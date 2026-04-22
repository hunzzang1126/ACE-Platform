// ─────────────────────────────────────────────────
// Carbon Adapter + Grid + Layout Composer — Unit Tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    remToPx, SPACING_PX, spacing, resolveTypeStyle,
    scaledFontSize, TYPE_SCALE_PX, miniUnit, DURATION,
} from './adapter';
import { columns, centeredX, getGutter, getMargin } from './gridSystem';
import { buildDesignElements } from './layoutComposer';
import type { DesignContent, DesignPalette } from './layoutComposer';

// ── Adapter Tests ────────────────────────────────

describe('Carbon Adapter', () => {
    describe('remToPx', () => {
        it('converts rem string to px', () => {
            expect(remToPx('1rem')).toBe(16);
            expect(remToPx('2rem')).toBe(32);
            expect(remToPx('0.5rem')).toBe(8);
        });

        it('passes through numbers', () => {
            expect(remToPx(42)).toBe(42);
        });

        it('handles px strings', () => {
            expect(remToPx('0.32px')).toBe(0.32);
        });
    });

    describe('SPACING_PX', () => {
        it('has 13 spacing values', () => {
            expect(SPACING_PX.length).toBe(13);
        });

        it('starts at 2px and ends at 160px', () => {
            expect(SPACING_PX[0]).toBe(2);
            expect(SPACING_PX[12]).toBe(160);
        });

        it('includes key values: 8, 16, 32, 48', () => {
            expect(SPACING_PX).toContain(8);
            expect(SPACING_PX).toContain(16);
            expect(SPACING_PX).toContain(32);
            expect(SPACING_PX).toContain(48);
        });
    });

    describe('spacing()', () => {
        it('returns miniUnit-snapped values', () => {
            const result = spacing(5, 300);
            expect(result % miniUnit).toBe(0);
        });

        it('scales with canvas size', () => {
            const small = spacing(5, 160);
            const large = spacing(5, 1080);
            expect(large).toBeGreaterThan(small);
        });

        it('never returns less than miniUnit', () => {
            expect(spacing(0, 50)).toBeGreaterThanOrEqual(miniUnit);
        });
    });

    describe('TYPE_SCALE_PX', () => {
        it('has 23 values', () => {
            expect(TYPE_SCALE_PX.length).toBe(23);
        });

        it('starts at 12px', () => {
            expect(TYPE_SCALE_PX[0]).toBe(12);
        });

        it('includes Carbon scale: 12,14,16,18,20,24,28,32,36,42', () => {
            expect(TYPE_SCALE_PX.slice(0, 10)).toEqual([12, 14, 16, 18, 20, 24, 28, 32, 36, 42]);
        });
    });

    describe('resolveTypeStyle()', () => {
        it('resolves display01 at large canvas', () => {
            const style = resolveTypeStyle('display01', 1080);
            expect(style.fontSize).toBeGreaterThanOrEqual(42);
            expect(style.lineHeight).toBeGreaterThan(1);
            expect(style.fontWeight).toBeDefined();
        });

        it('applies breakpoint overrides for larger canvases', () => {
            const small = resolveTypeStyle('display01', 300);
            const large = resolveTypeStyle('display01', 1400);
            // display01 has breakpoints: lg→54px, xlg→60px, max→76px
            expect(large.fontSize).toBeGreaterThanOrEqual(small.fontSize);
        });

        it('returns fallback for unknown style', () => {
            const style = resolveTypeStyle('nonexistent', 300);
            expect(style.fontSize).toBe(16);
        });
    });

    describe('DURATION', () => {
        it('has 6 duration tokens', () => {
            expect(Object.keys(DURATION).length).toBe(6);
        });

        it('fast01 is 70ms', () => {
            expect(DURATION.fast01).toBe(70);
        });
    });
});

// ── Grid System Tests ────────────────────────────

describe('Carbon Grid System', () => {
    describe('columns()', () => {
        it('16 columns = full canvas width minus margins', () => {
            const full = columns(16, 1080);
            expect(full).toBeLessThanOrEqual(1080);
            expect(full).toBeGreaterThan(1080 * 0.8);
        });

        it('8 columns ≈ half of 16 columns', () => {
            const half = columns(8, 1080);
            const full = columns(16, 1080);
            expect(half).toBeGreaterThan(full * 0.4);
            expect(half).toBeLessThan(full * 0.6);
        });

        it('1 column is smallest', () => {
            const one = columns(1, 1080);
            const two = columns(2, 1080);
            expect(two).toBeGreaterThan(one);
        });

        it('clamps to 1-16 range', () => {
            expect(columns(0, 1080)).toBe(columns(1, 1080));
            expect(columns(20, 1080)).toBe(columns(16, 1080));
        });
    });

    describe('centeredX()', () => {
        it('centers element horizontally', () => {
            const w = columns(8, 1080);
            const x = centeredX(8, 1080);
            // x + w/2 should be roughly canvas center
            expect(Math.abs((x + w / 2) - 540)).toBeLessThan(20);
        });
    });

    describe('getGutter()', () => {
        it('wide gutter > narrow gutter', () => {
            expect(getGutter(1080, 'wide')).toBeGreaterThan(getGutter(1080, 'narrow'));
        });

        it('condensed gutter is 0', () => {
            expect(getGutter(1080, 'condensed')).toBe(0);
        });
    });
});

// ── Layout Composer Tests ────────────────────────

