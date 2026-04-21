// ─────────────────────────────────────────────────
// fontAttributeDb.test.ts + fontMatcher.test.ts
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { FONT_ATTRIBUTE_DB, MOOD_AXES, FONT_ATTR_MAP } from './fontAttributeDb';
import { FONT_FAMILIES } from '@/components/panels/PropertyPanelSections';

describe('FONT_ATTRIBUTE_DB', () => {
    it('covers all fonts in FONT_FAMILIES', () => {
        const dbFamilies = new Set(FONT_ATTRIBUTE_DB.map(f => f.family));
        for (const family of FONT_FAMILIES) {
            expect(dbFamilies.has(family)).toBe(true);
        }
    });

    it('has no duplicate families', () => {
        const families = FONT_ATTRIBUTE_DB.map(f => f.family);
        expect(new Set(families).size).toBe(families.length);
    });

    it('all mood values are in 0–1 range', () => {
        for (const font of FONT_ATTRIBUTE_DB) {
            for (const axis of MOOD_AXES) {
                const val = font[axis];
                expect(val).toBeGreaterThanOrEqual(0);
                expect(val).toBeLessThanOrEqual(1);
            }
        }
    });

    it('all fonts have a family name', () => {
        for (const font of FONT_ATTRIBUTE_DB) {
            expect(font.family.length).toBeGreaterThan(0);
        }
    });

    it('FONT_ATTR_MAP has same count as DB', () => {
        expect(FONT_ATTR_MAP.size).toBe(FONT_ATTRIBUTE_DB.length);
    });

    it('variable font flags are boolean', () => {
        for (const font of FONT_ATTRIBUTE_DB) {
            expect(typeof font.hasVariable).toBe('boolean');
        }
    });

    it('Playfair Display has high luxury score', () => {
        const pf = FONT_ATTR_MAP.get('Playfair Display');
        expect(pf).toBeDefined();
        expect(pf!.luxury).toBeGreaterThanOrEqual(0.8);
    });

    it('Inter has high modern/tech score', () => {
        const inter = FONT_ATTR_MAP.get('Inter');
        expect(inter).toBeDefined();
        expect(inter!.modern).toBeGreaterThanOrEqual(0.8);
        expect(inter!.tech).toBeGreaterThanOrEqual(0.7);
    });

    it('Bebas Neue has high boldImpact score', () => {
        const bebas = FONT_ATTR_MAP.get('Bebas Neue');
        expect(bebas).toBeDefined();
        expect(bebas!.boldImpact).toBeGreaterThanOrEqual(0.9);
    });
});
