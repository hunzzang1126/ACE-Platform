// ─────────────────────────────────────────────────
// templateScaling.test — Tests for template → canvas scaling logic
// ─────────────────────────────────────────────────
// Covers: uniform scale, background fill, edge elements, text buffer, opacity
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    computeUniformScale,
    scaleElementRect,
    scaleFontSize,
    textWidthBuffer,
    type TemplateScaleParams,
} from './templateScaling';

// ═══════════════════════════════════════════════════
// computeUniformScale
// ═══════════════════════════════════════════════════

describe('computeUniformScale', () => {
    it('uses height-based scale when canvas is wider than template aspect', () => {
        // 1080x1080 → 300x250: height is limiting
        const { uniformScale, offsetX, offsetY } = computeUniformScale({ tW: 1080, tH: 1080, cW: 300, cH: 250 });
        expect(uniformScale).toBeCloseTo(250 / 1080, 4);
        expect(offsetX).toBeGreaterThan(0); // centered horizontally
        expect(offsetY).toBe(0); // no vertical offset
    });

    it('uses width-based scale when canvas is taller than template aspect', () => {
        // 1080x1080 → 250x400: width is limiting
        const { uniformScale, offsetX, offsetY } = computeUniformScale({ tW: 1080, tH: 1080, cW: 250, cH: 400 });
        expect(uniformScale).toBeCloseTo(250 / 1080, 4);
        expect(offsetX).toBe(0);
        expect(offsetY).toBeGreaterThan(0); // centered vertically
    });

    it('returns scale=1 and zero offsets for same-size canvas', () => {
        const { uniformScale, offsetX, offsetY } = computeUniformScale({ tW: 1080, tH: 1080, cW: 1080, cH: 1080 });
        expect(uniformScale).toBe(1);
        expect(offsetX).toBe(0);
        expect(offsetY).toBe(0);
    });

    it('handles landscape template → portrait canvas', () => {
        // 1920x1080 → 400x600
        const { uniformScale } = computeUniformScale({ tW: 1920, tH: 1080, cW: 400, cH: 600 });
        expect(uniformScale).toBeCloseTo(400 / 1920, 4); // width is limiting
    });
});

// ═══════════════════════════════════════════════════
// scaleElementRect
// ═══════════════════════════════════════════════════

describe('scaleElementRect', () => {
    const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
    const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);

    // ── Category 1: Full background → fills canvas ──

    it('fills canvas for full-background elements', () => {
        const bg = { x: 0, y: 0, w: 1080, h: 1080 };
        const result = scaleElementRect(bg, sp, uniformScale, offsetX, offsetY);
        expect(result).toEqual({ x: 0, y: 0, w: 300, h: 250 });
    });

    it('fills canvas for near-full elements (98% threshold)', () => {
        const bg = { x: 0, y: 0, w: 1060, h: 1060 }; // ~98.1% of 1080
        const result = scaleElementRect(bg, sp, uniformScale, offsetX, offsetY);
        expect(result).toEqual({ x: 0, y: 0, w: 300, h: 250 });
    });

    it('does NOT fill canvas for slightly-under-threshold elements', () => {
        const bg = { x: 10, y: 10, w: 1050, h: 1050 }; // ~97.2% — under threshold
        const result = scaleElementRect(bg, sp, uniformScale, offsetX, offsetY);
        expect(result.w).not.toBe(300); // should NOT fill
    });

    // ── Category 2: Full-height element (accent bar) → pins to edge ──

    it('stretches full-height element to canvas height and pins x', () => {
        // Accent bar: x=0, w=8, h=1080 (full height)
        const accentBar = { x: 0, y: 0, w: 8, h: 1080 };
        const result = scaleElementRect(accentBar, sp, uniformScale, offsetX, offsetY);
        expect(result.x).toBe(0); // pinned to left edge
        expect(result.y).toBe(0);
        expect(result.h).toBe(250); // fills canvas height
        expect(result.w).toBeGreaterThanOrEqual(1); // at least 1px
    });

    it('scales x proportionally for full-height element at non-zero x', () => {
        // Vertical line at x=540 (center of 1080 template)
        const line = { x: 540, y: 0, w: 2, h: 1080 };
        const result = scaleElementRect(line, sp, uniformScale, offsetX, offsetY);
        expect(result.x).toBe(150); // 540 * (300/1080) = 150
        expect(result.h).toBe(250);
    });

    // ── Category 3: Full-width element (top bar) → pins to top ──

    it('stretches full-width element to canvas width and pins y', () => {
        const topBar = { x: 0, y: 0, w: 1080, h: 8 };
        const result = scaleElementRect(topBar, sp, uniformScale, offsetX, offsetY);
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
        expect(result.w).toBe(300);
        expect(result.h).toBeGreaterThanOrEqual(1);
    });

    it('scales y proportionally for full-width element at non-zero y', () => {
        const bottomBar = { x: 0, y: 1077, w: 1080, h: 3 };
        const result = scaleElementRect(bottomBar, sp, uniformScale, offsetX, offsetY);
        expect(result.w).toBe(300);
        expect(result.y).toBe(Math.round(1077 * (250 / 1080)));
    });

    // ── Category 4: Content elements → uniform scale + center ──

    it('uniformly scales content elements', () => {
        // Headline: x=80, y=280, w=920, h=300
        const headline = { x: 80, y: 280, w: 920, h: 300 };
        const result = scaleElementRect(headline, sp, uniformScale, offsetX, offsetY);
        expect(result.w).toBe(Math.round(920 * uniformScale));
        expect(result.h).toBe(Math.round(300 * uniformScale));
    });

    it('centers content with horizontal offset when height-limited', () => {
        const content = { x: 80, y: 280, w: 920, h: 300 };
        const result = scaleElementRect(content, sp, uniformScale, offsetX, offsetY);
        expect(result.x).toBe(Math.round(80 * uniformScale) + offsetX);
        expect(offsetX).toBeGreaterThan(0); // should have offset for centering
    });

    it('preserves proportional gaps between content elements', () => {
        // Headline y=280 h=300, Body y=620 h=80  (gap = 40px in template)
        const headline = { x: 80, y: 280, w: 920, h: 300 };
        const body = { x: 80, y: 620, w: 700, h: 80 };
        const rHeadline = scaleElementRect(headline, sp, uniformScale, offsetX, offsetY);
        const rBody = scaleElementRect(body, sp, uniformScale, offsetX, offsetY);
        const headlineBottom = rHeadline.y + rHeadline.h;
        const gapPx = rBody.y - headlineBottom;
        // Original gap = 40px, scaled gap = 40 * uniformScale ≈ 9px (±1 rounding)
        expect(gapPx).toBeGreaterThanOrEqual(Math.round(40 * uniformScale) - 1);
        expect(gapPx).toBeLessThanOrEqual(Math.round(40 * uniformScale) + 1);
    });
});

