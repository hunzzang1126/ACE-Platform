// ─────────────────────────────────────────────────
// agentFlowHelpers — Brand scan + template selection
// ─────────────────────────────────────────────────
// Extracted from agentGenerateFlow.ts to keep under 400 lines.
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';
import type { AssetSelection } from '@/services/brandAssetSelector';

// ★ v739: Text layout extracted to agentTextLayout.ts — re-export for backward compat
export { recalcTextHeights, autoCreateSubheadline } from './agentTextLayout';
export interface BrandScanResult {
    context: string;
    paletteHint: string;
    fontHint: string;
    assetHint: string;
    logoUrl: string | null;
    logoW: number;
    logoH: number;
    visionBlocks: any[];
    /** ★ v719: Hybrid selector result (Code + AI) */
    selectedAssets: AssetSelection | null;
}

export async function scanBrandCloud(
    prompt: string,
    canvasW: number,
    canvasH: number,
    cb: AgentFlowCallbacks,
    signal?: AbortSignal,
): Promise<BrandScanResult> {
    cb.addCard('brand-scan', 'Scanning Brand Cloud', 'running');
    const result: BrandScanResult = { context: '', paletteHint: '', fontHint: '', assetHint: '', logoUrl: null, logoW: 0, logoH: 0, visionBlocks: [], selectedAssets: null };

    try {
        const { useBrandKitStore } = await resilientImport(() => import('@/stores/brandKitStore'));
        const kit = useBrandKitStore.getState().getActiveKit();
        if (!kit) { cb.updateCard('brand-scan', 'done', 'No active brand kit'); return result; }

        result.paletteHint = [`Brand colors: primary=${kit.palette.primary}, secondary=${kit.palette.secondary}`, `accent=${kit.palette.accent}, background=${kit.palette.background}, text=${kit.palette.text}`].join(', ');
        result.fontHint = `Brand fonts: heading="${kit.typography.heading.family}", body="${kit.typography.body.family}", CTA="${kit.typography.cta.family}"`;

        const activeAssets = kit.assets.filter(a => !a.deletedAt);

        // ★ v719: Hybrid brand asset selection (Code Layer + AI Layer)
        try {
            const { selectBrandAssets } = await resilientImport(() => import('@/services/brandAssetSelector'));
            const selection = await selectBrandAssets(prompt, activeAssets, result.context, canvasW, canvasH, signal);
            result.selectedAssets = selection;

            // Logo decided by selector (replaces legacy keyword matching)
            if (selection.logo) {
                result.logoUrl = selection.logo.src;
                result.logoW = selection.logo.width;
                result.logoH = selection.logo.height;
            }

            // Build UI summary
            const usedParts: string[] = [];
            const skippedParts: string[] = [];
            if (selection.logo) usedParts.push(`Logo: ${selection.logo.name}`);
            if (selection.background) usedParts.push(`BG: ${selection.background.reasoning}`);
            for (const p of selection.productImages) usedParts.push(`Product: ${p.reasoning}`);
            if (selection.needsGeneratedBackground) usedParts.push('BG: AI will generate');
            for (const s of selection.skippedAssets) skippedParts.push(`Skip: ${s.asset.name} (${s.reasoning})`);

            const summary = `${usedParts.length} selected, ${skippedParts.length} skipped`;
            cb.updateCard('brand-scan', 'done', `${kit.name}: ${summary}`, {
                expandedDetail: [...usedParts, ...skippedParts, '', result.context].filter(Boolean).join('\n'),
            });

            // ★ v725: Conversational narration — tell user WHAT was found, not just counts
            const narrateParts: string[] = [];
            if (selection.logo) {
                narrateParts.push(`Found logo "${selection.logo.name}" in Brand Cloud — using it in the design.`);
            }
            if (selection.background) {
                narrateParts.push(`Found background "${selection.background.asset.name}" — applying as canvas background.`);
            }
            for (const p of selection.productImages) {
                narrateParts.push(`Found product image "${p.asset.name}" — placing on canvas.`);
            }
            if (narrateParts.length === 0 && activeAssets.length > 0) {
                narrateParts.push(`Scanned Brand Cloud "${kit.name}" — no matching assets for this design.`);
            }
            if (selection.needsGeneratedBackground && !selection.background) {
                narrateParts.push('No brand background found — AI will generate one.');
            }
            cb.narrate(narrateParts.join('\n'));
        } catch (selErr) {
            console.warn('[BrandScan] Asset selector failed, falling back to legacy:', selErr);
            // Fallback to legacy logo detection
            const logoAssets = activeAssets.filter(a => a.category === 'logo');
            if (logoAssets.length > 0) {
                const logo = logoAssets[0]!;
                result.logoUrl = logo.src; result.logoW = logo.width; result.logoH = logo.height;
            }
            cb.updateCard('brand-scan', 'done', `${kit.name}: ${activeAssets.length} asset(s)`, { expandedDetail: result.context });
            if (logoAssets.length > 0) {
                cb.narrate(`Found logo "${logoAssets[0]!.name}" in Brand Cloud — using it in the design.`);
            } else {
                cb.narrate(`Scanned Brand Cloud "${kit.name}" — ${activeAssets.length} asset(s) found.`);
            }
        }

        try {
            const { buildBrandVisionBlocks } = await resilientImport(() => import('@/services/brandContextBuilder'));
            result.visionBlocks = buildBrandVisionBlocks(kit);
            if (result.visionBlocks.length > 0) cb.narrate(`AI can now visually see ${Math.floor(result.visionBlocks.length / 2)} brand asset(s).`);
        } catch { /* optional */ }
    } catch {
        cb.updateCard('brand-scan', 'done', 'Brand Cloud scan skipped');
    }
    return result;
}

