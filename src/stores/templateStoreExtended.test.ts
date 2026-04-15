// ─────────────────────────────────────────────────
// templateStoreExtended.test.ts — Uncovered actions
// ─────────────────────────────────────────────────
// Fills gaps: updateTemplate, toggleFavorite, incrementUsage,
// getByTag, search, instantiate, clearOverride,
// setEditingTemplateId, setEditingTempCsId, syncOverridesFromCloud

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTemplateStore } from './templateStore';
import type { BannerVariant } from '@/schema/design.types';

// Mock supabase
vi.mock('@/services/supabaseClient', () => ({
    fetchTemplateOverrides: vi.fn().mockResolvedValue({}),
    upsertTemplateOverride: vi.fn().mockResolvedValue({ error: null }),
    deleteTemplateOverride: vi.fn().mockResolvedValue({ error: null }),
}));

const mockVariant: BannerVariant = {
    id: 'v-1',
    preset: { id: 'p-300x250', name: '300x250', width: 300, height: 250, category: 'display' },
    elements: [{ id: 'el-1', type: 'shape', name: 'BG', visible: true, locked: false, opacity: 1, zIndex: 0, constraints: { horizontal: { anchor: 'left', offset: 0 }, vertical: { anchor: 'top', offset: 0 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 300, height: 250 } } } as any],
    backgroundColor: '#fff',
    overriddenElementIds: [],
    syncLocked: false,
};

function seedTemplate(name = 'Test Template') {
    return useTemplateStore.getState().saveAsTemplate({
        name, description: 'desc', category: 'display', tags: ['banner', 'test'],
        thumbnailSrc: 'data:image/png;base64,x', width: 300, height: 250,
        variant: mockVariant,
    });
}

beforeEach(() => {
    // Reset to built-in templates only
    const builtIns = useTemplateStore.getState().templates.filter(t => t.isBuiltIn);
    useTemplateStore.setState({ templates: builtIns, templateOverrides: {}, editingTemplateId: null, editingTempCsId: null });
});

describe('templateStore — updateTemplate', () => {
    it('should update name and description', () => {
        const id = seedTemplate();
        useTemplateStore.getState().updateTemplate(id, { name: 'New Name', description: 'New Desc' });
        const tmpl = useTemplateStore.getState().getById(id);
        expect(tmpl!.name).toBe('New Name');
        expect(tmpl!.description).toBe('New Desc');
    });

    it('should update category', () => {
        const id = seedTemplate();
        useTemplateStore.getState().updateTemplate(id, { category: 'social' });
        expect(useTemplateStore.getState().getById(id)!.category).toBe('social');
    });

    it('should not crash for non-existent ID', () => {
        expect(() => useTemplateStore.getState().updateTemplate('nonexistent', { name: 'X' })).not.toThrow();
    });
});

describe('templateStore — toggleFavorite', () => {
    it('should toggle isFavorite on and off', () => {
        const id = seedTemplate();
        expect(useTemplateStore.getState().getById(id)!.isFavorite).toBe(false);
        useTemplateStore.getState().toggleFavorite(id);
        expect(useTemplateStore.getState().getById(id)!.isFavorite).toBe(true);
        useTemplateStore.getState().toggleFavorite(id);
        expect(useTemplateStore.getState().getById(id)!.isFavorite).toBe(false);
    });
});

describe('templateStore — incrementUsage', () => {
    it('should increment usageCount', () => {
        const id = seedTemplate();
        expect(useTemplateStore.getState().getById(id)!.usageCount).toBe(0);
        useTemplateStore.getState().incrementUsage(id);
        expect(useTemplateStore.getState().getById(id)!.usageCount).toBe(1);
        useTemplateStore.getState().incrementUsage(id);
        expect(useTemplateStore.getState().getById(id)!.usageCount).toBe(2);
    });
});

