// ─────────────────────────────────────────────────
// agentFlowHelpers — Brand scan + template selection
// ─────────────────────────────────────────────────
// Extracted from agentGenerateFlow.ts to keep under 400 lines.
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';
import type { AssetSelection } from '@/services/brandAssetSelector';

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

/**
 * Recalculate text element heights after content substitution.
 * Template heights are for short placeholders — AI content is often much longer.
 * Also auto-shrinks fonts if any text element would exceed 40% of canvas height.
 */
export function recalcTextHeights(elements: any[], canvasH: number): void {
    for (const el of elements) {
        if (el.type !== 'text' || !el.content || !el.font_size || !el.w) continue;
        const isBold = el.font_weight && parseInt(el.font_weight) >= 600;
        const charW = el.font_size * (isBold ? 0.65 : 0.50);
        const charsPerLine = Math.max(1, Math.floor(el.w / charW));
        const lines = Math.max(1, Math.ceil(el.content.length / charsPerLine));
        el.h = Math.round(el.font_size * 1.45 * lines + 8);

        // Auto-shrink font if text would overflow canvas height
        const maxH = canvasH * 0.4;
        while (el.h > maxH && el.font_size > 12) {
            el.font_size -= 2;
            const newCharW = el.font_size * (isBold ? 0.65 : 0.50);
            const newCPL = Math.max(1, Math.floor(el.w / newCharW));
            const newLines = Math.max(1, Math.ceil(el.content.length / newCPL));
            el.h = Math.round(el.font_size * 1.45 * newLines + 8);
        }
    }
}

/**
 * Auto-create a subheadline element below the headline when the AI generates
 * a subheadline but the template has no matching element.
 */
export function autoCreateSubheadline(
    allElements: any[], content: any, canvasW: number, canvasH: number,
): void {
    const headlineEl = allElements.find((el: any) =>
        el.type === 'text' && el.content === content.headline
    ) ?? allElements.find((el: any) => (el.name ?? '').toLowerCase().includes('headline'));
    const headlineY = headlineEl?.y ?? canvasH * 0.3;
    const headlineFontSize = headlineEl?.font_size ?? Math.round(canvasH * 0.06);
    const headlineContent = headlineEl?.content ?? content.headline ?? '';
    const headlineW = headlineEl?.w ?? Math.round(canvasW * 0.85);
    const isBold = headlineEl?.font_weight && parseInt(headlineEl.font_weight) >= 600;
    const charWidth = headlineFontSize * (isBold ? 0.65 : 0.50);
    const charsPerLine = Math.max(1, Math.floor(headlineW / charWidth));
    const headlineLines = Math.max(1, Math.ceil(headlineContent.length / charsPerLine));
    const estimatedHeadlineH = Math.round(headlineFontSize * 1.45 * headlineLines + 8);
    const headlineH = Math.max(headlineEl?.h ?? 0, estimatedHeadlineH);
    const subFontSize = Math.max(14, Math.min(32, Math.round(canvasH * 0.035)));
    const subY = headlineY + headlineH + Math.round(canvasH * 0.02);
    const subX = headlineEl?.x ?? Math.round(canvasW * 0.075);
    const subW = headlineEl?.w ?? Math.round(canvasW * 0.85);
    const subCharWidth = subFontSize * 0.50;
    const subCharsPerLine = Math.max(1, Math.floor(subW / subCharWidth));
    const subLines = Math.max(1, Math.ceil(content.subheadline.length / subCharsPerLine));
    const subH = Math.round(subFontSize * 1.45 * subLines + 8);
    allElements.push({
        name: 'subheadline', type: 'text', content: content.subheadline,
        x: subX, y: subY, w: subW, h: subH,
        font_size: subFontSize, font_weight: '400',
        text_align: headlineEl?.text_align ?? 'center',
        color_hex: headlineEl?.color_hex ?? '#FFFFFF', line_height: 1.3,
    });
    console.log(`[Pipeline] Auto-created subheadline: "${content.subheadline.slice(0, 40)}" at y=${subY}, h=${subH}`);
}

// ── BG element names — template backgrounds that get special treatment ──
const BG_NAMES = new Set([
    'background', 'accent_zone', 'accent_glow', 'text_overlay',
    'accent_diagonal', 'bottom_border', 'bottom_accent',
]);

/**
 * Process template elements: handle BG, inject content, replace fonts, apply overlay.
 * Keeps template font sizes intact (Golden Template approach).
 */
export async function processTemplateElements(
    elements: any[],
    content: any,
    guide: any,
    canvasW: number, canvasH: number,
    bgResult: { hasImage: boolean; url: string | null },
    designStrategy?: any,
): Promise<any[]> {
    let allElements = [...elements];

    if (bgResult.hasImage && bgResult.url) {
        // Strip template BG, force white text, apply overlay
        allElements = allElements.filter(el =>
            el.type === 'text' || !BG_NAMES.has((el.name ?? '').toLowerCase())
        );
        for (const el of allElements) {
            if (el.type === 'text') el.color_hex = '#FFFFFF';
        }
        try {
            const { buildOverlayResult } = await resilientImport(() => import('@/services/overlayStyles'));
            const overlay = buildOverlayResult(
                designStrategy?.overlayApproach ?? 'gradient-scrim',
                canvasW, canvasH,
                guide.colors.background ?? '#0B0F1A',
                guide.colors.accent ?? '#3b82f6',
                designStrategy?.imageFilters?.brightness ?? -0.15,
                designStrategy?.imageFilters?.blur ?? 0,
            );
            if (overlay.overlayElements.length > 0) allElements.unshift(...overlay.overlayElements);
            if (overlay.textModifiers.shadowBlur > 0) {
                for (const el of allElements) {
                    if (el.type === 'text') {
                        el.shadow_blur = overlay.textModifiers.shadowBlur;
                        el.shadow_offset_x = 0;
                        el.shadow_offset_y = overlay.textModifiers.shadowOffsetY;
                        el.shadow_opacity = overlay.textModifiers.shadowOpacity;
                    }
                }
            }
        } catch { /* overlay is best-effort */ }
    } else {
        const { recolorTemplateElements } = await resilientImport(() => import('./agentColorRecolor'));
        allElements = recolorTemplateElements(allElements, guide);
    }

    // Content injection: replace template placeholder text with AI copy
    const contentMap: Record<string, string> = {};
    if (content.headline) contentMap['headline'] = content.headline;
    if (content.subheadline) contentMap['subheadline'] = content.subheadline;
    if (content.cta) { contentMap['cta_label'] = content.cta; contentMap['cta'] = content.cta; }
    if (content.tag) { contentMap['tag_text'] = content.tag; contentMap['tag'] = content.tag; }

    for (const el of allElements) {
        if (el.type !== 'text') continue;
        const name = (el.name ?? '').toLowerCase();
        for (const [key, value] of Object.entries(contentMap)) {
            if (name.includes(key)) { el.content = value; break; }
        }
    }

    // Font replacement: AI palette fonts (keep template font sizes!)
    for (const el of allElements) {
        if (el.type !== 'text') continue;
        const name = (el.name ?? '').toLowerCase();
        if (name.includes('headline') && !name.includes('sub')) {
            el.font_family = guide.typography.primaryFont;
        } else if (el.font_family) {
            el.font_family = guide.typography.secondaryFont;
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
