// ─────────────────────────────────────────────────
// localeLayer.test.ts — Locale Layer store tests
// ─────────────────────────────────────────────────
// Covers: setLocaleData, switchLocale, roundtrip,
// multi-variant, button labels, edge cases.
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
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

    it('★ REGRESSION: merges new locale without losing existing ones', () => {
        setupTestCS();
        // First: add Korean → English
        useDesignStore.getState().setLocaleData(makeLocaleData());
        // Then: add French
        useDesignStore.getState().setLocaleData({
            locales: {
                en: { Headline: 'JUST DO IT', Subline: 'BREAK YOUR LIMITS.', CTA: 'SHOP NOW' },
                fr: { Headline: 'FAITES-LE', Subline: 'DÉPASSEZ VOS LIMITES.', CTA: 'ACHETEZ' },
            },
            activeLocale: 'fr',
            originalLocale: 'en',
        });

        const ld = useDesignStore.getState().creativeSet!.localeData!;
        // Korean must still exist
        expect(ld.locales['ko']).toBeDefined();
        expect(ld.locales['ko']!.Headline).toBe('그냥 해');
        // French must be added
        expect(ld.locales['fr']).toBeDefined();
        expect(ld.locales['fr']!.Headline).toBe('FAITES-LE');
        // English still there
        expect(ld.locales['en']).toBeDefined();
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

describe('Locale Layer — multi-language regression', () => {
    beforeEach(() => {
        useDesignStore.setState({ allCreativeSets: {}, activeCreativeSetId: null, creativeSet: null });
    });

    it('★ REGRESSION: adding 3rd language does not overwrite original', () => {
        // Simulate: English original → add KO → add DE
        // The bug was: after switchLocale('ko'), canvas shows Korean.
        // Adding DE would read canvas (Korean) and save it as 'en' original.
        const store = useDesignStore.getState();
        store.createCreativeSet('Test', {
            id: 'p1', name: '300x250', width: 300, height: 250, category: 'display',
        });
        store.addElementToMaster({
            id: 'el-1', name: 'Headline', type: 'text',
            content: 'Design Is not Hard', fontFamily: 'Inter', fontSize: 32, fontWeight: 700,
            fontStyle: 'normal', color: '#fff', textAlign: 'center',
            lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 40 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 40 }, rotation: 0 },
            opacity: 1, visible: true, locked: false, zIndex: 1,
        } as any);

        // Step 1: Add Korean translation
        store.setLocaleData({
            locales: {
                en: { Headline: 'Design Is not Hard' },
                ko: { Headline: '디자인은 어렵지 않습니다' },
            },
            activeLocale: 'ko',
            originalLocale: 'en',
        });
        store.switchLocale('ko');

        // Verify canvas now shows Korean
        const afterKO = useDesignStore.getState().creativeSet!;
        const masterAfterKO = afterKO.variants.find(v => v.id === afterKO.masterVariantId)!;
        expect((masterAfterKO.elements.find(e => e.name === 'Headline') as any).content).toBe('디자인은 어렵지 않습니다');

        // Step 2: Add German (simulating what LocalePickerPopover does)
        // The CORRECT behavior: read originalTexts from localeData.en, NOT from canvas
        const existingOriginal = afterKO.localeData?.locales['en'];
        expect(existingOriginal).toBeDefined();
        expect(existingOriginal!.Headline).toBe('Design Is not Hard'); // ★ MUST be English!

        store.setLocaleData({
            locales: {
                en: existingOriginal!, // preserved from store
                de: { Headline: 'Design ist nicht schwer' },
            },
            activeLocale: 'de',
            originalLocale: 'en',
        });

        // Step 3: Verify original English is preserved
        const final = useDesignStore.getState().creativeSet!.localeData!;
        expect(final.locales['en']!.Headline).toBe('Design Is not Hard'); // NOT Korean!
        expect(final.locales['ko']!.Headline).toBe('디자인은 어렵지 않습니다');
        expect(final.locales['de']!.Headline).toBe('Design ist nicht schwer');

        // Step 4: switchLocale back to EN shows English
        store.switchLocale(null); // revert to original
        const reverted = useDesignStore.getState().creativeSet!;
        const masterReverted = reverted.variants.find(v => v.id === reverted.masterVariantId)!;
        expect((masterReverted.elements.find(e => e.name === 'Headline') as any).content).toBe('Design Is not Hard');
    });

    it('★ REGRESSION: round-trip EN→KO→DE→EN→KO all preserve correctly', () => {
        const store = useDesignStore.getState();
        store.createCreativeSet('Test', {
            id: 'p1', name: '300x250', width: 300, height: 250, category: 'display',
        });
        store.addElementToMaster({
            id: 'el-1', name: 'HL', type: 'text',
            content: 'Hello World', fontFamily: 'Inter', fontSize: 32, fontWeight: 700,
            fontStyle: 'normal', color: '#fff', textAlign: 'center',
            lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 40 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 40 }, rotation: 0 },
            opacity: 1, visible: true, locked: false, zIndex: 1,
        } as any);

        store.setLocaleData({
            locales: {
                en: { HL: 'Hello World' },
                ko: { HL: '안녕하세요' },
                de: { HL: 'Hallo Welt' },
            },
            activeLocale: null,
            originalLocale: 'en',
        });

        // Switch through all languages and verify content
        store.switchLocale('ko');
        expect((useDesignStore.getState().creativeSet!.variants[0]!.elements[0] as any).content).toBe('안녕하세요');
        store.switchLocale('de');
        expect((useDesignStore.getState().creativeSet!.variants[0]!.elements[0] as any).content).toBe('Hallo Welt');
        store.switchLocale(null); // back to original
        expect((useDesignStore.getState().creativeSet!.variants[0]!.elements[0] as any).content).toBe('Hello World');
        store.switchLocale('ko'); // back to KO
        expect((useDesignStore.getState().creativeSet!.variants[0]!.elements[0] as any).content).toBe('안녕하세요');
    });

    it('★ REGRESSION: per-locale fontSize — FR shrink does not affect EN or KO', () => {
        const store = useDesignStore.getState();
        store.createCreativeSet('FontTest', {
            id: 'p1', name: '300x250', width: 300, height: 250, category: 'display',
        });
        store.addElementToMaster({
            id: 'el-1', name: 'Headline', type: 'text',
            content: 'WSOP RINGS', fontFamily: 'Inter', fontSize: 48, fontWeight: 700,
            fontStyle: 'normal', color: '#fff', textAlign: 'center',
            lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
            // Box: 250w × 60h — EN "WSOP RINGS" fits at 48px (1 line)
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 40 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 250, height: 60 }, rotation: 0 },
            opacity: 1, visible: true, locked: false, zIndex: 1,
        } as any);

        store.setLocaleData({
            locales: {
                en: { Headline: 'WSOP RINGS' },
                ko: { Headline: 'WSOP 반지' },
                // FR is significantly longer → will trigger auto-shrink
                fr: { Headline: 'DES BAGUES WSOP SERONT REMPORTÉES' },
            },
            activeLocale: null,
            originalLocale: 'en',
        });

        // Switch to FR — should get shrunk fontSize
        store.switchLocale('fr');
        const frFontSize = (useDesignStore.getState().creativeSet!.variants[0]!.elements[0] as any).fontSize;
        expect(frFontSize).toBeLessThan(48); // FR text is long → must shrink

        // Switch to EN — should restore original 48px
        store.switchLocale(null);
        const enFontSize = (useDesignStore.getState().creativeSet!.variants[0]!.elements[0] as any).fontSize;
        expect(enFontSize).toBe(48); // ★ EN must NOT be affected by FR shrink

        // Switch to KO — should get KO-specific fontSize (not FR's)
        store.switchLocale('ko');
        const koFontSize = (useDesignStore.getState().creativeSet!.variants[0]!.elements[0] as any).fontSize;
        expect(koFontSize).toBeGreaterThanOrEqual(frFontSize); // KO is shorter than FR
        expect(koFontSize).toBeLessThanOrEqual(48); // KO may or may not need shrink

        // Switch back to FR — should be same shrunk value as before (cached)
        store.switchLocale('fr');
        const frFontSize2 = (useDesignStore.getState().creativeSet!.variants[0]!.elements[0] as any).fontSize;
        expect(frFontSize2).toBe(frFontSize); // cached — identical
    });
});

