// ─────────────────────────────────────────────────
// bottomPanelHelpers.test.ts — Label & icon helpers
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { BAR_COLORS, nodeLabel, nodeIcon } from './bottomPanelHelpers';

describe('BAR_COLORS', () => {
    it('has 7 colors', () => {
        expect(BAR_COLORS).toHaveLength(7);
    });

    it('all are valid hex colors', () => {
        for (const c of BAR_COLORS) {
            expect(c).toMatch(/^#[0-9a-f]{6}$/i);
        }
    });
});

describe('nodeLabel', () => {
    it('returns name for named nodes', () => {
        expect(nodeLabel({ name: 'Background', type: 'shape', id: 1 } as any)).toBe('Background');
    });

    it('returns type-based label for unnamed nodes', () => {
        const label = nodeLabel({ name: '', type: 'text', id: 1 } as any);
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
    });
});

describe('nodeIcon', () => {
    it('returns icon for text type', () => {
        const icon = nodeIcon('text');
        expect(typeof icon).toBe('string');
    });

    it('returns icon for shape type', () => {
        const icon = nodeIcon('shape');
        expect(typeof icon).toBe('string');
    });

    it('returns icon for image type', () => {
        const icon = nodeIcon('image');
        expect(typeof icon).toBe('string');
    });

    it('returns fallback for unknown type', () => {
        const icon = nodeIcon('unknown');
        expect(typeof icon).toBe('string');
    });
});
