// ─────────────────────────────────────────────────
// designStore.variants.test.ts — Variant management
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore } from './designStore';
import type { BannerPreset } from '@/schema/design.types';

const MASTER: BannerPreset = { id: 'master', name: '300x250', width: 300, height: 250, category: 'display' };
const V_A: BannerPreset = { id: 'v-a', name: '728x90', width: 728, height: 90, category: 'display' };
const V_B: BannerPreset = { id: 'v-b', name: '160x600', width: 160, height: 600, category: 'display' };

describe('designStore — variant CRUD', () => {
    beforeEach(() => {
        useDesignStore.setState({ allCreativeSets: {}, activeCreativeSetId: null, creativeSet: null });
        useDesignStore.getState().createCreativeSet('Test', MASTER);
    });

    it('addVariant creates a new variant', () => {
        useDesignStore.getState().addVariant(V_A);
        expect(useDesignStore.getState().creativeSet!.variants.length).toBe(2);
        expect(useDesignStore.getState().creativeSet!.variants[1]!.preset.width).toBe(728);
    });

    it('removeVariant removes non-master variant', () => {
        useDesignStore.getState().addVariant(V_A);
        const vid = useDesignStore.getState().creativeSet!.variants[1]!.id;
        useDesignStore.getState().removeVariant(vid);
        expect(useDesignStore.getState().creativeSet!.variants.length).toBe(1);
    });

    it('cannot remove master variant', () => {
        const masterId = useDesignStore.getState().creativeSet!.masterVariantId;
        useDesignStore.getState().removeVariant(masterId);
        expect(useDesignStore.getState().creativeSet!.variants.length).toBeGreaterThanOrEqual(1);
    });

    it('multiple variants coexist', () => {
        useDesignStore.getState().addVariant(V_A);
        useDesignStore.getState().addVariant(V_B);
        expect(useDesignStore.getState().creativeSet!.variants.length).toBe(3);
    });

    it('addElementToMaster adds to master variant', () => {
        useDesignStore.getState().addElementToMaster({
            id: 'e1', type: 'shape', shapeType: 'rectangle', name: 'Test',
            visible: true, locked: false, opacity: 1, zIndex: 1, fill: '#ff0000',
            constraints: {
                horizontal: { anchor: 'left', offset: 10 },
                vertical: { anchor: 'top', offset: 10 },
                size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
            },
        } as any);
        const mid = useDesignStore.getState().creativeSet!.masterVariantId;
        const master = useDesignStore.getState().creativeSet!.variants.find(v => v.id === mid);
        expect(master!.elements.length).toBe(1);
    });

    it('removeElementFromMaster removes element', () => {
        useDesignStore.getState().addElementToMaster({
            id: 'e1', type: 'shape', shapeType: 'rectangle', name: 'Test',
            visible: true, locked: false, opacity: 1, zIndex: 1, fill: '#ff0000',
            constraints: {
                horizontal: { anchor: 'left', offset: 10 },
                vertical: { anchor: 'top', offset: 10 },
                size: { widthMode: 'fixed', heightMode: 'fixed', width: 100, height: 50 },
            },
        } as any);
        useDesignStore.getState().removeElementFromMaster('e1');
        const mid = useDesignStore.getState().creativeSet!.masterVariantId;
        const master = useDesignStore.getState().creativeSet!.variants.find(v => v.id === mid);
        expect(master!.elements.length).toBe(0);
    });
});
