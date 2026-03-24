// ─────────────────────────────────────────────────
// elementConverters — Regression Tests
// ─────────────────────────────────────────────────
// ★ Color conversion bugs were the #1 recurring regression.
import { describe, it, expect } from 'vitest';
import {
    absoluteToConstraints,
    constraintsToAbsolute,
    rgbFloatToHex,
    hexToRgbFloat,
} from './elementConverters';

// ── Color Converters ──────────────────────────────

describe('rgbFloatToHex — Float to Hex Color', () => {
    it('(1, 0, 0) → #ff0000 (red)', () => {
        expect(rgbFloatToHex(1, 0, 0)).toBe('#ff0000');
    });

    it('(0, 1, 0) → #00ff00 (green)', () => {
        expect(rgbFloatToHex(0, 1, 0)).toBe('#00ff00');
    });

    it('(0, 0, 1) → #0000ff (blue)', () => {
        expect(rgbFloatToHex(0, 0, 1)).toBe('#0000ff');
    });

    it('(0, 0, 0) → #000000 (black)', () => {
        expect(rgbFloatToHex(0, 0, 0)).toBe('#000000');
    });

    it('(1, 1, 1) → #ffffff (white)', () => {
        expect(rgbFloatToHex(1, 1, 1)).toBe('#ffffff');
    });
});

