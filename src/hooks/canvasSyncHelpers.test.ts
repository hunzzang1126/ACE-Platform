// ─────────────────────────────────────────────────
// canvasSyncHelpers.test.ts — Critical pure functions
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
    it('parses rgba() string', () => {
        expect(parseShadowColor('rgba(255, 0, 0, 0.5)')).toEqual([1, 0, 0, 0.5]);
    });

    it('parses rgb() string (alpha defaults to 1)', () => {
        expect(parseShadowColor('rgb(0, 255, 0)')).toEqual([0, 1, 0, 1.0]);
    });

    it('parses hex string', () => {
        const [r, g, b, a] = parseShadowColor('#ff0000');
        expect(r).toBe(1); expect(g).toBe(0); expect(b).toBe(0); expect(a).toBe(1);
    });

    it('returns NaN-safe result for non-hex strings', () => {
        const result = parseShadowColor('bad');
        // short string hits the fallback [0,0,0,0.5]
        expect(result).toEqual([0, 0, 0, 0.5]);
    });
});

describe('clampTextPosition', () => {
    const cw = 300, ch = 250;

    it('returns unchanged for in-bounds text', () => {
        const r = clampTextPosition(10, 10, 100, 30, cw, ch, 16);
        expect(r.x).toBe(10); expect(r.y).toBe(10);
    });

    it('clamps off-screen left', () => {
        expect(clampTextPosition(-200, 10, 100, 30, cw, ch, 16).x).toBe(0);
    });

    it('clamps off-screen top', () => {
        expect(clampTextPosition(10, -100, 100, 30, cw, ch, 16).y).toBe(0);
    });

    it('clamps off-screen right', () => {
        expect(clampTextPosition(400, 10, 100, 30, cw, ch, 16).x).toBeLessThanOrEqual(cw);
    });

    it('fixes zero-width', () => {
        expect(clampTextPosition(10, 10, 0, 30, cw, ch, 16).w).toBeGreaterThan(0);
    });
});

describe('isImageOutOfBounds', () => {
    it('false for in-bounds', () => expect(isImageOutOfBounds(10, 10, 100, 80, 300, 250)).toBe(false));
    it('true for zero-width', () => expect(isImageOutOfBounds(10, 10, 0, 80, 300, 250)).toBe(true));
    it('true for right of canvas', () => expect(isImageOutOfBounds(300, 10, 100, 80, 300, 250)).toBe(true));
    it('true for below canvas', () => expect(isImageOutOfBounds(10, 250, 100, 80, 300, 250)).toBe(true));
    it('true for left of canvas', () => expect(isImageOutOfBounds(-101, 10, 100, 80, 300, 250)).toBe(true));
});

describe('centerImage', () => {
    it('centers image', () => {
        const r = centerImage(300, 250, 100, 80);
        expect(r.x).toBe(100); expect(r.y).toBe(85);
    });

    it('constrains large images', () => {
        const r = centerImage(300, 250, 1000, 800);
        expect(r.w).toBeLessThanOrEqual(150);
    });
});

describe('clampVideoPosition', () => {
    it('unchanged for in-bounds', () => {
        const r = clampVideoPosition(10, 10, 100, 80, 300, 250);
        expect(r.x).toBe(10);
    });

    it('resets out-of-bounds to full canvas', () => {
        const r = clampVideoPosition(400, 300, 100, 80, 300, 250);
        expect(r.w).toBe(300); expect(r.h).toBe(250);
    });
});