describe('Locale Layer — removeLocale', () => {
    beforeEach(() => {
        useDesignStore.setState({ allCreativeSets: {}, activeCreativeSetId: null, creativeSet: null });
    });

    it('removes a non-original locale', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        expect(useDesignStore.getState().creativeSet!.localeData!.locales['en']).toBeDefined();

        useDesignStore.getState().removeLocale('en');
        // After removing the only non-original, localeData should be cleaned up
        expect(useDesignStore.getState().creativeSet!.localeData).toBeUndefined();
    });

    it('refuses to remove the original locale', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        useDesignStore.getState().removeLocale('ko'); // ko is original

        // ko must still exist
        expect(useDesignStore.getState().creativeSet!.localeData!.locales['ko']).toBeDefined();
    });

    it('switches to original when removing the active locale', () => {
        setupTestCS();
        const ld = makeLocaleData();
        useDesignStore.getState().setLocaleData(ld);
        useDesignStore.getState().switchLocale('en'); // activate English
        expect(useDesignStore.getState().creativeSet!.localeData!.activeLocale).toBe('en');

        useDesignStore.getState().removeLocale('en');

        // Should have switched back to original (ko) content
        const cs = useDesignStore.getState().creativeSet!;
        const master = cs.variants.find(v => v.id === cs.masterVariantId)!;
        const headline = master.elements.find(el => el.name === 'Headline') as any;
        expect(headline.content).toBe('그냥 해'); // Korean original restored
    });

    it('removes one locale while keeping others', () => {
        setupTestCS();
        // Add 3 locales: KO (original) + EN + FR
        useDesignStore.getState().setLocaleData({
            locales: {
                ko: { Headline: '그냥 해', Subline: '한계를 뛰어넘어', CTA: '지금 구매' },
                en: { Headline: 'JUST DO IT', Subline: 'BREAK YOUR LIMITS.', CTA: 'SHOP NOW' },
                fr: { Headline: 'FAITES-LE', Subline: 'DÉPASSEZ VOS LIMITES.', CTA: 'ACHETEZ' },
            },
            activeLocale: null,
            originalLocale: 'ko',
        });

        useDesignStore.getState().removeLocale('en');

        const ld = useDesignStore.getState().creativeSet!.localeData!;
        expect(ld.locales['en']).toBeUndefined(); // removed
        expect(ld.locales['ko']).toBeDefined(); // original kept
        expect(ld.locales['fr']).toBeDefined(); // French kept
    });

    it('does nothing when no localeData exists', () => {
        setupTestCS();
        expect(() => useDesignStore.getState().removeLocale('en')).not.toThrow();
    });
});

