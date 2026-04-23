// ─────────────────────────────────────────────────
// Carbon Layout Rules — Aspect-category + variant positioning
// ─────────────────────────────────────────────────
// Each aspect ratio has MULTIPLE layout variants to prevent
// monotonous, always-centered designs.
// ─────────────────────────────────────────────────

import type { AspectCategory } from '@/schema/layoutRoles';

export type LayoutVariant = 'centered' | 'left-hero' | 'offset-right';

export interface ElementRule {
    typeStyle: string;
    cols: number;
    align: 'center' | 'left' | 'right';
    /** Spacing step between this element and previous (Carbon spacing index 0-12) */
    gapStep: number;
    maxLines?: number;
    fontWeight?: number;
    textAlign?: 'left' | 'center' | 'right';
    /** Ad impact multiplier: scales Carbon font size for ad creative impact */
    adScale: number;
}

export interface LayoutRuleSet {
    headline: ElementRule;
    subline: ElementRule;
    cta: ElementRule;
    tag: ElementRule;
    /** Minimum CTA height as fraction of canvasMin */
    ctaHeightFactor: number;
}

// ── Square Rules ─────────────────────────────────

const SQUARE_CENTERED: LayoutRuleSet = {
    headline: { typeStyle: 'display03', cols: 14, align: 'center', gapStep: 6, maxLines: 3, fontWeight: 700, textAlign: 'center', adScale: 1.6 },
    subline:  { typeStyle: 'heading04', cols: 13, align: 'center', gapStep: 8, textAlign: 'center', adScale: 1.3 },
    cta:      { typeStyle: 'heading03', cols: 10, align: 'center', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.4 },
    tag:      { typeStyle: 'label02', cols: 10, align: 'center', gapStep: 5, textAlign: 'center', adScale: 1.6 },
    ctaHeightFactor: 0.055,
};

const SQUARE_LEFT_HERO: LayoutRuleSet = {
    headline: { typeStyle: 'display03', cols: 12, align: 'left', gapStep: 6, maxLines: 3, fontWeight: 700, textAlign: 'left', adScale: 1.5 },
    subline:  { typeStyle: 'heading04', cols: 11, align: 'left', gapStep: 8, textAlign: 'left', adScale: 1.3 },
    cta:      { typeStyle: 'heading03', cols: 8, align: 'left', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.4 },
    tag:      { typeStyle: 'label02', cols: 8, align: 'left', gapStep: 5, textAlign: 'left', adScale: 1.6 },
    ctaHeightFactor: 0.055,
};

const SQUARE_OFFSET_RIGHT: LayoutRuleSet = {
    headline: { typeStyle: 'display03', cols: 11, align: 'right', gapStep: 6, maxLines: 3, fontWeight: 700, textAlign: 'right', adScale: 1.5 },
    subline:  { typeStyle: 'heading04', cols: 10, align: 'right', gapStep: 8, textAlign: 'right', adScale: 1.3 },
    cta:      { typeStyle: 'heading03', cols: 8, align: 'right', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.4 },
    tag:      { typeStyle: 'label02', cols: 8, align: 'right', gapStep: 5, textAlign: 'right', adScale: 1.6 },
    ctaHeightFactor: 0.055,
};

// ── Landscape Rules ──────────────────────────────

const LANDSCAPE_CENTERED: LayoutRuleSet = {
    headline: { typeStyle: 'expressiveHeading06', cols: 14, align: 'center', gapStep: 6, maxLines: 2, fontWeight: 700, textAlign: 'center', adScale: 1.5 },
    subline:  { typeStyle: 'heading04', cols: 12, align: 'center', gapStep: 7, textAlign: 'center', adScale: 1.3 },
    cta:      { typeStyle: 'productiveHeading03', cols: 8, align: 'center', gapStep: 8, fontWeight: 600, textAlign: 'center', adScale: 1.3 },
    tag:      { typeStyle: 'label02', cols: 10, align: 'center', gapStep: 4, textAlign: 'center', adScale: 1.4 },
    ctaHeightFactor: 0.07,
};

const LANDSCAPE_LEFT_HERO: LayoutRuleSet = {
    headline: { typeStyle: 'expressiveHeading06', cols: 10, align: 'left', gapStep: 5, maxLines: 2, fontWeight: 700, textAlign: 'left', adScale: 1.4 },
    subline:  { typeStyle: 'heading04', cols: 9, align: 'left', gapStep: 6, textAlign: 'left', adScale: 1.2 },
    cta:      { typeStyle: 'productiveHeading03', cols: 6, align: 'left', gapStep: 7, fontWeight: 600, textAlign: 'center', adScale: 1.3 },
    tag:      { typeStyle: 'label02', cols: 6, align: 'left', gapStep: 4, textAlign: 'left', adScale: 1.3 },
    ctaHeightFactor: 0.08,
};

