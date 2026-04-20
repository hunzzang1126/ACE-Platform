// ─────────────────────────────────────────────────
// templateStore.test — Design template library tests
// ─────────────────────────────────────────────────
// ★ Cloud-only architecture: zero hardcoded templates.
// All test fixtures use inline mock data.
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useTemplateStore } from './templateStore';
import type { DesignTemplate } from './templateStore';
import type { BannerVariant } from '@/schema/design.types';

// ── Mock Fixtures ──

const mockVariant: BannerVariant = {
    id: 'v1',
    preset: { id: 'p1', name: '300x250', width: 300, height: 250, category: 'display' },
    elements: [],
    backgroundColor: '#ffffff',
    overriddenElementIds: [],
    syncLocked: false,
};

function makeMockTemplate(id: string, name: string, opts?: Partial<DesignTemplate>): DesignTemplate {
    return {
        id, name, description: '', category: 'social', tags: [],
        thumbnailSrc: '', width: 1080, height: 1080,
        variantSnapshot: JSON.stringify(mockVariant),
        usageCount: 0, isBuiltIn: false, isFavorite: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        ...opts,
    };
}

const MOCK_TEMPLATES: DesignTemplate[] = [
    makeMockTemplate('tmpl-a', 'Template A'),
    makeMockTemplate('tmpl-b', 'Template B'),
    makeMockTemplate('tmpl-c', 'Template C'),
];

// ═══════════════════════════════════════════════════
// Core CRUD
// ═══════════════════════════════════════════════════

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
        useTemplateStore.getState().saveAsTemplate({ name: 'A', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant });
        useTemplateStore.getState().saveAsTemplate({ name: 'B', category: 'social', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant });
        expect(useTemplateStore.getState().getByCategory('display').length).toBe(1);
    });

    it('searches by name', () => {
        useTemplateStore.getState().saveAsTemplate({ name: 'Holiday Sale', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant });
        expect(useTemplateStore.getState().search('holiday').length).toBe(1);
        expect(useTemplateStore.getState().search('xyz').length).toBe(0);
    });

    it('instantiates a template', () => {
        const id = useTemplateStore.getState().saveAsTemplate({ name: 'Test', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant });
        const result = useTemplateStore.getState().instantiate(id);
        expect(result).not.toBeNull();
        expect(result!.id).not.toBe(mockVariant.id);
    });

    it('tracks usage count', () => {
        const id = useTemplateStore.getState().saveAsTemplate({ name: 'Test', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant });
        useTemplateStore.getState().instantiate(id);
        useTemplateStore.getState().instantiate(id);
        expect(useTemplateStore.getState().getById(id)!.usageCount).toBe(2);
    });

    it('instantiate returns null for non-existent ID', () => {
        expect(useTemplateStore.getState().instantiate('non-existent')).toBeNull();
    });

    it('instantiate preserves element data from template', () => {
        const variantWithElements: BannerVariant = {
            ...mockVariant,
            elements: [{
                id: 'el-1', name: 'Test', type: 'text',
                constraints: { horizontal: { anchor: 'left', offset: 10 }, vertical: { anchor: 'top', offset: 10 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 30 }, rotation: 0 },
                opacity: 1, visible: true, locked: false, zIndex: 1,
                content: 'Test', fontSize: 16, fontWeight: 400, color: '#000',
            } as any],
        };
        const id = useTemplateStore.getState().saveAsTemplate({ name: 'With Elements', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: variantWithElements });
        const result = useTemplateStore.getState().instantiate(id);
        expect(result!.elements.length).toBe(1);
        expect((result!.elements[0] as any).content).toBe('Test');
    });

    it('double instantiate produces different variant IDs', () => {
        const id = useTemplateStore.getState().saveAsTemplate({ name: 'Double', category: 'display', thumbnailSrc: '', width: 300, height: 250, variant: mockVariant });
        const r1 = useTemplateStore.getState().instantiate(id);
        const r2 = useTemplateStore.getState().instantiate(id);
        expect(r1!.id).not.toBe(r2!.id);
    });
});

// ═══════════════════════════════════════════════════
// Query helpers
// ═══════════════════════════════════════════════════

