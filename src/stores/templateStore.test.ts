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

    it('clearOverride removes template entirely (cloud-only architecture)', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;

        // Override then clear
        useTemplateStore.getState().overrideTemplate(templateId, overrideVariant);
        useTemplateStore.getState().clearOverride(templateId);

        // Cloud-only: template is removed, not reverted
        const tmpl = useTemplateStore.getState().templates.find(t => t.id === templateId);
        expect(tmpl).toBeUndefined();
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

// ─────────────────────────────────────────────────
// Regression Guards — Template Editing Cleanup
// ─────────────────────────────────────────────────
describe('useTemplateStore — Editing Cleanup Regression Guards', () => {
    beforeEach(() => {
        useTemplateStore.setState({
            templates: [...BUILT_IN_TEMPLATES],
            templateOverrides: {},
            editingTemplateId: null,
            editingTempCsId: null,
        });
    });

    it('★ REGRESSION: setEditingTempCsId stores and clears correctly', () => {
        useTemplateStore.getState().setEditingTempCsId('temp-cs-123');
        expect(useTemplateStore.getState().editingTempCsId).toBe('temp-cs-123');

        useTemplateStore.getState().setEditingTempCsId(null);
        expect(useTemplateStore.getState().editingTempCsId).toBeNull();
    });

    it('★ REGRESSION: editing flags are independent from each other', () => {
        useTemplateStore.getState().setEditingTemplateId('tmpl-1');
        useTemplateStore.getState().setEditingTempCsId('cs-1');

        // Clearing template ID should NOT affect temp CS ID
        useTemplateStore.getState().setEditingTemplateId(null);
        expect(useTemplateStore.getState().editingTempCsId).toBe('cs-1');

        // And vice versa
        useTemplateStore.getState().setEditingTemplateId('tmpl-2');
        useTemplateStore.getState().setEditingTempCsId(null);
        expect(useTemplateStore.getState().editingTemplateId).toBe('tmpl-2');
    });

    it('★ REGRESSION: overrideTemplate clears editingTemplateId', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        useTemplateStore.getState().setEditingTemplateId(templateId);
        useTemplateStore.getState().setEditingTempCsId('temp-cs-456');

        useTemplateStore.getState().overrideTemplate(templateId, {
            ...mockVariant,
            backgroundColor: '#999999',
        });

        // overrideTemplate clears editingTemplateId (store responsibility)
        expect(useTemplateStore.getState().editingTemplateId).toBeNull();
        // editingTempCsId is cleared by the CALLER (DetailEditorPage), not the store
        expect(useTemplateStore.getState().editingTempCsId).toBe('temp-cs-456');
    });

    it('★ REGRESSION: cleanup must be synchronous — not deferred', () => {
        // This test validates the principle: editing flags must be clearable
        // synchronously before any navigation or state persist happens
        useTemplateStore.getState().setEditingTemplateId('tmpl-x');
        useTemplateStore.getState().setEditingTempCsId('cs-x');

        // Synchronous clear (this is what the fix enforces)
        useTemplateStore.getState().setEditingTemplateId(null);
        useTemplateStore.getState().setEditingTempCsId(null);

        // Immediately after, both should be null (no deferred behavior)
        expect(useTemplateStore.getState().editingTemplateId).toBeNull();
        expect(useTemplateStore.getState().editingTempCsId).toBeNull();
    });
});

