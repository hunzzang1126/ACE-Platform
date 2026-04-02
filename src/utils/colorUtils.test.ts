// ─────────────────────────────────────────────────
// colorUtils.test.ts — Color conversion utility tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, hexToPixiColor } from './colorUtils';

describe('colorUtils', () => {
    describe('hexToRgb', () => {
        it('should convert #ff0000 to red', () => {
            const rgb = hexToRgb('#ff0000');
            expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
        });

        it('should convert #00ff00 to green', () => {
            expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
        });

        it('should convert #0000ff to blue', () => {
            expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
        });

        it('should convert #ffffff to white', () => {
            expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
        });

        it('should convert #000000 to black', () => {
            expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
        });

        it('should handle hex without hash', () => {
            expect(hexToRgb('c9a84c')).toEqual({ r: 201, g: 168, b: 76 });
        });

        it('should handle uppercase hex', () => {
            expect(hexToRgb('#FF6B35')).toEqual({ r: 255, g: 107, b: 53 });
        });

        it('should return null for invalid input', () => {
            expect(hexToRgb('invalid')).toBeNull();
            expect(hexToRgb('#gggggg')).toBeNull();
            expect(hexToRgb('#fff')).toBeNull(); // shorthand not supported
        });
    });

    describe('rgbToHex', () => {
        it('should convert red to #ff0000', () => {
            expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
        });

        it('should convert green to #00ff00', () => {
            expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
        });

        it('should convert white to #ffffff', () => {
            expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
        });

        it('should convert black to #000000', () => {
            expect(rgbToHex(0, 0, 0)).toBe('#000000');
        });

        it('should pad single digit hex values', () => {
            expect(rgbToHex(1, 2, 3)).toBe('#010203');
        });
    });

    describe('hexToPixiColor', () => {
        it('should convert #ff0000 to 0xff0000', () => {
            expect(hexToPixiColor('#ff0000')).toBe(0xff0000);
        });

        it('should convert #000000 to 0', () => {
            expect(hexToPixiColor('#000000')).toBe(0);
        });

        it('should convert #ffffff to 16777215', () => {
            expect(hexToPixiColor('#ffffff')).toBe(16777215);
        });

        it('should convert brand color correctly', () => {
            expect(hexToPixiColor('#c9a84c')).toBe(0xc9a84c);
        });
    });

    describe('roundtrip', () => {
        it('should roundtrip hexToRgb → rgbToHex', () => {
            const original = '#c9a84c';
            const rgb = hexToRgb(original)!;
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            expect(hex).toBe(original);
        });
    });
});
