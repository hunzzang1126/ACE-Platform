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

// ─────────────────────────────────────────────────
// Template Override Tests (Admin global edit system)
// ─────────────────────────────────────────────────
describe('useTemplateStore — Template Overrides', () => {
    beforeEach(() => {
        // Seed with built-in templates
        useTemplateStore.setState({
            templates: [...BUILT_IN_TEMPLATES],
            templateOverrides: {},
            editingTemplateId: null,
            editingTempCsId: null,
        });
    });

    const overrideVariant: BannerVariant = {
        id: 'override-v1',
        preset: { id: 'p1', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
        elements: [
            {
                id: 'el-override-1', name: 'Override Text', type: 'text',
                constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'center', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 50 }, rotation: 0 },
                opacity: 1, visible: true, locked: false, zIndex: 1,
                content: 'ADMIN EDITED', fontSize: 24, fontWeight: 700, color: '#ff0000',
            } as any,
        ],
        backgroundColor: '#111111',
        overriddenElementIds: [],
        syncLocked: false,
    };

    it('overrideTemplate saves variant snapshot locally', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant);

        const overrides = useTemplateStore.getState().templateOverrides;
        expect(overrides[templateId]).toBeDefined();
        expect(JSON.parse(overrides[templateId]).backgroundColor).toBe('#111111');
    });

    it('overrideTemplate updates the template in the templates array', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        const originalSnapshot = BUILT_IN_TEMPLATES[0].variantSnapshot;

        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant);

        const tmpl = useTemplateStore.getState().templates.find(t => t.id === templateId);
        expect(tmpl).toBeDefined();
        expect(tmpl!.variantSnapshot).not.toBe(originalSnapshot);
        expect(JSON.parse(tmpl!.variantSnapshot).backgroundColor).toBe('#111111');
    });

    it('overrideTemplate updates width and height when provided', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant, 500, 500);

        const tmpl = useTemplateStore.getState().templates.find(t => t.id === templateId);
        expect(tmpl!.width).toBe(500);
        expect(tmpl!.height).toBe(500);
    });

    it('overrideTemplate clears editingTemplateId', () => {
        useTemplateStore.getState().setEditingTemplateId('some-id');
        expect(useTemplateStore.getState().editingTemplateId).toBe('some-id');

        const templateId = BUILT_IN_TEMPLATES[0].id;
        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant);
        expect(useTemplateStore.getState().editingTemplateId).toBeNull();
    });

    it('clearOverride reverts template to built-in default', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        const originalSnapshot = BUILT_IN_TEMPLATES[0].variantSnapshot;

        // Override then clear
        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant);
        useTemplateStore.getState().clearOverride(templateId);

        const tmpl = useTemplateStore.getState().templates.find(t => t.id === templateId);
        expect(tmpl!.variantSnapshot).toBe(originalSnapshot);
        expect(useTemplateStore.getState().templateOverrides[templateId]).toBeUndefined();
    });

    it('clearOverride removes from templateOverrides map', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant);
        expect(useTemplateStore.getState().templateOverrides[templateId]).toBeDefined();

        useTemplateStore.getState().clearOverride(templateId);
        expect(useTemplateStore.getState().templateOverrides[templateId]).toBeUndefined();
    });

    it('multiple independent overrides work concurrently', () => {
        const id1 = BUILT_IN_TEMPLATES[0].id;
        const id2 = BUILT_IN_TEMPLATES[1].id;

        useTemplateStore.getState().overrideTemplate(id1, overrideVariant);
        useTemplateStore.getState().overrideTemplate(id2, {
            ...overrideVariant, id: 'override-v2', backgroundColor: '#222222',
        });

        const overrides = useTemplateStore.getState().templateOverrides;
        expect(Object.keys(overrides).length).toBe(2);
        expect(JSON.parse(overrides[id1]).backgroundColor).toBe('#111111');
        expect(JSON.parse(overrides[id2]).backgroundColor).toBe('#222222');
    });

    it('clearing one override does not affect another', () => {
        const id1 = BUILT_IN_TEMPLATES[0].id;
        const id2 = BUILT_IN_TEMPLATES[1].id;

        useTemplateStore.getState().overrideTemplate(id1, overrideVariant);
        useTemplateStore.getState().overrideTemplate(id2, {
            ...overrideVariant, id: 'override-v2', backgroundColor: '#222222',
        });

        useTemplateStore.getState().clearOverride(id1);
        expect(useTemplateStore.getState().templateOverrides[id1]).toBeUndefined();
        expect(useTemplateStore.getState().templateOverrides[id2]).toBeDefined();
    });

    it('override variant snapshot is valid JSON', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant);

        const snapshot = useTemplateStore.getState().templateOverrides[templateId];
        expect(() => JSON.parse(snapshot)).not.toThrow();
        const parsed = JSON.parse(snapshot);
        expect(parsed.elements).toBeInstanceOf(Array);
        expect(parsed.elements[0].content).toBe('ADMIN EDITED');
    });

    it('overriding same template twice updates (not duplicates)', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;

        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant);
        useTemplateStore.getState().overrideTemplate(templateId, {
            ...overrideVariant, backgroundColor: '#333333',
        });

        const overrides = useTemplateStore.getState().templateOverrides;
        // Only one entry, not two
        expect(Object.keys(overrides).filter(k => k === templateId).length).toBe(1);
        expect(JSON.parse(overrides[templateId]).backgroundColor).toBe('#333333');
    });

    it('instantiate uses overridden snapshot if present', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant);

        const result = useTemplateStore.getState().instantiate(templateId);
        expect(result).not.toBeNull();
        expect(result!.backgroundColor).toBe('#111111');
        expect(result!.elements[0]).toBeDefined();
        expect((result!.elements[0] as any).content).toBe('ADMIN EDITED');
    });

    it('syncOverridesFromCloud action exists on the store', () => {
        expect(typeof useTemplateStore.getState().syncOverridesFromCloud).toBe('function');
    });
});