describe('Locale Layer — auto-shrink integration', () => {
    beforeEach(() => {
        useDesignStore.setState({ allCreativeSets: {}, activeCreativeSetId: null, creativeSet: null });
    });

    function getMasterVid() {
        const cs = useDesignStore.getState().creativeSet!;
        return cs.masterVariantId;
    }

    it('captures per-variant originalFontSizes on first switchLocale call', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());

        // Before switch — no originalFontSizes
        const ldBefore = useDesignStore.getState().creativeSet!.localeData!;
        expect(ldBefore.originalFontSizes).toBeUndefined();

        // After switch — per-variant originalFontSizes captured
        useDesignStore.getState().switchLocale('en');
        const ldAfter = useDesignStore.getState().creativeSet!.localeData!;
        expect(ldAfter.originalFontSizes).toBeDefined();
        const vid = getMasterVid();
        expect(ldAfter.originalFontSizes![vid]).toBeDefined();
        expect(ldAfter.originalFontSizes![vid]!['Headline']).toBe(32);
    });

    it('caches localeFontSizes per locale per variant', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        useDesignStore.getState().switchLocale('en');

        const ld = useDesignStore.getState().creativeSet!.localeData!;
        const vid = getMasterVid();
        expect(ld.localeFontSizes).toBeDefined();
        expect(ld.localeFontSizes!['en']).toBeDefined();
        expect(ld.localeFontSizes!['en']![vid]).toBeDefined();
        expect(ld.localeFontSizes!['en']![vid]!['Headline']).toBeGreaterThan(0);
    });

    it('different locales get different cached fontSizes', () => {
        const store = useDesignStore.getState();
        store.createCreativeSet('ShrinkTest', {
            id: 'p1', name: '300x250', width: 300, height: 250, category: 'display',
        });
        store.addElementToMaster({
            id: 'el-1', name: 'HL', type: 'text',
            content: 'Short', fontFamily: 'Inter', fontSize: 48, fontWeight: 700,
            fontStyle: 'normal', color: '#fff', textAlign: 'center',
            lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 10 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 60 }, rotation: 0 },
            opacity: 1, visible: true, locked: false, zIndex: 1,
        } as any);

        store.setLocaleData({
            locales: {
                en: { HL: 'Short' },
                fr: { HL: 'BEAUCOUP PLUS LONG TEXTE POUR TESTER' },
            },
            activeLocale: null,
            originalLocale: 'en',
        });

        const vid = getMasterVid();

        // Switch to EN (original) — should get full size
        store.switchLocale(null);
        const ld1 = useDesignStore.getState().creativeSet!.localeData!;
        expect(ld1.localeFontSizes!['en']![vid]!['HL']).toBe(48);

        // Switch to FR — should get shrunk size
        store.switchLocale('fr');
        const ld2 = useDesignStore.getState().creativeSet!.localeData!;
        expect(ld2.localeFontSizes!['fr']![vid]!['HL']).toBeLessThan(48);

        // EN cache unchanged after FR switch
        expect(ld2.localeFontSizes!['en']![vid]!['HL']).toBe(48);
    });

    it('does not recalculate cached fontSizes on re-switch', () => {
        setupTestCS();
        useDesignStore.getState().setLocaleData(makeLocaleData());
        const vid = getMasterVid();

        useDesignStore.getState().switchLocale('en');
        const first = useDesignStore.getState().creativeSet!.localeData!.localeFontSizes!['en']![vid];

        useDesignStore.getState().switchLocale(null);
        useDesignStore.getState().switchLocale('en'); // re-switch
        const second = useDesignStore.getState().creativeSet!.localeData!.localeFontSizes!['en']![vid];

        // Same cached object (not recalculated)
        expect(second).toEqual(first);
    });

    it('★ per-variant: 1080x1080 gets larger fontSize than 300x250 for same locale', () => {
        const store = useDesignStore.getState();
        store.createCreativeSet('MultiSize', {
            id: 'p1', name: '300x250', width: 300, height: 250, category: 'display',
        });
        // Add headline to master (300×250)
        store.addElementToMaster({
            id: 'el-1', name: 'HL', type: 'text',
            content: 'WSOP RINGS WILL BE WON', fontFamily: 'Inter', fontSize: 48, fontWeight: 700,
            fontStyle: 'normal', color: '#fff', textAlign: 'center',
            lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 10 },
                size: { widthMode: 'fixed', heightMode: 'fixed', width: 250, height: 60 }, rotation: 0 },
            opacity: 1, visible: true, locked: false, zIndex: 1,
        } as any);

        // Add a second variant (1080×1080)
        store.addVariant({ id: 'p2', name: '1080x1080', width: 1080, height: 1080, category: 'social' });
        const cs1 = useDesignStore.getState().creativeSet!;
        const bigVariant = cs1.variants.find(v => v.id !== cs1.masterVariantId)!;

        // Add element to big variant — must update BOTH allCreativeSets and creativeSet
        const csSnap = JSON.parse(JSON.stringify(useDesignStore.getState().creativeSet!));
        const bv = csSnap.variants.find((v: any) => v.id === bigVariant.id);
        bv.elements = [{
            id: 'el-1b', name: 'HL', type: 'text',
            content: 'WSOP RINGS WILL BE WON', fontFamily: 'Inter', fontSize: 48, fontWeight: 700,
            fontStyle: 'normal', color: '#fff', textAlign: 'center',
            lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 50 },
                size: { widthMode: 'fixed', heightMode: 'fixed', width: 900, height: 200 }, rotation: 0 },
            opacity: 1, visible: true, locked: false, zIndex: 1,
        }];
        const csId = useDesignStore.getState().activeCreativeSetId!;
        useDesignStore.setState({
            creativeSet: csSnap,
            allCreativeSets: { [csId]: csSnap },
        });

        // Set locale data with long FR text
        store.setLocaleData({
            locales: {
                en: { HL: 'WSOP RINGS WILL BE WON' },
                fr: { HL: 'DES BAGUES WSOP SERONT REMPORTÉES LORS DU TOURNOI' },
            },
            activeLocale: null,
            originalLocale: 'en',
        });

        // Switch to FR
        store.switchLocale('fr');
        const ld = useDesignStore.getState().creativeSet!.localeData!;
        const masterVid = useDesignStore.getState().creativeSet!.masterVariantId;

        const smallFontSize = ld.localeFontSizes!['fr']![masterVid]!['HL'];
        const bigFontSize = ld.localeFontSizes!['fr']![bigVariant.id]!['HL'];

        // Big variant has 900px box → should get LARGER fontSize than 250px master
        expect(bigFontSize).toBeGreaterThan(smallFontSize);
        // Both should be <= original
        expect(smallFontSize).toBeLessThanOrEqual(48);
        expect(bigFontSize).toBeLessThanOrEqual(48);
    });
});

describe('LocaleBar — right-click context menu architecture', () => {
    let src: string;

    beforeAll(async () => {
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        src = readFileSync(resolve(__dirname, '../components/creativeset/LocaleBar.tsx'), 'utf-8');
    });

    it('uses onContextMenu for delete, NOT inline × button', () => {
        expect(src).toContain('onContextMenu');
        expect(src).not.toContain('locale-pill-remove');
    });

    it('renders context menu with danger styling', () => {
        expect(src).toContain('locale-ctx-menu');
        expect(src).toContain('locale-ctx-item--danger');
    });

    it('has backdrop to close menu on click away', () => {
        expect(src).toContain('locale-ctx-backdrop');
        expect(src).toContain('handleCloseCtx');
    });

    it('prevents context menu on original locale pills', () => {
        expect(src).toContain('if (isOriginal) return');
    });

    it('shows tooltip hint about right-click on non-original pills', () => {
        expect(src).toContain('right-click to remove');
    });

    it('calls removeLocale from store on confirm', () => {
        expect(src).toContain('removeLocale');
        expect(src).toContain('window.confirm');
    });
});
