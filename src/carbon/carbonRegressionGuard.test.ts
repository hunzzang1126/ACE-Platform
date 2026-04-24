// ─────────────────────────────────────────────────
// ★ REGRESSION GUARD — Carbon Layout System
// ─────────────────────────────────────────────────
// Protects existing behavior before P0 expansion.
// Every test here MUST pass before AND after changes.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getLayoutRules, RULES_MAP } from './layoutRules';
import type { LayoutVariant, LayoutRuleSet } from './layoutRules';
import { buildDesignElements } from './layoutComposer';
import type { DesignContent, DesignPalette } from './layoutComposer';
import type { AspectCategory } from '@/schema/layoutRoles';

// ── Test Fixtures ──

const PALETTE: DesignPalette = {
    gradientStart: '#1a1a2e',
    gradientEnd: '#16213e',
    accent: '#e94560',
    foreground: '#FFFFFF',
    background: '#1a1a2e',
    typography: { primaryFont: 'Inter', secondaryFont: 'Inter' },
};

const FULL_CONTENT: DesignContent = {
    headline: 'Premium Summer Sale',
    subheadline: 'Up to 50% off everything',
    cta: 'Shop Now',
    tag: 'Limited Time',
};

const MINIMAL_CONTENT: DesignContent = {
    headline: 'Hello World',
};

// Standard IAB ad sizes
const AD_SIZES: [number, number, string][] = [
    [300, 250, 'Medium Rectangle'],
    [728, 90, 'Leaderboard'],
    [160, 600, 'Wide Skyscraper'],
    [300, 600, 'Half Page'],
    [336, 280, 'Large Rectangle'],
    [970, 250, 'Billboard'],
    [250, 250, 'Square'],
    [1080, 1080, 'Social Square'],
    [1200, 628, 'Social Landscape'],
    [1080, 1920, 'Story'],
];

const VARIANTS: LayoutVariant[] = [
    'centered', 'left-hero', 'offset-right',
    'top-heavy', 'bottom-stack', 'split-left',
    'minimal-center', 'bold-statement', 'editorial', 'compact-bar',
];
const ASPECTS: AspectCategory[] = ['square', 'landscape', 'portrait', 'ultra-wide'];

// ─────────────────────────────────────────────────
// 1. Layout Rules API Contract
// ─────────────────────────────────────────────────

describe('★ REGRESSION: Layout Rules API', () => {
    it('getLayoutRules returns rules and variant for all aspect categories', () => {
        for (const aspect of ASPECTS) {
            const result = getLayoutRules(aspect);
            expect(result.rules).toBeDefined();
            expect(result.variant).toBeDefined();
            expect(VARIANTS).toContain(result.variant);
        }
    });

    it('getLayoutRules accepts explicit variant', () => {
        for (const aspect of ASPECTS) {
            for (const variant of VARIANTS) {
                const result = getLayoutRules(aspect, variant);
                expect(result.variant).toBe(variant);
                expect(result.rules).toBeDefined();
            }
        }
    });

    it('every LayoutRuleSet has headline, subline, cta, tag, ctaHeightFactor', () => {
        for (const aspect of ASPECTS) {
            for (const variant of VARIANTS) {
                const { rules } = getLayoutRules(aspect, variant);
                expect(rules.headline).toBeDefined();
                expect(rules.subline).toBeDefined();
                expect(rules.cta).toBeDefined();
                expect(rules.tag).toBeDefined();
                expect(rules.ctaHeightFactor).toBeGreaterThan(0);
            }
        }
    });

    it('every ElementRule has required fields', () => {
        const requiredFields = ['typeStyle', 'cols', 'align', 'gapStep', 'adScale'] as const;
        for (const aspect of ASPECTS) {
            for (const variant of VARIANTS) {
                const { rules } = getLayoutRules(aspect, variant);
                for (const role of ['headline', 'subline', 'cta', 'tag'] as const) {
                    const rule = rules[role];
                    for (const field of requiredFields) {
                        expect(rule[field], `${aspect}/${variant}/${role}.${field}`).toBeDefined();
                    }
                }
            }
        }
    });

    it('RULES_MAP provides backward-compatible centered defaults', () => {
        for (const aspect of ASPECTS) {
            expect(RULES_MAP[aspect]).toBeDefined();
            expect(RULES_MAP[aspect].headline).toBeDefined();
        }
    });

    it('cols values are within 1-16 range', () => {
        for (const aspect of ASPECTS) {
            for (const variant of VARIANTS) {
                const { rules } = getLayoutRules(aspect, variant);
                for (const role of ['headline', 'subline', 'cta', 'tag'] as const) {
                    expect(rules[role].cols).toBeGreaterThanOrEqual(1);
                    expect(rules[role].cols).toBeLessThanOrEqual(16);
                }
            }
        }
    });

    it('adScale values are within 1.0-2.0 range', () => {
        for (const aspect of ASPECTS) {
            for (const variant of VARIANTS) {
                const { rules } = getLayoutRules(aspect, variant);
                for (const role of ['headline', 'subline', 'cta', 'tag'] as const) {
                    expect(rules[role].adScale).toBeGreaterThanOrEqual(1.0);
                    expect(rules[role].adScale).toBeLessThanOrEqual(2.0);
                }
            }
        }
    });
});

