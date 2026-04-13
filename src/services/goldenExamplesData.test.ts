// ─────────────────────────────────────────────────
// goldenExamplesData — Data Integrity Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
    premiumDark300x250,
    boldImpact300x250,
    electricDark728x90,
    warmNeutral1080x1080,
    cleanClinical160x600,
} from './goldenExamplesData';

const ALL_EXAMPLES = [
    premiumDark300x250,
    boldImpact300x250,
    electricDark728x90,
    warmNeutral1080x1080,
    cleanClinical160x600,
];

describe('goldenExamplesData — Structural Integrity', () => {
    it('exports 5 golden examples', () => {
        expect(ALL_EXAMPLES).toHaveLength(5);
    });

    it.each(ALL_EXAMPLES.map(e => [e.id, e]))('"%s" has valid metadata', (_, example) => {
        expect(example.id).toBeTruthy();
        expect(example.description.length).toBeGreaterThan(10);
        expect(example.canvasW).toBeGreaterThan(0);
        expect(example.canvasH).toBeGreaterThan(0);
        expect(example.styleGuide).toBeTruthy();
    });

    it.each(ALL_EXAMPLES.map(e => [e.id, e]))('"%s" has 8+ elements', (_, example) => {
        expect(example.elements.length).toBeGreaterThanOrEqual(8);
    });

    it.each(ALL_EXAMPLES.map(e => [e.id, e]))('"%s" has background element', (_, example) => {
        const bg = example.elements.find(e => e.name === 'background');
        expect(bg).toBeDefined();
        expect(bg!.x).toBe(0);
        expect(bg!.y).toBe(0);
        expect(bg!.w).toBe(example.canvasW);
        expect(bg!.h).toBe(example.canvasH);
    });

    it.each(ALL_EXAMPLES.map(e => [e.id, e]))('"%s" has headline element', (_, example) => {
        const headline = example.elements.find(e => e.name === 'headline');
        expect(headline).toBeDefined();
        expect(headline!.type).toBe('text');
        expect(headline!.font_size).toBeGreaterThan(20);
    });

    it.each(ALL_EXAMPLES.map(e => [e.id, e]))('"%s" has CTA button + label', (_, example) => {
        const btn = example.elements.find(e => e.name === 'cta_button');
        const label = example.elements.find(e => e.name === 'cta_label');
        expect(btn).toBeDefined();
        expect(label).toBeDefined();
        expect(label!.type).toBe('text');
    });
});

describe('goldenExamplesData — Element Bounds', () => {
    it.each(ALL_EXAMPLES.map(e => [e.id, e]))('"%s" elements fit within canvas', (_, example) => {
        for (const el of example.elements) {
            // Allow slight overflow for decorative elements
            if (el.name?.includes('decorative') || el.name?.includes('accent_glow')) continue;
            expect(el.x).toBeGreaterThanOrEqual(-10);
            expect(el.y).toBeGreaterThanOrEqual(-10);
        }
    });

    it.each(ALL_EXAMPLES.map(e => [e.id, e]))('"%s" text elements have valid font sizes', (_, example) => {
        for (const el of example.elements) {
            if (el.type === 'text' && el.font_size) {
                expect(el.font_size).toBeGreaterThanOrEqual(8);
                expect(el.font_size).toBeLessThanOrEqual(200);
            }
        }
    });

    it.each(ALL_EXAMPLES.map(e => [e.id, e]))('"%s" unique element names', (_, example) => {
        const names = example.elements.map(e => e.name);
        const unique = new Set(names);
        expect(unique.size).toBe(names.length);
    });
});

describe('goldenExamplesData — Specific Sizes', () => {
    it('300x250 premium dark has gold accent', () => {
        const accent = premiumDark300x250.elements.find(e => e.name === 'accent_line');
        expect(accent).toBeDefined();
        // Gold-ish warm color
        expect(accent!.r!).toBeGreaterThan(0.5);
    });

    it('728x90 leaderboard has horizontal layout', () => {
        const headline = electricDark728x90.elements.find(e => e.name === 'headline');
        const cta = electricDark728x90.elements.find(e => e.name === 'cta_button');
        expect(headline!.x).toBeLessThan(cta!.x); // left-to-right flow
    });

    it('1080x1080 social post has large text', () => {
        const headline = warmNeutral1080x1080.elements.find(e => e.name === 'headline');
        expect(headline!.font_size).toBeGreaterThanOrEqual(100);
    });

    it('160x600 skyscraper has narrow width', () => {
        expect(cleanClinical160x600.canvasW).toBe(160);
        const headline = cleanClinical160x600.elements.find(e => e.name === 'headline');
        expect(headline!.w!).toBeLessThanOrEqual(160);
    });
});
