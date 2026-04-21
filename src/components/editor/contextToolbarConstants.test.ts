// ─────────────────────────────────────────────────
// contextToolbarConstants.test.ts — Font list validation
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

// Mock document for ensureGoogleFont (called at import time)
vi.stubGlobal('document', {
    createElement: () => ({ rel: '', href: '' }),
    head: { appendChild: vi.fn() },
    fonts: { check: () => false, load: () => Promise.resolve() },
    getElementById: () => null,
});

import { FONT_FAMILIES, FONT_FAMILIES_BY_CATEGORY } from './contextToolbarConstants';

describe('FONT_FAMILIES', () => {
    it('has at least 50 fonts', () => {
        expect(FONT_FAMILIES.length).toBeGreaterThanOrEqual(50);
    });

    it('all entries are clean font names (no comma fallback)', () => {
        for (const f of FONT_FAMILIES) {
            expect(f).not.toContain(',');
        }
    });

    it('includes Inter', () => {
        expect(FONT_FAMILIES).toContain('Inter');
    });

    it('includes serif fonts', () => {
        expect(FONT_FAMILIES).toContain('Playfair Display');
        expect(FONT_FAMILIES).toContain('Merriweather');
    });

    it('includes monospace fonts', () => {
        expect(FONT_FAMILIES).toContain('JetBrains Mono');
    });

    it('includes Korean fonts', () => {
        expect(FONT_FAMILIES).toContain('Noto Sans KR');
    });
});

describe('FONT_FAMILIES_BY_CATEGORY', () => {
    it('has at least 8 categories', () => {
        expect(Object.keys(FONT_FAMILIES_BY_CATEGORY).length).toBeGreaterThanOrEqual(8);
    });

    it('flat list matches category totals', () => {
        const total = Object.values(FONT_FAMILIES_BY_CATEGORY).flat().length;
        expect(FONT_FAMILIES.length).toBe(total);
    });
});
