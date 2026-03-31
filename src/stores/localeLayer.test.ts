// ─────────────────────────────────────────────────
// localeLayer.test.ts — Locale Layer store tests
// ─────────────────────────────────────────────────
// Covers: setLocaleData, switchLocale, roundtrip,
// multi-variant, button labels, edge cases.
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore } from './designStore';
import type { LocaleData } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';

// ── Helper: create a test creative set with Korean text ──

function setupTestCS() {
    const store = useDesignStore.getState();
    store.createCreativeSet('Test Project', {
        id: 'p1', name: '320x480', width: 320, height: 480, category: 'display',
    });
    const cs = useDesignStore.getState().creativeSet!;

    // Add text elements to master
    const headline: DesignElement = {
        id: 'el-1', name: 'Headline', type: 'text',
        content: '그냥 해', fontFamily: 'Inter', fontSize: 32, fontWeight: 700,
        fontStyle: 'normal', color: '#fff', textAlign: 'center',
        lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
        constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 40 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 40 }, rotation: 0 },
        opacity: 1, visible: true, locked: false, zIndex: 1,
    } as DesignElement;

    const subline: DesignElement = {
        id: 'el-2', name: 'Subline', type: 'text',
        content: '한계를 뛰어넘어', fontFamily: 'Inter', fontSize: 16, fontWeight: 400,
        fontStyle: 'normal', color: '#ccc', textAlign: 'center',
        lineHeight: 1.4, letterSpacing: 0, autoShrink: false,
        constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 80 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 20 }, rotation: 0 },
        opacity: 1, visible: true, locked: false, zIndex: 2,
    } as DesignElement;

    const cta: DesignElement = {
        id: 'el-3', name: 'CTA', type: 'button',
        label: '지금 구매', fontFamily: 'Inter', fontSize: 14, fontWeight: 600,
        color: '#fff', backgroundColor: '#ff5733', borderRadius: 22,
        constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'bottom', offset: 30 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 160, height: 44 }, rotation: 0 },
        opacity: 1, visible: true, locked: false, zIndex: 3,
    } as DesignElement;

    const bg: DesignElement = {
        id: 'el-4', name: 'Background', type: 'shape', shapeType: 'rectangle',
        fill: '#1a1a2e',
        constraints: { horizontal: { anchor: 'stretch', offset: 0 }, vertical: { anchor: 'stretch', offset: 0 }, size: { widthMode: 'relative', heightMode: 'relative', width: 1, height: 1 }, rotation: 0 },
        opacity: 1, visible: true, locked: false, zIndex: 0,
    } as DesignElement;

    store.addElementToMaster(bg);
    store.addElementToMaster(headline);
    store.addElementToMaster(subline);
    store.addElementToMaster(cta);

    // Add a second variant for multi-variant testing
    store.addVariant({ id: 'p2', name: '300x250', width: 300, height: 250, category: 'display' });

    return useDesignStore.getState().creativeSet!;
}

function makeLocaleData(): LocaleData {
    return {
        locales: {
            ko: { Headline: '그냥 해', Subline: '한계를 뛰어넘어', CTA: '지금 구매' },
            en: { Headline: 'JUST DO IT', Subline: 'BREAK YOUR LIMITS.', CTA: 'SHOP NOW' },
        },
        activeLocale: null,
        originalLocale: 'ko',
    };
}

// ── Tests ──

describe('Locale Layer — setLocaleData', () => {
    beforeEach(() => {
        useDesignStore.setState({ allCreativeSets: {}, activeCreativeSetId: null, creativeSet: null });
    });

    it('stores localeData on the creative set', () => {
        setupTestCS();
        const ld = makeLocaleData();
        useDesignStore.getState().setLocaleData(ld);
        const cs = useDesignStore.getState().creativeSet!;
        expect(cs.localeData).toBeDefined();
        expect(cs.localeData!.originalLocale).toBe('ko');
        expect(Object.keys(cs.localeData!.locales)).toEqual(['ko', 'en']);
    });

    it('does nothing when no creative set is open', () => {
        useDesignStore.setState({ creativeSet: null, activeCreativeSetId: null });
        const ld = makeLocaleData();
        useDesignStore.getState().setLocaleData(ld);
        expect(useDesignStore.getState().creativeSet).toBeNull();
    });
});