export async function selectTemplate(prompt: string, canvasW: number, canvasH: number, _brandVisionBlocks: any[], _abort: AbortController, cb: AgentFlowCallbacks, aiTemplateId?: string | null) {
    cb.narrate(`Selecting layout template for ${canvasW}×${canvasH}...`);
    cb.addCard('structure', 'Selecting layout template', 'running');

    const { useTemplateStore } = await resilientImport(() => import('@/stores/templateStore'));
    const allTemplates = useTemplateStore.getState().templates ?? [];

    if (allTemplates.length === 0) throw new Error('No templates available in store');

    // ★ v734: AI-selected template takes priority
    if (aiTemplateId) {
        const aiPicked = allTemplates.find(t => t.id === aiTemplateId);
        if (aiPicked) {
            const template = { id: aiPicked.id, name: aiPicked.name, description: aiPicked.description ?? '' };
            cb.updateCard('structure', 'done', template.name, {
                reasoning: 'AI Creative Director selected this template',
                expandedDetail: `Template: ${template.name}\nID: ${template.id}\nSelected by AI based on prompt analysis`,
            });
            cb.narrate(`AI selected template "${template.name}"`);
            return template;
        }
        console.warn(`[selectTemplate] AI-chosen template "${aiTemplateId}" not found in store, falling back to keyword match`);
    }

    // ★ Fallback: keyword matching
    const promptLower = prompt.toLowerCase();
    const promptWords = promptLower.split(/\s+/);

    let bestTemplate = allTemplates[0]!;
    let bestScore = 0;

    for (const tmpl of allTemplates) {
        const nameWords = (tmpl.name || '').toLowerCase().split(/[\s\-_]+/);
        const descWords = (tmpl.description || '').toLowerCase().split(/[\s\-_]+/);
        const allWords = [...nameWords, ...descWords];
        let score = 0;
        for (const word of allWords) {
            if (word.length < 3) continue;
            if (promptLower.includes(word)) score += 2;
            if (promptWords.some(pw => pw.includes(word) || word.includes(pw))) score += 1;
        }
        const tags = (tmpl as any).tags ?? [];
        for (const tag of tags) {
            if (promptLower.includes(tag.toLowerCase())) score += 3;
        }
        if (score > bestScore) {
            bestScore = score;
            bestTemplate = tmpl;
        }
    }

    const template = { id: bestTemplate.id, name: bestTemplate.name, description: bestTemplate.description ?? '' };
    const method = bestScore > 0 ? `Matched by keywords (score: ${bestScore})` : 'Default template (no keyword match)';
    cb.updateCard('structure', 'done', template.name, {
        reasoning: method,
        expandedDetail: `Template: ${template.name}\nID: ${template.id}\n${method}`,
    });
    cb.narrate(`Selected "${template.name}" — ${method}`);
    return template;
}

// ★ v739: recalcTextHeights, estimateTextHeight, autoCreateSubheadline → agentTextLayout.ts

// ── BG element names — template backgrounds that get special treatment ──
const BG_NAMES = new Set([
    'background', 'accent_zone', 'accent_glow', 'text_overlay',
    'accent_diagonal', 'bottom_border', 'bottom_accent',
]);