describe('hexToRgbFloat — Hex to Float Color', () => {
    it('#ff0000 → [1, 0, 0, 1]', () => {
        const [r, g, b, a] = hexToRgbFloat('#ff0000');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0, 2);
        expect(a).toBe(1);
    });

    it('#ffffff → [1, 1, 1, 1]', () => {
        const [r, g, b, a] = hexToRgbFloat('#ffffff');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(1, 2);
        expect(b).toBeCloseTo(1, 2);
    });

    it('#000000 → [0, 0, 0, 1]', () => {
        const [r, g, b] = hexToRgbFloat('#000000');
        expect(r).toBeCloseTo(0, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    // ★ REGRESSION: rgba(255,255,255,0.85) was parsed as hex → NaN → black
    // This exact bug caused white template subtext to turn black on save/reload.
    it('rgba(255,255,255,0.85) → [1, 1, 1, 0.85]', () => {
        const [r, g, b, a] = hexToRgbFloat('rgba(255,255,255,0.85)');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(1, 2);
        expect(b).toBeCloseTo(1, 2);
        expect(a).toBeCloseTo(0.85, 2);
    });

    it('rgb(128, 128, 128) → ~[0.5, 0.5, 0.5, 1]', () => {
        const [r, g, b, a] = hexToRgbFloat('rgb(128, 128, 128)');
        expect(r).toBeCloseTo(0.502, 2);
        expect(g).toBeCloseTo(0.502, 2);
        expect(b).toBeCloseTo(0.502, 2);
        expect(a).toBe(1.0);
    });

    it('rgba(0,0,0,0.5) → [0, 0, 0, 0.5]', () => {
        const [r, g, b, a] = hexToRgbFloat('rgba(0,0,0,0.5)');
        expect(r).toBeCloseTo(0, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0, 2);
        expect(a).toBeCloseTo(0.5, 2);
    });

    it('malformed input returns safe [0,0,0,1]', () => {
        const [r, g, b, a] = hexToRgbFloat('not-a-color');
        expect(r).toBe(0);
        expect(g).toBe(0);
        expect(b).toBe(0);
        expect(a).toBe(1.0);
    });
});

// ★ REGRESSION GUARD: Round-trip fidelity
describe('Color Round-Trip — hex → float → hex', () => {
    it('#ff5733 survives round-trip', () => {
        const [r, g, b] = hexToRgbFloat('#ff5733');
        const hex = rgbFloatToHex(r, g, b);
        expect(hex).toBe('#ff5733');
    });

    it('#3b82f6 survives round-trip', () => {
        const [r, g, b] = hexToRgbFloat('#3b82f6');
        const hex = rgbFloatToHex(r, g, b);
        expect(hex).toBe('#3b82f6');
    });

    it('#0f172a survives round-trip', () => {
        const [r, g, b] = hexToRgbFloat('#0f172a');
        const hex = rgbFloatToHex(r, g, b);
        expect(hex).toBe('#0f172a');
    });
});

// ── Constraint Converters ─────────────────────────

describe('absoluteToConstraints + constraintsToAbsolute — Round-Trip', () => {
    it('top-left element round-trips correctly', () => {
        const constraints = absoluteToConstraints(10, 20, 100, 50, 300, 250);
        const abs = constraintsToAbsolute(constraints, 300, 250);
        expect(abs.x).toBeCloseTo(10, 0);
        expect(abs.y).toBeCloseTo(20, 0);
        expect(abs.w).toBeCloseTo(100, 0);
        expect(abs.h).toBeCloseTo(50, 0);
    });

    it('centered element round-trips correctly', () => {
        const constraints = absoluteToConstraints(100, 100, 100, 50, 300, 250);
        const abs = constraintsToAbsolute(constraints, 300, 250);
        expect(abs.x).toBeCloseTo(100, 0);
        expect(abs.y).toBeCloseTo(100, 0);
    });

    it('full-size background round-trips correctly', () => {
        const constraints = absoluteToConstraints(0, 0, 300, 250, 300, 250);
        const abs = constraintsToAbsolute(constraints, 300, 250);
        expect(abs.x).toBeCloseTo(0, 0);
        expect(abs.y).toBeCloseTo(0, 0);
        expect(abs.w).toBeCloseTo(300, 0);
        expect(abs.h).toBeCloseTo(250, 0);
    });
});

// ── resolveFontWeight — Regression Tests ──────────
// ★ REGRESSION GUARD: parseInt('bold', 10) = NaN → NaN || 400 = 400.
// AI-generated text with fontWeight:'bold' was silently downgraded to
// normal weight (400) in the preview. resolveFontWeight() must handle
// both numeric strings and CSS keyword values.

import { resolveFontWeight } from './elementConverters';

describe('resolveFontWeight — keyword and numeric conversion', () => {
    // Numeric passthrough
    it('number 700 → 700', () => expect(resolveFontWeight(700)).toBe(700));
    it('number 400 → 400', () => expect(resolveFontWeight(400)).toBe(400));

    // Numeric strings
    it('"700" → 700', () => expect(resolveFontWeight('700')).toBe(700));
    it('"400" → 400', () => expect(resolveFontWeight('400')).toBe(400));
    it('"900" → 900', () => expect(resolveFontWeight('900')).toBe(900));

    // ★ KEY REGRESSION: These previously returned 400 due to parseInt('bold') = NaN
    it('"bold" → 700 (was broken: returned 400)', () => expect(resolveFontWeight('bold')).toBe(700));
    it('"BOLD" → 700 (case insensitive)', () => expect(resolveFontWeight('BOLD')).toBe(700));
    it('"normal" → 400', () => expect(resolveFontWeight('normal')).toBe(400));
    it('"semibold" → 600', () => expect(resolveFontWeight('semibold')).toBe(600));
    it('"semi-bold" → 600', () => expect(resolveFontWeight('semi-bold')).toBe(600));
    it('"medium" → 600', () => expect(resolveFontWeight('medium')).toBe(600));
    it('"light" → 300', () => expect(resolveFontWeight('light')).toBe(300));
    it('"lighter" → 300', () => expect(resolveFontWeight('lighter')).toBe(300));
    it('"thin" → 100', () => expect(resolveFontWeight('thin')).toBe(100));
    it('"bolder" → 800', () => expect(resolveFontWeight('bolder')).toBe(800));
    it('"extrabold" → 800', () => expect(resolveFontWeight('extrabold')).toBe(800));
    it('"black" → 900', () => expect(resolveFontWeight('black')).toBe(900));

    // Null/undefined fallback
    it('undefined → 400', () => expect(resolveFontWeight(undefined)).toBe(400));
    it('null → 400', () => expect(resolveFontWeight(null)).toBe(400));
    it('empty string → 400', () => expect(resolveFontWeight('')).toBe(400));
});

// ── Save-Cycle Fidelity Tests ─────────────────────
// ★ REGRESSION GUARD: Tests matching quality-standards.md rule G:
// absoluteToConstraints → constraintsToAbsolute must produce the same visual position.
// This is the SINGLE SOURCE OF TRUTH constraint — any drift here = rendering desync.

describe('Save-Cycle Fidelity — constraintsToAbsolute(absoluteToConstraints())', () => {
    // Helper: verify x,y,w,h survive a round-trip through constraints
    function roundTrip(x: number, y: number, w: number, h: number, cw: number, ch: number) {
        const constraints = absoluteToConstraints(x, y, w, h, cw, ch);
        return constraintsToAbsolute(constraints, cw, ch);
    }

    it('1080x1080: small element at top-left', () => {
        const r = roundTrip(20, 30, 200, 100, 1080, 1080);
        expect(r.x).toBeCloseTo(20, 0);
        expect(r.y).toBeCloseTo(30, 0);
        expect(r.w).toBeCloseTo(200, 0);
        expect(r.h).toBeCloseTo(100, 0);
    });

    it('1080x1080: element at center', () => {
        const r = roundTrip(440, 440, 200, 200, 1080, 1080);
        expect(r.x).toBeCloseTo(440, 0);
        expect(r.y).toBeCloseTo(440, 0);
    });

    it('1080x1080: narrow accent bar at left edge', () => {
        const r = roundTrip(0, 0, 8, 1080, 1080, 1080);
        expect(r.x).toBeCloseTo(0, 0);
        expect(r.y).toBeCloseTo(0, 0);
        expect(r.w).toBeCloseTo(8, 0);
        expect(r.h).toBeCloseTo(1080, 0);
    });

    it('300x250: headline at typical position', () => {
        const r = roundTrip(16, 24, 268, 60, 300, 250);
        expect(r.x).toBeCloseTo(16, 0);
        expect(r.y).toBeCloseTo(24, 0);
        expect(r.w).toBeCloseTo(268, 0);
        expect(r.h).toBeCloseTo(60, 0);
    });

    it('970x250: wide banner element', () => {
        const r = roundTrip(50, 50, 870, 150, 970, 250);
        expect(r.x).toBeCloseTo(50, 0);
        expect(r.y).toBeCloseTo(50, 0);
        expect(r.w).toBeCloseTo(870, 0);
        expect(r.h).toBeCloseTo(150, 0);
    });

    it('160x600: skyscraper element', () => {
        const r = roundTrip(10, 20, 140, 40, 160, 600);
        expect(r.x).toBeCloseTo(10, 0);
        expect(r.y).toBeCloseTo(20, 0);
        expect(r.w).toBeCloseTo(140, 0);
        expect(r.h).toBeCloseTo(40, 0);
    });

    it('zero position (origin) element', () => {
        const r = roundTrip(0, 0, 100, 50, 300, 250);
        expect(r.x).toBeCloseTo(0, 0);
        expect(r.y).toBeCloseTo(0, 0);
    });

    it('element touching right/bottom edge', () => {
        const r = roundTrip(200, 200, 100, 50, 300, 250);
        expect(r.x).toBeCloseTo(200, 0);
        expect(r.y).toBeCloseTo(200, 0);
        expect(r.w).toBeCloseTo(100, 0);
        expect(r.h).toBeCloseTo(50, 0);
    });

    it('1px element survives round-trip', () => {
        const r = roundTrip(540, 540, 1, 1, 1080, 1080);
        expect(r.w).toBeCloseTo(1, 0);
        expect(r.h).toBeCloseTo(1, 0);
    });

    it('★ REGRESSION: Bold Dark template positions survive save-cycle', () => {
        // Simulates the exact Bold Dark template element positions
        const bg = roundTrip(0, 0, 1080, 1080, 1080, 1080); // Background
        expect(bg.x).toBeCloseTo(0, 0);
        expect(bg.w).toBeCloseTo(1080, 0);

        const bar = roundTrip(0, 0, 8, 1080, 1080, 1080); // Accent bar
        expect(bar.w).toBeCloseTo(8, 0);

        const hl = roundTrip(80, 176, 920, 273, 1080, 1080); // Headline
        expect(hl.x).toBeCloseTo(80, 0);
        expect(hl.y).toBeCloseTo(176, 0);

        const body = roundTrip(80, 497, 700, 89, 1080, 1080); // Body
        expect(Math.abs(body.x - 80)).toBeLessThanOrEqual(2); // ±2px acceptable
        expect(Math.abs(body.y - 497)).toBeLessThanOrEqual(2); // ±2px acceptable
    });
});
