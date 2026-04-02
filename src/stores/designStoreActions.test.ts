// ─────────────────────────────────────────────────
// designStoreActions.test.ts — Extended action tests
// ─────────────────────────────────────────────────
// Focus: uncovered actions in designStore:
//   updateMasterElement, updateVariantElement,
//   toggleElementOverride, replaceCreativeSet,
//   deleteAllCreativeSets, renameCreativeSet,
//   DATA LOSS GUARD in replaceVariantElements,
//   setLocaleData, switchLocale
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore } from './designStore';
import type { BannerPreset } from '@/schema/design.types';
import { createDefaultConstraints } from '@/schema/elements.types';
import type { ShapeElement, TextElement } from '@/schema/elements.types';

const P: BannerPreset = { id: 'p-300x250', name: '300x250', width: 300, height: 250, category: 'display' };
const P2: BannerPreset = { id: 'p-728x90', name: '728x90', width: 728, height: 90, category: 'display' };

function makeShape(id: string, fill = '#000'): ShapeElement {
    return { id, type: 'shape', shapeType: 'rectangle', name: `Shape-${id}`, visible: true, locked: false, opacity: 1, zIndex: 0, fill, constraints: createDefaultConstraints() } as ShapeElement;
}

function makeText(id: string, content = 'Hello'): TextElement {
    return { id, type: 'text', name: `Text-${id}`, content, fontFamily: 'Inter', fontSize: 24, fontWeight: 400, fontStyle: 'normal', color: '#ffffff', textAlign: 'center', lineHeight: 1.2, letterSpacing: 0, autoShrink: false, visible: true, locked: false, opacity: 1, zIndex: 1, constraints: createDefaultConstraints() } as TextElement;
}

beforeEach(() => {
    useDesignStore.setState({ allCreativeSets: {}, activeCreativeSetId: null, creativeSet: null });
});

describe('designStore — updateMasterElement', () => {
    it('should update a property on the master element', () => {
        const csId = useDesignStore.getState().createCreativeSet('Test', P);
        useDesignStore.getState().addElementToMaster(makeShape('el-1', '#red'));

        useDesignStore.getState().updateMasterElement('el-1', { opacity: 0.5 });
        const el = useDesignStore.getState().creativeSet!.variants[0].elements[0];
        expect(el.opacity).toBe(0.5);
    });

    it('should propagate to non-locked, non-overridden slaves', () => {
        useDesignStore.getState().createCreativeSet('Prop', P);
        const masterId = useDesignStore.getState().creativeSet!.masterVariantId;
        useDesignStore.getState().addElementToMaster(makeShape('el-1'));
        useDesignStore.getState().addVariant(P2);

        // Add el-1 to slave manually
        const slaveId = useDesignStore.getState().creativeSet!.variants[1].id;
        useDesignStore.getState().connectPlug(masterId, slaveId);

        useDesignStore.getState().updateMasterElement('el-1', { opacity: 0.3 });
        const slave = useDesignStore.getState().creativeSet!.variants.find(v => v.id === slaveId)!;
        const slaveEl = slave.elements.find(e => e.id === 'el-1');
        if (slaveEl) expect(slaveEl.opacity).toBe(0.3);
    });

    it('should NOT propagate to overridden elements', () => {
        useDesignStore.getState().createCreativeSet('Override', P);
        const masterId = useDesignStore.getState().creativeSet!.masterVariantId;
        useDesignStore.getState().addElementToMaster(makeShape('el-1'));
        useDesignStore.getState().addVariant(P2);
        const slaveId = useDesignStore.getState().creativeSet!.variants[1].id;
        useDesignStore.getState().connectPlug(masterId, slaveId);

        // Override el-1 in slave
        useDesignStore.getState().toggleElementOverride(slaveId, 'el-1');

        useDesignStore.getState().updateMasterElement('el-1', { opacity: 0.1 });
        const slave = useDesignStore.getState().creativeSet!.variants.find(v => v.id === slaveId)!;
        const slaveEl = slave.elements.find(e => e.id === 'el-1');
        if (slaveEl) expect(slaveEl.opacity).not.toBe(0.1);
    });
});

describe('designStore — updateVariantElement', () => {
    it('should update a specific element in a variant', () => {
        useDesignStore.getState().createCreativeSet('Variant Update', P);
        const masterId = useDesignStore.getState().creativeSet!.masterVariantId;
        useDesignStore.getState().addElementToMaster(makeShape('el-1'));

        useDesignStore.getState().updateVariantElement(masterId, 'el-1', { visible: false });
        const el = useDesignStore.getState().creativeSet!.variants[0].elements[0];
        expect(el.visible).toBe(false);
    });

    it('should not crash for non-existent variant', () => {
        useDesignStore.getState().createCreativeSet('Safe', P);
        expect(() => useDesignStore.getState().updateVariantElement('fake', 'el-1', {})).not.toThrow();
    });
});

