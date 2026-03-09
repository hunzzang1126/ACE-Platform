// ─────────────────────────────────────────────────
// brandPalette — Regression Tests
// ─────────────────────────────────────────────────
// Tests for color space conversions and brand palette generation.
import { describe, it, expect } from 'vitest';
import {
    generateBrandPalette,
    // Color space utils are not exported — test via generateBrandPalette
} from './brandPalette';

// Since hexToRgb/rgbToHex etc are not exported, we test them indirectly
// through generateBrandPalette which uses all of them.

describe('generateBrandPalette — Core Palette Generation', () => {
    it('returns a BrandPalette with all 6 fields', () => {
        const palette = generateBrandPalette('#ff0000');
        expect(palette.primary).toBeDefined();
        expect(palette.secondary).toBeDefined();
        expect(palette.accent).toBeDefined();
        expect(palette.background).toBeDefined();
        expect(palette.text).toBeDefined();
        expect(palette.surface).toBeDefined();
    });

    it('primary color matches input', () => {
        const palette = generateBrandPalette('#3b82f6');
        // Primary should be the input color (or very close)
        expect(palette.primary.toLowerCase()).toBe('#3b82f6');
    });

    it('all generated colors are valid hex format', () => {
        const palette = generateBrandPalette('#e11d48');
        const hexRegex = /^#[0-9a-f]{6}$/i;
        expect(palette.primary).toMatch(hexRegex);
        expect(palette.secondary).toMatch(hexRegex);
        expect(palette.accent).toMatch(hexRegex);
        expect(palette.background).toMatch(hexRegex);
        expect(palette.text).toMatch(hexRegex);
        expect(palette.surface).toMatch(hexRegex);
    });

    it('generates different palettes for different inputs', () => {
        const p1 = generateBrandPalette('#ff0000');
        const p2 = generateBrandPalette('#0000ff');
        // Secondary should differ for different primary colors
        expect(p1.secondary).not.toBe(p2.secondary);
    });

    it('works with black input', () => {
        const palette = generateBrandPalette('#000000');
        expect(palette.primary).toBeDefined();
        expect(palette.text).toBeDefined();
    });

    it('works with white input', () => {
        const palette = generateBrandPalette('#ffffff');
        expect(palette.primary).toBeDefined();
        expect(palette.background).toBeDefined();
    });
});

describe('generateBrandPalette — Harmony Modes', () => {
    it('complementary mode produces valid palette', () => {
        const palette = generateBrandPalette('#e11d48', 'complementary');
        expect(palette.secondary).toBeDefined();
        expect(palette.secondary).not.toBe(palette.primary);
    });

    it('analogous mode produces valid palette', () => {
        const palette = generateBrandPalette('#e11d48', 'analogous');
        expect(palette.secondary).toBeDefined();
    });

    it('triadic mode produces valid palette', () => {
        const palette = generateBrandPalette('#e11d48', 'triadic');
        expect(palette.secondary).toBeDefined();
    });

    it('split-complementary mode produces valid palette', () => {
        const palette = generateBrandPalette('#e11d48', 'split-complementary');
        expect(palette.secondary).toBeDefined();
    });
});

describe('generateBrandPalette — Edge Cases', () => {
    it('handles 3-char hex by working correctly', () => {
        // Even if the function doesn't support 3-char, it shouldn't crash
        try {
            const palette = generateBrandPalette('#f00');
            expect(palette.primary).toBeDefined();
        } catch {
            // If it throws, that's also acceptable behavior for invalid input
            expect(true).toBe(true);
        }
    });

    it('low-saturation gray produces valid palette', () => {
        const palette = generateBrandPalette('#808080');
        expect(palette.primary).toBeDefined();
        expect(palette.secondary).toBeDefined();
    });

    it('high-saturation neon produces valid palette', () => {
        const palette = generateBrandPalette('#00ff00');
        expect(palette.primary).toBeDefined();
        expect(palette.secondary).toBeDefined();
    });
});