// ─────────────────────────────────────────────────
// 2. Element Non-Overlap (ALL sizes × ALL variants)
// ─────────────────────────────────────────────────

describe('★ REGRESSION: Element non-overlap across ALL sizes and variants', () => {
    for (const [w, h, name] of AD_SIZES) {
        for (const variant of VARIANTS) {
            it(`no overlap in ${name} (${w}x${h}) — ${variant}`, () => {
                const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, w, h, false, variant);
                const positioned = elements.filter(
                    el => el.type === 'text' || el.name === 'cta_button'
                );

                for (let i = 0; i < positioned.length; i++) {
                    for (let j = i + 1; j < positioned.length; j++) {
                        const a = positioned[i]!;
                        const b = positioned[j]!;
                        // cta_label intentionally overlaps cta_button
                        if ((a.name === 'cta_button' && b.name === 'cta_label') ||
                            (a.name === 'cta_label' && b.name === 'cta_button')) continue;

                        const aTop = a.y ?? 0, aBot = aTop + (a.h ?? 0);
                        const bTop = b.y ?? 0, bBot = bTop + (b.h ?? 0);
                        const vOverlap = aTop < bBot && bTop < aBot;

                        if (vOverlap) {
                            const aLeft = a.x ?? 0, aRight = aLeft + (a.w ?? 0);
                            const bLeft = b.x ?? 0, bRight = bLeft + (b.w ?? 0);
                            const hOverlap = aLeft < bRight && bLeft < aRight;
                            expect(
                                hOverlap && vOverlap,
                                `"${a.name}" overlaps "${b.name}" in ${name} (${variant})`
                            ).toBe(false);
                        }
                    }
                }
            });
        }
    }
});

// ─────────────────────────────────────────────────
// 3. Elements Stay Within Canvas Bounds
// ─────────────────────────────────────────────────

describe('★ REGRESSION: Elements within canvas bounds', () => {
    for (const [w, h, name] of AD_SIZES) {
        for (const variant of VARIANTS) {
            it(`all elements within ${name} (${w}x${h}) — ${variant}`, () => {
                const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, w, h, false, variant);
                for (const el of elements) {
                    const ex = el.x ?? 0, ey = el.y ?? 0;
                    const ew = el.w ?? 0, eh = el.h ?? 0;
                    expect(ex, `${el.name} x < 0`).toBeGreaterThanOrEqual(-1); // 1px tolerance
                    expect(ey, `${el.name} y < 0`).toBeGreaterThanOrEqual(-1);
                    expect(ex + ew, `${el.name} right > ${w}`).toBeLessThanOrEqual(w + 2);
                    expect(ey + eh, `${el.name} bottom > ${h}`).toBeLessThanOrEqual(h + 2);
                }
            });
        }
    }
});

