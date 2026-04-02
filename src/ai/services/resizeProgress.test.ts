// ─────────────────────────────────────────────────
// resizeProgress.test.ts — Resize orchestrator progress
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    createInitialProgress,
    updateVariantStatus,
    buildProgressMessage,
} from './resizeProgress';

describe('createInitialProgress', () => {
    it('creates progress with all variants pending', () => {
        const variants = [
            { id: 'v1', label: '300x250' },
            { id: 'v2', label: '970x250' },
        ];
        const p = createInitialProgress(variants);
        expect(p.variants).toHaveLength(2);
        expect(p.variants[0]!.status).toBe('pending');
        expect(p.variants[1]!.status).toBe('pending');
        expect(p.totalFixed).toBe(0);
    });

    it('sets phase to planning', () => {
        const p = createInitialProgress([{ id: 'v1', label: '300x250' }]);
        expect(p.phase).toBe('planning');
    });

    it('stores variant labels', () => {
        const p = createInitialProgress([{ id: 'v1', label: 'Banner 300x250' }]);
        expect(p.variants[0]!.label).toBe('Banner 300x250');
    });
});

describe('updateVariantStatus', () => {
    it('marks variant as done', () => {
        const p = createInitialProgress([{ id: 'v1', label: '300x250' }]);
        const updated = updateVariantStatus(p, 'v1', 'done');
        expect(updated.variants[0]!.status).toBe('done');
    });

    it('marks variant as error', () => {
        const p = createInitialProgress([{ id: 'v1', label: '300x250' }]);
        const updated = updateVariantStatus(p, 'v1', 'error');
        expect(updated.variants[0]!.status).toBe('error');
    });

    it('updates fixCount when provided', () => {
        const p = createInitialProgress([{ id: 'v1', label: '300x250' }]);
        const updated = updateVariantStatus(p, 'v1', 'done', 3);
        expect(updated.variants[0]!.fixCount).toBe(3);
        expect(updated.totalFixed).toBe(3);
    });

    it('sums totalFixed across all variants', () => {
        let p = createInitialProgress([
            { id: 'v1', label: '300x250' },
            { id: 'v2', label: '970x250' },
        ]);
        p = updateVariantStatus(p, 'v1', 'done', 2);
        p = updateVariantStatus(p, 'v2', 'done', 5);
        expect(p.totalFixed).toBe(7);
    });
});

describe('buildProgressMessage', () => {
    it('shows planning message', () => {
        const p = createInitialProgress([{ id: 'v1', label: '300x250' }]);
        const msg = buildProgressMessage(p);
        expect(msg).toContain('Planning');
    });

    it('shows resizing progress', () => {
        const p = createInitialProgress([{ id: 'v1', label: '300x250' }]);
        p.phase = 'resizing';
        const msg = buildProgressMessage(p);
        expect(msg).toContain('Resizing');
    });

    it('shows done message with fix count', () => {
        let p = createInitialProgress([{ id: 'v1', label: '300x250' }]);
        p = updateVariantStatus(p, 'v1', 'done', 3);
        p.phase = 'done';
        const msg = buildProgressMessage(p);
        expect(msg).toContain('Done');
        expect(msg).toContain('3');
    });

    it('shows error message', () => {
        const p = createInitialProgress([{ id: 'v1', label: '300x250' }]);
        p.phase = 'error';
        expect(buildProgressMessage(p)).toContain('Error');
    });
});
