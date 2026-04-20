// ─────────────────────────────────────────────────
// agentFlowHelpers — Brand scan + template selection
// ─────────────────────────────────────────────────
// Extracted from agentGenerateFlow.ts to keep under 400 lines.
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';

export interface BrandScanResult {
    context: string;
    paletteHint: string;
    fontHint: string;
    assetHint: string;
    logoUrl: string | null;
    logoW: number;
    logoH: number;
    visionBlocks: any[];
}

export async function scanBrandCloud(prompt: string, cb: AgentFlowCallbacks): Promise<BrandScanResult> {
    cb.addCard('brand-scan', 'Scanning Brand Cloud', 'running');
    const result: BrandScanResult = { context: '', paletteHint: '', fontHint: '', assetHint: '', logoUrl: null, logoW: 0, logoH: 0, visionBlocks: [] };

    try {
        const { useBrandKitStore } = await resilientImport(() => import('@/stores/brandKitStore'));
        const kit = useBrandKitStore.getState().getActiveKit();
        if (!kit) { cb.updateCard('brand-scan', 'done', 'No active brand kit'); return result; }

        result.paletteHint = [`Brand colors: primary=${kit.palette.primary}, secondary=${kit.palette.secondary}`, `accent=${kit.palette.accent}, background=${kit.palette.background}, text=${kit.palette.text}`].join(', ');
        result.fontHint = `Brand fonts: heading="${kit.typography.heading.family}", body="${kit.typography.body.family}", CTA="${kit.typography.cta.family}"`;

        const activeAssets = kit.assets.filter(a => !a.deletedAt);
        const logoAssets = activeAssets.filter(a => a.category === 'logo');
        if (logoAssets.length > 0) {
            const brandNameLower = (kit.guidelines?.name || kit.name || '').toLowerCase();
            const brandTaglineLower = (kit.guidelines?.tagline || '').toLowerCase();
            const pl = prompt.toLowerCase();
            if (pl.includes(brandNameLower) || (brandTaglineLower && pl.includes(brandTaglineLower)) || pl.includes('logo') || pl.includes('brand') || pl.includes('로고') || pl.includes('브랜드')) {
                const logo = logoAssets[0]!;
                result.logoUrl = logo.src; result.logoW = logo.width; result.logoH = logo.height;
            }
        }

        const promptLower = prompt.toLowerCase();
        const matchedAssets = activeAssets.filter(a => a.tags.some(t => promptLower.includes(t.toLowerCase())) || promptLower.includes(a.name.toLowerCase()) || promptLower.includes(a.category));
        if (matchedAssets.length > 0 || logoAssets.length > 0) {
            const allRelevant = [...new Set([...logoAssets, ...matchedAssets])];
            result.assetHint = `Brand assets: ${allRelevant.map(a => `"${a.name}" (${a.category}, ${a.width}x${a.height})`).join(', ')}`;
        }

        const g = kit.guidelines;
        result.context = [`Brand: ${g.name || kit.name}`, g.tagline ? `Tagline: "${g.tagline}"` : '', g.voiceTone ? `Voice: ${g.voiceTone}` : '', g.ctaPhrases.length > 0 ? `CTA phrases: ${g.ctaPhrases.join(', ')}` : '', result.paletteHint, result.fontHint, result.assetHint].filter(Boolean).join('\n');

        try {
            const { buildBrandVisionBlocks } = await resilientImport(() => import('@/services/brandContextBuilder'));
            result.visionBlocks = buildBrandVisionBlocks(kit);
            if (result.visionBlocks.length > 0) cb.narrate(`AI can now visually see ${Math.floor(result.visionBlocks.length / 2)} brand asset(s).`);
        } catch { /* optional */ }

        const logoNote = logoAssets.length > 0 ? ` (${logoAssets.length} logo)` : '';
        const assetNote = matchedAssets.length > 0 ? `${matchedAssets.length} matching asset(s)${logoNote}` : `${activeAssets.length} asset(s)${logoNote}`;
        cb.updateCard('brand-scan', 'done', `${kit.name}: ${assetNote}`, { expandedDetail: result.context });
        cb.narrate(`Brand kit "${kit.name}" loaded — ${assetNote}.`);
    } catch {
        cb.updateCard('brand-scan', 'done', 'Brand Cloud scan skipped');
    }
    return result;
}

export async function selectTemplate(prompt: string, canvasW: number, canvasH: number, _brandVisionBlocks: any[], _abort: AbortController, cb: AgentFlowCallbacks) {
    cb.narrate(`Selecting layout template for ${canvasW}×${canvasH}...`);
    cb.addCard('structure', 'Selecting layout template', 'running');

    const { useTemplateStore } = await resilientImport(() => import('@/stores/templateStore'));
    const allTemplates = useTemplateStore.getState().templates ?? [];

    if (allTemplates.length === 0) throw new Error('No templates available in store');

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
