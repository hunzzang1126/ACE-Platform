// ─────────────────────────────────────────────────
// fontMatcher.test.ts — Cosine similarity matching tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
    parseMoodQuery, matchFonts, matchFontsFromText, hasMoodKeywords,
} from './fontMatcher';

describe('parseMoodQuery', () => {
    it('parses single keyword', () => {
        const q = parseMoodQuery('luxury');
        expect(q.luxury).toBeGreaterThan(0);
        expect(q.elegant).toBeGreaterThan(0);
    });

    it('parses multiple keywords', () => {
        const q = parseMoodQuery('luxury modern');
        expect(q.luxury).toBeGreaterThan(0);
        expect(q.modern).toBeGreaterThan(0);
    });

    it('normalizes max to 1.0', () => {
        const q = parseMoodQuery('luxury modern tech');
        const maxVal = Math.max(...Object.values(q));
        expect(maxVal).toBe(1.0);
    });

    it('returns empty for unrecognized words', () => {
        const q = parseMoodQuery('xyzzy foobar');
        expect(Object.keys(q).length).toBe(0);
    });

    it('handles Korean keywords', () => {
        const q = parseMoodQuery('고급');
        expect(q.luxury).toBeGreaterThan(0);
    });

    it('handles comma-separated input', () => {
        const q = parseMoodQuery('luxury,modern');
        expect(q.luxury).toBeGreaterThan(0);
        expect(q.modern).toBeGreaterThan(0);
    });
});

describe('matchFonts', () => {
    it('returns top N results', () => {
        const query = { luxury: 1.0, elegant: 1.0 };
        const results = matchFonts(query, 3);
        expect(results).toHaveLength(3);
    });

    it('results are sorted by score descending', () => {
        const query = { luxury: 1.0, elegant: 1.0 };
        const results = matchFonts(query, 5);
        for (let i = 1; i < results.length; i++) {
            expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
        }
    });

    it('luxury query → serif fonts rank high', () => {
        const query = { luxury: 1.0, elegant: 1.0 };
        const results = matchFonts(query, 5);
        const families = results.map(r => r.family);
        // All top results should be serif/editorial fonts
        const luxuryFonts = ['Playfair Display', 'Cormorant Garant', 'Cormorant', 'EB Garamond'];
        expect(families.some(f => luxuryFonts.includes(f))).toBe(true);
    });

    it('tech query → modern fonts rank high', () => {
        const query = { tech: 1.0, modern: 1.0 };
        const results = matchFonts(query, 3);
        const families = results.map(r => r.family);
        // Should include tech-oriented fonts
        const techFonts = ['Orbitron', 'Space Grotesk', 'JetBrains Mono', 'Inter', 'IBM Plex Sans'];
        expect(families.some(f => techFonts.includes(f))).toBe(true);
    });

    it('boldImpact query → display fonts rank high', () => {
        const query = { boldImpact: 1.0 };
        const results = matchFonts(query, 3);
        const families = results.map(r => r.family);
        const impactFonts = ['Bebas Neue', 'Anton', 'Black Han Sans', 'Staatliches'];
        expect(families.some(f => impactFonts.includes(f))).toBe(true);
    });

    it('returns empty for empty query', () => {
        expect(matchFonts({}, 5)).toHaveLength(0);
    });

    it('each result has hasVariable flag', () => {
        const results = matchFonts({ modern: 1.0 }, 5);
        for (const r of results) {
            expect(typeof r.hasVariable).toBe('boolean');
        }
    });
});

describe('matchFontsFromText', () => {
    it('returns font families as strings', () => {
        const result = matchFontsFromText('luxury');
        expect(result.length).toBeGreaterThan(0);
        expect(typeof result[0]).toBe('string');
    });

    it('luxury → includes Playfair Display', () => {
        const result = matchFontsFromText('luxury', 5);
        expect(result).toContain('Playfair Display');
    });

    it('friendly playful → includes rounded fonts', () => {
        const result = matchFontsFromText('friendly playful', 5);
        const friendlyFonts = ['Fredoka', 'Baloo 2', 'Quicksand', 'Nunito'];
        expect(result.some(f => friendlyFonts.includes(f))).toBe(true);
    });

    it('Korean: 고급 → includes serif fonts', () => {
        const result = matchFontsFromText('고급', 5);
        expect(result).toContain('Playfair Display');
    });

    it('returns empty for gibberish', () => {
        expect(matchFontsFromText('xyzzy')).toHaveLength(0);
    });
});

describe('hasMoodKeywords', () => {
    it('detects English keywords', () => {
        expect(hasMoodKeywords('luxury font')).toBe(true);
    });

    it('detects Korean keywords', () => {
        expect(hasMoodKeywords('고급 폰트')).toBe(true);
    });

    it('returns false for font names', () => {
        expect(hasMoodKeywords('Inter')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(hasMoodKeywords('')).toBe(false);
    });
});
