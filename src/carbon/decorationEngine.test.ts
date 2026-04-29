// ─────────────────────────────────────────────────
// Decoration Engine — Unit Tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildDecorations, hasDecorations, getDecorationRules } from './decorationEngine';
import { buildDesignElements } from './layoutComposer';
import type { DesignContent, DesignPalette } from './layoutComposer';
import type { LayoutVariant } from './layoutRules';

const PALETTE: DesignPalette = {
    gradientStart: '#6366F1', gradientEnd: '#2DD4BF', accent: '#2DD4BF',
    foreground: '#FFFFFF', background: '#0B0F1A',
    typography: { primaryFont: 'Inter', secondaryFont: 'Inter' },
};

const CONTENT: DesignContent = {
    headline: 'Test Headline',
    subheadline: 'Test Subheadline',
    cta: 'Get Started',
    tag: 'New',
};

describe('Decoration Engine', () => {
    describe('buildDecorations', () => {
        it('centered variant produces accent_line', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 1080, 1080, false, 'centered');
            const accentLine = elements.find(el => el.name === 'accent_line');
            expect(accentLine).toBeDefined();
            expect(accentLine!.type).toBe('rect');
        });

        it('minimal-center produces only logo_area decoration (no traditional decos)', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 1080, 1080, false, 'minimal-center');
            const decos = elements.filter(el =>
                ['accent_line', 'tag_underline', 'top_accent_bar', 'bottom_accent_bar', 'corner_accent'].includes(el.name ?? '')
            );
            expect(decos).toHaveLength(0);
            // But logo_area should exist
            expect(elements.find(el => el.name === 'logo_area')).toBeDefined();
        });

        it('left-hero has accent_line + tag_underline', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 1080, 1080, false, 'left-hero');
            expect(elements.find(el => el.name === 'accent_line')).toBeDefined();
            expect(elements.find(el => el.name === 'tag_underline')).toBeDefined();
        });

        it('top-heavy has top_accent_bar', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 1080, 1080, false, 'top-heavy');
            const bar = elements.find(el => el.name === 'top_accent_bar');
            expect(bar).toBeDefined();
            expect(bar!.x).toBe(0);
            expect(bar!.y).toBe(0);
            expect(bar!.w).toBe(1080);
        });

        it('bottom-stack has bottom_accent_bar at canvas bottom', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 300, 250, false, 'bottom-stack');
            const bar = elements.find(el => el.name === 'bottom_accent_bar');
            expect(bar).toBeDefined();
            expect((bar!.y ?? 0) + (bar!.h ?? 0)).toBe(250);
        });

        it('split-left has corner_accent', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 1080, 1080, false, 'split-left');
            const dot = elements.find(el => el.name === 'corner_accent');
            expect(dot).toBeDefined();
            expect(dot!.radius).toBeGreaterThan(0); // rounded
        });

        it('bold-statement has both top and bottom bars', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 300, 250, false, 'bold-statement');
            expect(elements.find(el => el.name === 'top_accent_bar')).toBeDefined();
            expect(elements.find(el => el.name === 'bottom_accent_bar')).toBeDefined();
        });

        it('accent_line is positioned between headline and next element', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 1080, 1080, false, 'centered');
            const headline = elements.find(el => el.name === 'headline')!;
            const sub = elements.find(el => el.name === 'subheadline')!;
            const line = elements.find(el => el.name === 'accent_line')!;
            const headlineBottom = headline.y! + headline.h!;
            expect(line.y).toBeGreaterThanOrEqual(headlineBottom - 5);
            expect(line.y).toBeLessThanOrEqual(sub.y!);
        });

        it('decorations use accent color from palette', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 1080, 1080, false, 'left-hero');
            const line = elements.find(el => el.name === 'accent_line')!;
            // #2DD4BF = r≈0.176, g≈0.831, b≈0.749 (0-1 float)
            expect(line.r).toBeCloseTo(0.176, 1);
            expect(line.g).toBeCloseTo(0.831, 1);
            expect(line.b).toBeCloseTo(0.749, 1);
        });

        it('all decorations are semi-transparent (a < 1)', () => {
            const { elements } = buildDesignElements(CONTENT, PALETTE, 1080, 1080, false, 'left-hero');
            const decos = elements.filter(el =>
                ['accent_line', 'tag_underline', 'top_accent_bar', 'bottom_accent_bar', 'corner_accent'].includes(el.name ?? '')
            );
            for (const d of decos) {
                expect(d.a, `${d.name} should be semi-transparent`).toBeLessThan(1);
                expect(d.a, `${d.name} should be visible`).toBeGreaterThan(0);
            }
        });
    });

    describe('hasDecorations', () => {
        it('returns true for variants with decorations', () => {
            expect(hasDecorations('centered')).toBe(true);
            expect(hasDecorations('left-hero')).toBe(true);
            expect(hasDecorations('bold-statement')).toBe(true);
        });

        it('returns true for minimal-center (has logoPlaceholder)', () => {
            expect(hasDecorations('minimal-center')).toBe(true);
        });

        it('returns false for compact-bar', () => {
            expect(hasDecorations('compact-bar')).toBe(false);
        });
    });

    describe('getDecorationRules', () => {
        it('returns config for all variants', () => {
            const variants: LayoutVariant[] = [
                'centered', 'left-hero', 'offset-right', 'top-heavy', 'bottom-stack',
                'split-left', 'minimal-center', 'bold-statement', 'editorial', 'compact-bar',
            ];
            for (const v of variants) {
                const rules = getDecorationRules(v);
                expect(rules).toBeDefined();
                expect(typeof rules.accentLine).toBe('boolean');
            }
        });
    });

    describe('Cross-size stability', () => {
        const AD_SIZES: [number, number][] = [
            [300, 250], [728, 90], [160, 600], [1080, 1080], [970, 250],
        ];

        it('decorations stay within canvas bounds for all sizes', () => {
            for (const [w, h] of AD_SIZES) {
                const { elements } = buildDesignElements(CONTENT, PALETTE, w, h, false, 'left-hero');
                const decos = elements.filter(el =>
                    ['accent_line', 'tag_underline', 'top_accent_bar', 'bottom_accent_bar', 'corner_accent'].includes(el.name ?? '')
                );
                for (const d of decos) {
                    expect(d.x, `${d.name} x out of bounds at ${w}x${h}`).toBeGreaterThanOrEqual(0);
                    expect(d.y, `${d.name} y out of bounds at ${w}x${h}`).toBeGreaterThanOrEqual(-1);
                    expect((d.x ?? 0) + (d.w ?? 0), `${d.name} right out of bounds at ${w}x${h}`).toBeLessThanOrEqual(w + 1);
                    expect((d.y ?? 0) + (d.h ?? 0), `${d.name} bottom out of bounds at ${w}x${h}`).toBeLessThanOrEqual(h + 1);
                }
            }
        });

        it('decoration sizes scale with canvas', () => {
            const { elements: small } = buildDesignElements(CONTENT, PALETTE, 300, 250, false, 'centered');
            const { elements: large } = buildDesignElements(CONTENT, PALETTE, 1080, 1080, false, 'centered');
            const smallLine = small.find(el => el.name === 'accent_line');
            const largeLine = large.find(el => el.name === 'accent_line');
            if (smallLine && largeLine) {
                expect(largeLine.w).toBeGreaterThan(smallLine.w!);
            }
        });
    });
});