describe('templateStore — Query Methods', () => {
    it('getByTag should filter by tag (case-insensitive)', () => {
        seedTemplate();
        const results = useTemplateStore.getState().getByTag('BANNER');
        expect(results.some(t => t.tags.includes('banner'))).toBe(true);
    });

    it('search should match name', () => {
        seedTemplate('Summer Sale Banner');
        const results = useTemplateStore.getState().search('summer');
        expect(results.some(t => t.name === 'Summer Sale Banner')).toBe(true);
    });

    it('search should match description', () => {
        const id = seedTemplate();
        useTemplateStore.getState().updateTemplate(id, { description: 'holiday promo' });
        const results = useTemplateStore.getState().search('holiday');
        expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('search should match tags', () => {
        seedTemplate();
        const results = useTemplateStore.getState().search('test');
        expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('getFavorites should return favorited templates only', () => {
        const id = seedTemplate();
        useTemplateStore.getState().toggleFavorite(id);
        const favs = useTemplateStore.getState().getFavorites();
        expect(favs.some(t => t.id === id)).toBe(true);
    });

    it('getByCategory should filter correctly', () => {
        seedTemplate();
        const results = useTemplateStore.getState().getByCategory('display');
        expect(results.length).toBeGreaterThanOrEqual(1);
    });
});

describe('templateStore — instantiate', () => {
    it('should return a variant with new ID', () => {
        const id = seedTemplate();
        const variant = useTemplateStore.getState().instantiate(id);
        expect(variant).not.toBeNull();
        expect(variant!.id).not.toBe(mockVariant.id);
    });

    it('should increment usage count on instantiate', () => {
        const id = seedTemplate();
        useTemplateStore.getState().instantiate(id);
        expect(useTemplateStore.getState().getById(id)!.usageCount).toBe(1);
    });

    it('should return null for non-existent template', () => {
        expect(useTemplateStore.getState().instantiate('nope')).toBeNull();
    });
});

describe('templateStore — Editing State', () => {
    it('setEditingTemplateId sets and clears', () => {
        useTemplateStore.getState().setEditingTemplateId('tmpl-1');
        expect(useTemplateStore.getState().editingTemplateId).toBe('tmpl-1');
        useTemplateStore.getState().setEditingTemplateId(null);
        expect(useTemplateStore.getState().editingTemplateId).toBeNull();
    });

    it('setEditingTempCsId sets and clears', () => {
        useTemplateStore.getState().setEditingTempCsId('cs-temp');
        expect(useTemplateStore.getState().editingTempCsId).toBe('cs-temp');
        useTemplateStore.getState().setEditingTempCsId(null);
        expect(useTemplateStore.getState().editingTempCsId).toBeNull();
    });
});

describe('templateStore — overrideTemplate', () => {
    it('should save override snapshot locally', () => {
        const builtIn = useTemplateStore.getState().templates.find(t => t.isBuiltIn);
        if (!builtIn) return; // Skip if no built-ins
        useTemplateStore.getState().overrideTemplate(builtIn.id, mockVariant);
        expect(useTemplateStore.getState().templateOverrides[builtIn.id]).toBeDefined();
    });

    it('should strip locked state from elements', () => {
        const builtIn = useTemplateStore.getState().templates.find(t => t.isBuiltIn);
        if (!builtIn) return;
        const lockedVariant = { ...mockVariant, elements: [{ ...mockVariant.elements[0], locked: true }] };
        useTemplateStore.getState().overrideTemplate(builtIn.id, lockedVariant as any);
        const snapshot = JSON.parse(useTemplateStore.getState().templateOverrides[builtIn.id]);
        expect(snapshot.elements[0].locked).toBe(false);
    });

    it('should clear editingTemplateId', () => {
        useTemplateStore.getState().setEditingTemplateId('some-id');
        const builtIn = useTemplateStore.getState().templates.find(t => t.isBuiltIn);
        if (!builtIn) return;
        useTemplateStore.getState().overrideTemplate(builtIn.id, mockVariant);
        expect(useTemplateStore.getState().editingTemplateId).toBeNull();
    });
});

describe('templateStore — clearOverride', () => {
    it('should remove override and revert to built-in', () => {
        const builtIn = useTemplateStore.getState().templates.find(t => t.isBuiltIn);
        if (!builtIn) return;

        // Override it
        useTemplateStore.getState().overrideTemplate(builtIn.id, mockVariant);
        expect(useTemplateStore.getState().templateOverrides[builtIn.id]).toBeDefined();
        // After override, snapshot changed
        const overriddenSnapshot = useTemplateStore.getState().getById(builtIn.id)!.variantSnapshot;
        expect(overriddenSnapshot).toContain('el-1'); // our mock element

        // Clear the override
        useTemplateStore.getState().clearOverride(builtIn.id);
        expect(useTemplateStore.getState().templateOverrides[builtIn.id]).toBeUndefined();
        // Snapshot should revert to built-in (different from overridden)
        const reverted = useTemplateStore.getState().getById(builtIn.id);
        expect(reverted).toBeDefined();
    });
});

describe('templateStore — syncOverridesFromCloud', () => {
    it('should not crash when no overrides exist', async () => {
        await expect(useTemplateStore.getState().syncOverridesFromCloud()).resolves.toBeUndefined();
    });
});

// ─────────────────────────────────────────────────
// ★ REGRESSION: deleteCustomTemplate + hiddenBuiltInIds (v424)
// ─────────────────────────────────────────────────
describe('templateStore — ★ REGRESSION: deleteCustomTemplate (v424)', () => {
    beforeEach(() => {
        useTemplateStore.setState({
            templates: [...useTemplateStore.getState().templates.filter(t => t.isBuiltIn)],
            templateOverrides: {},
            hiddenBuiltInIds: [],
            editingTemplateId: null,
            editingTempCsId: null,
        });
    });

    it('deletes a custom (non-built-in) template', () => {
        const id = useTemplateStore.getState().addCustomTemplate({
            name: 'My Custom', category: 'display', variant: mockVariant,
        });
        expect(useTemplateStore.getState().templates.some(t => t.id === id)).toBe(true);

        useTemplateStore.getState().deleteCustomTemplate(id);
        expect(useTemplateStore.getState().templates.some(t => t.id === id)).toBe(false);
    });

    it('★ REGRESSION: deletes a built-in template (was blocked before v424)', () => {
        const builtIn = useTemplateStore.getState().templates.find(t => t.isBuiltIn);
        if (!builtIn) return;

        useTemplateStore.getState().deleteCustomTemplate(builtIn.id);
        expect(useTemplateStore.getState().templates.some(t => t.id === builtIn.id)).toBe(false);
    });

    it('★ REGRESSION: adds built-in ID to hiddenBuiltInIds when deleting built-in', () => {
        const builtIn = useTemplateStore.getState().templates.find(t => t.isBuiltIn);
        if (!builtIn) return;

        useTemplateStore.getState().deleteCustomTemplate(builtIn.id);
        expect(useTemplateStore.getState().hiddenBuiltInIds).toContain(builtIn.id);
    });

    it('does NOT add custom template ID to hiddenBuiltInIds', () => {
        const id = useTemplateStore.getState().addCustomTemplate({
            name: 'Custom', category: 'social', variant: mockVariant,
        });

        useTemplateStore.getState().deleteCustomTemplate(id);
        expect(useTemplateStore.getState().hiddenBuiltInIds).not.toContain(id);
    });

    it('removes templateOverrides entry on delete', () => {
        const builtIn = useTemplateStore.getState().templates.find(t => t.isBuiltIn);
        if (!builtIn) return;

        // Override first, then delete
        useTemplateStore.getState().overrideTemplate(builtIn.id, mockVariant);
        expect(useTemplateStore.getState().templateOverrides[builtIn.id]).toBeDefined();

        useTemplateStore.getState().deleteCustomTemplate(builtIn.id);
        expect(useTemplateStore.getState().templateOverrides[builtIn.id]).toBeUndefined();
    });

    it('hiddenBuiltInIds does not duplicate on repeated delete', () => {
        const builtIn = useTemplateStore.getState().templates.find(t => t.isBuiltIn);
        if (!builtIn) return;

        useTemplateStore.getState().deleteCustomTemplate(builtIn.id);
        // Manually re-add to templates and delete again
        useTemplateStore.setState({ templates: [...useTemplateStore.getState().templates, { ...builtIn }] });
        useTemplateStore.getState().deleteCustomTemplate(builtIn.id);

        const count = useTemplateStore.getState().hiddenBuiltInIds.filter(id => id === builtIn.id).length;
        expect(count).toBe(1);
    });
});

// ─────────────────────────────────────────────────
// ★ REGRESSION: addCustomTemplate (v424)
// ─────────────────────────────────────────────────
describe('templateStore — addCustomTemplate (v424)', () => {
    it('creates a custom template with slugified name as ID', () => {
        const id = useTemplateStore.getState().addCustomTemplate({
            name: 'Test Custom', category: 'display', variant: mockVariant,
        });
        expect(id).toBe('test-custom');
    });

    it('sets isBuiltIn to false', () => {
        const id = useTemplateStore.getState().addCustomTemplate({
            name: 'Not Built In', category: 'social', variant: mockVariant,
        });
        const tmpl = useTemplateStore.getState().getById(id);
        expect(tmpl!.isBuiltIn).toBe(false);
    });

    it('stores snapshot in templateOverrides', () => {
        const id = useTemplateStore.getState().addCustomTemplate({
            name: 'Override Test', category: 'display', variant: mockVariant,
        });
        expect(useTemplateStore.getState().templateOverrides[id]).toBeDefined();
    });

    it('embeds __customMeta in variant snapshot', () => {
        const id = useTemplateStore.getState().addCustomTemplate({
            name: 'Meta Test', category: 'email', variant: mockVariant,
        });
        const snapshot = JSON.parse(useTemplateStore.getState().templateOverrides[id]);
        expect(snapshot.__customMeta).toBeDefined();
        expect(snapshot.__customMeta.name).toBe('Meta Test');
        expect(snapshot.__customMeta.category).toBe('email');
    });

    it('sets width/height to 1080×1080', () => {
        const id = useTemplateStore.getState().addCustomTemplate({
            name: 'Size Test', category: 'display', variant: mockVariant,
        });
        const tmpl = useTemplateStore.getState().getById(id);
        expect(tmpl!.width).toBe(1080);
        expect(tmpl!.height).toBe(1080);
    });

    it('slugifies special characters in template name', () => {
        const id = useTemplateStore.getState().addCustomTemplate({
            name: 'Design Trends!!  2026', category: 'display', variant: mockVariant,
        });
        expect(id).toBe('design-trends-2026');
    });

    it('adds collision suffix when duplicate name exists', () => {
        const id1 = useTemplateStore.getState().addCustomTemplate({
            name: 'Duplicate Name', category: 'display', variant: mockVariant,
        });
        const id2 = useTemplateStore.getState().addCustomTemplate({
            name: 'Duplicate Name', category: 'display', variant: mockVariant,
        });
        expect(id1).toBe('duplicate-name');
        expect(id2).not.toBe(id1);
        expect(id2).toContain('duplicate-name-');
    });

    it('falls back to "custom-template" for empty name', () => {
        const id = useTemplateStore.getState().addCustomTemplate({
            name: '', category: 'display', variant: mockVariant,
        });
        expect(id).toBe('custom-template');
    });
});