// ─────────────────────────────────────────────────
// ★ REGRESSION: Locked State Stripping Tests
// Ensures admin can't accidentally save locked elements into templates
// ─────────────────────────────────────────────────
describe('useTemplateStore — Locked State Stripping', () => {
    beforeEach(() => {
        useTemplateStore.setState({
            templates: [...BUILT_IN_TEMPLATES],
            templateOverrides: {},
            editingTemplateId: null,
            editingTempCsId: null,
        });
    });

    it('★ REGRESSION: overrideTemplate strips locked:true from all elements', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        const variantWithLocked: BannerVariant = {
            id: 'v-locked',
            preset: { id: 'p1', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
            elements: [
                {
                    id: 'bg', name: 'Background', type: 'shape', shapeType: 'rectangle',
                    constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 1080, height: 1080 }, rotation: 0 },
                    opacity: 1, visible: true, locked: true, zIndex: 0, fill: '#000',
                } as any,
                {
                    id: 'hl', name: 'Headline', type: 'text',
                    constraints: { horizontal: { anchor: 'left', offset: 80 }, vertical: { anchor: 'top', offset: 280 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 920, height: 300 }, rotation: 0 },
                    opacity: 1, visible: true, locked: true, zIndex: 2,
                    content: 'Test', fontSize: 110, fontWeight: 800, color: '#fff',
                } as any,
            ],
            backgroundColor: '#0a0e1a',
            overriddenElementIds: [],
            syncLocked: false,
        };

        useTemplateStore.getState().overrideTemplate(templateId, variantWithLocked);

        const snapshot = useTemplateStore.getState().templateOverrides[templateId];
        const parsed = JSON.parse(snapshot);
        // ALL elements must have locked: false after save
        for (const el of parsed.elements) {
            expect(el.locked).toBe(false);
        }
    });

    it('★ REGRESSION: overrideTemplate preserves other properties when stripping locked', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        const variant: BannerVariant = {
            id: 'v-props',
            preset: { id: 'p1', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
            elements: [
                {
                    id: 'el1', name: 'Text Element', type: 'text',
                    constraints: { horizontal: { anchor: 'left', offset: 50 }, vertical: { anchor: 'top', offset: 100 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 400, height: 80 }, rotation: 0 },
                    opacity: 0.8, visible: false, locked: true, zIndex: 3,
                    content: 'Important', fontSize: 48, fontWeight: 600, color: '#ff0000',
                } as any,
            ],
            backgroundColor: '#ffffff',
            overriddenElementIds: [],
            syncLocked: false,
        };

        useTemplateStore.getState().overrideTemplate(templateId, variant);

        const snapshot = useTemplateStore.getState().templateOverrides[templateId];
        const parsed = JSON.parse(snapshot);
        const el = parsed.elements[0];
        // locked stripped
        expect(el.locked).toBe(false);
        // All other properties preserved
        expect(el.name).toBe('Text Element');
        expect(el.opacity).toBe(0.8);
        expect(el.visible).toBe(false);
        expect(el.zIndex).toBe(3);
        expect(el.content).toBe('Important');
        expect(el.fontSize).toBe(48);
        expect(el.color).toBe('#ff0000');
    });

    it('★ REGRESSION: overrideTemplate handles empty elements array', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        const variant: BannerVariant = {
            id: 'v-empty',
            preset: { id: 'p1', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
            elements: [],
            backgroundColor: '#000',
            overriddenElementIds: [],
            syncLocked: false,
        };

        useTemplateStore.getState().overrideTemplate(templateId, variant);
        const snapshot = useTemplateStore.getState().templateOverrides[templateId];
        const parsed = JSON.parse(snapshot);
        expect(parsed.elements).toEqual([]);
    });

    it('★ REGRESSION: overrideTemplate does not mutate the input variant', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        const variant: BannerVariant = {
            id: 'v-immutable',
            preset: { id: 'p1', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
            elements: [
                {
                    id: 'el1', name: 'BG', type: 'shape',
                    constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 100 }, rotation: 0 },
                    opacity: 1, visible: true, locked: true, zIndex: 0, fill: '#000',
                } as any,
            ],
            backgroundColor: '#000',
            overriddenElementIds: [],
            syncLocked: false,
        };

        useTemplateStore.getState().overrideTemplate(templateId, variant);
        // Original variant must NOT be mutated
        expect(variant.elements[0].locked).toBe(true);
    });
});

