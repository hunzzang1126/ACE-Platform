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
