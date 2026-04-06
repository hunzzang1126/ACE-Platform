// ─────────────────────────────────────────────────
// templatePreviewRenderer.test.ts — Template preview utilities
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/designTemplates', () => ({
    DESIGN_TEMPLATES: [
        { id: 't1', name: 'Bold Hero', category: 'hero', description: 'Test template',
          generate: () => ({ elements: [], background: '#000' }) },
        { id: 't2', name: 'Minimal Card', category: 'card', description: 'Minimal',
          generate: () => ({ elements: [], background: '#fff' }) },
    ],
}));
vi.mock('@/services/designStyleGuides', () => ({}));

import {
    getTemplateById,
    getTemplateByIndex,
    buildTemplateSelectionPrompt,
    clearPreviewCache,
} from './templatePreviewRenderer';

describe('getTemplateById', () => {
    it('returns template for valid id', () => {
        const t = getTemplateById('t1');
        expect(t).toBeDefined();
        expect(t!.name).toBe('Bold Hero');
    });

    it('returns undefined for invalid id', () => {
        expect(getTemplateById('nonexistent')).toBeUndefined();
    });
});

describe('getTemplateByIndex', () => {
    it('returns template for valid index (1-based)', () => {
        const t = getTemplateByIndex(1);
        expect(t).toBeDefined();
        expect(t!.id).toBe('t1');
    });

    it('returns undefined for out-of-range index', () => {
        expect(getTemplateByIndex(999)).toBeUndefined();
    });

    it('returns undefined for negative index', () => {
        expect(getTemplateByIndex(-1)).toBeUndefined();
    });
});

describe('buildTemplateSelectionPrompt', () => {
    it('returns string with template names', () => {
        const prompt = buildTemplateSelectionPrompt(300, 250);
        expect(prompt).toContain('Bold Hero');
        expect(prompt).toContain('Minimal Card');
    });

    it('includes canvas dimensions', () => {
        const prompt = buildTemplateSelectionPrompt(728, 90);
        expect(prompt).toContain('728');
        expect(prompt).toContain('90');
    });
});

describe('clearPreviewCache', () => {
    it('runs without error', () => {
        expect(() => clearPreviewCache()).not.toThrow();
    });
});
