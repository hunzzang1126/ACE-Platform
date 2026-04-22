// ─────────────────────────────────────────────────
// Carbon Grid System — 16-column grid for canvas rendering
// ─────────────────────────────────────────────────
// Carbon uses a 16-column responsive grid with 3 gutter modes:
//   wide (32px), narrow (16px), condensed (1px)
// Since @carbon/grid is CSS-only, we implement the MATH here.
// ─────────────────────────────────────────────────

import { spacing, miniUnit } from './adapter';

/** Gutter mode matching Carbon's grid system */
export type GutterMode = 'wide' | 'narrow' | 'condensed';

const GUTTER_FACTOR: Record<GutterMode, number> = {
    wide: 4,       // 32px at 1056px → 4 miniUnits
    narrow: 2,     // 16px at 1056px → 2 miniUnits
    condensed: 0,  // 1px (effectively 0 for canvas)
};

/**
 * Calculate the gutter width for a canvas size.
 * Scales proportionally with the canvas.
 */
export function getGutter(canvasW: number, mode: GutterMode = 'wide'): number {
    const canvasMin = canvasW; // gutter scales with width
    const factor = GUTTER_FACTOR[mode];
    return Math.max(factor > 0 ? 2 : 0, Math.round(miniUnit * factor * (canvasW / 1056)));
}

/**
 * Calculate the width of N columns out of 16 total.
 * Includes internal gutters between columns.
 *
 * @param n - number of columns (1-16)
 * @param canvasW - canvas width in px
 * @param mode - gutter mode
 * @returns width in px
 */
export function columns(n: number, canvasW: number, mode: GutterMode = 'wide'): number {
    const cols = Math.max(1, Math.min(n, 16));
    const gutter = getGutter(canvasW, mode);
    const totalGutters = 17; // 16 columns = 17 gutters (including margins)
    const colWidth = (canvasW - gutter * totalGutters) / 16;
    return Math.round(cols * colWidth + (cols - 1) * gutter);
}

/**
 * Get the left margin (canvas edge to first column).
 */
export function getMargin(canvasW: number, mode: GutterMode = 'wide'): number {
    return getGutter(canvasW, mode);
}

/**
 * Calculate the X position for an element spanning N columns, centered.
 */
export function centeredX(n: number, canvasW: number, mode: GutterMode = 'wide'): number {
    const w = columns(n, canvasW, mode);
    return Math.round((canvasW - w) / 2);
}

/**
 * Calculate the X position for a left-aligned element spanning N columns.
 */
export function leftAlignedX(n: number, canvasW: number, mode: GutterMode = 'wide'): number {
    return getMargin(canvasW, mode);
}

/**
 * Calculate the X position for a right-aligned element spanning N columns.
 */
export function rightAlignedX(n: number, canvasW: number, mode: GutterMode = 'wide'): number {
    const w = columns(n, canvasW, mode);
    return canvasW - w - getMargin(canvasW, mode);
}