describe('Carbon Layout Composer', () => {
    const palette: DesignPalette = {
        gradientStart: '#6366F1',
        gradientEnd: '#2DD4BF',
        accent: '#6366F1',
        foreground: '#FFFFFF',
        background: '#0B0F1A',
        typography: { primaryFont: 'Inter', secondaryFont: 'Inter' },
    };

    describe('buildDesignElements() — square canvas', () => {
        it('generates headline element', () => {
            const content: DesignContent = { headline: 'Test Headline' };
            const elements = buildDesignElements(content, palette, 1080, 1080, false);
            const headline = elements.find(el => el.name === 'headline');
            expect(headline).toBeDefined();
            expect(headline!.content).toBe('Test Headline');
            expect(headline!.font_size).toBeGreaterThan(20);
        });

        it('generates gradient background when no photo', () => {
            const content: DesignContent = { headline: 'Test' };
            const elements = buildDesignElements(content, palette, 1080, 1080, false);
            const bg = elements.find(el => el.name === 'background');
            expect(bg).toBeDefined();
            expect(bg!.gradient_start_hex).toBe('#6366F1');
        });

        it('skips background when photo exists', () => {
            const content: DesignContent = { headline: 'Test' };
            const elements = buildDesignElements(content, palette, 1080, 1080, true);
            const bg = elements.find(el => el.name === 'background');
            expect(bg).toBeUndefined();
        });

        it('generates CTA when provided', () => {
            const content: DesignContent = { headline: 'Test', cta: 'Buy Now' };
            const elements = buildDesignElements(content, palette, 1080, 1080, false);
            const ctaBtn = elements.find(el => el.name === 'cta_button');
            const ctaLabel = elements.find(el => el.name === 'cta_label');
            expect(ctaBtn).toBeDefined();
            expect(ctaLabel).toBeDefined();
            expect(ctaLabel!.content).toBe('Buy Now');
        });

        it('skips subheadline when not provided', () => {
            const content: DesignContent = { headline: 'Test' };
            const elements = buildDesignElements(content, palette, 1080, 1080, false);
            const sub = elements.find(el => el.name === 'subheadline');
            expect(sub).toBeUndefined();
        });

        it('includes subheadline when provided', () => {
            const content: DesignContent = { headline: 'H', subheadline: 'Sub' };
            const elements = buildDesignElements(content, palette, 1080, 1080, false);
            const sub = elements.find(el => el.name === 'subheadline');
            expect(sub).toBeDefined();
            expect(sub!.content).toBe('Sub');
        });
    });

    describe('no element overlap', () => {
        it('elements do not overlap vertically', () => {
            const content: DesignContent = {
                headline: 'Big Headline Text Here',
                subheadline: 'Supporting subheadline text',
                cta: 'Click Me',
                tag: 'Sale',
            };
            const elements = buildDesignElements(content, palette, 1080, 1080, false);
            const positioned = elements.filter(el => el.type === 'text' || el.name === 'cta_button');

            for (let i = 0; i < positioned.length; i++) {
                for (let j = i + 1; j < positioned.length; j++) {
                    const a = positioned[i]!;
                    const b = positioned[j]!;
                    // Skip cta_label overlapping cta_button (they're intentionally stacked)
                    if ((a.name === 'cta_button' && b.name === 'cta_label') ||
                        (a.name === 'cta_label' && b.name === 'cta_button')) continue;

                    const aBottom = (a.y ?? 0) + (a.h ?? 0);
                    const bTop = b.y ?? 0;
                    const bBottom = bTop + (b.h ?? 0);
                    const aTop = a.y ?? 0;

                    const verticalOverlap = aTop < bBottom && bTop < aBottom;
                    if (verticalOverlap) {
                        // Check horizontal overlap too
                        const aRight = (a.x ?? 0) + (a.w ?? 0);
                        const bLeft = b.x ?? 0;
                        const bRight = bLeft + (b.w ?? 0);
                        const aLeft = a.x ?? 0;
                        const horizontalOverlap = aLeft < bRight && bLeft < aRight;
                        expect(horizontalOverlap && verticalOverlap).toBe(false);
                    }
                }
            }
        });
    });

    describe('elements stay within canvas', () => {
        const sizes = [
            [300, 250], [728, 90], [1080, 1080], [160, 600],
            [336, 280], [970, 250], [300, 600], [250, 250],
        ];

        for (const [w, h] of sizes) {
            it(`all elements within ${w}x${h} canvas`, () => {
                const content: DesignContent = {
                    headline: 'Test Headline',
                    subheadline: 'Sub text here',
                    cta: 'Learn More',
                };
                const elements = buildDesignElements(content, palette, w!, h!, false);
                for (const el of elements) {
                    expect(el.x ?? 0).toBeGreaterThanOrEqual(0);
                    expect(el.y ?? 0).toBeGreaterThanOrEqual(0);
                    expect((el.x ?? 0) + (el.w ?? 0)).toBeLessThanOrEqual(w! + 2); // 2px tolerance
                    expect((el.y ?? 0) + (el.h ?? 0)).toBeLessThanOrEqual(h! + 2);
                }
            });
        }
    });

    describe('typography hierarchy', () => {
        it('headline font > subheadline font > tag font', () => {
            const content: DesignContent = {
                headline: 'H', subheadline: 'S', tag: 'T',
            };
            const elements = buildDesignElements(content, palette, 1080, 1080, false);
            const h = elements.find(el => el.name === 'headline')!;
            const s = elements.find(el => el.name === 'subheadline')!;
            const t = elements.find(el => el.name === 'tag_text')!;
            expect(h.font_size).toBeGreaterThan(s.font_size!);
            expect(s.font_size).toBeGreaterThan(t.font_size!);
        });
    });

    describe('photo background → white text', () => {
        it('sets text to white on photo bg', () => {
            const content: DesignContent = { headline: 'H', subheadline: 'S' };
            const elements = buildDesignElements(content, palette, 1080, 1080, true);
            const texts = elements.filter(el => el.type === 'text');
            for (const t of texts) {
                expect(t.color_hex).toBe('#FFFFFF');
            }
        });
    });
});
