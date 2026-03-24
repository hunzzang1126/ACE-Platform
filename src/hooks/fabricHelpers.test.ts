// ─────────────────────────────────────────────────
// fabricHelpers — Pure function tests
// ─────────────────────────────────────────────────
// Tests for color conversion and utility functions that don't need Fabric.js.
// fabricToEngineNode is tested indirectly via engine integration tests
// since it requires Fabric.js objects.

import { describe, it, expect } from 'vitest';
import { hexToRgb01, rgbToHex, nextColor } from './fabricHelpers';

// ── hexToRgb01 ────────────────────────────────────

describe('hexToRgb01 — hex string to 0-1 float RGB', () => {
    it('#ff0000 → [1, 0, 0]', () => {
        const [r, g, b] = hexToRgb01('#ff0000');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('#00ff00 → [0, 1, 0]', () => {
        const [r, g, b] = hexToRgb01('#00ff00');
        expect(r).toBeCloseTo(0, 2);
        expect(g).toBeCloseTo(1, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('#000000 → [0, 0, 0]', () => {
        const [r, g, b] = hexToRgb01('#000000');
        expect(r).toBeCloseTo(0, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('#ffffff → [1, 1, 1]', () => {
        const [r, g, b] = hexToRgb01('#ffffff');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(1, 2);
        expect(b).toBeCloseTo(1, 2);
    });

    it('shorthand #f00 → [1, 0, 0]', () => {
        const [r, g, b] = hexToRgb01('#f00');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('rgba(128, 64, 32) → ~[0.502, 0.251, 0.125]', () => {
        const [r, g, b] = hexToRgb01('rgba(128, 64, 32, 0.5)');
        expect(r).toBeCloseTo(0.502, 2);
        expect(g).toBeCloseTo(0.251, 2);
        expect(b).toBeCloseTo(0.125, 2);
    });

    it('rgb(255, 128, 0) → ~[1, 0.502, 0]', () => {
        const [r, g, b] = hexToRgb01('rgb(255, 128, 0)');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(0.502, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('malformed input → [0.5, 0.5, 0.5] fallback', () => {
        const [r, g, b] = hexToRgb01('not-a-color');
        expect(r).toBe(0.5);
        expect(g).toBe(0.5);
        expect(b).toBe(0.5);
    });
});

// ── rgbToHex ──────────────────────────────────────

describe('rgbToHex — 0-1 float RGB to hex string', () => {
    it('[1, 0, 0] → #ff0000', () => {
        expect(rgbToHex(1, 0, 0)).toBe('#ff0000');
    });

    it('[0, 1, 0] → #00ff00', () => {
        expect(rgbToHex(0, 1, 0)).toBe('#00ff00');
    });

    it('[0, 0, 0] → #000000', () => {
        expect(rgbToHex(0, 0, 0)).toBe('#000000');
    });

    it('[1, 1, 1] → #ffffff', () => {
        expect(rgbToHex(1, 1, 1)).toBe('#ffffff');
    });

    it('[0.5, 0.5, 0.5] → #808080', () => {
        expect(rgbToHex(0.5, 0.5, 0.5)).toBe('#808080');
    });
});

// ── Round-trip: hexToRgb01 → rgbToHex ─────────────

describe('Color Round-Trip — hexToRgb01 → rgbToHex', () => {
    it('#3b82f6 survives round-trip', () => {
        const [r, g, b] = hexToRgb01('#3b82f6');
        expect(rgbToHex(r, g, b)).toBe('#3b82f6');
    });

    it('#ff5733 survives round-trip', () => {
        const [r, g, b] = hexToRgb01('#ff5733');
        expect(rgbToHex(r, g, b)).toBe('#ff5733');
    });

    it('#0f172a survives round-trip', () => {
        const [r, g, b] = hexToRgb01('#0f172a');
        expect(rgbToHex(r, g, b)).toBe('#0f172a');
    });
});

// ── nextColor ─────────────────────────────────────

describe('nextColor — pastel color cycle', () => {
    it('returns a valid hex color', () => {
        const c = nextColor();
        expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('returns different colors on successive calls', () => {
        const c1 = nextColor();
        const c2 = nextColor();
        expect(c1).not.toBe(c2);
    });
});
