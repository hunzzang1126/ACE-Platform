// ─────────────────────────────────────────────────
// templateLayoutsB — Layout build() integrity tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { rightAligned, minimalClean, fullBleedHero, badgeFocus, horizontalStrip, tower } from './templateLayoutsB';
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

const mockContent = { headline: 'Bold Offer', subheadline: 'Get started today', tag: 'NEW', cta: 'Learn More' };

const LAYOUTS = [
    { name: 'rightAligned', layout: rightAligned },
    { name: 'minimalClean', layout: minimalClean },
    { name: 'fullBleedHero', layout: fullBleedHero },
    { name: 'badgeFocus', layout: badgeFocus },
    { name: 'horizontalStrip', layout: horizontalStrip },
    { name: 'tower', layout: tower },
] as const;

const SIZES = [
    { w: 300, h: 250 },
    { w: 728, h: 90 },
    { w: 160, h: 600 },
    { w: 1080, h: 1080 },
    { w: 320, h: 50 },
];

describe.each(LAYOUTS)('templateLayoutsB — $name', ({ name, layout }) => {
    it('has valid template metadata', () => {
        expect(layout.id).toBeTruthy();
        expect(layout.name).toBeTruthy();
        expect(layout.description.length).toBeGreaterThan(5);
        expect(layout.aspectRatios.length).toBeGreaterThan(0);
    });

    it.each(SIZES)('builds elements for %w×%h', ({ w, h }) => {
        const elements = layout.build(w, h, mockGuide, mockContent);
        expect(elements.length).toBeGreaterThanOrEqual(3);
    });

    it.each(SIZES)('background covers full canvas for %w×%h', ({ w, h }) => {
        const elements = layout.build(w, h, mockGuide, mockContent);
        const bg = elements.find(e => e.name === 'background');
        expect(bg).toBeDefined();
        expect(bg!.w).toBe(w);
        expect(bg!.h).toBe(h);
    });

    it.each(SIZES)('no NaN/undefined in positions for %w×%h', ({ w, h }) => {
        const elements = layout.build(w, h, mockGuide, mockContent);
        for (const el of elements) {
            expect(Number.isFinite(el.x)).toBe(true);
            expect(Number.isFinite(el.y)).toBe(true);
            expect(Number.isFinite(el.w)).toBe(true);
        }
    });

    it.each(SIZES)('font sizes are positive for %w×%h', ({ w, h }) => {
        const elements = layout.build(w, h, mockGuide, mockContent);
        for (const el of elements) {
            if (el.font_size) expect(el.font_size).toBeGreaterThan(0);
        }
    });
});

describe('templateLayoutsB — Layout-specific checks', () => {
    it('minimalClean has no CTA button (text-only CTA)', () => {
        const elements = minimalClean.build(300, 250, mockGuide, mockContent);
        const ctaBtn = elements.find(e => e.name === 'cta_button');
        expect(ctaBtn).toBeUndefined(); // minimalClean uses text-only CTA
    });

    it('badgeFocus has ellipse badge', () => {
        const elements = badgeFocus.build(1080, 1080, mockGuide, mockContent);
        const circle = elements.find(e => e.type === 'ellipse');
        expect(circle).toBeDefined();
    });

    it('tower has decorative_dot', () => {
        const elements = tower.build(1080, 1920, mockGuide, mockContent);
        const dot = elements.find(e => e.name === 'decorative_dot');
        expect(dot).toBeDefined();
    });
});