// ─────────────────────────────────────────────────
// 4. Typography Hierarchy Invariants
// ─────────────────────────────────────────────────

describe('★ REGRESSION: Typography hierarchy', () => {
    for (const [w, h, name] of AD_SIZES) {
        it(`headline > subheadline fontSize in ${name} (${w}x${h})`, () => {
            const content: DesignContent = {
                headline: 'Big Title Here',
                subheadline: 'Smaller supporting text',
            };
            const { elements } = buildDesignElements(content, PALETTE, w, h, false);
            const headline = elements.find(el => el.name === 'headline');
            const sub = elements.find(el => el.name === 'subheadline');
            expect(headline).toBeDefined();
            expect(sub).toBeDefined();
            expect(
                headline!.font_size,
                `headline (${headline!.font_size}px) should be larger than subheadline (${sub!.font_size}px) in ${name}`
            ).toBeGreaterThan(sub!.font_size!);
        });
    }

    it('headline font is primaryFont, subheadline is secondaryFont', () => {
        const customPalette = {
            ...PALETTE,
            typography: { primaryFont: 'Playfair Display', secondaryFont: 'Open Sans' },
        };
        const content: DesignContent = { headline: 'H', subheadline: 'S' };
        const { elements } = buildDesignElements(content, customPalette, 1080, 1080, false);
        expect(elements.find(el => el.name === 'headline')!.font_family).toBe('Playfair Display');
        expect(elements.find(el => el.name === 'subheadline')!.font_family).toBe('Open Sans');
    });

    it('minimum font size is never below 8px', () => {
        // Tiny canvas — should still produce readable text
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 160, 600, false);
        const texts = elements.filter(el => el.type === 'text');
        for (const t of texts) {
            expect(t.font_size, `${t.name} fontSize too small`).toBeGreaterThanOrEqual(8);
        }
    });
});

// ─────────────────────────────────────────────────
// 5. CTA Button Invariants
// ─────────────────────────────────────────────────

