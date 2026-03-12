// ─────────────────────────────────────────────────
// aiLayoutEngine.test.ts — Unit tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildLayoutFromSpec } from './aiLayoutEngine';
import type { LayoutSpec } from '@/services/aiStructureService';
import type { GeneratedContent } from '@/services/designTemplates';
import type { DesignStyleGuide } from '@/services/designStyleGuides';

// ── Test Fixtures ────────────────────────────────

const DEFAULT_CONTENT: GeneratedContent = {
    headline: 'Bold Move',
    subheadline: 'Professional solutions for modern teams',
    cta: 'Learn More',
    tag: 'NEW',
};

const DEFAULT_PALETTE: DesignStyleGuide = {
    id: 'test',
    name: 'Test Palette',
    description: '',
    keywords: [],
    colors: {
        background: '#0a0a0a',
        surface: '#141414',
        border: '#222222',
        foreground: '#ffffff',
        secondary: '#cccccc',
        tertiary: '#888888',
        muted: '#555555',
        accent: '#3b82f6',
        accentForeground: '#ffffff',
        error: '#ff4444',
        warning: '#ffaa00',
        info: '#4488ff',
        gradientStart: '#0a0a0a',
        gradientEnd: '#0f172a',
        gradientAngle: 135,
    },
    typography: {
        primaryFont: 'Inter',
        secondaryFont: 'Inter',
        scale: { hero: 0.18, headline: 0.11, title: 0.08, body: 0.055, caption: 0.04, micro: 0.03 },
        weights: { bold: '800', semibold: '600', medium: '500', normal: '400' },
        letterSpacing: { tight: -0.5, normal: 0, wide: 1.5 },
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, safe: 16 },
    radius: 6,
};

function makeSpec(overrides?: Partial<LayoutSpec>): LayoutSpec {
    return {
        layoutType: 'centered-stack',
        alignment: 'center',
        headlineZone: { xPct: 0.08, yPct: 0.2, wPct: 0.84, hPct: 0.3 },
        ctaZone: { xPct: 0.25, yPct: 0.78, wPct: 0.5, hPct: 0.12 },
        headlineFontSize: 28,
        subheadlineFontSize: 12,
        accentStrategy: 'none',
        spacing: 'balanced',
        mood: 'professional',
        reasoning: 'Test spec',
        ...overrides,
    };
}

describe('aiLayoutEngine — buildLayoutFromSpec', () => {
    const W = 300, H = 250;

    // ── Basic Structure ──

    describe('basic structure', () => {
        it('always starts with a background element', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            expect(elements[0]!.name).toBe('background');
            expect(elements[0]!.w).toBe(W);
            expect(elements[0]!.h).toBe(H);
        });

        it('includes headline, subheadline, cta_button, cta_label', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const names = elements.map(e => e.name);
            expect(names).toContain('headline');
            expect(names).toContain('subheadline');
            expect(names).toContain('cta_button');
            expect(names).toContain('cta_label');
        });

        it('includes tag text when content has a tag', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const names = elements.map(e => e.name);
            expect(names).toContain('tag_text');
        });

        it('omits tag text when content has no tag', () => {
            const noTag = { ...DEFAULT_CONTENT, tag: '' };
            const elements = buildLayoutFromSpec(makeSpec(), noTag, DEFAULT_PALETTE, W, H);
            const names = elements.map(e => e.name);
            expect(names).not.toContain('tag_text');
        });

        it('sets correct headline content', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const headline = elements.find(e => e.name === 'headline');
            expect(headline?.content).toBe('Bold Move');
        });

        it('sets CTA label in uppercase', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const ctaLabel = elements.find(e => e.name === 'cta_label');
            expect(ctaLabel?.content).toBe('LEARN MORE');
        });
    });

    // ── Accent Strategies ──

    describe('accent strategies', () => {
        it('adds top-bar accent', () => {
            const spec = makeSpec({ accentStrategy: 'top-bar' });
            const elements = buildLayoutFromSpec(spec, DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const accent = elements.find(e => e.name === 'accent_bar');
            expect(accent).toBeDefined();
            expect(accent?.y).toBe(0);
            expect(accent?.w).toBe(W);
        });

        it('adds side-bar accent', () => {
            const spec = makeSpec({ accentStrategy: 'side-bar' });
            const elements = buildLayoutFromSpec(spec, DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const accent = elements.find(e => e.name === 'accent_bar');
            expect(accent).toBeDefined();
            expect(accent?.x).toBe(0);
            expect(accent?.h).toBe(H);
        });

        it('adds ellipse for circle accent', () => {
            const spec = makeSpec({ accentStrategy: 'circle' });
            const elements = buildLayoutFromSpec(spec, DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const accent = elements.find(e => e.name === 'accent_circle');
            expect(accent).toBeDefined();
            expect(accent?.type).toBe('ellipse');
        });

        it('adds overlay for overlay accent', () => {
            const spec = makeSpec({ accentStrategy: 'overlay' });
            const elements = buildLayoutFromSpec(spec, DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const overlay = elements.find(e => e.name === 'text_overlay');
            expect(overlay).toBeDefined();
            expect(overlay?.a).toBe(0.5);
        });

        it('adds no accent for "none" strategy', () => {
            const spec = makeSpec({ accentStrategy: 'none' });
            const elements = buildLayoutFromSpec(spec, DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const accents = elements.filter(e => e.name?.startsWith('accent') || e.name === 'text_overlay');
            expect(accents.length).toBe(0);
        });
    });

    // ── Element Positions ──

    describe('element positions', () => {
        it('all elements are within canvas bounds', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            for (const el of elements) {
                expect(el.x).toBeGreaterThanOrEqual(0);
                expect(el.y).toBeGreaterThanOrEqual(0);
                // Background, overlays can be full width/height
                if (el.name !== 'background' && el.name !== 'text_overlay') {
                    expect(el.x + el.w).toBeLessThanOrEqual(W + 1); // +1 for rounding
                }
            }
        });

        it('subheadline is below headline', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const headline = elements.find(e => e.name === 'headline')!;
            const sub = elements.find(e => e.name === 'subheadline')!;
            expect(sub.y).toBeGreaterThan(headline.y);
        });

        it('CTA is below subheadline', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const sub = elements.find(e => e.name === 'subheadline')!;
            const cta = elements.find(e => e.name === 'cta_button')!;
            expect(cta.y).toBeGreaterThan(sub.y);
        });
    });

    // ── Colors ──

    describe('colors', () => {
        it('uses palette foreground for headline', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const headline = elements.find(e => e.name === 'headline');
            expect(headline?.color_hex).toBe('#ffffff');
        });

        it('uses palette accent for CTA button', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const cta = elements.find(e => e.name === 'cta_button');
            // CTA should have accent color (converted to r,g,b)
            expect(cta?.r).toBeDefined();
        });

        it('uses gradient for background', () => {
            const elements = buildLayoutFromSpec(makeSpec(), DEFAULT_CONTENT, DEFAULT_PALETTE, W, H);
            const bg = elements.find(e => e.name === 'background');
            expect(bg?.gradient_start_hex).toBe('#0a0a0a');
            expect(bg?.gradient_end_hex).toBe('#0f172a');
        });
    });
});
