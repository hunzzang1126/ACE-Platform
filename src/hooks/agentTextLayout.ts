// ─────────────────────────────────────────────────
// agentTextLayout.ts — Text sizing, overflow prevention, cascade
// ─────────────────────────────────────────────────
// ★ v739: Extracted from agentFlowHelpers.ts.
// Handles: font auto-shrink, overlap prevention, subheadline creation.
// ─────────────────────────────────────────────────

/**
 * ★ v739: Recalculate text heights + prevent overlap.
 * 1. Shrink font if text overflows its own bounding box (position-first).
 * 2. Cascade-push elements below when a text element grows taller.
 */
export function recalcTextHeights(elements: any[], canvasH: number): void {
    for (const el of elements) {
        if (el.type !== 'text' || !el.content || !el.font_size || !el.w) continue;
        const isBold = el.font_weight && parseInt(el.font_weight) >= 600;
        const originalH = el.h ?? canvasH * 0.15;
        const maxAllowedH = Math.min(originalH * 1.5, canvasH * 0.35);

        const estH = estimateTextHeight(el.content, el.font_size, el.w, isBold);

        // ★ Shrink font if text overflows its OWN bounding box
        if (estH > maxAllowedH && el.font_size > 12) {
            while (el.font_size > 12) {
                el.font_size -= 1;
                const newH = estimateTextHeight(el.content, el.font_size, el.w, isBold);
                if (newH <= maxAllowedH) break;
            }
            el.h = estimateTextHeight(el.content, el.font_size, el.w, isBold);
            console.log(`[recalcTextHeights] Shrunk "${el.name}" to ${el.font_size}px (text overflowed bounding box)`);
        }
    }

    // ★ v739: Cascade-push — prevent overlapping elements
    const textEls = elements.filter(e => e.type === 'text').sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
    for (let i = 1; i < textEls.length; i++) {
        const prev = textEls[i - 1]!;
        const curr = textEls[i]!;
        const prevBottom = (prev.y ?? 0) + estimateTextHeight(
            prev.content ?? '', prev.font_size ?? 14, prev.w ?? 300,
            parseInt(prev.font_weight ?? '400') >= 600,
        );
        const gap = Math.round(canvasH * 0.015);
        if ((curr.y ?? 0) < prevBottom + gap) {
            const oldY = curr.y;
            curr.y = Math.round(prevBottom + gap);
            console.log(`[recalcTextHeights] Pushed "${curr.name}" down: y ${oldY} → ${curr.y} (avoided overlap with "${prev.name}")`);
        }
    }
}

export function estimateTextHeight(content: string, fontSize: number, width: number, isBold: boolean): number {
    const charW = fontSize * (isBold ? 0.65 : 0.50);
    const charsPerLine = Math.max(1, Math.floor(width / charW));
    const lines = Math.max(1, Math.ceil(content.length / charsPerLine));
    return Math.round(fontSize * 1.45 * lines + 8);
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
    const headlineH = Math.max(
        headlineEl?.h ?? 0,
        estimateTextHeight(headlineContent, headlineFontSize, headlineW, !!isBold),
    );
    const subFontSize = Math.max(14, Math.min(32, Math.round(canvasH * 0.035)));
    const subY = headlineY + headlineH + Math.round(canvasH * 0.02);
    const subX = headlineEl?.x ?? Math.round(canvasW * 0.075);
    const subW = headlineEl?.w ?? Math.round(canvasW * 0.85);
    const subH = estimateTextHeight(content.subheadline, subFontSize, subW, false);
    allElements.push({
        name: 'subheadline', type: 'text', content: content.subheadline,
        x: subX, y: subY, w: subW, h: subH,
        font_size: subFontSize, font_weight: '400',
        text_align: headlineEl?.text_align ?? 'center',
        color_hex: headlineEl?.color_hex ?? '#FFFFFF', line_height: 1.3,
    });
    console.log(`[Pipeline] Auto-created subheadline: "${content.subheadline.slice(0, 40)}" at y=${subY}, h=${subH}`);
}
