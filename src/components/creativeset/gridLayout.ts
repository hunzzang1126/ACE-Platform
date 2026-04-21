// ─────────────────────────────────────────────────
// gridLayout.ts — Size Dashboard card layout helpers
// ─────────────────────────────────────────────────

const BASE_PREVIEW_WIDTH = 280;
const BASE_PREVIEW_HEIGHT = 360;
const GRID_GAP = 32;
const GRID_COLS = 3;

export { BASE_PREVIEW_WIDTH, BASE_PREVIEW_HEIGHT, GRID_GAP, GRID_COLS };

export interface CardSize {
    id: string;
    w: number;
    h: number;
}

/**
 * Scale a variant preview card to fit within the base preview dimensions.
 * Returns a uniform scale factor so all cards scale proportionally with zoom.
 */
export function getPreviewScale(width: number, height: number, zoom: number): number {
    const maxW = BASE_PREVIEW_WIDTH * zoom;
    const maxH = BASE_PREVIEW_HEIGHT * zoom;
    return Math.min(maxW / width, maxH / height, 1 * zoom);
}

/**
 * Row-based packing layout using ACTUAL card widths.
 * Wide cards (1600×900) take more horizontal space;
 * tall cards (1080×1920) take less.
 * Prevents overlap at any zoom level.
 */
export function computeAutoPositions(
    cardSizes: CardSize[],
    zoom: number,
): Record<string, { x: number; y: number }> {
    const positions: Record<string, { x: number; y: number }> = {};
    const maxRowWidth = (BASE_PREVIEW_WIDTH * zoom + GRID_GAP + 40) * GRID_COLS;
    let curX = 0;
    let curY = 0;
    let rowMaxH = 0;

    for (const card of cardSizes) {
        // Wrap to next row if this card would exceed row width
        if (curX > 0 && curX + card.w > maxRowWidth) {
            curX = 0;
            curY += rowMaxH + 100 + GRID_GAP;
            rowMaxH = 0;
        }
        positions[card.id] = { x: curX, y: curY };
        curX += card.w + GRID_GAP;
        rowMaxH = Math.max(rowMaxH, card.h);
    }
    return positions;
}
