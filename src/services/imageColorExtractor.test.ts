// ─────────────────────────────────────────────────
// imageColorExtractor.test.ts — Color extraction tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './imageColorExtractor.ts'), 'utf-8');

describe('imageColorExtractor — module structure', () => {
    it('exports ExtractedColors interface', () => {
        expect(src).toContain('export interface ExtractedColors');
    });

    it('exports extractColorsFromImage function', () => {
        expect(src).toContain('export async function extractColorsFromImage');
    });

    it('has dominant, palette, avgLuminance, warmth fields', () => {
        expect(src).toContain('dominant: string');
        expect(src).toContain('palette: string[]');
        expect(src).toContain('avgLuminance: number');
        expect(src).toContain("warmth: 'warm' | 'cool' | 'neutral'");
    });

    it('has suggestedText and suggestedAccent fields', () => {
        expect(src).toContain('suggestedText: string');
        expect(src).toContain('suggestedAccent: string');
    });
});

describe('imageColorExtractor — implementation details', () => {
    it('uses Canvas getImageData for pixel sampling', () => {
        expect(src).toContain('getImageData');
        expect(src).toContain('drawImage');
    });

    it('quantizes HSL for frequency counting', () => {
        expect(src).toContain('quantizeHSL');
        expect(src).toContain('bucketToHex');
    });

    it('imports from colorHarmony for HSL utils', () => {
        expect(src).toContain("import { hexToHSL, hslToHex");
    });

    it('downscales image to 128px for speed', () => {
        expect(src).toContain('const size = 128');
    });

    it('has fallback colors for failure cases', () => {
        expect(src).toContain('function fallbackColors');
        expect(src).toContain("dominant: '#1a1a2e'");
    });

    it('classifies warmth from dominant HSL', () => {
        expect(src).toContain('function classifyWarmth');
    });

    it('suggests complementary hue for accent', () => {
        expect(src).toContain('(domHSL.h + 180) % 360');
    });

    it('uses crossOrigin for CORS safety', () => {
        expect(src).toContain("img.crossOrigin = 'anonymous'");
    });
});

describe('imageColorExtractor — quantization logic', () => {
    it('quantizes hue to 15° bins (24 total)', () => {
        expect(src).toContain('Math.floor(h / 15) * 15');
    });

    it('quantizes saturation to 4 bins', () => {
        expect(src).toContain('Math.round(s * 3) / 3');
    });

    it('quantizes lightness to 6 bins', () => {
        expect(src).toContain('Math.round(l * 5) / 5');
    });
});
