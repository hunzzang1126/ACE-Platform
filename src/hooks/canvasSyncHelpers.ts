// ─────────────────────────────────────────────────
// canvasSyncHelpers.ts — Pure logic extracted from useCanvasSync
// ─────────────────────────────────────────────────
// These functions are extracted for testability. They contain
// the exact logic that has caused recurring bugs:
//   1. Shadow color parsing
//   2. Text position clamping
//   3. Image out-of-bounds detection
//   4. Video overlay normalization
// ─────────────────────────────────────────────────

/** Parse CSS shadow color string → [r, g, b, a] floats (0-1) */
export function parseShadowColor(color: string): [number, number, number, number] {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) return [parseInt(m[1]!) / 255, parseInt(m[2]!) / 255, parseInt(m[3]!) / 255, m[4] !== undefined ? parseFloat(m[4]!) : 1.0];
    const hex = color.replace('#', '');
    if (hex.length >= 6) return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255, 1.0];
    return [0, 0, 0, 0.5];
}

/** Clamp text position so it's never fully offscreen. */
export function clampTextPosition(
    x: number, y: number, w: number, h: number,
    canvasW: number, canvasH: number, fontSize: number,
): { x: number; y: number; w: number; h: number } {
    const textH = h > 0 ? h : (fontSize || 16) * 2;
    let cx = x, cy = y, cw = w, ch = h;
    if (cx < -cw) cx = 0;
    if (cy < -textH) cy = 0;
    if (cx > canvasW) cx = Math.max(0, canvasW - cw);
    if (cy > canvasH) cy = Math.max(0, canvasH - textH);
    if (cw <= 0) cw = canvasW * 0.85;
    return { x: cx, y: cy, w: cw, h: ch };
}

/** Check if an image is out-of-bounds and needs repositioning. */
export function isImageOutOfBounds(
    x: number, y: number, w: number, h: number,
    canvasW: number, canvasH: number,
): boolean {
    return w <= 0 || h <= 0 || x >= canvasW || y >= canvasH || x + w <= 0 || y + h <= 0;
}

/** Reposition an out-of-bounds image to center. */
export function centerImage(
    canvasW: number, canvasH: number,
    naturalW?: number, naturalH?: number,
): { x: number; y: number; w: number; h: number } {
    const w = Math.min(canvasW * 0.5, naturalW ?? canvasW * 0.5);
    const h = Math.min(canvasH * 0.5, naturalH ?? canvasH * 0.5);
    return { x: Math.round((canvasW - w) / 2), y: Math.round((canvasH - h) / 2), w, h };
}

/** Clamp video overlay dimensions within canvas. */
export function clampVideoPosition(
    x: number, y: number, w: number, h: number,
    canvasW: number, canvasH: number,
): { x: number; y: number; w: number; h: number } {
    const isOut = w <= 0 || h <= 0 || x >= canvasW || y >= canvasH || x + w <= 0 || y + h <= 0;
    if (isOut) return { x: 0, y: 0, w: canvasW, h: canvasH };
    return {
        x: Math.max(0, Math.min(x, canvasW - 10)),
        y: Math.max(0, Math.min(y, canvasH - 10)),
        w: Math.min(w, canvasW - Math.max(0, Math.min(x, canvasW - 10))),
        h: Math.min(h, canvasH - Math.max(0, Math.min(y, canvasH - 10))),
    };
}
