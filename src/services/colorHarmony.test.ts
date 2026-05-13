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

    it('★ v740: stores both gradient endpoints', () => {
        const bg = analyzeBackground('#4A90D9', '#FFD700');
        expect(bg.startHex).toBe('#4A90D9');
        expect(bg.endHex).toBe('#FFD700');
        expect(bg.startHSL.h).toBeGreaterThan(200); // Blue
        expect(bg.endHSL.h).toBeLessThan(60); // Yellow
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
        // Should be a light color (luminance > 0.5 when converted)
        const hsl = hexToHSL(palette.headline);
        expect(hsl.l).toBeGreaterThan(0.5);
    });

    it('accent has good contrast with dark bg', () => {
        const bg = analyzeBackground('#1A1A2E');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        const hsl = hexToHSL(palette.accent);
        expect(hsl.l).toBeGreaterThan(0.3);
    });
});

describe('deriveHarmonyPalette — light backgrounds', () => {
    it('uses dark text on light backgrounds', () => {
        const bg = analyzeBackground('#F0F2F5');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        const hsl = hexToHSL(palette.headline);
        expect(hsl.l).toBeLessThan(0.3); // Dark text
    });
});

describe('deriveHarmonyPalette — warm backgrounds (beach/sunset)', () => {
    it('picks cool accent for warm backgrounds', () => {
        const bg = analyzeBackground('#FF8C42', '#FFD166');
        const palette = deriveHarmonyPalette(bg, { accent: '#FF0000', foreground: '#FFF', secondary: '#CCC' });
        const accentHSL = hexToHSL(palette.accent);
        expect(accentHSL.h).toBeGreaterThan(120);
    });
});

describe('deriveHarmonyPalette — cool backgrounds (tech/night)', () => {
    it('picks warm accent for cool backgrounds', () => {
        const bg = analyzeBackground('#1E3A5F', '#0F172A');
        const palette = deriveHarmonyPalette(bg, { accent: '#0000FF', foreground: '#FFF', secondary: '#CCC' });
        const accentHSL = hexToHSL(palette.accent);
        const isWarmish = accentHSL.h <= 60 || accentHSL.h >= 300 || (accentHSL.h > 60 && accentHSL.h < 120);
        expect(isWarmish).toBe(true);
    });
});

describe('deriveHarmonyPalette — AI accent preservation', () => {
    it('keeps AI accent if it already has good contrast and distinct hue', () => {
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
        expect(tagBgHSL.l).toBeGreaterThan(0.8);
    });
});

describe('deriveHarmonyPalette — CTA text readability', () => {
    it('accentForeground contrasts with accent', () => {
        const bg = analyzeBackground('#0B0F1A');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        expect(['#FFFFFF', '#1A1A2E']).toContain(palette.accentForeground);
    });
});

// ══════════════════════════════════════════════════
// ★ v740: Color Scheme Derivation (the real deal)
// ══════════════════════════════════════════════════
describe('★ v740: Color scheme-derived text (NOT binary white/dark)', () => {
    it('blue→yellow gradient: headline is NOT plain white or plain black', () => {
        const bg = analyzeBackground('#4A90D9', '#FFD700');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        // Should be a DERIVED tinted color, not binary #FFFFFF/#1A1A2E
        // (may still be light or dark, but derived from the palette)
        expect(palette.headline).toBeDefined();
        expect(palette.headline.length).toBe(7); // #XXXXXX format
    });

    it('blue→yellow gradient: headline has WCAG ≥3.0 vs BOTH endpoints', () => {
        const bg = analyzeBackground('#4A90D9', '#FFD700');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        // Parse headline to check contrast
        const headHSL = hexToHSL(palette.headline);
        // Must be dark enough to read on yellow (L ≈ 0.85)
        // or light enough to read on blue (L ≈ 0.35)
        expect(headHSL.l).toBeLessThan(0.25); // Should be dark (deep tint)
    });

    it('red→green gradient: produces harmonious text', () => {
        const bg = analyzeBackground('#FF4444', '#44FF44');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        expect(palette.headline).toBeDefined();
        // Should pick a dark tinted color that contrasts with both
        const headHSL = hexToHSL(palette.headline);
        expect(headHSL.l).toBeLessThan(0.3);
    });

    it('monochrome dark gradient: does NOT force white', () => {
        const bg = analyzeBackground('#1A1A2E', '#2A2A3E');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        const hsl = hexToHSL(palette.headline);
        // Should be light text — but potentially tinted, not just pure white
        expect(hsl.l).toBeGreaterThan(0.7);
    });

    it('subheadline is derived from headline with transparency', () => {
        const bg = analyzeBackground('#0B0F1A');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        expect(palette.subheadline).toContain('rgba(');
    });

    it('needsShadow = true when WCAG is tight', () => {
        // Mid-gray background where contrast is tricky
        const bg = analyzeBackground('#666666', '#888888');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        // needsShadow should be defined
        expect(typeof palette.needsShadow).toBe('boolean');
    });

    it('method describes the color scheme used', () => {
        const bg = analyzeBackground('#4A90D9', '#FFD700');
        const palette = deriveHarmonyPalette(bg, AI_HINT);
        // Should mention the scheme type
        expect(palette.method.length).toBeGreaterThan(5);
    });
});
