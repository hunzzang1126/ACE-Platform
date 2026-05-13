// ─────────────────────────────────────────────────
// colorHarmony.test.ts — Background-Aware Color Harmony
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    hexToHSL, hslToHex, analyzeBackground, deriveHarmonyPalette,
} from './colorHarmony';

// ══════════════════════════════════════════════════
// HSL Conversion
// ══════════════════════════════════════════════════
describe('hexToHSL / hslToHex — round-trip fidelity', () => {
    it('converts pure red correctly', () => {
        const hsl = hexToHSL('#FF0000');
        expect(hsl.h).toBeCloseTo(0, 0);
        expect(hsl.s).toBeCloseTo(1, 1);
        expect(hsl.l).toBeCloseTo(0.5, 1);
    });

    it('converts pure blue correctly', () => {
        const hsl = hexToHSL('#0000FF');
        expect(hsl.h).toBeCloseTo(240, 0);
    });

    it('round-trips common colors', () => {
        const colors = ['#FF6B6B', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
        for (const hex of colors) {
            const hsl = hexToHSL(hex);
            const back = hslToHex(hsl.h, hsl.s, hsl.l);
            // Allow ±2 per channel due to rounding
            const diff = Math.abs(parseInt(hex.slice(1, 3), 16) - parseInt(back.slice(1, 3), 16))
                + Math.abs(parseInt(hex.slice(3, 5), 16) - parseInt(back.slice(3, 5), 16))
                + Math.abs(parseInt(hex.slice(5, 7), 16) - parseInt(back.slice(5, 7), 16));
            expect(diff).toBeLessThanOrEqual(6);
        }
    });
});

// ══════════════════════════════════════════════════
// Background Analysis
// ══════════════════════════════════════════════════
describe('analyzeBackground — luminance + warmth detection', () => {
    it('classifies dark background correctly', () => {
        const bg = analyzeBackground('#0B0F1A');
        expect(bg.isLight).toBe(false);
        expect(bg.luminance).toBeLessThan(0.1);
    });

    it('classifies light background correctly', () => {
        const bg = analyzeBackground('#F0F2F5');
        expect(bg.isLight).toBe(true);
        expect(bg.luminance).toBeGreaterThan(0.8);
    });

    it('classifies warm sunset colors as warm', () => {
        const bg = analyzeBackground('#FF8C42', '#FFD166');
        expect(bg.warmth).toBe('warm');
    });

    it('classifies ocean/tech blue as cool', () => {
        const bg = analyzeBackground('#1E3A5F', '#2563EB');
        expect(bg.warmth).toBe('cool');
    });

    it('classifies gray as neutral', () => {
        const bg = analyzeBackground('#808080');
        expect(bg.warmth).toBe('neutral');
    });

    it('averages gradient endpoints', () => {
        const bg = analyzeBackground('#000000', '#FFFFFF');
        expect(bg.luminance).toBeGreaterThan(0.3);
        expect(bg.luminance).toBeLessThan(0.7);
    });
});

// ══════════════════════════════════════════════════
// Harmony Palette Generation
// ══════════════════════════════════════════════════
const AI_HINT = { accent: '#6366F1', foreground: '#FFFFFF', secondary: '#CCCCCC' };

describe('deriveHarmonyPalette — dark backgrounds', () => {
    it('uses light text on dark backgrounds', () => {
        const bg = analyzeBackground('#0B0F1A');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        expect(palette.headline).toBe('#FFFFFF');
        expect(palette.subheadline).toContain('rgba(255');
    });

    it('accent has good contrast with dark bg', () => {
        const bg = analyzeBackground('#1A1A2E');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        // Accent should be vibrant enough to stand out
        const hsl = hexToHSL(palette.accent);
        expect(hsl.l).toBeGreaterThan(0.3);
    });
});

describe('deriveHarmonyPalette — light backgrounds', () => {
    it('uses dark text on light backgrounds', () => {
        const bg = analyzeBackground('#F0F2F5');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        expect(palette.headline).toBe('#1A1A2E');
        expect(palette.subheadline).toContain('rgba(26');
    });
});

describe('deriveHarmonyPalette — warm backgrounds (beach/sunset)', () => {
    it('picks cool accent for warm backgrounds', () => {
        const bg = analyzeBackground('#FF8C42', '#FFD166');
        const palette = deriveHarmonyPalette(bg, { accent: '#FF0000', foreground: '#FFF', secondary: '#CCC' });
        // AI accent (#FF0000) is also warm → should be overridden with cool
        const accentHSL = hexToHSL(palette.accent);
        // Expect hue in cool range (150-270) or at least different from warm
        expect(accentHSL.h).toBeGreaterThan(120);
    });
});

describe('deriveHarmonyPalette — cool backgrounds (tech/night)', () => {
    it('picks warm accent for cool backgrounds', () => {
        const bg = analyzeBackground('#1E3A5F', '#0F172A');
        const palette = deriveHarmonyPalette(bg, { accent: '#0000FF', foreground: '#FFF', secondary: '#CCC' });
        // AI accent (#0000FF) is also cool → should be overridden with warm
        const accentHSL = hexToHSL(palette.accent);
        // Expect hue in warm range (0-60, 300-360) or distinctly different
        const isWarmish = accentHSL.h <= 60 || accentHSL.h >= 300 || (accentHSL.h > 60 && accentHSL.h < 120);
        expect(isWarmish).toBe(true);
    });
});

describe('deriveHarmonyPalette — AI accent preservation', () => {
    it('keeps AI accent if it already has good contrast and distinct hue', () => {
        // Dark bg, AI accent is bright teal (good contrast, distinct hue)
        const bg = analyzeBackground('#0B0F1A');
        const palette = deriveHarmonyPalette(bg, { accent: '#2DD4BF', foreground: '#FFF', secondary: '#CCC' });
        expect(palette.accent).toBe('#2DD4BF');
    });
});

describe('deriveHarmonyPalette — tag colors', () => {
    it('tag has distinct color from headline', () => {
        const bg = analyzeBackground('#0B0F1A');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        expect(palette.tag).not.toBe(palette.headline);
    });

    it('tagBg has appropriate lightness for background', () => {
        const bg = analyzeBackground('#F0F2F5');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        const tagBgHSL = hexToHSL(palette.tagBg);
        // Light bg → tag bg should be very light (pastel)
        expect(tagBgHSL.l).toBeGreaterThan(0.8);
    });
});

describe('deriveHarmonyPalette — CTA text readability', () => {
    it('accentForeground contrasts with accent', () => {
        const bg = analyzeBackground('#0B0F1A');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        // CTA text should be white or dark depending on accent brightness
        expect(['#FFFFFF', '#1A1A2E']).toContain(palette.accentForeground);
    });
});
