// ─────────────────────────────────────────────────
// templateScaling — Pure functions for template → canvas coordinate mapping
// ─────────────────────────────────────────────────
// Extracted from SidebarTemplateTab.tsx for testability.
// ─────────────────────────────────────────────────

export interface ScaledRect { x: number; y: number; w: number; h: number; }

export interface TemplateScaleParams {
    /** Template original width */  tW: number;
    /** Template original height */ tH: number;
    /** Canvas width */             cW: number;
    /** Canvas height */            cH: number;
}

/**
 * Compute uniform scale factor and centering offsets.
 * Uniform scale preserves all proportions (gaps, font ratios, aspect ratios).
 */
export function computeUniformScale(p: TemplateScaleParams) {
    const uniformScale = Math.min(p.cW / p.tW, p.cH / p.tH);
    const offsetX = Math.round((p.cW - p.tW * uniformScale) / 2);
    const offsetY = Math.round((p.cH - p.tH * uniformScale) / 2);
    return { uniformScale, offsetX, offsetY };
}

/**
 * Map an element from template space → canvas space.
 *
 * 4 categories:
 * 1. Full background (covers both axes) → fill entire canvas
 * 2. Full-height element (accent bars) → stretch height, scale x proportionally
 * 3. Full-width element (top bars) → stretch width, scale y proportionally
 * 4. Content element → uniform scale + center offset
 */
export function scaleElementRect(
    abs: ScaledRect, p: TemplateScaleParams,
    uniformScale: number, offsetX: number, offsetY: number,
): ScaledRect {
    const coversW = abs.w >= p.tW * 0.98;
    const coversH = abs.h >= p.tH * 0.98;

    if (coversW && coversH) {
        return { x: 0, y: 0, w: p.cW, h: p.cH };
    }
    if (coversH) {
        return {
            x: Math.round(abs.x * (p.cW / p.tW)), y: 0,
            w: Math.max(1, Math.round(abs.w * (p.cW / p.tW))), h: p.cH,
        };
    }
    if (coversW) {
        return {
            x: 0, y: Math.round(abs.y * (p.cH / p.tH)),
            w: p.cW, h: Math.max(1, Math.round(abs.h * (p.cH / p.tH))),
        };
    }
    return {
        x: Math.round(abs.x * uniformScale) + offsetX,
        y: Math.round(abs.y * uniformScale) + offsetY,
        w: Math.round(abs.w * uniformScale),
        h: Math.round(abs.h * uniformScale),
    };
}

/**
 * Compute font size after scaling, with minimum of 6px.
 */
export function scaleFontSize(fontSize: number, uniformScale: number): number {
    return Math.max(Math.round(fontSize * uniformScale), 6);
}