describe('Locale Layer — switchLocale', () => {
    beforeEach(() => {
        useDesignStore.setState({ allCreativeSets: {}, activeCreativeSetId: null, creativeSet: null });
    });

    it('switches text content to English across master variant', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        useDesignStore.getState().switchLocale('en');

        const cs = useDesignStore.getState().creativeSet!;
        const master = cs.variants.find(v => v.id === cs.masterVariantId)!;
        const headline = master.elements.find(el => el.name === 'Headline') as any;
        const subline = master.elements.find(el => el.name === 'Subline') as any;
        expect(headline.content).toBe('JUST DO IT');
        expect(subline.content).toBe('BREAK YOUR LIMITS.');
    });

    it('switches button labels to English', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        useDesignStore.getState().switchLocale('en');

        const cs = useDesignStore.getState().creativeSet!;
        const master = cs.variants.find(v => v.id === cs.masterVariantId)!;
        const cta = master.elements.find(el => el.name === 'CTA') as any;
        expect(cta.label).toBe('SHOP NOW');
    });

    it('switches ALL variants, not just master', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        useDesignStore.getState().switchLocale('en');

        const cs = useDesignStore.getState().creativeSet!;
        for (const variant of cs.variants) {
            const headline = variant.elements.find(el => el.name === 'Headline') as any;
            if (headline) expect(headline.content).toBe('JUST DO IT');
        }
    });

    it('reverts to original when switching to null', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        useDesignStore.getState().switchLocale('en');
        useDesignStore.getState().switchLocale(null);

        const cs = useDesignStore.getState().creativeSet!;
        const master = cs.variants.find(v => v.id === cs.masterVariantId)!;
        const headline = master.elements.find(el => el.name === 'Headline') as any;
        expect(headline.content).toBe('그냥 해');
    });

    it('round-trip: KO → EN → KO matches original', () => {
        setupTestCS();
        const originalCS = JSON.parse(JSON.stringify(useDesignStore.getState().creativeSet!));

        useDesignStore.getState().setLocaleData(makeLocaleData());
        useDesignStore.getState().switchLocale('en');
        useDesignStore.getState().switchLocale(null); // back to original

        const cs = useDesignStore.getState().creativeSet!;
        const master = cs.variants.find(v => v.id === cs.masterVariantId)!;
        const origMaster = originalCS.variants.find((v: any) => v.id === originalCS.masterVariantId);

        for (const el of master.elements) {
            const origEl = origMaster.elements.find((oe: any) => oe.name === el.name);
            if (!origEl) continue;
            if (el.type === 'text') expect((el as any).content).toBe(origEl.content);
            if (el.type === 'button') expect((el as any).label).toBe(origEl.label);
        }
    });

    it('does not affect non-text elements (shape, image)', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        const bgBefore = JSON.stringify(
            useDesignStore.getState().creativeSet!.variants[0]!.elements.find(el => el.type === 'shape')
        );
        useDesignStore.getState().switchLocale('en');
        const bgAfter = JSON.stringify(
            useDesignStore.getState().creativeSet!.variants[0]!.elements.find(el => el.type === 'shape')
        );
        expect(bgAfter).toBe(bgBefore);
    });

    it('handles missing locale code gracefully (no crash)', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        expect(() => useDesignStore.getState().switchLocale('ja')).not.toThrow();
        // Content should remain unchanged
        const cs = useDesignStore.getState().creativeSet!;
        const master = cs.variants.find(v => v.id === cs.masterVariantId)!;
        const headline = master.elements.find(el => el.name === 'Headline') as any;
        expect(headline.content).toBe('그냥 해');
    });

    it('does nothing when no localeData exists', () => {
        setupTestCS();
        expect(() => useDesignStore.getState().switchLocale('en')).not.toThrow();
    });

    it('sets activeLocale on the localeData', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        useDesignStore.getState().switchLocale('en');
        expect(useDesignStore.getState().creativeSet!.localeData!.activeLocale).toBe('en');
    });

    it('sets activeLocale to null when reverting', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        useDesignStore.getState().switchLocale('en');
        useDesignStore.getState().switchLocale(null);
        expect(useDesignStore.getState().creativeSet!.localeData!.activeLocale).toBeNull();
    });
});
