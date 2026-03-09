// ─────────────────────────────────────────────────
// criticAgent.ts — Design Critic (Agent 3/3)
// ─────────────────────────────────────────────────
// Receives: current scene graph + brand compliance rules
// Returns: CriticResult (score, issues, fix suggestions)
// Uses vision API when screenshot available,
// falls back to structural analysis.
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import { buildBrandComplianceForCritic } from '@/services/brandContextBuilder';
import { executeTool } from '@/services/toolRegistry';
import type { ToolContext } from '@/services/tools/toolTypes';
import type { BrandKit } from '@/stores/brandKitStore';
import type { SceneGraph } from '@/services/sceneGraphBuilder';
import type { CriticResult, CriticIssue, ProgressCallback } from './agentTypes';

// ── Structural Analysis (no API needed) ──
// Fast, deterministic checks based on scene graph data.

export function runStructuralCritic(
    sceneGraph: SceneGraph,
    brandKit: BrandKit | null,
): CriticResult {
    const issues: CriticIssue[] = [];
    const canvasW = sceneGraph.canvas.width;
    const canvasH = sceneGraph.canvas.height;
    const pad = Math.max(10, Math.round(Math.min(canvasW, canvasH) * 0.05));

    // 1. Check overlaps
    for (const rel of sceneGraph.relationships) {
        if (rel.overlaps.length > 0) {
            // Overlaps with background are expected
            const nonBgOverlaps = rel.overlaps.filter(name => {
                const node = sceneGraph.elements.find(e => e.name === name);
                return node && node.role !== 'background';
            });
            if (nonBgOverlaps.length > 0 && sceneGraph.elements.find(e => e.name === rel.elementName)?.role !== 'background') {
                issues.push({
                    type: 'overlap',
                    severity: 'warning',
                    element: rel.elementName,
                    description: `"${rel.elementName}" overlaps with: ${nonBgOverlaps.join(', ')}`,
                });
            }
        }
    }

    // 2. Check clipping (outside canvas)
    for (const el of sceneGraph.elements) {
        if (el.bounds.x < 0 || el.bounds.y < 0 ||
            el.bounds.x + el.bounds.w > canvasW ||
            el.bounds.y + el.bounds.h > canvasH) {
            issues.push({
                type: 'clipping',
                severity: 'error',
                element: el.name,
                description: `"${el.name}" extends outside canvas bounds`,
                fixTool: 'move_node',
                fixParams: {
                    id: el.id,
                    x: Math.max(pad, Math.min(el.bounds.x, canvasW - el.bounds.w - pad)),
                    y: Math.max(pad, Math.min(el.bounds.y, canvasH - el.bounds.h - pad)),
                },
            });
        }
    }

    // 3. Check safe zone violations
    for (const el of sceneGraph.elements) {
        if (el.role === 'background') continue;
        const b = el.bounds;
        if (b.x < pad || b.y < pad || b.x + b.w > canvasW - pad || b.y + b.h > canvasH - pad) {
            issues.push({
                type: 'spacing',
                severity: 'warning',
                element: el.name,
                description: `"${el.name}" is too close to canvas edge (min ${pad}px padding)`,
            });
        }
    }

    // 4. Check text hierarchy
    const textEls = sceneGraph.elements.filter(e => e.style.fontSize);
    if (textEls.length >= 2) {
        const sorted = [...textEls].sort((a, b) => (b.style.fontSize ?? 0) - (a.style.fontSize ?? 0));
        const headline = sorted[0];
        if (headline.role !== 'headline' && headline.role !== null) {
            issues.push({
                type: 'hierarchy',
                severity: 'warning',
                element: headline.name,
                description: `Largest text "${headline.name}" has role "${headline.role}" — expected "headline"`,
            });
        }
    }

    // 5. Brand compliance (if brand kit active)
    let brandComplianceScore: number | undefined;
    if (brandKit) {
        const compliance = buildBrandComplianceForCritic(brandKit);

        // Check colors
        for (const el of sceneGraph.elements) {
            const colors = [el.style.fill, el.style.color].filter(Boolean) as string[];
            for (const color of colors) {
                if (!compliance.allowedColors.map(c => c.toLowerCase()).includes(color.toLowerCase())) {
                    issues.push({
                        type: 'brand_violation',
                        severity: 'warning',
                        element: el.name,
                        description: `Color ${color} not in brand palette`,
                        fixTool: 'set_fill',
                        fixParams: { id: el.id, color: compliance.allowedColors[0] },
                    });
                }
                if (compliance.forbiddenColors.map(c => c.toLowerCase()).includes(color.toLowerCase())) {
                    issues.push({
                        type: 'brand_violation',
                        severity: 'error',
                        element: el.name,
                        description: `Uses forbidden color ${color}`,
                    });
                }
            }
        }

        // Check required logo
        if (compliance.requiredAssets.length > 0) {
            const hasLogo = sceneGraph.elements.some(e => e.role === 'logo' || e.name.toLowerCase().includes('logo'));
            if (!hasLogo) {
                issues.push({
                    type: 'missing_logo',
                    severity: 'error',
                    description: 'Primary logo required but not placed on canvas',
                });
            }
        }

        // Check fonts
        for (const el of sceneGraph.elements) {
            if (el.style.fontFamily && !compliance.fontFamilies.map(f => f.toLowerCase()).includes(el.style.fontFamily.toLowerCase())) {
                issues.push({
                    type: 'font_mismatch',
                    severity: 'warning',
                    element: el.name,
                    description: `Font "${el.style.fontFamily}" not in brand typography`,
                });
            }
        }

        const totalChecks = sceneGraph.elements.length * 2; // color + font per element
        const violations = issues.filter(i => i.type === 'brand_violation' || i.type === 'missing_logo' || i.type === 'font_mismatch').length;
        brandComplianceScore = totalChecks > 0 ? Math.round((1 - violations / totalChecks) * 100) : 100;
    }

    // Calculate overall score
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);

    return {
        score,
        pass: score >= 82,
        issues,
        suggestions: issues
            .filter(i => i.fixTool)
            .map(i => `Fix "${i.element}": ${i.description}`),
        brandComplianceScore,
    };
}

