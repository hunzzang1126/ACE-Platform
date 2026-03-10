// ─────────────────────────────────────────────────
// templateStore.test — Design template library tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useTemplateStore } from './templateStore';
import type { BannerVariant } from '@/schema/design.types';

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
});