/** ★ v737: Apply harmony colors to all elements by role */
function applyHarmonyColors(elements: any[], harmony: import('@/services/colorHarmony').HarmonyPalette): void {
    const hexToRgb01 = (hex: string) => {
        const c = hex.replace('#', '');
        return { r: parseInt(c.slice(0, 2), 16) / 255, g: parseInt(c.slice(2, 4), 16) / 255, b: parseInt(c.slice(4, 6), 16) / 255 };
    };
    for (const el of elements) {
        const name = (el.name ?? '').toLowerCase();
        if (el.type === 'text') {
            if (name.includes('headline') && !name.includes('sub')) el.color_hex = harmony.headline;
            else if (name.includes('sub')) el.color_hex = harmony.subheadline;
            else if (name.includes('cta') || name.includes('label')) el.color_hex = harmony.accentForeground;
            else if (name.includes('tag')) el.color_hex = harmony.tag;
            else el.color_hex = harmony.body;
        } else if (name.includes('cta') || name.includes('button')) {
            const { r, g, b } = hexToRgb01(harmony.accent);
            el.r = r; el.g = g; el.b = b;
        } else if (name.includes('accent') || name.includes('badge') || name.includes('tag')) {
            const { r, g, b } = hexToRgb01(harmony.accent);
            el.r = r; el.g = g; el.b = b; el.a = el.a ?? 0.15;
        }
    }
}


