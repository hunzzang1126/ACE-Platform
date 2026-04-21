// ─────────────────────────────────────────────────
// FontPicker.test.ts — Font picker utility tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

// Test the pure utility functions extracted from FontPicker
// (displayName, getCategory, font grouping)

describe('FontPicker utilities', () => {
    // displayName
    describe('displayName', () => {
        const displayName = (full: string) => full.split(',')[0].trim();

        it('extracts first font family name', () => {
            expect(displayName('Inter, sans-serif')).toBe('Inter');
        });

        it('handles font with spaces', () => {
            expect(displayName('Plus Jakarta Sans, sans-serif')).toBe('Plus Jakarta Sans');
        });

        it('handles single font name (no fallback)', () => {
            expect(displayName('Arial')).toBe('Arial');
        });

        it('trims whitespace', () => {
            expect(displayName(' Roboto , sans-serif')).toBe('Roboto');
        });
    });

    // getCategory
    describe('getCategory', () => {
        const getCategory = (full: string) => {
            if (full.includes('serif') && !full.includes('sans-serif')) return 'Serif';
            if (full.includes('monospace')) return 'Mono';
            return 'Sans-Serif';
        };

        it('identifies sans-serif fonts', () => {
            expect(getCategory('Inter, sans-serif')).toBe('Sans-Serif');
            expect(getCategory('Poppins, sans-serif')).toBe('Sans-Serif');
        });

        it('identifies serif fonts', () => {
            expect(getCategory('Playfair Display, serif')).toBe('Serif');
            expect(getCategory('Georgia, serif')).toBe('Serif');
        });

        it('identifies monospace fonts', () => {
            expect(getCategory('JetBrains Mono, monospace')).toBe('Mono');
            expect(getCategory('Fira Code, monospace')).toBe('Mono');
        });

        it('defaults to Sans-Serif for ambiguous', () => {
            expect(getCategory('CustomFont')).toBe('Sans-Serif');
        });
    });

    // Font list integrity
    describe('FONT_FAMILIES list', () => {
        it('has at least 50 fonts', async () => {
            const { FONT_FAMILIES } = await import('./contextToolbarConstants');
            expect(FONT_FAMILIES.length).toBeGreaterThanOrEqual(50);
        });

        it('all entries are clean names (no comma fallback)', async () => {
            const { FONT_FAMILIES } = await import('./contextToolbarConstants');
            for (const f of FONT_FAMILIES) {
                expect(f).not.toContain(',');
            }
        });

        it('has no duplicate entries', async () => {
            const { FONT_FAMILIES } = await import('./contextToolbarConstants');
            const unique = new Set(FONT_FAMILIES);
            expect(unique.size).toBe(FONT_FAMILIES.length);
        });
    });
});
