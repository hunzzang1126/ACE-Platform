// ─────────────────────────────────────────────────
// ctaStyleBuilder.test.ts — CTA style rendering tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildCtaElements } from './ctaStyleBuilder';
import type { CtaStyleInput } from './ctaStyleBuilder';
import type { CtaStyle } from './designStrategy';

const BASE_INPUT: CtaStyleInput = {
    text: 'Shop Now',
    x: 100, y: 500, w: 300, h: 60,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
    lineHeight: 1.2,
    accentColor: '#e94560',
    gradientEndColor: '#2DD4BF',
    canvasMin: 1080,
};

describe('ctaStyleBuilder', () => {
    const ALL_STYLES: CtaStyle[] = ['pill', 'outlined', 'solid', 'text-arrow', 'rounded-square'];

    describe('all styles produce valid elements', () => {
        for (const style of ALL_STYLES) {
            it(`${style}: returns at least 1 element`, () => {
                const elements = buildCtaElements(style, BASE_INPUT);
                expect(elements.length).toBeGreaterThanOrEqual(1);
            });

            it(`${style}: all elements have name, type, x, y, w, h`, () => {
                const elements = buildCtaElements(style, BASE_INPUT);
                for (const el of elements) {
                    expect(el.name).toBeTruthy();
                    expect(el.type).toBeTruthy();
                    expect(el.x).toBeDefined();
                    expect(el.y).toBeDefined();
                    expect(el.w).toBeGreaterThan(0);
                    expect(el.h).toBeGreaterThan(0);
                }
            });
        }
    });

    describe('pill (default)', () => {
        it('produces 2 elements (button + label)', () => {
            const els = buildCtaElements('pill', BASE_INPUT);
            expect(els).toHaveLength(2);
            expect(els[0]!.name).toBe('cta_button');
            expect(els[1]!.name).toBe('cta_label');
        });

        it('button has gradient and full rounding (radius = h/2)', () => {
            const els = buildCtaElements('pill', BASE_INPUT);
            const btn = els[0]!;
            expect(btn.gradient_start_hex).toBe(BASE_INPUT.accentColor);
            expect(btn.gradient_end_hex).toBe(BASE_INPUT.gradientEndColor);
            expect(btn.radius).toBe(Math.round(BASE_INPUT.h / 2));
        });

        it('label has white text', () => {
            const els = buildCtaElements('pill', BASE_INPUT);
            expect(els[1]!.color_hex).toBe('#FFFFFF');
        });

        it('button has shadow for depth', () => {
            const els = buildCtaElements('pill', BASE_INPUT);
            expect(els[0]!.shadow_blur).toBeGreaterThan(0);
        });
    });

    describe('outlined', () => {
        it('produces 3 elements (border + inner + label)', () => {
            const els = buildCtaElements('outlined', BASE_INPUT);
            expect(els).toHaveLength(3);
            expect(els[0]!.name).toBe('cta_button');
            expect(els[1]!.name).toBe('cta_button_inner');
            expect(els[2]!.name).toBe('cta_label');
        });

        it('inner rect is smaller than outer (border effect)', () => {
            const els = buildCtaElements('outlined', BASE_INPUT);
            const outer = els[0]!;
            const inner = els[1]!;
            expect(inner.w).toBeLessThan(outer.w!);
            expect(inner.h).toBeLessThan(outer.h!);
        });

        it('inner rect is nearly transparent', () => {
            const els = buildCtaElements('outlined', BASE_INPUT);
            expect(els[1]!.a).toBeLessThan(0.05);
        });

        it('★ REGRESSION: label uses accent color (not white)', () => {
            const els = buildCtaElements('outlined', BASE_INPUT);
            expect(els[2]!.color_hex).toBe(BASE_INPUT.accentColor);
        });
    });

    describe('solid', () => {
        it('produces 2 elements (button + label)', () => {
            const els = buildCtaElements('solid', BASE_INPUT);
            expect(els).toHaveLength(2);
        });

        it('button uses solid color (no gradient)', () => {
            const els = buildCtaElements('solid', BASE_INPUT);
            expect(els[0]!.gradient_start_hex).toBeUndefined();
        });

        it('button has subtle radius (not pill-rounded)', () => {
            const els = buildCtaElements('solid', BASE_INPUT);
            expect(els[0]!.radius).toBeGreaterThan(0);
            expect(els[0]!.radius).toBeLessThan(BASE_INPUT.h / 2);
        });
    });

    describe('text-arrow', () => {
        it('produces only 1 element (label with arrow, no button)', () => {
            const els = buildCtaElements('text-arrow', BASE_INPUT);
            expect(els).toHaveLength(1);
            expect(els[0]!.name).toBe('cta_label');
        });

        it('★ DESIGN: text has arrow appended', () => {
            const els = buildCtaElements('text-arrow', BASE_INPUT);
            expect(els[0]!.content).toContain('→');
            expect(els[0]!.content).toContain(BASE_INPUT.text);
        });

        it('text uses accent color', () => {
            const els = buildCtaElements('text-arrow', BASE_INPUT);
            expect(els[0]!.color_hex).toBe(BASE_INPUT.accentColor);
        });
    });

    describe('rounded-square', () => {
        it('produces 2 elements (button + label)', () => {
            const els = buildCtaElements('rounded-square', BASE_INPUT);
            expect(els).toHaveLength(2);
        });

        it('radius is ~20% of height (professional, not pill)', () => {
            const els = buildCtaElements('rounded-square', BASE_INPUT);
            const expectedRadius = Math.round(BASE_INPUT.h * 0.2);
            expect(els[0]!.radius).toBe(expectedRadius);
        });

        it('button has gradient (premium feel)', () => {
            const els = buildCtaElements('rounded-square', BASE_INPUT);
            expect(els[0]!.gradient_start_hex).toBe(BASE_INPUT.accentColor);
        });
    });

    describe('★ REGRESSION: visual distinctiveness', () => {
        it('5 styles produce at least 3 distinct visual forms', () => {
            // Collect unique element counts and presence/absence of gradient
            const signatures = new Set<string>();
            for (const style of ALL_STYLES) {
                const els = buildCtaElements(style, BASE_INPUT);
                const hasGradient = els.some(e => e.gradient_start_hex);
                const hasButton = els.some(e => e.name === 'cta_button');
                const sig = `${els.length}-${hasGradient}-${hasButton}`;
                signatures.add(sig);
            }
            expect(signatures.size).toBeGreaterThanOrEqual(3);
        });

        it('outlined label is NOT white (differentiated from pill)', () => {
            const pillLabel = buildCtaElements('pill', BASE_INPUT).find(e => e.name === 'cta_label')!;
            const outlinedLabel = buildCtaElements('outlined', BASE_INPUT).find(e => e.name === 'cta_label')!;
            expect(pillLabel.color_hex).not.toBe(outlinedLabel.color_hex);
        });
    });
});