describe('★ REGRESSION: CTA button', () => {
    it('CTA button and label exist when cta text provided', () => {
        const { elements } = buildDesignElements(
            { headline: 'H', cta: 'Buy Now' }, PALETTE, 300, 250, false,
        );
        expect(elements.find(el => el.name === 'cta_button')).toBeDefined();
        expect(elements.find(el => el.name === 'cta_label')).toBeDefined();
    });

    it('CTA button and label are absent when no cta text', () => {
        const { elements } = buildDesignElements(
            { headline: 'H' }, PALETTE, 300, 250, false,
        );
        expect(elements.find(el => el.name === 'cta_button')).toBeUndefined();
        expect(elements.find(el => el.name === 'cta_label')).toBeUndefined();
    });

    it('CTA label has white text', () => {
        const { elements } = buildDesignElements(
            { headline: 'H', cta: 'Buy Now' }, PALETTE, 300, 250, false,
        );
        const label = elements.find(el => el.name === 'cta_label');
        expect(label!.color_hex).toBe('#FFFFFF');
    });

    it('CTA button uses accent color', () => {
        const { elements } = buildDesignElements(
            { headline: 'H', cta: 'Buy' }, PALETTE, 300, 250, false,
        );
        const btn = elements.find(el => el.name === 'cta_button');
        // accent is #e94560 → hexR/G/B returns 0-1 range
        expect(btn!.r).toBeCloseTo(233 / 255, 2);
        expect(btn!.g).toBeCloseTo(69 / 255, 2);
        expect(btn!.b).toBeCloseTo(96 / 255, 2);
    });

    it('CTA button has rounded corners (radius > 0)', () => {
        const { elements } = buildDesignElements(
            { headline: 'H', cta: 'Buy' }, PALETTE, 1080, 1080, false,
        );
        const btn = elements.find(el => el.name === 'cta_button');
        expect(btn!.radius).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────
// 6. Background Generation
// ─────────────────────────────────────────────────

describe('★ REGRESSION: Background generation', () => {
    it('gradient background when hasBgImage=false', () => {
        const { elements } = buildDesignElements(MINIMAL_CONTENT, PALETTE, 300, 250, false);
        const bg = elements.find(el => el.name === 'background');
        expect(bg).toBeDefined();
        expect(bg!.gradient_start_hex).toBeDefined();
        expect(bg!.gradient_end_hex).toBeDefined();
        expect(bg!.w).toBe(300);
        expect(bg!.h).toBe(250);
    });

    it('no background element when hasBgImage=true', () => {
        const { elements } = buildDesignElements(MINIMAL_CONTENT, PALETTE, 300, 250, true);
        expect(elements.find(el => el.name === 'background')).toBeUndefined();
    });

    it('text is white when hasBgImage=true', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 300, 250, true);
        const texts = elements.filter(el => el.type === 'text');
        for (const t of texts) {
            expect(t.color_hex).toBe('#FFFFFF');
        }
    });
});

// ─────────────────────────────────────────────────
// 7. Compression (tiny canvases)
// ─────────────────────────────────────────────────

describe('★ REGRESSION: Compression for small canvases', () => {
    it('728x90 leaderboard fits all elements', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 728, 90, false);
        const maxBottom = Math.max(...elements.map(el => (el.y ?? 0) + (el.h ?? 0)));
        expect(maxBottom).toBeLessThanOrEqual(92); // 2px tolerance
    });

    it('970x250 billboard does not clip text', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 970, 250, false);
        for (const el of elements) {
            expect((el.y ?? 0) + (el.h ?? 0)).toBeLessThanOrEqual(252);
        }
    });

    it('160x600 skyscraper fits vertically', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 160, 600, false);
        for (const el of elements) {
            expect((el.y ?? 0) + (el.h ?? 0)).toBeLessThanOrEqual(602);
        }
    });
});

// ─────────────────────────────────────────────────
// 8. Variant Selection Distribution
// ─────────────────────────────────────────────────

describe('★ REGRESSION: Variant selection', () => {
    it('random variant selection produces all 10 variants over 100 calls', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 100; i++) {
            const { variant } = getLayoutRules('square');
            seen.add(variant);
        }
        expect(seen.size).toBe(10);
    });
});

// ─────────────────────────────────────────────────
// 9. BuildResult Contract
// ─────────────────────────────────────────────────

describe('★ REGRESSION: buildDesignElements return contract', () => {
    it('returns elements array and variant string', () => {
        const result = buildDesignElements(MINIMAL_CONTENT, PALETTE, 300, 250, false);
        expect(Array.isArray(result.elements)).toBe(true);
        expect(typeof result.variant).toBe('string');
        expect(VARIANTS).toContain(result.variant);
    });

    it('minimal content produces at least 2 elements (bg + headline)', () => {
        const { elements } = buildDesignElements(MINIMAL_CONTENT, PALETTE, 300, 250, false);
        expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    it('full content produces at least 5 elements (bg + tag + headline + sub + cta_btn)', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 300, 250, false);
        expect(elements.length).toBeGreaterThanOrEqual(5);
    });

    it('every text element has content, font_size, color_hex', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, false);
        const texts = elements.filter(el => el.type === 'text');
        for (const t of texts) {
            expect(t.content, `${t.name} missing content`).toBeTruthy();
            expect(t.font_size, `${t.name} missing font_size`).toBeGreaterThan(0);
            expect(t.color_hex, `${t.name} missing color_hex`).toBeTruthy();
        }
    });

    it('every element has x, y, w, h defined', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, false);
        for (const el of elements) {
            expect(el.x, `${el.name} missing x`).toBeDefined();
            expect(el.y, `${el.name} missing y`).toBeDefined();
            expect(el.w, `${el.name} missing w`).toBeDefined();
            expect(el.h, `${el.name} missing h`).toBeDefined();
        }
    });
});

