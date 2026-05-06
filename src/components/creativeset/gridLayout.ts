// ─────────────────────────────────────────────────
// gridLayout.ts — Size Dashboard card layout helpers
// ─────────────────────────────────────────────────
// ★ v726: Area-proportional sizing + flow layout

const BASE_AREA = 70000; // reference visual area (px²) at zoom=1
const GRID_GAP = 32;
const CARD_CHROME_H = 60; // header (~32) + footer (~28)

export { BASE_AREA, GRID_GAP, CARD_CHROME_H };

export interface CardSize {
    id: string;
    w: number;
    h: number;
}

/**
 * Area-proportional card sizing.
 * All cards get roughly equal visual "weight" (area) but aspect ratios are preserved.
 * A 1920x1080 card appears wider than 1080x1080, and 1080x1350 appears taller.
 */
export function getCardDisplaySize(w: number, h: number, zoom: number): { dw: number; dh: number; scale: number } {
    const refArea = BASE_AREA * zoom * zoom;
    const aspect = w / h;
    const dh = Math.round(Math.sqrt(refArea / aspect));
    const dw = Math.round(dh * aspect);
    return { dw, dh, scale: dw / w };
}

/**
 * Flow layout — positions cards left→right, wrapping to next row.
 * Uses actual card display dimensions, preventing overlap at any zoom.
 */
export function computeAutoPositions(
    cardSizes: CardSize[],
    zoom: number,
    maxRowWidth = 1200,
): Record<string, { x: number; y: number }> {
    const positions: Record<string, { x: number; y: number }> = {};
    let curX = 0;
    let curY = 0;
    let rowMaxH = 0;

    for (const card of cardSizes) {
        if (curX > 0 && curX + card.w > maxRowWidth) {
            curX = 0;
            curY += rowMaxH + GRID_GAP;
            rowMaxH = 0;
        }
        positions[card.id] = { x: curX, y: curY };
        curX += card.w + GRID_GAP;
        rowMaxH = Math.max(rowMaxH, card.h + CARD_CHROME_H);
    }
    return positions;
}
