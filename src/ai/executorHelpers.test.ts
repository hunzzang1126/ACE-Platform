// ─────────────────────────────────────────────────
// executorHelpers.test.ts — Color helpers + node factory tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { hslToRgb, hexToRgb, rgbToHex, makeNodeInfo, getLayoutColor } from './executorHelpers';

describe('executorHelpers', () => {

    // ── hslToRgb ──

    describe('hslToRgb', () => {
        it('should convert pure red', () => {
            const [r, g, b] = hslToRgb(0, 1, 0.5);
            expect(r).toBeCloseTo(1, 1);
            expect(g).toBeCloseTo(0, 1);
            expect(b).toBeCloseTo(0, 1);
        });

        it('should convert pure green', () => {
            const [r, g, b] = hslToRgb(120, 1, 0.5);
            expect(r).toBeCloseTo(0, 1);
            expect(g).toBeCloseTo(1, 1);
            expect(b).toBeCloseTo(0, 1);
        });

        it('should convert pure blue', () => {
            const [r, g, b] = hslToRgb(240, 1, 0.5);
            expect(r).toBeCloseTo(0, 1);
            expect(g).toBeCloseTo(0, 1);
            expect(b).toBeCloseTo(1, 1);
        });

        it('should convert white (lightness=1)', () => {
            const [r, g, b] = hslToRgb(0, 0, 1);
            expect(r).toBeCloseTo(1);
            expect(g).toBeCloseTo(1);
            expect(b).toBeCloseTo(1);
        });

        it('should convert black (lightness=0)', () => {
            const [r, g, b] = hslToRgb(0, 0, 0);
            expect(r).toBeCloseTo(0);
            expect(g).toBeCloseTo(0);
            expect(b).toBeCloseTo(0);
        });

        it('should handle yellow range (h=60)', () => {
            const [r, g, b] = hslToRgb(60, 1, 0.5);
            expect(r).toBeCloseTo(1, 1);
            expect(g).toBeCloseTo(1, 1);
            expect(b).toBeCloseTo(0, 1);
        });

        it('should handle cyan range (h=180)', () => {
            const [r, g, b] = hslToRgb(180, 1, 0.5);
            expect(r).toBeCloseTo(0, 1);
            expect(g).toBeCloseTo(1, 1);
            expect(b).toBeCloseTo(1, 1);
        });

        it('should handle magenta range (h=300)', () => {
            const [r, g, b] = hslToRgb(300, 1, 0.5);
            expect(r).toBeCloseTo(1, 1);
            expect(g).toBeCloseTo(0, 1);
            expect(b).toBeCloseTo(1, 1);
        });
    });

    // ── hexToRgb ──

    describe('hexToRgb', () => {
        it('should parse 6-digit hex', () => {
            expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
        });

        it('should parse 6-digit hex without hash', () => {
            expect(hexToRgb('00ff00')).toEqual([0, 1, 0]);
        });

        it('should parse 3-digit hex', () => {
            const [r, g, b] = hexToRgb('#fff');
            expect(r).toBeCloseTo(1);
            expect(g).toBeCloseTo(1);
            expect(b).toBeCloseTo(1);
        });

        it('should parse 3-digit hex without hash', () => {
            const [r, g, b] = hexToRgb('000');
            expect(r).toBe(0);
            expect(g).toBe(0);
            expect(b).toBe(0);
        });

        it('should return [0,0,0] for invalid hex', () => {
            expect(hexToRgb('invalid')).toEqual([0, 0, 0]);
        });

        it('should handle mixed case', () => {
            const [r] = hexToRgb('#FF0000');
            expect(r).toBe(1);
        });

        it('should handle mid-range value', () => {
            const [r, g, b] = hexToRgb('#808080');
            expect(r).toBeCloseTo(0.502, 2);
            expect(g).toBeCloseTo(0.502, 2);
            expect(b).toBeCloseTo(0.502, 2);
        });
    });

    // ── rgbToHex ──

    describe('rgbToHex', () => {
        it('should convert pure red', () => {
            expect(rgbToHex(1, 0, 0)).toBe('#ff0000');
        });

        it('should convert pure green', () => {
            expect(rgbToHex(0, 1, 0)).toBe('#00ff00');
        });

        it('should convert pure blue', () => {
            expect(rgbToHex(0, 0, 1)).toBe('#0000ff');
        });

        it('should convert white', () => {
            expect(rgbToHex(1, 1, 1)).toBe('#ffffff');
        });

        it('should convert black', () => {
            expect(rgbToHex(0, 0, 0)).toBe('#000000');
        });

        it('should round to nearest byte', () => {
            const hex = rgbToHex(0.5, 0.5, 0.5);
            expect(hex).toBe('#808080');
        });

        it('★ REGRESSION: rgbToHex roundtrips with hexToRgb', () => {
            const original = '#3a7bd5';
            const [r, g, b] = hexToRgb(original);
            const result = rgbToHex(r, g, b);
            expect(result).toBe(original);
        });
    });

    // ── makeNodeInfo ──

    describe('makeNodeInfo', () => {
        it('should create a SceneNodeInfo with correct properties', () => {
            const node = makeNodeInfo(1, 'rect', 10, 20, 100, 50, '#ff0000', 0.8);
            expect(node.id).toBe(1);
            expect(node.type).toBe('rect');
            expect(node.x).toBe(10);
            expect(node.y).toBe(20);
            expect(node.width).toBe(100);
            expect(node.height).toBe(50);
            expect(node.color).toBe('#ff0000');
            expect(node.opacity).toBe(0.8);
            expect(node.zIndex).toBe(0);
        });

        it('should generate label with color name when known', () => {
            const node = makeNodeInfo(1, 'rect', 0, 0, 50, 50, '#ff0000', 1);
            expect(node.label).toBe('Red Rect #1');
        });

        it('should use hex as label when color not in dictionary', () => {
            const node = makeNodeInfo(2, 'ellipse', 0, 0, 50, 50, '#abcdef', 1);
            expect(node.label).toContain('#abcdef');
            expect(node.label).toContain('Ellipse');
        });

        it('should capitalize type name', () => {
            const node = makeNodeInfo(1, 'text', 0, 0, 100, 30, '#ffffff', 1);
            expect(node.label).toContain('Text');
        });

        it('should expand rounded_rect to "Rounded Rect"', () => {
            const node = makeNodeInfo(1, 'rounded_rect' as any, 0, 0, 100, 50, '#000000', 1);
            expect(node.label).toContain('Rounded Rect');
        });

        it('should include default effects', () => {
            const node = makeNodeInfo(1, 'rect', 0, 0, 50, 50, '#ff0000', 1);
            expect(node.effects.hasShadow).toBe(false);
            expect(node.effects.brightness).toBe(1);
            expect(node.effects.blendMode).toBe('normal');
        });

        it('should initialize with empty animations', () => {
            const node = makeNodeInfo(1, 'rect', 0, 0, 50, 50, '#ff0000', 1);
            expect(node.animations).toEqual([]);
        });
    });

    // ── getLayoutColor ──

    describe('getLayoutColor', () => {
        it('should return RGB tuple for rainbow scheme', () => {
            const [r, g, b] = getLayoutColor('rainbow', 0, 5);
            expect(typeof r).toBe('number');
            expect(typeof g).toBe('number');
            expect(typeof b).toBe('number');
            expect(r).toBeGreaterThanOrEqual(0);
            expect(r).toBeLessThanOrEqual(1);
        });

        it('should return different colors for different indices (rainbow)', () => {
            const c1 = getLayoutColor('rainbow', 0, 4);
            const c2 = getLayoutColor('rainbow', 2, 4);
            const isDifferent = c1[0] !== c2[0] || c1[1] !== c2[1] || c1[2] !== c2[2];
            expect(isDifferent).toBe(true);
        });

        it('should return blue-ish hues for monochrome', () => {
            const [r, g, b] = getLayoutColor('monochrome', 0, 5);
            // Monochrome uses hue=210 (blue range)
            expect(b).toBeGreaterThan(r);
        });

        it('should return gradient values', () => {
            const start = getLayoutColor('gradient', 0, 3);
            const end = getLayoutColor('gradient', 2, 3);
            expect(start[0]).not.toEqual(end[0]); // r shifts with t
        });

        it('should return random colors for unknown scheme', () => {
            const [r, g, b] = getLayoutColor('unknown', 0, 5);
            expect(r).toBeGreaterThanOrEqual(0);
            expect(r).toBeLessThanOrEqual(1);
        });
    });
});
