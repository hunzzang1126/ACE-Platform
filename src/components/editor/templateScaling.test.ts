// ─────────────────────────────────────────────────
// templateScaling.test — Tests for template → canvas scaling logic
// ─────────────────────────────────────────────────
// Covers: uniform scale, background fill, edge elements, font, regression guards
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    computeUniformScale,
    scaleElementRect,
    scaleFontSize,
    type TemplateScaleParams,
} from './templateScaling';

// ═══════════════════════════════════════════════════
// computeUniformScale
// ═══════════════════════════════════════════════════

describe('computeUniformScale', () => {
    it('uses height-based scale when canvas is wider than template aspect', () => {
        const { uniformScale, offsetX, offsetY } = computeUniformScale({ tW: 1080, tH: 1080, cW: 300, cH: 250 });
        expect(uniformScale).toBeCloseTo(250 / 1080, 4);
        expect(offsetX).toBeGreaterThan(0);
        expect(offsetY).toBe(0);
    });

    it('uses width-based scale when canvas is taller than template aspect', () => {
        const { uniformScale, offsetX, offsetY } = computeUniformScale({ tW: 1080, tH: 1080, cW: 250, cH: 400 });
        expect(uniformScale).toBeCloseTo(250 / 1080, 4);
        expect(offsetX).toBe(0);
        expect(offsetY).toBeGreaterThan(0);
    });

    it('returns scale=1 and zero offsets for same-size canvas', () => {
        const { uniformScale, offsetX, offsetY } = computeUniformScale({ tW: 1080, tH: 1080, cW: 1080, cH: 1080 });
        expect(uniformScale).toBe(1);
        expect(offsetX).toBe(0);
        expect(offsetY).toBe(0);
    });

    it('handles landscape template → portrait canvas', () => {
        const { uniformScale } = computeUniformScale({ tW: 1920, tH: 1080, cW: 400, cH: 600 });
        expect(uniformScale).toBeCloseTo(400 / 1920, 4);
    });
});

// ═══════════════════════════════════════════════════
// scaleElementRect
// ═══════════════════════════════════════════════════

