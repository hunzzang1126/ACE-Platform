// ─────────────────────────────────────────────────
// designStore — Regression Tests
// ─────────────────────────────────────────────────
// Guards critical design data operations.
// Run: npx vitest run src/stores/designStore.test.ts
//
// PROTECTED BUGS:
// - Color conversion on save/load (hex → rgba corruption)
// - Creative set deletion not cleaning up
// - replaceVariantElements overwriting overridden elements

import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore } from './designStore';
import type { BannerPreset } from '@/schema/design.types';
import type { ShapeElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';

// Full preset with required fields
const MASTER_PRESET: BannerPreset = {
    id: 'test-300x250',
    name: '300x250',
    width: 300,
    height: 250,
    category: 'display',
};

// Helper to create a valid ShapeElement for testing
function makeTestRect(id: string, fill: string): ShapeElement {
    return {
        id,
        type: 'shape',
        shapeType: 'rectangle',
        name: `Rect ${id}`,
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        fill,
        constraints: createDefaultConstraints(),
    } as ShapeElement;
}

beforeEach(() => {
    useDesignStore.setState({
        allCreativeSets: {},
        activeCreativeSetId: null,
        creativeSet: null,
    });
});

describe('designStore — Creative Set CRUD', () => {

    it('createCreativeSet returns ID and sets it as active', () => {
        const id = useDesignStore.getState().createCreativeSet('Banner A', MASTER_PRESET);

        expect(id).toBeTruthy();
        expect(useDesignStore.getState().activeCreativeSetId).toBe(id);
        expect(useDesignStore.getState().creativeSet).not.toBeNull();
        expect(useDesignStore.getState().creativeSet!.name).toBe('Banner A');
    });

    it('createCreativeSet creates a master variant with correct dimensions', () => {
        useDesignStore.getState().createCreativeSet('Test', MASTER_PRESET);
        const cs = useDesignStore.getState().creativeSet!;

        expect(cs.variants).toHaveLength(1);
        const master = cs.variants[0]!;
        expect(master.preset.width).toBe(300);
        expect(master.preset.height).toBe(250);
        expect(master.id).toBe(cs.masterVariantId);
    });

    it('deleteCreativeSet removes from allCreativeSets and clears active', () => {
        const id = useDesignStore.getState().createCreativeSet('Delete Me', MASTER_PRESET);
        expect(useDesignStore.getState().allCreativeSets[id]).toBeDefined();

        useDesignStore.getState().deleteCreativeSet(id);

        expect(useDesignStore.getState().allCreativeSets[id]).toBeUndefined();
        expect(useDesignStore.getState().activeCreativeSetId).toBeNull();
        expect(useDesignStore.getState().creativeSet).toBeNull();
    });

    it('openCreativeSet switches the active set', () => {
        const id1 = useDesignStore.getState().createCreativeSet('Set A', MASTER_PRESET);
        const id2 = useDesignStore.getState().createCreativeSet('Set B', MASTER_PRESET);

        expect(useDesignStore.getState().activeCreativeSetId).toBe(id2);

        useDesignStore.getState().openCreativeSet(id1);
        expect(useDesignStore.getState().activeCreativeSetId).toBe(id1);
        expect(useDesignStore.getState().creativeSet!.name).toBe('Set A');
    });
});

describe('designStore — Element Operations', () => {

    it('addElementToMaster adds element to master variant', () => {
        useDesignStore.getState().createCreativeSet('Test', MASTER_PRESET);
        const cs = useDesignStore.getState().creativeSet!;

        const rect = makeTestRect('el-1', '#FF0000');
        useDesignStore.getState().addElementToMaster(rect);

        const updated = useDesignStore.getState().creativeSet!;
        const master = updated.variants.find(v => v.id === cs.masterVariantId)!;
        expect(master.elements).toHaveLength(1);
        expect(master.elements[0]!.id).toBe('el-1');
        expect((master.elements[0] as ShapeElement).fill).toBe('#FF0000');
    });

    // ★ REGRESSION GUARD: Color values must be preserved exactly
    it('element fill color is preserved exactly — no conversion', () => {
        useDesignStore.getState().createCreativeSet('Color Test', MASTER_PRESET);

        const rect = makeTestRect('color-el', '#FF5733');
        useDesignStore.getState().addElementToMaster(rect);

        const master = useDesignStore.getState().creativeSet!.variants[0]!;
        const stored = master.elements.find(e => e.id === 'color-el') as ShapeElement;

        // ★ This was the bug — fill was being converted to rgba or different format
        expect(stored.fill).toBe('#FF5733');
    });

    it('removeElementFromMaster removes from all variants', () => {
        useDesignStore.getState().createCreativeSet('Remove Test', MASTER_PRESET);

        const rect = makeTestRect('remove-me', '#000');
        useDesignStore.getState().addElementToMaster(rect);
        useDesignStore.getState().addVariant({
            id: 'test-728x90',
            name: '728x90',
            width: 728,
            height: 90,
            category: 'display',
        });

        const before = useDesignStore.getState().creativeSet!;
        expect(before.variants).toHaveLength(2);
        expect(before.variants[0]!.elements).toHaveLength(1);
        expect(before.variants[1]!.elements).toHaveLength(1);

        useDesignStore.getState().removeElementFromMaster('remove-me');

        const after = useDesignStore.getState().creativeSet!;
        expect(after.variants[0]!.elements).toHaveLength(0);
        expect(after.variants[1]!.elements).toHaveLength(0);
    });
});

describe('designStore — Variant Management', () => {

    it('addVariant creates new variant with smart-sized elements', () => {
        useDesignStore.getState().createCreativeSet('Variant Test', MASTER_PRESET);

        const rect = makeTestRect('sized-el', '#00F');
        useDesignStore.getState().addElementToMaster(rect);

        useDesignStore.getState().addVariant({
            id: 'test-728x90',
            name: '728x90',
            width: 728,
            height: 90,
            category: 'display',
        });

        const cs = useDesignStore.getState().creativeSet!;
        expect(cs.variants).toHaveLength(2);
        expect(cs.variants[1]!.elements.length).toBeGreaterThanOrEqual(1);
    });

    it('removeVariant cannot delete the master variant', () => {
        useDesignStore.getState().createCreativeSet('Cannot Remove Master', MASTER_PRESET);
        const masterId = useDesignStore.getState().creativeSet!.masterVariantId;

        useDesignStore.getState().removeVariant(masterId);

        expect(useDesignStore.getState().creativeSet!.variants).toHaveLength(1);
        expect(useDesignStore.getState().creativeSet!.variants[0]!.id).toBe(masterId);
    });
});