/** Process template elements: BG handling, content injection, font, colors. */
export async function processTemplateElements(
    elements: any[], content: any, guide: any,
    canvasW: number, canvasH: number,
    bgResult: { hasImage: boolean; url: string | null },
    designStrategy?: any,
): Promise<any[]> {
    let allElements = [...elements];

    // ★ v737: Analyze background for gradient/solid path (harmony colors)
    const { analyzeBackground, deriveHarmonyPalette } = await resilientImport(() => import('@/services/colorHarmony'));
    const bgAnalysis = analyzeBackground(guide.colors.gradientStart ?? guide.colors.background ?? '#0B0F1A', guide.colors.gradientEnd ?? guide.colors.gradientStart ?? '#0B0F1A');
    const harmony = deriveHarmonyPalette(bgAnalysis, { accent: guide.colors.accent ?? '#3b82f6', foreground: guide.colors.foreground ?? '#FFFFFF', secondary: guide.colors.secondary ?? '#CCCCCC' });

    if (bgResult.hasImage && bgResult.url) {
        // Strip template BG shapes, keep text/decoration intact
        allElements = allElements.filter(el =>
            el.type === 'text' || !BG_NAMES.has((el.name ?? '').toLowerCase())
        );
        // ★ v738: BG images are unpredictable — ALWAYS white text with shadow
        // Harmony colors ONLY for accent shapes/CTA, NOT for text on photos
        for (const el of allElements) {
            if (el.type === 'text') {
                el.color_hex = '#FFFFFF';
                el.shadow_blur = el.shadow_blur ?? 10;
                el.shadow_offset_x = 0;
                el.shadow_offset_y = el.shadow_offset_y ?? 2;
                el.shadow_opacity = el.shadow_opacity ?? 0.7;
            }
        }
        // Apply harmony to non-text elements only (accent shapes, CTA bg)
        for (const el of allElements) {
            if (el.type === 'text') continue;
            const name = (el.name ?? '').toLowerCase();
            if (name.includes('cta') || name.includes('button')) {
                const c = harmony.accent.replace('#', '');
                el.r = parseInt(c.slice(0, 2), 16) / 255;
                el.g = parseInt(c.slice(2, 4), 16) / 255;
                el.b = parseInt(c.slice(4, 6), 16) / 255;
            }
        }
    } else {
        // Gradient/solid background → recolor + harmony-derived colors
        const { recolorTemplateElements } = await resilientImport(() => import('./agentColorRecolor'));
        allElements = recolorTemplateElements(allElements, guide);
        applyHarmonyColors(allElements, harmony);
        // ★ v740: Shadow as WCAG insurance when harmony engine says contrast is tight
        if (harmony.needsShadow) {
            for (const el of allElements) {
                if (el.type === 'text') {
                    el.shadow_blur = el.shadow_blur ?? 8;
                    el.shadow_offset_y = el.shadow_offset_y ?? 2;
                    el.shadow_opacity = el.shadow_opacity ?? 0.5;
                }
            }
        }
    }

    // ★ v741: Content injection — ROLE INFERENCE, not just name matching.
    // 1. Try name-based matching first (fast path)
    // 2. For unmatched elements: infer role from font_size + y-position
    // 3. ALL template placeholders MUST be replaced — no text leaks through
    const textEls = allElements.filter(el => el.type === 'text');

    // Pass 1: Name-based matching (exact matches)
    const injected = new Set<any>();
    let headlineInjected = false;
    let subInjected = false;
    let ctaInjected = false;
    let tagInjected = false;

    for (const el of textEls) {
        const name = (el.name ?? '').toLowerCase();
        if (name.includes('headline') && !name.includes('sub')) {
            if (content.headline) { el.content = content.headline; injected.add(el); headlineInjected = true; }
        } else if (name.includes('sub') || name.includes('body') || name.includes('description') || name.includes('detail') || name.includes('tagline')) {
            if (content.subheadline) { el.content = content.subheadline; injected.add(el); subInjected = true; }
        } else if (name.includes('cta') || name.includes('label') || name.includes('button')) {
            if (content.cta) { el.content = content.cta; injected.add(el); ctaInjected = true; }
        } else if (name.includes('tag') || name.includes('badge') || name.includes('date')) {
            if (content.tag) { el.content = content.tag; injected.add(el); tagInjected = true; }
        }
    }

    // Pass 2: Role inference for UNMATCHED text elements.
    // Sort by font_size (desc) → largest = headline, next = sub, etc.
    const unmatched = textEls.filter(el => !injected.has(el));
    if (unmatched.length > 0) {
        const sorted = [...unmatched].sort((a, b) => (b.font_size ?? 0) - (a.font_size ?? 0));
        for (const el of sorted) {
            if (!headlineInjected && content.headline) {
                el.content = content.headline;
                headlineInjected = true;
                console.log(`[Pipeline] Role-inferred headline → "${el.name}" (font=${el.font_size})`);
            } else if (!subInjected && content.subheadline) {
                el.content = content.subheadline;
                subInjected = true;
                console.log(`[Pipeline] Role-inferred subheadline → "${el.name}" (font=${el.font_size})`);
            } else if (!tagInjected && content.tag) {
                el.content = content.tag;
                tagInjected = true;
                console.log(`[Pipeline] Role-inferred tag → "${el.name}" (font=${el.font_size})`);
            } else if (!ctaInjected && content.cta) {
                el.content = content.cta;
                ctaInjected = true;
                console.log(`[Pipeline] Role-inferred CTA → "${el.name}" (font=${el.font_size})`);
            } else if (content.subheadline && el.content && el.content.length > 3) {
                // Extra text elements → replace with subheadline to prevent placeholders
                el.content = content.subheadline;
                console.log(`[Pipeline] Extra text → subheadline: "${el.name}" (font=${el.font_size})`);
            }
        }
    }

    // Pass 3: Kill remaining template placeholders that couldn't be replaced.
    // If a text element STILL has its original template content and wasn't injected,
    // it's a leaked placeholder. Mark it empty — it gets filtered out later.
    for (const el of textEls) {
        if (injected.has(el)) continue;
        const name = (el.name ?? '').toLowerCase();
        // Skip elements that WERE updated in Pass 2 (check if content matches any AI content)
        const isAiContent = el.content === content.headline || el.content === content.subheadline
            || el.content === content.cta || el.content === content.tag;
        if (isAiContent) continue;
        // This is a template placeholder that survived — hide it
        if (el.content && el.content.length > 3) {
            console.log(`[Pipeline] Killing leaked placeholder "${el.name}": "${el.content?.slice(0, 40)}"`);
            el.content = '';
        }
    }

    // ★ v736: Preserve template fonts — they ARE the design
    // Only apply AI palette fonts when template element has NO font specified.
    // Typography defaults (tracking, weight) are fallbacks only (uses ?? operator).
    for (const el of allElements) {
        if (el.type !== 'text') continue;
        const name = (el.name ?? '').toLowerCase();
        // ★ Font fallback: template font > AI palette font > "Inter"
        if (!el.font_family) {
            if (name.includes('headline') && !name.includes('sub')) {
                el.font_family = guide.typography.primaryFont;
            } else {
                el.font_family = guide.typography.secondaryFont;
            }
        }
        // Typography defaults — only if template didn't specify
        if (name.includes('headline') && !name.includes('sub')) {
            el.letter_spacing = el.letter_spacing ?? -0.5;
            el.line_height = el.line_height ?? 1.1;
            el.font_weight = el.font_weight ?? '800';
        } else if (name.includes('sub')) {
            el.letter_spacing = el.letter_spacing ?? 0;
            el.line_height = el.line_height ?? 1.35;
            el.font_weight = el.font_weight ?? '400';
        } else if (name.includes('tag')) {
            el.letter_spacing = el.letter_spacing ?? 2;
            el.font_weight = el.font_weight ?? '600';
        }
    }

    // Auto-create subheadline if template lacks one but AI generated it
    if (content.subheadline) {
        const hasSub = allElements.some((el: any) =>
            el.type === 'text' && (el.name ?? '').toLowerCase().includes('sub')
        );
        if (!hasSub) autoCreateSubheadline(allElements, content, canvasW, canvasH);
    }

    // Recalculate text heights (AI copy may be longer than template placeholders)
    recalcTextHeights(allElements, canvasH);

    return allElements;
}
