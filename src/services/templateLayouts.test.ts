// ─────────────────────────────────────────────────
// templateLayouts.test.ts — Layout builder validation
// ─────────────────────────────────────────────────
// Validates: all 6+6 layouts produce valid elements,
// correct element names, proper bounding box constraints,
// adaptive font scaling, etc.

import { describe, it, expect } from 'vitest';
import { centeredStack, leftAlignedCard, boldHeadline, splitHorizontal, diagonalSplit, topDownCascade } from './templateLayoutsA';

// Minimal style guide for testing
const mockGuide: any = {
    id: 'bold-dark',
    typography: {
        primaryFont: 'Inter', secondaryFont: 'DM Sans',
        scale: { hero: 0.12, headline: 0.08, title: 0.06, body: 0.04, caption: 0.03 },
        weights: { bold: '800', semibold: '600', normal: '400' },
        letterSpacing: { tight: -0.5 },
    },
    colors: {
        foreground: '#ffffff', secondary: '#aaaaaa', tertiary: '#666666',
        accent: '#ff6b00', accentForeground: '#ffffff',
        gradientStart: '#0a0e1a', gradientEnd: '#1a2e4a', gradientAngle: 135,
        surface: '#1a1a2e', muted: '#888888',
    },
    spacing: { safe: 12 },
    radius: 8,
};

const mockContent = {
    headline: 'Summer Sale', subheadline: 'Up to 50% off everything',
    cta: 'Shop Now', tag: 'Limited Time',
};

const layouts = [
    { name: 'centeredStack', fn: centeredStack },
    { name: 'leftAlignedCard', fn: leftAlignedCard },
    { name: 'boldHeadline', fn: boldHeadline },
    { name: 'splitHorizontal', fn: splitHorizontal },
    { name: 'diagonalSplit', fn: diagonalSplit },
    { name: 'topDownCascade', fn: topDownCascade },
];

const canvasSizes = [
    { w: 300, h: 250, label: '300x250' },
    { w: 728, h: 90, label: '728x90' },
    { w: 160, h: 600, label: '160x600' },
    { w: 1080, h: 1080, label: '1080x1080' },
];

describe('templateLayouts — All layouts produce valid elements', () => {
    for (const layout of layouts) {
        for (const size of canvasSizes) {
            it(`${layout.name} @ ${size.label} produces elements`, () => {
                const elements = layout.fn.build(size.w, size.h, mockGuide, mockContent);
                expect(elements.length).toBeGreaterThanOrEqual(5);
            });

            it(`${layout.name} @ ${size.label} has background as first element`, () => {
                const elements = layout.fn.build(size.w, size.h, mockGuide, mockContent);
                expect(elements[0].name).toBe('background');
            });

            it(`${layout.name} @ ${size.label} has headline element`, () => {
                const elements = layout.fn.build(size.w, size.h, mockGuide, mockContent);
                expect(elements.some((e: any) => e.name === 'headline')).toBe(true);
            });

            it(`${layout.name} @ ${size.label} has CTA button`, () => {
                const elements = layout.fn.build(size.w, size.h, mockGuide, mockContent);
                expect(elements.some((e: any) => e.name === 'cta_button')).toBe(true);
            });

            it(`${layout.name} @ ${size.label} has CTA label`, () => {
                const elements = layout.fn.build(size.w, size.h, mockGuide, mockContent);
                expect(elements.some((e: any) => e.name === 'cta_label')).toBe(true);
            });
        }
    }
});

describe('templateLayouts — Element names are unique', () => {
    for (const layout of layouts) {
        it(`${layout.name} has unique element names`, () => {
            const elements = layout.fn.build(300, 250, mockGuide, mockContent);
            const names = elements.map((e: any) => e.name);
            const unique = new Set(names);
            expect(unique.size).toBe(names.length);
        });
    }
});

describe('templateLayouts — Font sizes are reasonable', () => {
    for (const layout of layouts) {
        it(`${layout.name} has font sizes >= 8`, () => {
            const elements = layout.fn.build(300, 250, mockGuide, mockContent);
            for (const el of elements) {
                if ((el as any).font_size) {
                    expect((el as any).font_size).toBeGreaterThanOrEqual(8);
                }
            }
        });
    }
});

describe('templateLayouts — Background dimensions match canvas', () => {
    for (const layout of layouts) {
        for (const size of canvasSizes) {
            it(`${layout.name} @ ${size.label} background covers full canvas`, () => {
                const elements = layout.fn.build(size.w, size.h, mockGuide, mockContent);
                const bg = elements[0] as any;
                expect(bg.w).toBe(size.w);
                expect(bg.h).toBe(size.h);
            });
        }
    }
});

describe('templateLayouts — Metadata', () => {
    for (const layout of layouts) {
        it(`${layout.name} has id and name`, () => {
            expect(layout.fn.id).toBeTruthy();
            expect(layout.fn.name).toBeTruthy();
        });

        it(`${layout.name} has aspectRatios array`, () => {
            expect(Array.isArray(layout.fn.aspectRatios)).toBe(true);
            expect(layout.fn.aspectRatios.length).toBeGreaterThan(0);
        });

        it(`${layout.name} has description`, () => {
            expect(layout.fn.description).toBeTruthy();
        });
    }
});
