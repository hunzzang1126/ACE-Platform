// ─────────────────────────────────────────────────
// templatePreviewRenderer.test.ts — Supabase-only template preview
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = readFileSync(resolve(__dirname, './templatePreviewRenderer.ts'), 'utf-8');

// ── Mock templateStore (Supabase-synced) ──

vi.mock('@/stores/templateStore', () => ({
    useTemplateStore: {
        getState: () => ({
            templates: [
                { id: 'ai-centered-stack', name: 'Centered Stack', description: 'Centered layout', variantSnapshot: '{"elements":[]}', width: 1080, height: 1080 },
                { id: 'ai-bold-headline', name: 'Bold Headline', description: 'Big headline', variantSnapshot: '{"elements":[]}', width: 1080, height: 1080 },
                { id: 'builtin-bold-dark', name: 'Bold Dark', description: 'Dark theme', variantSnapshot: '{"elements":[]}', width: 1080, height: 1080 },
            ],
        }),
    },
}));

vi.mock('@/services/templateResolver', () => ({
    resolveTemplateElements: () => [],
}));

import {
    getTemplateById,
    getTemplateByIndex,
    buildTemplateSelectionPrompt,
    clearPreviewCache,
} from './templatePreviewRenderer';

// ── Structure: no hardcoded templates ──

describe('templatePreviewRenderer — Supabase-only structure', () => {
    it('does NOT import from designTemplates (hardcoded removed)', () => {
        expect(SRC).not.toContain('designTemplates');
        expect(SRC).not.toContain('DESIGN_TEMPLATES');
    });

    it('reads from templateStore (Supabase-synced)', () => {
        expect(SRC).toContain('useTemplateStore');
        expect(SRC).toContain('getState');
    });

    it('uses resolveTemplateElements for preview rendering', () => {
        expect(SRC).toContain('resolveTemplateElements');
    });

    it('does NOT call template.build() anywhere', () => {
        expect(SRC).not.toContain('.build(');
    });
});

// ── Functional tests ──

describe('getTemplateById', () => {
    it('returns template for valid Supabase ID', () => {
        const t = getTemplateById('ai-centered-stack');
        expect(t).toBeDefined();
        expect(t!.name).toBe('Centered Stack');
    });

    it('returns undefined for deleted template', () => {
        expect(getTemplateById('ai-right-aligned')).toBeUndefined();
    });
});

describe('getTemplateByIndex', () => {
    it('returns template for 1-based index', () => {
        const t = getTemplateByIndex(1);
        expect(t).toBeDefined();
        expect(t!.id).toBe('ai-centered-stack');
    });

    it('returns undefined for out-of-range index', () => {
        expect(getTemplateByIndex(999)).toBeUndefined();
    });
});

describe('buildTemplateSelectionPrompt', () => {
    it('lists only Supabase templates', () => {
        const prompt = buildTemplateSelectionPrompt(300, 250);
        expect(prompt).toContain('Centered Stack');
        expect(prompt).toContain('Bold Headline');
        expect(prompt).not.toContain('right-aligned');
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