// ── Vision-Enhanced Critic (API-based) ──
// Uses Claude Vision to analyze screenshot + structural data.

export async function runVisionCritic(
    screenshot: string,
    sceneGraph: SceneGraph,
    brandKit: BrandKit | null,
    signal: AbortSignal,
    onProgress?: ProgressCallback,
): Promise<CriticResult> {
    onProgress?.('Analyzing design quality...', 'critic');

    // Start with structural analysis
    const structural = runStructuralCritic(sceneGraph, brandKit);

    // If no API call possible or structural score is high enough, return early
    if (structural.score >= 95) {
        return structural;
    }

    // Vision analysis for deeper check
    try {
        const pureBase64 = screenshot.startsWith('data:')
            ? screenshot.split(',')[1] ?? screenshot
            : screenshot;

        const elementSummary = sceneGraph.elements
            .map(e => `"${e.name}" (${e.type}, ${e.bounds.w}x${e.bounds.h} at ${e.bounds.x},${e.bounds.y})`)
            .join('\n');

        const body = {
            model: DEFAULT_CLAUDE_MODEL,
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: 'image/png', data: pureBase64 },
                    },
                    {
                        type: 'text',
                        text: `Review this ${sceneGraph.canvas.width}x${sceneGraph.canvas.height} banner.

Elements:
${elementSummary}

Structural issues already found: ${structural.issues.length}
${structural.issues.map(i => `- [${i.severity}] ${i.description}`).join('\n')}

Check for additional visual issues not caught by structural analysis:
- Text readability and contrast
- Visual balance and composition
- Professional quality

Return JSON only: { "additionalScore": <-15 to +10 adjustment>, "additionalIssues": [{ "type": "contrast|hierarchy|spacing", "severity": "error|warning", "element": "<name>", "description": "<issue>" }] }`,
                    },
                ],
            }],
        };

        const data = await callAnthropicApi(body, signal) as {
            content: Array<{ type: string; text?: string }>;
        };

        const rawText = data.content.find(c => c.type === 'text')?.text ?? '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const vision = JSON.parse(jsonMatch[0]) as {
                additionalScore: number;
                additionalIssues: CriticIssue[];
            };

            const adjustedScore = Math.max(0, Math.min(100, structural.score + (vision.additionalScore ?? 0)));
            const allIssues = [...structural.issues, ...(vision.additionalIssues ?? [])];

            onProgress?.(`Design score: ${adjustedScore}/100 (${allIssues.length} issues)`, 'critic');

            return {
                score: adjustedScore,
                pass: adjustedScore >= 82,
                issues: allIssues,
                suggestions: allIssues.filter(i => i.fixTool).map(i => `Fix "${i.element}": ${i.description}`),
                brandComplianceScore: structural.brandComplianceScore,
            };
        }
    } catch (err) {
        console.warn('[Critic] Vision analysis failed, using structural only:', err);
    }

    onProgress?.(`Design score: ${structural.score}/100`, 'critic');
    return structural;
}
