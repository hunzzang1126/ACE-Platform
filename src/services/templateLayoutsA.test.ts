// ─────────────────────────────────────────────────
// templateLayoutsA — Layout build() integrity tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { centeredStack, leftAlignedCard, boldHeadline, splitHorizontal, diagonalSplit, topDownCascade } from './templateLayoutsA';
import type { DesignStyleGuide } from '@/services/designStyleGuides';

const mockGuide: DesignStyleGuide = {
    id: 'test', name: 'Test',
    colors: {
        primary: '#2DD4BF', accent: '#6366F1', foreground: '#1A1A2E', secondary: '#71717a',
        background: '#0B0F1A', surface: '#1e1e2e', muted: '#52525b', tertiary: '#a1a1aa',
        gradientStart: '#0B0F1A', gradientEnd: '#1e1e2e', gradientAngle: 135,
        accentForeground: '#FFFFFF',
    },
    typography: { primaryFont: 'Inter', secondaryFont: 'Inter', monoFont: 'monospace' },
    radius: 8,
};

const mockContent = { headline: 'Test Headline', subheadline: 'Test subheadline', tag: 'SALE', cta: 'Shop Now' };

const LAYOUTS = [
    { name: 'centeredStack', layout: centeredStack },
    { name: 'leftAlignedCard', layout: leftAlignedCard },
    { name: 'boldHeadline', layout: boldHeadline },
    { name: 'splitHorizontal', layout: splitHorizontal },
    { name: 'diagonalSplit', layout: diagonalSplit },
    { name: 'topDownCascade', layout: topDownCascade },
] as const;

const SIZES = [
    { w: 300, h: 250 },
    { w: 728, h: 90 },
    { w: 160, h: 600 },
    { w: 1080, h: 1080 },
    { w: 468, h: 60 },
];

describe.each(LAYOUTS)('templateLayoutsA — $name', ({ name, layout }) => {
    it('has valid template metadata', () => {
        expect(layout.id).toBeTruthy();
        expect(layout.name).toBeTruthy();
        expect(layout.description.length).toBeGreaterThan(5);
        expect(layout.aspectRatios.length).toBeGreaterThan(0);
        expect(typeof layout.build).toBe('function');
    });

    it.each(SIZES)('builds elements for %w×%h without errors', ({ w, h }) => {
        const elements = layout.build(w, h, mockGuide, mockContent);
        expect(Array.isArray(elements)).toBe(true);
        expect(elements.length).toBeGreaterThanOrEqual(3);
    });

    it.each(SIZES)('all elements have name and type for %w×%h', ({ w, h }) => {
        const elements = layout.build(w, h, mockGuide, mockContent);
        for (const el of elements) {
            expect(el.name).toBeTruthy();
            expect(el.type).toBeTruthy();
        }
    });

    it.each(SIZES)('includes background for %w×%h', ({ w, h }) => {
        const elements = layout.build(w, h, mockGuide, mockContent);
        const bg = elements.find(e => e.name === 'background');
        expect(bg).toBeDefined();
        expect(bg!.w).toBe(w);
        expect(bg!.h).toBe(h);
    });

    it.each(SIZES)('includes headline for %w×%h', ({ w, h }) => {
        const elements = layout.build(w, h, mockGuide, mockContent);
        const headline = elements.find(e => e.name === 'headline');
        expect(headline).toBeDefined();
        expect(headline!.font_size).toBeGreaterThan(0);
    });

    it.each(SIZES)('no elements have NaN position for %w×%h', ({ w, h }) => {
        const elements = layout.build(w, h, mockGuide, mockContent);
        for (const el of elements) {
            expect(Number.isFinite(el.x)).toBe(true);
            expect(Number.isFinite(el.y)).toBe(true);
            expect(Number.isFinite(el.w)).toBe(true);
            expect(Number.isFinite(el.h)).toBe(true);
        }
    });
});