const LANDSCAPE_OFFSET_RIGHT: LayoutRuleSet = {
    headline: { typeStyle: 'expressiveHeading06', cols: 10, align: 'right', gapStep: 5, maxLines: 2, fontWeight: 700, textAlign: 'right', adScale: 1.4 },
    subline:  { typeStyle: 'heading04', cols: 9, align: 'right', gapStep: 6, textAlign: 'right', adScale: 1.2 },
    cta:      { typeStyle: 'productiveHeading03', cols: 6, align: 'right', gapStep: 7, fontWeight: 600, textAlign: 'center', adScale: 1.3 },
    tag:      { typeStyle: 'label02', cols: 6, align: 'right', gapStep: 4, textAlign: 'right', adScale: 1.3 },
    ctaHeightFactor: 0.08,
};

// ── Portrait Rules ───────────────────────────────

const PORTRAIT_CENTERED: LayoutRuleSet = {
    headline: { typeStyle: 'display01', cols: 14, align: 'center', gapStep: 6, maxLines: 4, fontWeight: 700, textAlign: 'center', adScale: 1.5 },
    subline:  { typeStyle: 'heading04', cols: 13, align: 'center', gapStep: 8, textAlign: 'center', adScale: 1.3 },
    cta:      { typeStyle: 'productiveHeading03', cols: 12, align: 'center', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.3 },
    tag:      { typeStyle: 'label02', cols: 12, align: 'center', gapStep: 5, textAlign: 'center', adScale: 1.5 },
    ctaHeightFactor: 0.06,
};

const PORTRAIT_LEFT_HERO: LayoutRuleSet = {
    headline: { typeStyle: 'display01', cols: 13, align: 'left', gapStep: 6, maxLines: 4, fontWeight: 700, textAlign: 'left', adScale: 1.4 },
    subline:  { typeStyle: 'heading04', cols: 12, align: 'left', gapStep: 8, textAlign: 'left', adScale: 1.3 },
    cta:      { typeStyle: 'productiveHeading03', cols: 10, align: 'left', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.3 },
    tag:      { typeStyle: 'label02', cols: 10, align: 'left', gapStep: 5, textAlign: 'left', adScale: 1.5 },
    ctaHeightFactor: 0.06,
};

const PORTRAIT_OFFSET_RIGHT: LayoutRuleSet = {
    headline: { typeStyle: 'display01', cols: 12, align: 'right', gapStep: 6, maxLines: 4, fontWeight: 700, textAlign: 'right', adScale: 1.4 },
    subline:  { typeStyle: 'heading04', cols: 11, align: 'right', gapStep: 8, textAlign: 'right', adScale: 1.3 },
    cta:      { typeStyle: 'productiveHeading03', cols: 10, align: 'right', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.3 },
    tag:      { typeStyle: 'label02', cols: 10, align: 'right', gapStep: 5, textAlign: 'right', adScale: 1.5 },
    ctaHeightFactor: 0.06,
};

// ── Ultra-Wide Rules (always horizontal — only 1 variant) ──

const ULTRA_WIDE: LayoutRuleSet = {
    headline: { typeStyle: 'expressiveHeading05', cols: 6, align: 'left', gapStep: 3, maxLines: 1, fontWeight: 700, textAlign: 'left', adScale: 1.4 },
    subline:  { typeStyle: 'expressiveHeading03', cols: 5, align: 'center', gapStep: 3, textAlign: 'center', adScale: 1.2 },
    cta:      { typeStyle: 'productiveHeading02', cols: 3, align: 'right', gapStep: 3, fontWeight: 600, textAlign: 'center', adScale: 1.3 },
    tag:      { typeStyle: 'label01', cols: 3, align: 'left', gapStep: 2, textAlign: 'left', adScale: 1.3 },
    ctaHeightFactor: 0.35,
};

// ── Variant Map ──────────────────────────────────

const VARIANT_MAP: Record<AspectCategory, Record<LayoutVariant, LayoutRuleSet>> = {
    'square': { 'centered': SQUARE_CENTERED, 'left-hero': SQUARE_LEFT_HERO, 'offset-right': SQUARE_OFFSET_RIGHT },
    'landscape': { 'centered': LANDSCAPE_CENTERED, 'left-hero': LANDSCAPE_LEFT_HERO, 'offset-right': LANDSCAPE_OFFSET_RIGHT },
    'portrait': { 'centered': PORTRAIT_CENTERED, 'left-hero': PORTRAIT_LEFT_HERO, 'offset-right': PORTRAIT_OFFSET_RIGHT },
    'ultra-wide': { 'centered': ULTRA_WIDE, 'left-hero': ULTRA_WIDE, 'offset-right': ULTRA_WIDE },
};

const VARIANTS: LayoutVariant[] = ['centered', 'left-hero', 'offset-right'];

/** Get a specific layout variant, or random if not specified. */
export function getLayoutRules(
    category: AspectCategory,
    variant?: LayoutVariant,
): { rules: LayoutRuleSet; variant: LayoutVariant } {
    const picked = variant ?? VARIANTS[Math.floor(Math.random() * VARIANTS.length)]!;
    return { rules: VARIANT_MAP[category][picked], variant: picked };
}

/** Legacy compat: single rules map (always returns centered). */
export const RULES_MAP: Record<AspectCategory, LayoutRuleSet> = {
    'square': SQUARE_CENTERED,
    'landscape': LANDSCAPE_CENTERED,
    'portrait': PORTRAIT_CENTERED,
    'ultra-wide': ULTRA_WIDE,
};
