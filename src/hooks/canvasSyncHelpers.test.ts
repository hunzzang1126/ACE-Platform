// ─────────────────────────────────────────────────
// canvasSyncHelpers.test.ts — Tests for extracted sync logic
// ─────────────────────────────────────────────────
// ★ REGRESSION GUARD: Every function here has caused bugs before.
// These tests ensure the same bug never comes back.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    parseShadowColor,
    clampTextPosition,
    isImageOutOfBounds,
    centerImage,
    clampVideoPosition,
} from './canvasSyncHelpers';

describe('parseShadowColor', () => {
    it('should parse rgba() format', () => {
        const [r, g, b, a] = parseShadowColor('rgba(255, 128, 0, 0.5)');
        expect(r).toBeCloseTo(1.0);
        expect(g).toBeCloseTo(0.502, 2);
        expect(b).toBeCloseTo(0.0);
        expect(a).toBeCloseTo(0.5);
    });

    it('should parse rgb() format (alpha defaults to 1)', () => {
        const [r, g, b, a] = parseShadowColor('rgb(0, 0, 0)');
        expect(r).toBe(0);
        expect(g).toBe(0);
        expect(b).toBe(0);
        expect(a).toBe(1.0);
    });

    it('should parse hex color', () => {
        const [r, g, b, a] = parseShadowColor('#ff0000');
        expect(r).toBeCloseTo(1.0);
        expect(g).toBe(0);
        expect(b).toBe(0);
        expect(a).toBe(1.0);
    });

    it('should parse hex without # prefix', () => {
        const [r, g, b, a] = parseShadowColor('ffffff');
        expect(r).toBeCloseTo(1.0);
        expect(g).toBeCloseTo(1.0);
        expect(b).toBeCloseTo(1.0);
    });

    it('should fallback to [0,0,0,0.5] for short invalid input', () => {
        const [r, g, b, a] = parseShadowColor('xyz');
        expect(r).toBe(0);
        expect(g).toBe(0);
        expect(b).toBe(0);
        expect(a).toBe(0.5);
    });

    it('should return NaN values for long non-hex strings (hex path)', () => {
        // "invalid" has 7 chars, >= 6, so it tries hex parse → NaN
        const [r] = parseShadowColor('invalid');
        expect(Number.isNaN(r)).toBe(true);
    });

    it('should handle rgba with alpha 0', () => {
        const [, , , a] = parseShadowColor('rgba(0, 0, 0, 0)');
        expect(a).toBe(0);
    });
});

describe('clampTextPosition — ★ REGRESSION: text pushed offscreen', () => {
    const CW = 1080, CH = 1080;

    it('should not change position when within bounds', () => {
        const result = clampTextPosition(100, 200, 400, 50, CW, CH, 32);
        expect(result.x).toBe(100);
        expect(result.y).toBe(200);
    });

    it('★ REGRESSION: should clamp text pushed far left', () => {
        const result = clampTextPosition(-500, 200, 400, 50, CW, CH, 32);
        expect(result.x).toBe(0); // Clamped from -500
    });

    it('★ REGRESSION: should clamp text pushed far up', () => {
        const result = clampTextPosition(100, -200, 400, 50, CW, CH, 32);
        expect(result.y).toBe(0); // Clamped from -200
    });

    it('★ REGRESSION: should clamp text pushed past right edge', () => {
        const result = clampTextPosition(1200, 200, 400, 50, CW, CH, 32);
        expect(result.x).toBeLessThanOrEqual(CW);
    });

    it('★ REGRESSION: should clamp text pushed past bottom edge', () => {
        const result = clampTextPosition(100, 1200, 400, 50, CW, CH, 32);
        expect(result.y).toBeLessThanOrEqual(CH);
    });

    it('★ REGRESSION: zero width text gets default (85% of canvas)', () => {
        const result = clampTextPosition(100, 200, 0, 50, CW, CH, 32);
        expect(result.w).toBeCloseTo(CW * 0.85);
    });

    it('should use fontSize*2 as fallback height when h=0', () => {
        const result = clampTextPosition(100, -200, 400, 0, CW, CH, 32);
        // y < -(fontSize*2=64) → y stays -200 because -200 > -64 is false... wait
        // h=0 so textH = 32*2 = 64; y=-200; -200 < -64 → y=0
        expect(result.y).toBe(0);
    });
});

describe('isImageOutOfBounds', () => {
    const CW = 300, CH = 250;

    it('should return false for image within bounds', () => {
        expect(isImageOutOfBounds(50, 50, 100, 100, CW, CH)).toBe(false);
    });

    it('should return true for zero-width image', () => {
        expect(isImageOutOfBounds(50, 50, 0, 100, CW, CH)).toBe(true);
    });

    it('should return true for zero-height image', () => {
        expect(isImageOutOfBounds(50, 50, 100, 0, CW, CH)).toBe(true);
    });

    it('★ REGRESSION: image pushed past right edge', () => {
        expect(isImageOutOfBounds(300, 50, 100, 100, CW, CH)).toBe(true);
    });

    it('★ REGRESSION: image pushed past bottom edge', () => {
        expect(isImageOutOfBounds(50, 250, 100, 100, CW, CH)).toBe(true);
    });

    it('★ REGRESSION: image entirely left of canvas', () => {
        expect(isImageOutOfBounds(-200, 50, 100, 100, CW, CH)).toBe(true);
    });

    it('★ REGRESSION: image entirely above canvas', () => {
        expect(isImageOutOfBounds(50, -200, 100, 100, CW, CH)).toBe(true);
    });

    it('should return false when partially visible', () => {
        // Image starts at x=-50, has width 100 → right edge at 50 (visible)
        expect(isImageOutOfBounds(-50, 50, 100, 100, CW, CH)).toBe(false);
    });
});

describe('centerImage', () => {
    it('should center image in canvas', () => {
        const result = centerImage(300, 250, 200, 150);
        expect(result.w).toBe(150); // min(300*0.5=150, 200) = 150
        expect(result.h).toBe(125); // min(250*0.5=125, 150) = 125
        expect(result.x).toBe(Math.round((300 - result.w) / 2));
        expect(result.y).toBe(Math.round((250 - result.h) / 2));
    });

    it('should use canvas proportions when no natural dimensions', () => {
        const result = centerImage(1080, 1080);
        expect(result.w).toBe(540); // 1080*0.5
        expect(result.h).toBe(540);
    });
});

describe('clampVideoPosition — ★ REGRESSION: video fills screen on OOB', () => {
    const CW = 1080, CH = 1080;

    it('should not change valid position', () => {
        const result = clampVideoPosition(100, 100, 400, 300, CW, CH);
        expect(result.x).toBe(100);
        expect(result.y).toBe(100);
    });

    it('★ REGRESSION: OOB video should fill entire canvas', () => {
        const result = clampVideoPosition(2000, 2000, 100, 100, CW, CH);
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
        expect(result.w).toBe(CW);
        expect(result.h).toBe(CH);
    });

    it('should clamp x to canvas boundary', () => {
        const result = clampVideoPosition(-100, 100, 400, 300, CW, CH);
        expect(result.x).toBe(0); // Clamped from -100
    });

    it('should handle zero dimensions as OOB', () => {
        const result = clampVideoPosition(0, 0, 0, 0, CW, CH);
        expect(result.w).toBe(CW);
        expect(result.h).toBe(CH);
    });
});