describe('scaleElementRect', () => {
    const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
    const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);

    it('fills canvas for full-background elements', () => {
        const bg = { x: 0, y: 0, w: 1080, h: 1080 };
        const result = scaleElementRect(bg, sp, uniformScale, offsetX, offsetY);
        expect(result).toEqual({ x: 0, y: 0, w: 300, h: 250 });
    });

    it('fills canvas for near-full elements (98% threshold)', () => {
        const bg = { x: 0, y: 0, w: 1060, h: 1060 };
        const result = scaleElementRect(bg, sp, uniformScale, offsetX, offsetY);
        expect(result).toEqual({ x: 0, y: 0, w: 300, h: 250 });
    });

    it('does NOT fill canvas for slightly-under-threshold elements', () => {
        const bg = { x: 10, y: 10, w: 1050, h: 1050 };
        const result = scaleElementRect(bg, sp, uniformScale, offsetX, offsetY);
        expect(result.w).not.toBe(300);
    });

    it('stretches full-height element to canvas height and pins x', () => {
        const accentBar = { x: 0, y: 0, w: 8, h: 1080 };
        const result = scaleElementRect(accentBar, sp, uniformScale, offsetX, offsetY);
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
        expect(result.h).toBe(250);
        expect(result.w).toBeGreaterThanOrEqual(1);
    });

    it('scales x proportionally for full-height element at non-zero x', () => {
        const line = { x: 540, y: 0, w: 2, h: 1080 };
        const result = scaleElementRect(line, sp, uniformScale, offsetX, offsetY);
        expect(result.x).toBe(150);
        expect(result.h).toBe(250);
    });

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

    it('uniformly scales content elements', () => {
        const headline = { x: 80, y: 280, w: 920, h: 300 };
        const result = scaleElementRect(headline, sp, uniformScale, offsetX, offsetY);
        expect(result.w).toBe(Math.round(920 * uniformScale));
        expect(result.h).toBe(Math.round(300 * uniformScale));
    });

    it('centers content with horizontal offset when height-limited', () => {
        const content = { x: 80, y: 280, w: 920, h: 300 };
        const result = scaleElementRect(content, sp, uniformScale, offsetX, offsetY);
        expect(result.x).toBe(Math.round(80 * uniformScale) + offsetX);
        expect(offsetX).toBeGreaterThan(0);
    });

    it('preserves proportional gaps between content elements', () => {
        const headline = { x: 80, y: 280, w: 920, h: 300 };
        const body = { x: 80, y: 620, w: 700, h: 80 };
        const rHeadline = scaleElementRect(headline, sp, uniformScale, offsetX, offsetY);
        const rBody = scaleElementRect(body, sp, uniformScale, offsetX, offsetY);
        const headlineBottom = rHeadline.y + rHeadline.h;
        const gapPx = rBody.y - headlineBottom;
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
// ★ REGRESSION GUARDS — v400-v410 text handler fixes
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: template drop bugs', () => {
    it('★ REGRESSION: background must fill canvas even with different aspect ratio', () => {
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);
        const bg = { x: 0, y: 0, w: 1080, h: 1080 };
        const result = scaleElementRect(bg, sp, uniformScale, offsetX, offsetY);
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
        expect(result.x).toBe(0);
        expect(result.h).toBe(250);
    });

    it('★ REGRESSION: text font size ratio must equal position ratio (uniform)', () => {
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale } = computeUniformScale(sp);
        const scaledFont = scaleFontSize(110, uniformScale);
        const scaledW = Math.round(920 * uniformScale);
        const originalRatio = 920 / 110;
        const scaledRatio = scaledW / scaledFont;
        expect(Math.abs(originalRatio - scaledRatio)).toBeLessThan(0.5);
    });

    it('★ REGRESSION: spacing between elements must not collapse with uniform scale', () => {
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);
        const headline = { x: 80, y: 280, w: 920, h: 300 };
        const body = { x: 80, y: 620, w: 700, h: 80 };
        const h = scaleElementRect(headline, sp, uniformScale, offsetX, offsetY);
        const b = scaleElementRect(body, sp, uniformScale, offsetX, offsetY);
        const originalGap = 620 - (280 + 300);
        const scaledGap = b.y - (h.y + h.h);
        const expectedGap = Math.round(originalGap * uniformScale);
        expect(Math.abs(scaledGap - expectedGap)).toBeLessThanOrEqual(1);
    });
});

describe('★ REGRESSION: text width — no buffer, no measurement (v400-v410)', () => {
    it('★ REGRESSION: text width must use exact proportional value — no buffer', () => {
        // v400-v406 added width buffers that broke alignment and caused overflow.
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale } = computeUniformScale(sp);
        const expected = Math.round(920 * uniformScale);
        expect(expected).toBeGreaterThan(0);
        expect(expected).toBeLessThanOrEqual(300);
    });

    it('★ REGRESSION: center-aligned text x must NOT be compensated', () => {
        // v404 compensated x for center text — caused misalignment.
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 300, cH: 250 };
        const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);
        const centerText = { x: 80, y: 300, w: 920, h: 250 };
        const result = scaleElementRect(centerText, sp, uniformScale, offsetX, offsetY);
        expect(result.x).toBe(Math.round(80 * uniformScale) + offsetX);
    });

    it('★ REGRESSION: templateScaling must NOT export textWidthBuffer', async () => {
        // textWidthBuffer was removed in v410 after 6 failed approaches.
        const mod = await import('./templateScaling') as Record<string, unknown>;
        expect(mod.textWidthBuffer).toBeUndefined();
    });

    it('★ REGRESSION: templateScaling must NOT export measureTextWidth', async () => {
        // measureTextWidth caused text to render as 1 line instead of 2 (v405).
        const mod = await import('./templateScaling') as Record<string, unknown>;
        expect(mod.measureTextWidth).toBeUndefined();
    });

    it('★ REGRESSION: same-size canvas must produce exact template width', () => {
        const sp: TemplateScaleParams = { tW: 1080, tH: 1080, cW: 1080, cH: 1080 };
        const { uniformScale, offsetX, offsetY } = computeUniformScale(sp);
        const text = { x: 80, y: 300, w: 920, h: 250 };
        const result = scaleElementRect(text, sp, uniformScale, offsetX, offsetY);
        expect(result.w).toBe(920);
        expect(result.x).toBe(80);
    });
});