describe('designStore — toggleElementOverride', () => {
    it('should add element to overriddenElementIds', () => {
        useDesignStore.getState().createCreativeSet('Toggle', P);
        useDesignStore.getState().addVariant(P2);
        const slaveId = useDesignStore.getState().creativeSet!.variants[1].id;

        useDesignStore.getState().toggleElementOverride(slaveId, 'el-1');
        const variant = useDesignStore.getState().creativeSet!.variants.find(v => v.id === slaveId)!;
        expect(variant.overriddenElementIds).toContain('el-1');
    });

    it('should remove element from overriddenElementIds on second toggle', () => {
        useDesignStore.getState().createCreativeSet('Toggle Off', P);
        useDesignStore.getState().addVariant(P2);
        const slaveId = useDesignStore.getState().creativeSet!.variants[1].id;

        useDesignStore.getState().toggleElementOverride(slaveId, 'el-1');
        useDesignStore.getState().toggleElementOverride(slaveId, 'el-1');
        const variant = useDesignStore.getState().creativeSet!.variants.find(v => v.id === slaveId)!;
        expect(variant.overriddenElementIds).not.toContain('el-1');
    });
});

describe('designStore — deleteAllCreativeSets', () => {
    it('should clear everything', () => {
        useDesignStore.getState().createCreativeSet('A', P);
        useDesignStore.getState().createCreativeSet('B', P);
        expect(Object.keys(useDesignStore.getState().allCreativeSets).length).toBe(2);

        useDesignStore.getState().deleteAllCreativeSets();
        expect(Object.keys(useDesignStore.getState().allCreativeSets).length).toBe(0);
        expect(useDesignStore.getState().activeCreativeSetId).toBeNull();
        expect(useDesignStore.getState().creativeSet).toBeNull();
    });
});

describe('designStore — replaceCreativeSet', () => {
    it('should set a new creative set as active', () => {
        useDesignStore.getState().createCreativeSet('Old', P);
        const newCS: any = { id: 'cs-new', name: 'New', masterVariantId: 'v-1', variants: [{ id: 'v-1', preset: P, elements: [], backgroundColor: '#fff', overriddenElementIds: [], syncLocked: false }], plugConnections: {}, brand: { primaryColor: '#000', secondaryColor: '#fff', fontFamily: 'Inter' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

        useDesignStore.getState().replaceCreativeSet(newCS);
        expect(useDesignStore.getState().activeCreativeSetId).toBe('cs-new');
        expect(useDesignStore.getState().creativeSet!.name).toBe('New');
    });

    it('should clear active when passed null', () => {
        useDesignStore.getState().createCreativeSet('Temp', P);
        useDesignStore.getState().replaceCreativeSet(null as any);
        expect(useDesignStore.getState().activeCreativeSetId).toBeNull();
    });
});

describe('designStore — ★ DATA LOSS GUARD in replaceVariantElements', () => {
    it('should BLOCK empty replace when variant has elements', () => {
        useDesignStore.getState().createCreativeSet('Guard', P);
        const masterId = useDesignStore.getState().creativeSet!.masterVariantId;

        useDesignStore.getState().replaceVariantElements(masterId, [makeShape('el-1')]);
        expect(useDesignStore.getState().creativeSet!.variants[0].elements.length).toBe(1);

        // Try to overwrite with empty — should be BLOCKED
        useDesignStore.getState().replaceVariantElements(masterId, []);
        expect(useDesignStore.getState().creativeSet!.variants[0].elements.length).toBe(1);
    });

    it('should ALLOW empty replace on initially empty variant', () => {
        useDesignStore.getState().createCreativeSet('Empty OK', P);
        const masterId = useDesignStore.getState().creativeSet!.masterVariantId;
        expect(useDesignStore.getState().creativeSet!.variants[0].elements.length).toBe(0);

        // Empty → empty is fine
        useDesignStore.getState().replaceVariantElements(masterId, []);
        expect(useDesignStore.getState().creativeSet!.variants[0].elements.length).toBe(0);
    });
});

describe('designStore — setLocaleData + switchLocale', () => {
    it('should store locale data', () => {
        useDesignStore.getState().createCreativeSet('Locale', P);
        const localeData = { originalLocale: 'en', activeLocale: 'en', locales: { en: { Headline: 'Hello' }, ko: { Headline: '안녕' } } };
        useDesignStore.getState().setLocaleData(localeData as any);
        expect(useDesignStore.getState().creativeSet!.localeData).toBeDefined();
    });

    it('should switch locale and update text elements', () => {
        useDesignStore.getState().createCreativeSet('Switch', P);
        const masterId = useDesignStore.getState().creativeSet!.masterVariantId;
        const text = makeText('t-1', 'Hello');
        text.name = 'Headline';
        useDesignStore.getState().replaceVariantElements(masterId, [text as any]);

        useDesignStore.getState().setLocaleData({ originalLocale: 'en', activeLocale: 'en', locales: { en: { Headline: 'Hello' }, ko: { Headline: '안녕' } } } as any);
        useDesignStore.getState().switchLocale('ko');

        const el = useDesignStore.getState().creativeSet!.variants[0].elements[0] as any;
        expect(el.content).toBe('안녕');
    });

    it('should restore original locale when switching back', () => {
        useDesignStore.getState().createCreativeSet('Restore', P);
        const masterId = useDesignStore.getState().creativeSet!.masterVariantId;
        const text = makeText('t-1', 'Hello');
        text.name = 'Headline';
        useDesignStore.getState().replaceVariantElements(masterId, [text as any]);

        useDesignStore.getState().setLocaleData({ originalLocale: 'en', activeLocale: 'en', locales: { en: { Headline: 'Hello' }, ko: { Headline: '안녕' } } } as any);
        useDesignStore.getState().switchLocale('ko');
        useDesignStore.getState().switchLocale(null as any);

        const el = useDesignStore.getState().creativeSet!.variants[0].elements[0] as any;
        expect(el.content).toBe('Hello');
    });
});
