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

/**
 * Compute text width buffer (0.7em) that prevents premature word-wrap.
 * Heavy/bold fonts (weight 700-900) render wider per character at smaller sizes.
 * Center compensation in SidebarTemplateTab ensures this doesn't break alignment.
 */
export function textWidthBuffer(scaledFontSize: number): number {
    return Math.round(scaledFontSize * 0.7);
}

// Shared offscreen canvas for text measurement
let _measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D | null {
    if (_measureCtx) return _measureCtx;
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    _measureCtx = c.getContext('2d');
    return _measureCtx;
}

/**
 * Measure actual rendered text width using Canvas2D.
 * Returns the larger of the proportional width or the measured content width,
 * ensuring the textbox exactly fits the text — no gap, no premature wrap.
 */
export function measureTextWidth(
    content: string, fontSize: number,
    fontFamily: string, fontWeight: string,
    proportionalWidth: number,
): number {
    const ctx = getMeasureCtx();
    if (!ctx) return proportionalWidth; // SSR fallback

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    // Split by explicit \n and measure the widest line
    const lines = content.split('\n');
    let maxLineWidth = 0;
    for (const line of lines) {
        const m = ctx.measureText(line);
        if (m.width > maxLineWidth) maxLineWidth = m.width;
    }
    // Add 2px for sub-pixel antialiasing safety
    const measured = Math.ceil(maxLineWidth) + 2;
    // Return whichever is larger: measured text width or the proportional scaled width
    return Math.max(proportionalWidth, measured);
}