// ─────────────────────────────────────────────────
// 10. Contrast Guard
// ─────────────────────────────────────────────────

describe('★ REGRESSION: Contrast and visual guards', () => {
    it('light gradient gets darkened (flat gradient correction)', () => {
        const lightPalette: DesignPalette = {
            ...PALETTE,
            gradientStart: '#F0F0F0',
            gradientEnd: '#F5F5F5',
            foreground: '#333333',
        };
        const { elements } = buildDesignElements(MINIMAL_CONTENT, lightPalette, 300, 250, false);
        const bg = elements.find(el => el.name === 'background');
        // Should NOT remain near-white
        expect(bg!.gradient_start_hex).not.toBe('#F0F0F0');
    });

    it('low contrast foreground gets corrected', () => {
        const lowContrastPalette: DesignPalette = {
            ...PALETTE,
            gradientStart: '#111111',
            gradientEnd: '#222222',
            foreground: '#333333', // very close to bg — low contrast
        };
        const { elements } = buildDesignElements(MINIMAL_CONTENT, lowContrastPalette, 300, 250, false);
        const headline = elements.find(el => el.name === 'headline');
        // Text should be forced to white (bg is dark)
        expect(headline!.color_hex).toBe('#FFFFFF');
    });
});

// ─────────────────────────────────────────────────
// 11. Height-Aware Typography Scale
// ─────────────────────────────────────────────────

describe('★ P0-2: Height-aware typography', () => {
    it('728x90 headline font is smaller than 1080x1080 headline', () => {
        const { elements: small } = buildDesignElements(MINIMAL_CONTENT, PALETTE, 728, 90, false);
        const { elements: big } = buildDesignElements(MINIMAL_CONTENT, PALETTE, 1080, 1080, false);
        const smallH = small.find(el => el.name === 'headline')!.font_size!;
        const bigH = big.find(el => el.name === 'headline')!.font_size!;
        expect(bigH).toBeGreaterThan(smallH);
    });

    it('headline fontSize is capped by canvas height (30% budget)', () => {
        for (const [w, h] of AD_SIZES) {
            const { elements } = buildDesignElements(MINIMAL_CONTENT, PALETTE, w, h, false);
            const headline = elements.find(el => el.name === 'headline')!;
            // fontSize should not exceed ~30% of canvasH / lineHeight
            const maxReasonable = Math.floor(h * 0.30 / 1.2) + 1; // ~lineHeight 1.2 + 1px rounding
            expect(headline.font_size, `${w}x${h} headline fontSize too large`).toBeLessThanOrEqual(maxReasonable);
        }
    });

    it('subheadline never exceeds 20% of canvas height (single line)', () => {
        for (const [w, h] of AD_SIZES) {
            const content = { headline: 'H', subheadline: 'S' };
            const { elements } = buildDesignElements(content, PALETTE, w, h, false);
            const sub = elements.find(el => el.name === 'subheadline');
            if (sub) {
                expect(sub.font_size!, `${w}x${h} sub fontSize`).toBeLessThanOrEqual(h * 0.20);
            }
        }
    });
});

// ─────────────────────────────────────────────────
// 12. Vertical Bias Positioning
// ─────────────────────────────────────────────────

describe('★ P0-1: Vertical bias positioning', () => {
    it('top-heavy places headline in upper 40% of canvas', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, false, 'top-heavy');
        const headline = elements.find(el => el.name === 'headline')!;
        expect(headline.y).toBeLessThan(1080 * 0.40);
    });

    it('bottom-stack places headline in lower 60% of canvas', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, false, 'bottom-stack');
        const headline = elements.find(el => el.name === 'headline')!;
        expect(headline.y).toBeGreaterThan(1080 * 0.30);
    });

    it('centered places headline near the golden ratio (~38%)', () => {
        const { elements } = buildDesignElements(MINIMAL_CONTENT, PALETTE, 1080, 1080, false, 'centered');
        const headline = elements.find(el => el.name === 'headline')!;
        expect(headline.y).toBeGreaterThan(1080 * 0.15);
        expect(headline.y).toBeLessThan(1080 * 0.55);
    });
});

