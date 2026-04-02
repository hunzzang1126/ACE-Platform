// ─────────────────────────────────────────────────
// contextToolbarConstants.test.ts — Font list validation
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

// Mock document for ensureGoogleFont (called at import time)
vi.stubGlobal('document', {
    createElement: () => ({ rel: '', href: '' }),
    head: { appendChild: vi.fn() },
});

import { FONT_FAMILIES } from './contextToolbarConstants';

describe('FONT_FAMILIES', () => {
    it('has at least 20 fonts', () => {
        expect(FONT_FAMILIES.length).toBeGreaterThanOrEqual(20);
    });

    it('all entries have fallback family', () => {
        for (const f of FONT_FAMILIES) {
            expect(f).toContain(',');
        }
    });

    it('includes Inter', () => {
        expect(FONT_FAMILIES.some(f => f.startsWith('Inter'))).toBe(true);
    });

    it('includes serif fonts', () => {
        expect(FONT_FAMILIES.some(f => f.includes('serif') && !f.includes('sans-serif'))).toBe(true);
    });

    it('includes monospace fonts', () => {
        expect(FONT_FAMILIES.some(f => f.includes('monospace'))).toBe(true);
    });
});