describe('useTemplateStore — Query', () => {
    it('getById returns correct template', () => {
        const id = useTemplateStore.getState().saveAsTemplate({ name: 'FindMe', category: 'social', thumbnailSrc: '', width: 1080, height: 1080, variant: mockVariant });
        expect(useTemplateStore.getState().getById(id)!.name).toBe('FindMe');
    });

    it('getById returns undefined for non-existent ID', () => {
        expect(useTemplateStore.getState().getById('does-not-exist')).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════
// Template Overrides (Admin global edit system)
// ═══════════════════════════════════════════════════

describe('useTemplateStore — Template Overrides', () => {
    const overrideVariant: BannerVariant = {
        id: 'override-v1',
        preset: { id: 'p1', name: '1080x1080', width: 1080, height: 1080, category: 'social' },
        elements: [{
            id: 'el-1', name: 'Override Text', type: 'text',
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'center', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 50 }, rotation: 0 },
            opacity: 1, visible: true, locked: false, zIndex: 1,
            content: 'ADMIN EDITED', fontSize: 24, fontWeight: 700, color: '#ff0000',
        } as any],
        backgroundColor: '#111111',
        overriddenElementIds: [],
        syncLocked: false,
    };

    beforeEach(() => {
        useTemplateStore.setState({ templates: [...MOCK_TEMPLATES], templateOverrides: {}, editingTemplateId: null, editingTempCsId: null });
    });

    it('overrideTemplate saves variant snapshot locally', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        const overrides = useTemplateStore.getState().templateOverrides;
        expect(overrides['tmpl-a']).toBeDefined();
        expect(JSON.parse(overrides['tmpl-a']).backgroundColor).toBe('#111111');
    });

    it('overrideTemplate updates the template in the templates array', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        const tmpl = useTemplateStore.getState().templates.find(t => t.id === 'tmpl-a');
        expect(JSON.parse(tmpl!.variantSnapshot).backgroundColor).toBe('#111111');
    });

    it('overrideTemplate updates width and height when provided', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant, 500, 500);
        const tmpl = useTemplateStore.getState().templates.find(t => t.id === 'tmpl-a');
        expect(tmpl!.width).toBe(500);
        expect(tmpl!.height).toBe(500);
    });

    it('overrideTemplate clears editingTemplateId', () => {
        useTemplateStore.getState().setEditingTemplateId('some-id');
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        expect(useTemplateStore.getState().editingTemplateId).toBeNull();
    });

    it('clearOverride removes template entirely (cloud-only)', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        useTemplateStore.getState().clearOverride('tmpl-a');
        expect(useTemplateStore.getState().templates.find(t => t.id === 'tmpl-a')).toBeUndefined();
        expect(useTemplateStore.getState().templateOverrides['tmpl-a']).toBeUndefined();
    });

    it('clearOverride removes from templateOverrides map', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        expect(useTemplateStore.getState().templateOverrides['tmpl-a']).toBeDefined();
        useTemplateStore.getState().clearOverride('tmpl-a');
        expect(useTemplateStore.getState().templateOverrides['tmpl-a']).toBeUndefined();
    });

    it('multiple independent overrides work concurrently', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        useTemplateStore.getState().overrideTemplate('tmpl-b', { ...overrideVariant, id: 'v2', backgroundColor: '#222222' });
        const overrides = useTemplateStore.getState().templateOverrides;
        expect(Object.keys(overrides).length).toBe(2);
        expect(JSON.parse(overrides['tmpl-a']).backgroundColor).toBe('#111111');
        expect(JSON.parse(overrides['tmpl-b']).backgroundColor).toBe('#222222');
    });

    it('clearing one override does not affect another', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        useTemplateStore.getState().overrideTemplate('tmpl-b', { ...overrideVariant, id: 'v2', backgroundColor: '#222222' });
        useTemplateStore.getState().clearOverride('tmpl-a');
        expect(useTemplateStore.getState().templateOverrides['tmpl-a']).toBeUndefined();
        expect(useTemplateStore.getState().templateOverrides['tmpl-b']).toBeDefined();
    });

    it('override variant snapshot is valid JSON', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        const snapshot = useTemplateStore.getState().templateOverrides['tmpl-a'];
        expect(() => JSON.parse(snapshot)).not.toThrow();
        expect(JSON.parse(snapshot).elements[0].content).toBe('ADMIN EDITED');
    });

    it('overriding same template twice updates (not duplicates)', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        useTemplateStore.getState().overrideTemplate('tmpl-a', { ...overrideVariant, backgroundColor: '#333333' });
        const overrides = useTemplateStore.getState().templateOverrides;
        expect(Object.keys(overrides).filter(k => k === 'tmpl-a').length).toBe(1);
        expect(JSON.parse(overrides['tmpl-a']).backgroundColor).toBe('#333333');
    });

    it('instantiate uses overridden snapshot if present', () => {
        useTemplateStore.getState().overrideTemplate('tmpl-a', overrideVariant);
        const result = useTemplateStore.getState().instantiate('tmpl-a');
        expect(result!.backgroundColor).toBe('#111111');
        expect((result!.elements[0] as any).content).toBe('ADMIN EDITED');
    });

    it('syncOverridesFromCloud action exists on the store', () => {
        expect(typeof useTemplateStore.getState().syncOverridesFromCloud).toBe('function');
    });
});

