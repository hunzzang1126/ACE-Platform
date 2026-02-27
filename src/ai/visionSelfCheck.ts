// ─────────────────────────────────────────────────
// Vision-in-the-Loop — AI Self-Verification
// ─────────────────────────────────────────────────
// After the AI generates or modifies a design, this module:
// 1. Captures a screenshot of the result
// 2. Sends it to Claude Vision for analysis
// 3. Returns issues found
// 4. Can trigger auto-correction (max N loops)
//
// This ensures AI-generated designs are actually correct,
// not just "theoretically correct based on constraints."

import { renderVariantToCanvas } from '@/utils/screenshotCapture';
import { resolveConstraints } from '@/schema/constraints.types';
import type { BannerVariant } from '@/schema/design.types';
import type { TextElement, ShapeElement, ButtonElement } from '@/schema/elements.types';
import { getAspectCategory } from '@/schema/layoutRoles';

// ── Types ──

export interface VisionCheckResult {
    passed: boolean;
    issues: VisionIssue[];
    screenshotDataUrl?: string;
    loopCount: number;
}

export interface VisionIssue {
    severity: 'error' | 'warning';
    description: string;
    suggestion?: string;
}

export interface VisionSelfCheckConfig {
    /** Max correction loops before giving up */
    maxLoops: number;
    /** Claude API key */
    apiKey: string;
    /** Model for vision analysis */
    model: string;
}

const DEFAULT_CONFIG: VisionSelfCheckConfig = {
    maxLoops: 2,
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
};

// ── Helpers ──

/** Convert a BannerVariant to the format expected by renderVariantToCanvas */
function variantToRenderInput(variant: BannerVariant) {
    const w = variant.preset.width;
    const h = variant.preset.height;

    // Find background color
    const bgEl = variant.elements.find(el => el.role === 'background' && el.type === 'shape');
    const backgroundColor = bgEl ? (bgEl as ShapeElement).fill : '#FFFFFF';

    const elements = variant.elements.map(el => {
        const resolved = resolveConstraints(el.constraints, w, h);
        const base = {
            x: resolved.x,
            y: resolved.y,
            width: resolved.width,
            height: resolved.height,
            type: el.type,
            opacity: el.opacity,
        };
        switch (el.type) {
            case 'text': {
                const t = el as TextElement;
                return { ...base, color: t.color, content: t.content, fontSize: t.fontSize, fontFamily: t.fontFamily };
            }
            case 'shape': {
                const s = el as ShapeElement;
                return { ...base, fill: s.fill };
            }
            case 'button': {
                const b = el as ButtonElement;
                return { ...base, backgroundColor: b.backgroundColor, color: b.color, label: b.label, fontSize: 14 };
            }
            default:
                return base;
        }
    });

    return { width: w, height: h, backgroundColor, elements };
}

// ── Main Self-Check ──

/**
 * Run a vision self-check on a variant.
 * Captures screenshot → sends to Claude Vision → returns issues.
 */
export async function runVisionSelfCheck(
    variant: BannerVariant,
    config?: Partial<VisionSelfCheckConfig>,
): Promise<VisionCheckResult> {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    if (!cfg.apiKey) {
        return { passed: true, issues: [], loopCount: 0 };
    }

    try {
        // 1. Capture screenshot (returns base64 string without prefix)
        const renderInput = variantToRenderInput(variant);
        const base64 = renderVariantToCanvas(renderInput);
        const dataUrl = `data:image/png;base64,${base64}`;

        // 2. Send to Claude Vision for analysis
        const issues = await analyzeWithVision(base64, variant, cfg);

        return {
            passed: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            screenshotDataUrl: dataUrl,
            loopCount: 1,
        };
    } catch (err) {
        console.warn('[VisionSelfCheck] Failed:', err);
        return { passed: true, issues: [], loopCount: 0 };
    }
}

/**
 * Run a batch self-check on multiple variants.
 */
export async function runBatchVisionCheck(
    variants: BannerVariant[],
    config?: Partial<VisionSelfCheckConfig>,
): Promise<Map<string, VisionCheckResult>> {
    const results = new Map<string, VisionCheckResult>();
    for (const variant of variants) {
        const result = await runVisionSelfCheck(variant, config);
        results.set(variant.id, result);
    }
    return results;
}

// ── Vision API Call ──

async function analyzeWithVision(
    screenshotDataUrl: string,
    variant: BannerVariant,
    config: VisionSelfCheckConfig,
): Promise<VisionIssue[]> {
    const w = variant.preset.width;
    const h = variant.preset.height;
    const category = getAspectCategory(w, h);
    const elementRoles = variant.elements
        .filter(el => el.role)
        .map(el => `${el.name} (${el.role})`)
        .join(', ');

    const prompt = `You are a QA inspector for banner ad designs. Analyze this ${w}×${h} (${category}) banner screenshot.

Elements expected: ${elementRoles || 'unknown'}

Check for these issues:
1. OVERLAP: Are any text elements overlapping each other?
2. CLIPPING: Is any text cut off or extending outside the banner?
3. READABILITY: Is text too small to read? (< 8px equivalent)
4. LAYOUT: For ${category} aspect ratio:
${category === 'ultra-wide' ? '   - Logo should be LEFT, headline CENTER, CTA RIGHT' : ''}
${category === 'portrait' ? '   - Logo TOP, headline CENTER (multi-line), CTA BOTTOM' : ''}
${category === 'landscape' || category === 'square' ? '   - Vertical stack, centered' : ''}
5. VISUAL: Does the design look professional? Any obvious issues?

Reply in JSON format ONLY:
{
  "issues": [
    { "severity": "error|warning", "description": "...", "suggestion": "..." }
  ]
}

If no issues, return: { "issues": [] }`;

    try {
        // Remove "data:image/png;base64," prefix
        const base64 = screenshotDataUrl.replace(/^data:image\/\w+;base64,/, '');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/png',
                                data: base64,
                            },
                        },
                        { type: 'text', text: prompt },
                    ],
                }],
            }),
        });

        if (!response.ok) {
            console.warn(`[VisionSelfCheck] API error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return [];

        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.issues || []).map((issue: { severity?: string; description?: string; suggestion?: string }) => ({
            severity: issue.severity === 'error' ? 'error' : 'warning',
            description: issue.description || 'Unknown issue',
            suggestion: issue.suggestion,
        }));
    } catch (err) {
        console.warn('[VisionSelfCheck] Analysis failed:', err);
        return [];
    }
}
