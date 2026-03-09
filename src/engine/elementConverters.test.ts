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
