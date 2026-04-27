// ─────────────────────────────────────────────────
// fontRecommendations.test.ts — Font system tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    FONT_RECOMMENDATIONS, FONT_PAIRINGS, KOREAN_FONTS,
    getFontContextForAI,
} from './fontRecommendations';

describe('FONT_RECOMMENDATIONS data', () => {
    it('has at least 8 industry categories', () => {
        expect(Object.keys(FONT_RECOMMENDATIONS).length).toBeGreaterThanOrEqual(8);
    });

    it('each industry has at least 2 mood categories', () => {
        for (const [industry, moods] of Object.entries(FONT_RECOMMENDATIONS)) {
            expect(Object.keys(moods).length).toBeGreaterThanOrEqual(2);
        }
    });

    it('each mood has at least 2 font options', () => {
        for (const [industry, moods] of Object.entries(FONT_RECOMMENDATIONS)) {
            for (const [mood, fonts] of Object.entries(moods)) {
                expect(fonts.length).toBeGreaterThanOrEqual(2);
            }
        }
    });

    it('no duplicate fonts within same mood', () => {
        for (const [industry, moods] of Object.entries(FONT_RECOMMENDATIONS)) {
            for (const [mood, fonts] of Object.entries(moods)) {
                const unique = new Set(fonts);
                expect(unique.size).toBe(fonts.length);
            }
        }
    });

    it('includes luxury category', () => {
        expect(FONT_RECOMMENDATIONS.luxury).toBeDefined();
        expect(FONT_RECOMMENDATIONS.luxury.serif).toContain('Playfair Display');
    });

    it('includes tech category', () => {
        expect(FONT_RECOMMENDATIONS.tech).toBeDefined();
        expect(FONT_RECOMMENDATIONS.tech.clean).toContain('Inter');
    });

    it('includes food category', () => {
        expect(FONT_RECOMMENDATIONS.food).toBeDefined();
    });

    it('includes fashion category', () => {
        expect(FONT_RECOMMENDATIONS.fashion).toBeDefined();
    });
});

describe('FONT_PAIRINGS', () => {
    it('has at least 8 curated pairings', () => {
        expect(FONT_PAIRINGS.length).toBeGreaterThanOrEqual(8);
    });

    it('each pairing has headline and body', () => {
        for (const p of FONT_PAIRINGS) {
            expect(p.headline).toBeTruthy();
            expect(p.body).toBeTruthy();
            expect(p.headline).not.toBe(p.body);
        }
    });
});

describe('KOREAN_FONTS', () => {
    it('has at least 5 Korean font options', () => {
        expect(KOREAN_FONTS.length).toBeGreaterThanOrEqual(5);
    });

    it('includes Noto Sans KR', () => {
        expect(KOREAN_FONTS).toContain('Noto Sans KR');
    });
});

describe('getFontContextForAI', () => {
    it('returns string with font info when no industry', () => {
        const result = getFontContextForAI();
        expect(result).toContain('font');
        expect(result).toContain('update_element_property');
    });

    it('includes industry-specific recommendations', () => {
        const result = getFontContextForAI('luxury');
        expect(result).toContain('luxury');
        expect(result).toContain('Playfair Display');
    });

    it('includes pairings', () => {
        const result = getFontContextForAI();
        expect(result).toContain('Headline + Body pairings');
    });

    it('includes Korean fonts when lang is ko', () => {
        const result = getFontContextForAI(undefined, 'ko');
        expect(result).toContain('Korean fonts');
        expect(result).toContain('Noto Sans KR');
    });

    it('handles unknown industry gracefully', () => {
        const result = getFontContextForAI('unknownIndustry');
        expect(result).toBeTruthy();
        expect(result).toContain('update_element_property');
    });

    it('always ends with usage instruction', () => {
        const result = getFontContextForAI('tech');
        expect(result).toContain('update_element_property');
        expect(result).toContain('fontFamily');
    });
});

// ═══════════════════════════════════════════════════
// fontLoader — source verification
// ═══════════════════════════════════════════════════

describe('fontLoader source integrity', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(resolve(__dirname, '../services/fontLoader.ts'), 'utf-8');

    it('exports loadGoogleFont function', () => {
        expect(src).toContain('export async function loadGoogleFont');
    });

    it('uses document.fonts.load for safety', () => {
        expect(src).toContain('document.fonts.load');
    });

    it('deduplicates concurrent loads', () => {
        expect(src).toContain('pendingLoads');
    });

    it('has SYSTEM_FONTS bypass', () => {
        expect(src).toContain('SYSTEM_FONTS');
        expect(src).toContain('Inter');
    });

    it('uses Google Fonts CSS2 API', () => {
        expect(src).toContain('fonts.googleapis.com/css2');
    });

    it('handles errors gracefully (catch without re-throw)', () => {
        expect(src).toContain('catch');
        // No 'throw err' or 'throw new' — errors are logged, not propagated
        expect(src).not.toMatch(/throw\s+(err|new)/);
    });
});

// ═══════════════════════════════════════════════════
// smartContextBuilder — font injection verification
// ═══════════════════════════════════════════════════

describe('smartContextBuilder font injection', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(resolve(__dirname, './smartContextBuilder.ts'), 'utf-8');

    it('imports getFontContextForAI', () => {
        expect(src).toContain("import { getFontContextForAI } from './fontRecommendations'");
    });

    it('has lazy-load comment for font guidance (not injected every turn)', () => {
        // Font guidance moved to analyze_scene result only (saves ~200 tokens/turn)
        expect(src).toContain('Font guidance: lazy-loaded');
    });
});