// ─────────────────────────────────────────────────
// 13. Content Order Variations
// ─────────────────────────────────────────────────

describe('★ P0-1: Content order', () => {
    it('bold-statement places headline before tag (headline-first order)', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, false, 'bold-statement');
        const headline = elements.find(el => el.name === 'headline')!;
        const tag = elements.find(el => el.name === 'tag_text');
        if (tag) {
            expect(headline.y).toBeLessThan(tag.y!);
        }
    });

    it('centered (standard order) places tag before headline', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, false, 'centered');
        const headline = elements.find(el => el.name === 'headline')!;
        const tag = elements.find(el => el.name === 'tag_text')!;
        expect(tag.y).toBeLessThan(headline.y!);
    });
});

// ─────────────────────────────────────────────────
// 14. Text-on-Image Overlay (P0-4)
// ─────────────────────────────────────────────────

describe('★ P0-4: Text-on-image overlay', () => {
    it('overlay exists when hasBgImage=true', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, true, 'centered');
        const overlay = elements.find(el => el.name === 'text_overlay');
        expect(overlay).toBeDefined();
        expect(overlay!.type).toBe('rect');
    });

    it('no overlay when hasBgImage=false', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, false, 'centered');
        const overlay = elements.find(el => el.name === 'text_overlay');
        expect(overlay).toBeUndefined();
    });

    it('overlay has semi-transparent dark fill (a < 1)', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 300, 250, true);
        const overlay = elements.find(el => el.name === 'text_overlay')!;
        expect(overlay.a).toBeGreaterThan(0);
        expect(overlay.a).toBeLessThan(1);
        expect(overlay.r).toBe(0); // dark
        expect(overlay.g).toBe(0);
        expect(overlay.b).toBe(0);
    });

    it('overlay covers all text elements', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, true, 'centered');
        const overlay = elements.find(el => el.name === 'text_overlay')!;
        const textEls = elements.filter(el => el.type === 'text');
        for (const t of textEls) {
            expect(overlay.x!, `overlay doesn't cover ${t.name} left`).toBeLessThanOrEqual(t.x!);
            expect(overlay.y!, `overlay doesn't cover ${t.name} top`).toBeLessThanOrEqual(t.y!);
            expect((overlay.x ?? 0) + (overlay.w ?? 0)).toBeGreaterThanOrEqual((t.x ?? 0) + (t.w ?? 0) - 2);
            expect((overlay.y ?? 0) + (overlay.h ?? 0)).toBeGreaterThanOrEqual((t.y ?? 0) + (t.h ?? 0) - 2);
        }
    });

    it('overlay is first element (behind all content)', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, true, 'centered');
        expect(elements[0]!.name).toBe('text_overlay');
    });

    it('overlay stays within canvas bounds', () => {
        for (const [w, h] of AD_SIZES) {
            const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, w, h, true);
            const overlay = elements.find(el => el.name === 'text_overlay');
            if (overlay) {
                expect(overlay.x).toBeGreaterThanOrEqual(0);
                expect(overlay.y).toBeGreaterThanOrEqual(0);
                expect((overlay.x ?? 0) + (overlay.w ?? 0)).toBeLessThanOrEqual(w + 1);
                expect((overlay.y ?? 0) + (overlay.h ?? 0)).toBeLessThanOrEqual(h + 1);
            }
        }
    });

    it('overlay has rounded corners', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 1080, 1080, true);
        const overlay = elements.find(el => el.name === 'text_overlay')!;
        expect(overlay.radius).toBeGreaterThan(0);
    });

    it('text is white when bg image present (readability)', () => {
        const { elements } = buildDesignElements(FULL_CONTENT, PALETTE, 300, 250, true);
        const texts = elements.filter(el => el.type === 'text');
        for (const t of texts) {
            expect(t.color_hex).toBe('#FFFFFF');
        }
    });
});

