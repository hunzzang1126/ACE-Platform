// ─────────────────────────────────────────────────
// layoutBlueprints — Data Integrity Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { BANNER_BLUEPRINTS, SOCIAL_BLUEPRINTS, type LayoutBlueprint } from './layoutBlueprints';

const BANNER_KEYS = Object.keys(BANNER_BLUEPRINTS);
const SOCIAL_KEYS = Object.keys(SOCIAL_BLUEPRINTS);

describe('layoutBlueprints — Banner Blueprints', () => {
    it('exports 8 banner size blueprints', () => {
        expect(BANNER_KEYS).toHaveLength(8);
    });

    it('includes key IAB sizes', () => {
        expect(BANNER_KEYS).toContain('300x250');
        expect(BANNER_KEYS).toContain('728x90');
        expect(BANNER_KEYS).toContain('160x600');
        expect(BANNER_KEYS).toContain('320x50');
    });

    it.each(BANNER_KEYS.map(k => [k, BANNER_BLUEPRINTS[k]!]))('"%s" has valid dimensions', (_, bp: LayoutBlueprint) => {
        expect(bp.width).toBeGreaterThan(0);
        expect(bp.height).toBeGreaterThan(0);
        expect(bp.width).toBe(parseInt(bp.sizeLabel));
    });

    it.each(BANNER_KEYS.map(k => [k, BANNER_BLUEPRINTS[k]!]))('"%s" has valid layout type', (_, bp: LayoutBlueprint) => {
        expect(['stack-center', 'horizontal', 'vertical', 'split', 'single-row']).toContain(bp.layout);
    });

    it.each(BANNER_KEYS.map(k => [k, BANNER_BLUEPRINTS[k]!]))('"%s" has typography scale with 5 levels', (_, bp: LayoutBlueprint) => {
        expect(Object.keys(bp.typographyScale)).toHaveLength(5);
        // Each level is a [min, max] tuple
        for (const [min, max] of Object.values(bp.typographyScale)) {
            expect(min).toBeLessThanOrEqual(max);
            expect(min).toBeGreaterThan(0);
        }
    });

    it.each(BANNER_KEYS.map(k => [k, BANNER_BLUEPRINTS[k]!]))('"%s" has positive padding', (_, bp: LayoutBlueprint) => {
        expect(bp.padding).toBeGreaterThan(0);
    });

    it.each(BANNER_KEYS.map(k => [k, BANNER_BLUEPRINTS[k]!]))('"%s" max elements is 3-5', (_, bp: LayoutBlueprint) => {
        expect(bp.maxElements).toBeGreaterThanOrEqual(3);
        expect(bp.maxElements).toBeLessThanOrEqual(6);
    });

    it.each(BANNER_KEYS.map(k => [k, BANNER_BLUEPRINTS[k]!]))('"%s" has description', (_, bp: LayoutBlueprint) => {
        expect(bp.description.length).toBeGreaterThan(10);
    });
});

describe('layoutBlueprints — Social Blueprints', () => {
    it('exports 4 social format blueprints', () => {
        expect(SOCIAL_KEYS).toHaveLength(4);
    });

    it('includes key social ratios', () => {
        expect(SOCIAL_KEYS).toContain('9:16');
        expect(SOCIAL_KEYS).toContain('1:1');
        expect(SOCIAL_KEYS).toContain('4:5');
        expect(SOCIAL_KEYS).toContain('16:9');
    });

    it.each(SOCIAL_KEYS.map(k => [k, SOCIAL_BLUEPRINTS[k]!]))('"%s" has valid dimensions', (_, bp: LayoutBlueprint) => {
        expect(bp.width).toBeGreaterThanOrEqual(1080);
        expect(bp.height).toBeGreaterThanOrEqual(1080);
    });

    it.each(SOCIAL_KEYS.map(k => [k, SOCIAL_BLUEPRINTS[k]!]))('"%s" has typography scale', (_, bp: LayoutBlueprint) => {
        for (const [min, max] of Object.values(bp.typographyScale)) {
            expect(min).toBeLessThanOrEqual(max);
        }
    });

    it('9:16 story has large padding for safe zones', () => {
        expect(SOCIAL_BLUEPRINTS['9:16']!.padding).toBeGreaterThanOrEqual(40);
    });

    it('1:1 square has stack-center layout', () => {
        expect(SOCIAL_BLUEPRINTS['1:1']!.layout).toBe('stack-center');
    });

    it('16:9 landscape uses split layout', () => {
        expect(SOCIAL_BLUEPRINTS['16:9']!.layout).toBe('split');
    });
});
