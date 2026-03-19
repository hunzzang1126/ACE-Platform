// ─────────────────────────────────────────────────
// templateStore.test — Design template library tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useTemplateStore } from './templateStore';
import type { BannerVariant } from '@/schema/design.types';
import { BUILT_IN_TEMPLATES } from './builtInTemplates';

const mockVariant: BannerVariant = {
    id: 'v1',
    preset: { id: 'p1', name: '300x250', width: 300, height: 250, category: 'display' },
    elements: [],
    backgroundColor: '#ffffff',
    overriddenElementIds: [],
    syncLocked: false,
};

describe('useTemplateStore', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [] });
    });

    it('saves a template', () => {
        const id = useTemplateStore.getState().saveAsTemplate({
            name: 'Test', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant,
        });
        expect(id).toBeTruthy();
        expect(useTemplateStore.getState().templates.length).toBe(1);
    });

    it('deletes a template', () => {
        const id = useTemplateStore.getState().saveAsTemplate({
            name: 'Test', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant,
        });
        useTemplateStore.getState().deleteTemplate(id);
        expect(useTemplateStore.getState().templates.length).toBe(0);
    });

    it('toggles favorite', () => {
        const id = useTemplateStore.getState().saveAsTemplate({
            name: 'Test', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant,
        });
        useTemplateStore.getState().toggleFavorite(id);
        expect(useTemplateStore.getState().getFavorites().length).toBe(1);
    });

    it('gets by category', () => {
        useTemplateStore.getState().saveAsTemplate({
            name: 'A', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant,
        });
        useTemplateStore.getState().saveAsTemplate({
            name: 'B', category: 'social', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant,
        });
        expect(useTemplateStore.getState().getByCategory('display').length).toBe(1);
    });

    it('searches by name', () => {
        useTemplateStore.getState().saveAsTemplate({
            name: 'Holiday Sale', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant,
        });
        expect(useTemplateStore.getState().search('holiday').length).toBe(1);
        expect(useTemplateStore.getState().search('xyz').length).toBe(0);
    });

    it('instantiates a template', () => {
        const id = useTemplateStore.getState().saveAsTemplate({
            name: 'Test', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant,
        });
        const result = useTemplateStore.getState().instantiate(id);
        expect(result).not.toBeNull();
        expect(result!.id).not.toBe(mockVariant.id); // new ID
    });

    it('tracks usage count', () => {
        const id = useTemplateStore.getState().saveAsTemplate({
            name: 'Test', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant,
        });
        useTemplateStore.getState().instantiate(id);
        useTemplateStore.getState().instantiate(id);
        const tmpl = useTemplateStore.getState().getById(id);
        expect(tmpl!.usageCount).toBe(2);
    });

    it('instantiate returns null for non-existent ID', () => {
        const result = useTemplateStore.getState().instantiate('non-existent');
        expect(result).toBeNull();
    });

    it('instantiate preserves element data from template', () => {
        // Add a template with some elements
        const variantWithElements: BannerVariant = {
            ...mockVariant,
            elements: [
                {
                    id: 'original-el-1', name: 'Test Element', type: 'text',
                    constraints: { horizontal: { anchor: 'left', offset: 10 }, vertical: { anchor: 'top', offset: 10 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 30 }, rotation: 0 },
                    opacity: 1, visible: true, locked: false, zIndex: 1,
                    content: 'Test', fontSize: 16, fontWeight: 400, color: '#000',
                } as any,
            ],
        };
        const id = useTemplateStore.getState().saveAsTemplate({
            name: 'With Elements', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: variantWithElements,
        });

        const result = useTemplateStore.getState().instantiate(id);
        expect(result).not.toBeNull();
        // Elements should be preserved in the instantiated variant
        expect(result!.elements.length).toBe(1);
        expect((result!.elements[0] as any).content).toBe('Test');
    });

    it('double instantiate produces different variant IDs', () => {
        const id = useTemplateStore.getState().saveAsTemplate({
            name: 'Double', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant,
        });
        const r1 = useTemplateStore.getState().instantiate(id);
        const r2 = useTemplateStore.getState().instantiate(id);
        expect(r1).not.toBeNull();
        expect(r2).not.toBeNull();
        expect(r1!.id).not.toBe(r2!.id);
    });
});

// ─────────────────────────────────────────────────
// Built-in Template Integration Tests
// ─────────────────────────────────────────────────
describe('useTemplateStore — Built-in Templates', () => {
    it('built-in templates are valid and can be seeded', () => {
        useTemplateStore.setState({ templates: [...BUILT_IN_TEMPLATES] });
        const templates = useTemplateStore.getState().templates;
        const builtIns = templates.filter(t => t.isBuiltIn);
        expect(builtIns.length).toBeGreaterThanOrEqual(17);
    });

    it('getById returns correct template', () => {
        const id = useTemplateStore.getState().saveAsTemplate({
            name: 'FindMe', category: 'social', thumbnailSrc: '', width: 1080, height: 1080, variant: mockVariant,
        });
        const result = useTemplateStore.getState().getById(id);
        expect(result).not.toBeNull();
        expect(result!.name).toBe('FindMe');
        expect(result!.category).toBe('social');
    });

    it('getById returns undefined for non-existent ID', () => {
        const result = useTemplateStore.getState().getById('does-not-exist');
        expect(result).toBeUndefined();
    });
});