// ═══════════════════════════════════════════════════
// Editing Cleanup Regression Guards
// ═══════════════════════════════════════════════════

describe('useTemplateStore — Editing Cleanup', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [...MOCK_TEMPLATES], templateOverrides: {}, editingTemplateId: null, editingTempCsId: null });
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
        useTemplateStore.getState().setEditingTemplateId(null);
        expect(useTemplateStore.getState().editingTempCsId).toBe('cs-1');
        useTemplateStore.getState().setEditingTemplateId('tmpl-2');
        useTemplateStore.getState().setEditingTempCsId(null);
        expect(useTemplateStore.getState().editingTemplateId).toBe('tmpl-2');
    });

    it('★ REGRESSION: overrideTemplate clears editingTemplateId', () => {
        useTemplateStore.getState().setEditingTemplateId('tmpl-a');
        useTemplateStore.getState().setEditingTempCsId('temp-cs-456');
        useTemplateStore.getState().overrideTemplate('tmpl-a', { ...mockVariant, backgroundColor: '#999999' });
        expect(useTemplateStore.getState().editingTemplateId).toBeNull();
        expect(useTemplateStore.getState().editingTempCsId).toBe('temp-cs-456');
    });

    it('★ REGRESSION: cleanup must be synchronous', () => {
        useTemplateStore.getState().setEditingTemplateId('tmpl-x');
        useTemplateStore.getState().setEditingTempCsId('cs-x');
        useTemplateStore.getState().setEditingTemplateId(null);
        useTemplateStore.getState().setEditingTempCsId(null);
        expect(useTemplateStore.getState().editingTemplateId).toBeNull();
        expect(useTemplateStore.getState().editingTempCsId).toBeNull();
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION: Locked State Stripping
// ═══════════════════════════════════════════════════

describe('useTemplateStore — Locked State Stripping', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [...MOCK_TEMPLATES], templateOverrides: {}, editingTemplateId: null, editingTempCsId: null });
    });

    it('★ REGRESSION: overrideTemplate strips locked:true from all elements', () => {
        const variant: BannerVariant = {
            id: 'v-locked', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' },
            elements: [
                { id: 'bg', name: 'BG', type: 'shape', shapeType: 'rectangle', constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 1080, height: 1080 }, rotation: 0 }, opacity: 1, visible: true, locked: true, zIndex: 0, fill: '#000' } as any,
                { id: 'hl', name: 'HL', type: 'text', constraints: { horizontal: { anchor: 'left', offset: 80 }, vertical: { anchor: 'top', offset: 280 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 920, height: 300 }, rotation: 0 }, opacity: 1, visible: true, locked: true, zIndex: 2, content: 'Test', fontSize: 110, fontWeight: 800, color: '#fff' } as any,
            ],
            backgroundColor: '#0a0e1a', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate('tmpl-a', variant);
        const parsed = JSON.parse(useTemplateStore.getState().templateOverrides['tmpl-a']);
        for (const el of parsed.elements) expect(el.locked).toBe(false);
    });

    it('★ REGRESSION: overrideTemplate preserves other properties when stripping locked', () => {
        const variant: BannerVariant = {
            id: 'v-props', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' },
            elements: [{ id: 'el1', name: 'Text', type: 'text', constraints: { horizontal: { anchor: 'left', offset: 50 }, vertical: { anchor: 'top', offset: 100 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 400, height: 80 }, rotation: 0 }, opacity: 0.8, visible: false, locked: true, zIndex: 3, content: 'Important', fontSize: 48, fontWeight: 600, color: '#ff0000' } as any],
            backgroundColor: '#ffffff', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate('tmpl-a', variant);
        const el = JSON.parse(useTemplateStore.getState().templateOverrides['tmpl-a']).elements[0];
        expect(el.locked).toBe(false);
        expect(el.name).toBe('Text');
        expect(el.opacity).toBe(0.8);
        expect(el.content).toBe('Important');
    });

    it('★ REGRESSION: overrideTemplate handles empty elements array', () => {
        const variant: BannerVariant = { id: 'v-empty', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' }, elements: [], backgroundColor: '#000', overriddenElementIds: [], syncLocked: false };
        useTemplateStore.getState().overrideTemplate('tmpl-a', variant);
        expect(JSON.parse(useTemplateStore.getState().templateOverrides['tmpl-a']).elements).toEqual([]);
    });

    it('★ REGRESSION: overrideTemplate does not mutate the input variant', () => {
        const variant: BannerVariant = {
            id: 'v-immutable', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' },
            elements: [{ id: 'el1', name: 'BG', type: 'shape', constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 100 }, rotation: 0 }, opacity: 1, visible: true, locked: true, zIndex: 0, fill: '#000' } as any],
            backgroundColor: '#000', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate('tmpl-a', variant);
        expect(variant.elements[0].locked).toBe(true);
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION: Template Save Data Integrity
// ═══════════════════════════════════════════════════

describe('useTemplateStore — Data Integrity', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [...MOCK_TEMPLATES], templateOverrides: {}, editingTemplateId: null, editingTempCsId: null });
    });

    it('★ REGRESSION: override captures font family changes', () => {
        const variant: BannerVariant = {
            id: 'v-font', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' },
            elements: [{ id: 'hl', name: 'HL', type: 'text', constraints: { horizontal: { anchor: 'left', offset: 80 }, vertical: { anchor: 'top', offset: 176 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 920, height: 273 }, rotation: 0 }, opacity: 1, visible: true, locked: false, zIndex: 2, content: 'Design Is not Hard', fontSize: 130, fontWeight: 800, color: '#fff', fontFamily: 'Anton' } as any],
            backgroundColor: '#0a0e1a', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate('tmpl-a', variant);
        const parsed = JSON.parse(useTemplateStore.getState().templateOverrides['tmpl-a']);
        expect(parsed.elements[0].fontFamily).toBe('Anton');
        expect(parsed.elements[0].content).toBe('Design Is not Hard');
    });

    it('★ REGRESSION: override captures position/size changes', () => {
        const variant: BannerVariant = {
            id: 'v-pos', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' },
            elements: [{ id: 'hl', name: 'HL', type: 'text', constraints: { horizontal: { anchor: 'left', offset: 200 }, vertical: { anchor: 'top', offset: 400 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 600, height: 150 }, rotation: 0 }, opacity: 1, visible: true, locked: false, zIndex: 2, content: 'Moved', fontSize: 80, fontWeight: 700, color: '#fff' } as any],
            backgroundColor: '#000', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate('tmpl-a', variant);
        const parsed = JSON.parse(useTemplateStore.getState().templateOverrides['tmpl-a']);
        expect(parsed.elements[0].constraints.horizontal.offset).toBe(200);
        expect(parsed.elements[0].constraints.size.width).toBe(600);
    });

    it('★ REGRESSION: overriding twice updates (not stale data)', () => {
        const variantA: BannerVariant = {
            id: 'v-a', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' },
            elements: [{ id: 'a1', name: 'A', type: 'text', constraints: { horizontal: { anchor: 'left', offset: 10 }, vertical: { anchor: 'top', offset: 10 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 }, rotation: 0 }, opacity: 1, visible: true, locked: false, zIndex: 1, content: 'First', fontSize: 20, fontWeight: 400, color: '#000' } as any],
            backgroundColor: '#aaa', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate('tmpl-a', variantA);
        expect(JSON.parse(useTemplateStore.getState().templateOverrides['tmpl-a']).elements[0].content).toBe('First');

        const variantB: BannerVariant = {
            id: 'v-b', preset: variantA.preset,
            elements: [{ ...variantA.elements[0], id: 'b1', content: 'Second', fontFamily: 'Montserrat' } as any],
            backgroundColor: '#bbb', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate('tmpl-a', variantB);
        const parsed = JSON.parse(useTemplateStore.getState().templateOverrides['tmpl-a']);
        expect(parsed.elements[0].content).toBe('Second');
        expect(parsed.elements[0].fontFamily).toBe('Montserrat');
    });

    it('★ REGRESSION: template preview reads updated snapshot after override', () => {
        const variant: BannerVariant = {
            id: 'v-prev', preset: { id: 'p1', name: '1080', width: 1080, height: 1080, category: 'social' },
            elements: [{ id: 'p1', name: 'Preview', type: 'text', constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'center', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 500, height: 100 }, rotation: 0 }, opacity: 1, visible: true, locked: false, zIndex: 1, content: 'EDITED CONTENT', fontSize: 64, fontWeight: 800, color: '#fff', fontFamily: 'Playfair Display' } as any],
            backgroundColor: '#1a1a2e', overriddenElementIds: [], syncLocked: false,
        };
        useTemplateStore.getState().overrideTemplate('tmpl-a', variant);
        const tmpl = useTemplateStore.getState().templates.find(t => t.id === 'tmpl-a')!;
        const previewData = JSON.parse(tmpl.variantSnapshot);
        expect(previewData.elements[0].content).toBe('EDITED CONTENT');
        expect(previewData.elements[0].fontFamily).toBe('Playfair Display');
    });
});