// ═══════════════════════════════════════════════════
// scaleFontSize
// ═══════════════════════════════════════════════════

describe('scaleFontSize', () => {
    it('scales font proportionally', () => {
        expect(scaleFontSize(110, 0.2315)).toBe(25);
    });

    it('enforces minimum 6px', () => {
        expect(scaleFontSize(10, 0.1)).toBe(6);
        expect(scaleFontSize(1, 0.01)).toBe(6);
    });

    it('rounds to nearest integer', () => {
        expect(scaleFontSize(36, 0.2315)).toBe(Math.round(36 * 0.2315));
    });
});

// ═══════════════════════════════════════════════════
// textWidthBuffer
// ═══════════════════════════════════════════════════

describe('textWidthBuffer', () => {
    it('returns ~0.7em buffer', () => {
        expect(textWidthBuffer(20)).toBe(14); // round(20 * 0.7)
        expect(textWidthBuffer(25)).toBe(18); // round(25 * 0.7)
    });

    it('returns small buffer for small fonts', () => {
        expect(textWidthBuffer(6)).toBe(4); // round(6 * 0.7)
    });

    it('scales linearly with font size', () => {
        const buf10 = textWidthBuffer(10);
        const buf20 = textWidthBuffer(20);
        expect(buf20).toBe(buf10 * 2); // linear: 10 * 2 = 20
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARDS
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: template drop bugs', () => {
    it('★ REGRESSION: background must fill canvas even with different aspect ratio', () => {
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);
        const bg = { x: 0, y: 0, w: 1080, h: 1080 };
        const result = scaleElementRect(bg, sp, uniformScale, offsetX, offsetY);
        // BG must ALWAYS fill entire canvas, never leave gaps
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
        expect(result.w).toBe(300);
        expect(result.h).toBe(250);
    });

    it('★ REGRESSION: accent bar must pin to left edge (x=0)', () => {
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);
        const accent = { x: 0, y: 0, w: 8, h: 1080 };
        const result = scaleElementRect(accent, sp, uniformScale, offsetX, offsetY);
        // Must be at x=0, not pushed by offsetX
        expect(result.x).toBe(0);
        expect(result.h).toBe(250);
    });

    it('★ REGRESSION: text font size ratio must equal position ratio (uniform)', () => {
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale } = computeUniformScale(sp);
        const fontSize = 110;
        const w = 920;
        const scaledFont = scaleFontSize(fontSize, uniformScale);
        const scaledW = Math.round(w * uniformScale);
        // Ratio of width-to-font must be nearly preserved
        const originalRatio = w / fontSize;
        const scaledRatio = scaledW / scaledFont;
        expect(Math.abs(originalRatio - scaledRatio)).toBeLessThan(0.5);
    });

    it('★ REGRESSION: text width includes buffer to prevent premature wrapping', () => {
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale } = computeUniformScale(sp);
        const scaledFont = scaleFontSize(110, uniformScale);
        const buf = textWidthBuffer(scaledFont);
        // Buffer must be positive
        expect(buf).toBeGreaterThan(0);
        // Buffer should be reasonable (not larger than the font itself)
        expect(buf).toBeLessThanOrEqual(scaledFont);
    });

    it('★ REGRESSION: spacing between elements must not collapse with uniform scale', () => {
        // Before fix: scaleX=0.278, scaleY=0.231 — gap collapsed disproportionately
        // After fix: uniform scale preserves gap ratio
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);
        const headline = { x: 80, y: 280, w: 920, h: 300 };
        const body = { x: 80, y: 620, w: 700, h: 80 };
        const h = scaleElementRect(headline, sp, uniformScale, offsetX, offsetY);
        const b = scaleElementRect(body, sp, uniformScale, offsetX, offsetY);
        const originalGap = 620 - (280 + 300); // 40px
        const scaledGap = b.y - (h.y + h.h);
        const expectedGap = Math.round(originalGap * uniformScale);
        // Gap should be uniformly scaled (±1px rounding)
        expect(Math.abs(scaledGap - expectedGap)).toBeLessThanOrEqual(1);
    });
});