// ─────────────────────────────────────────────────
// ★ REGRESSION: Template Save Data Integrity
// Root cause: temp CS not in allCreativeSets meant
// saveToStore silently dropped edits. These tests
// ensure the override pipeline captures actual data.
// ─────────────────────────────────────────────────
describe('useTemplateStore — ★ REGRESSION: Template Save Data Integrity', () => {
    beforeEach(() => {
        useTemplateStore.setState({
            templates: [...BUILT_IN_TEMPLATES],
            templateOverrides: {},
            editingTemplateId: null,
            editingTempCsId: null,
        });
    });

    it('★ REGRESSION: override captures font family changes (not default Inter)', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        const variant: BannerVariant = {
            id: 'v-font',
            preset: { id: 'p1', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
            elements: [
                {
                    id: 'hl', name: 'Headline', type: 'text',
                    constraints: { horizontal: { anchor: 'left', offset: 80 }, vertical: { anchor: 'top', offset: 176 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 920, height: 273 }, rotation: 0 },
                    opacity: 1, visible: true, locked: false, zIndex: 2,
                    content: 'Design Is not Hard', fontSize: 130, fontWeight: 800, color: '#ffffff',
                    fontFamily: 'Anton',
                } as any,
            ],
            backgroundColor: '#0a0e1a',
            overriddenElementIds: [],
            syncLocked: false,
        };

        useTemplateStore.getState().overrideTemplate(templateId, variant);

        const snapshot = useTemplateStore.getState().templateOverrides[templateId];
        const parsed = JSON.parse(snapshot);
        expect(parsed.elements[0].fontFamily).toBe('Anton');
        expect(parsed.elements[0].fontSize).toBe(130);
        expect(parsed.elements[0].content).toBe('Design Is not Hard');
    });

    it('★ REGRESSION: override captures position/size changes', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        const variant: BannerVariant = {
            id: 'v-pos',
            preset: { id: 'p1', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
            elements: [
                {
                    id: 'hl', name: 'Headline', type: 'text',
                    constraints: {
                        horizontal: { anchor: 'left', offset: 200 },
                        vertical: { anchor: 'top', offset: 400 },
                        size: { widthMode: 'fixed', heightMode: 'fixed', width: 600, height: 150 },
                        rotation: 0,
                    },
                    opacity: 1, visible: true, locked: false, zIndex: 2,
                    content: 'Moved Text', fontSize: 80, fontWeight: 700, color: '#fff',
                } as any,
            ],
            backgroundColor: '#000',
            overriddenElementIds: [],
            syncLocked: false,
        };

        useTemplateStore.getState().overrideTemplate(templateId, variant);

        const snapshot = useTemplateStore.getState().templateOverrides[templateId];
        const parsed = JSON.parse(snapshot);
        expect(parsed.elements[0].constraints.horizontal.offset).toBe(200);
        expect(parsed.elements[0].constraints.vertical.offset).toBe(400);
        expect(parsed.elements[0].constraints.size.width).toBe(600);
        expect(parsed.elements[0].constraints.size.height).toBe(150);
    });

    it('★ REGRESSION: override reflects element deletion (fewer elements than original)', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;
        const originalParsed = JSON.parse(BUILT_IN_TEMPLATES[0].variantSnapshot);
        const originalCount = originalParsed.elements.length;

        // Simulate deleting one element: pass variant with fewer elements
        const reducedVariant: BannerVariant = {
            id: 'v-reduced',
            preset: { id: 'p1', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
            elements: originalParsed.elements.slice(0, -1), // Remove last element
            backgroundColor: originalParsed.backgroundColor,
            overriddenElementIds: [],
            syncLocked: false,
        };

        useTemplateStore.getState().overrideTemplate(templateId, reducedVariant);

        const snapshot = useTemplateStore.getState().templateOverrides[templateId];
        const parsed = JSON.parse(snapshot);
        expect(parsed.elements.length).toBe(originalCount - 1);
    });

    it('★ REGRESSION: overrideTemplate snapshot matches the variant passed (not stale data)', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;

        // First override with data A
        const variantA: BannerVariant = {
            id: 'v-a', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' },
            elements: [{ id: 'a1', name: 'A', type: 'text', constraints: { horizontal: { anchor: 'left', offset: 10 }, vertical: { anchor: 'top', offset: 10 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 }, rotation: 0 }, opacity: 1, visible: true, locked: false, zIndex: 1, content: 'First', fontSize: 20, fontWeight: 400, color: '#000' } as any],
            backgroundColor: '#aaa', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate(templateId, variantA);
        expect(JSON.parse(useTemplateStore.getState().templateOverrides[templateId]).elements[0].content).toBe('First');

        // Second override with data B
        const variantB: BannerVariant = {
            id: 'v-b', preset: variantA.preset,
            elements: [{ ...variantA.elements[0], id: 'b1', content: 'Second', fontFamily: 'Montserrat' } as any],
            backgroundColor: '#bbb', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate(templateId, variantB);

        const parsed = JSON.parse(useTemplateStore.getState().templateOverrides[templateId]);
        expect(parsed.elements[0].content).toBe('Second');
        expect(parsed.elements[0].fontFamily).toBe('Montserrat');
        expect(parsed.backgroundColor).toBe('#bbb');
    });

    it('★ REGRESSION: template preview reads updated snapshot after override', () => {
        const templateId = BUILT_IN_TEMPLATES[0].id;

        const editedVariant: BannerVariant = {
            id: 'v-preview', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' },
            elements: [{ id: 'p1', name: 'Preview', type: 'text', constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'center', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 500, height: 100 }, rotation: 0 }, opacity: 1, visible: true, locked: false, zIndex: 1, content: 'EDITED CONTENT', fontSize: 64, fontWeight: 800, color: '#fff', fontFamily: 'Playfair Display' } as any],
            backgroundColor: '#1a1a2e', overriddenElementIds: [], syncLocked: false,
        };

        useTemplateStore.getState().overrideTemplate(templateId, editedVariant);

        // Simulate what TemplatePreview does: read template.variantSnapshot
        const tmpl = useTemplateStore.getState().templates.find(t => t.id === templateId)!;
        const previewData = JSON.parse(tmpl.variantSnapshot);

        expect(previewData.elements[0].content).toBe('EDITED CONTENT');
        expect(previewData.elements[0].fontFamily).toBe('Playfair Display');
        expect(previewData.elements[0].fontSize).toBe(64);
        expect(previewData.backgroundColor).toBe('#1a1a2e');
    });
});

