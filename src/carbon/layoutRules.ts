// ─────────────────────────────────────────────────
// Carbon Layout Rules — Aspect-category + variant positioning
// ─────────────────────────────────────────────────
// Each aspect ratio has MULTIPLE layout variants to prevent
// monotonous, always-centered designs.
//
// v2: Added verticalBias + contentOrder for 10 distinct layouts.
// ─────────────────────────────────────────────────

import type { AspectCategory } from '@/schema/layoutRoles';

export type LayoutVariant =
    | 'centered' | 'left-hero' | 'offset-right'
    | 'top-heavy' | 'bottom-stack' | 'split-left'
    | 'minimal-center' | 'bold-statement' | 'editorial' | 'compact-bar';

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
    /** Where to position the content block vertically (default: 'center') */
    verticalBias?: 'center' | 'top' | 'bottom';
    /** Order of content elements (default: 'standard' = tag→headline→sub→cta) */
    contentOrder?: 'standard' | 'headline-first' | 'tag-last';
}

// ── Shared Builders (DRY) ────────────────────────

function sq(overrides: Partial<Record<'headline' | 'subline' | 'cta' | 'tag', Partial<ElementRule>>> & Partial<Omit<LayoutRuleSet, 'headline' | 'subline' | 'cta' | 'tag'>>): LayoutRuleSet {
    return {
        // ★ adScale values are HIGH because Carbon type styles are designed for web UI (16px body),
        // not display ads where text must dominate the canvas. 1080px ad ≠ 1080px web page.
        // ★ v718: gapStep reduced from 6/7/8 to 4/4/5 — web spacing was far too wide for ads.
        headline: { typeStyle: 'display03', cols: 14, align: 'center', gapStep: 4, maxLines: 3, fontWeight: 700, textAlign: 'center', adScale: 1.8, ...overrides.headline },
        subline:  { typeStyle: 'heading04', cols: 13, align: 'center', gapStep: 4, textAlign: 'center', adScale: 2.0, ...overrides.subline },
        cta:      { typeStyle: 'heading03', cols: 10, align: 'center', gapStep: 5, fontWeight: 600, textAlign: 'center', adScale: 1.8, ...overrides.cta },
        tag:      { typeStyle: 'label02', cols: 10, align: 'center', gapStep: 3, textAlign: 'center', adScale: 1.8, ...overrides.tag },
        ctaHeightFactor: overrides.ctaHeightFactor ?? 0.07,
        verticalBias: overrides.verticalBias,
        contentOrder: overrides.contentOrder,
    };
}

function ls(overrides: Partial<Record<'headline' | 'subline' | 'cta' | 'tag', Partial<ElementRule>>> & Partial<Omit<LayoutRuleSet, 'headline' | 'subline' | 'cta' | 'tag'>>): LayoutRuleSet {
    return {
        // ★ v718: gapStep reduced — tighter spacing for landscape ads
        headline: { typeStyle: 'expressiveHeading06', cols: 14, align: 'center', gapStep: 4, maxLines: 2, fontWeight: 700, textAlign: 'center', adScale: 1.5, ...overrides.headline },
        subline:  { typeStyle: 'heading04', cols: 12, align: 'center', gapStep: 4, textAlign: 'center', adScale: 1.3, ...overrides.subline },
        cta:      { typeStyle: 'productiveHeading03', cols: 8, align: 'center', gapStep: 5, fontWeight: 600, textAlign: 'center', adScale: 1.3, ...overrides.cta },
        tag:      { typeStyle: 'label02', cols: 10, align: 'center', gapStep: 3, textAlign: 'center', adScale: 1.4, ...overrides.tag },
        ctaHeightFactor: overrides.ctaHeightFactor ?? 0.07,
        verticalBias: overrides.verticalBias,
        contentOrder: overrides.contentOrder,
    };
}

function pt(overrides: Partial<Record<'headline' | 'subline' | 'cta' | 'tag', Partial<ElementRule>>> & Partial<Omit<LayoutRuleSet, 'headline' | 'subline' | 'cta' | 'tag'>>): LayoutRuleSet {
    return {
        // ★ v718: gapStep reduced — tighter spacing for portrait ads
        headline: { typeStyle: 'display01', cols: 14, align: 'center', gapStep: 4, maxLines: 4, fontWeight: 700, textAlign: 'center', adScale: 1.5, ...overrides.headline },
        subline:  { typeStyle: 'heading04', cols: 13, align: 'center', gapStep: 5, textAlign: 'center', adScale: 1.3, ...overrides.subline },
        cta:      { typeStyle: 'productiveHeading03', cols: 12, align: 'center', gapStep: 5, fontWeight: 600, textAlign: 'center', adScale: 1.3, ...overrides.cta },
        tag:      { typeStyle: 'label02', cols: 12, align: 'center', gapStep: 3, textAlign: 'center', adScale: 1.5, ...overrides.tag },
        ctaHeightFactor: overrides.ctaHeightFactor ?? 0.06,
        verticalBias: overrides.verticalBias,
        contentOrder: overrides.contentOrder,
    };
}

// ── Square Rules (10 variants) ───────────────────

const SQUARE: Record<LayoutVariant, LayoutRuleSet> = {
    'centered':        sq({}),
    'left-hero':       sq({ headline: { typeStyle: 'display03', cols: 12, align: 'left', gapStep: 6, maxLines: 3, fontWeight: 700, textAlign: 'left', adScale: 1.5 }, subline: { typeStyle: 'heading04', cols: 11, align: 'left', gapStep: 8, textAlign: 'left', adScale: 1.8 }, cta: { typeStyle: 'heading03', cols: 8, align: 'left', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.4 }, tag: { typeStyle: 'label02', cols: 8, align: 'left', gapStep: 5, textAlign: 'left', adScale: 1.6 } }),
    'offset-right':    sq({ headline: { typeStyle: 'display03', cols: 11, align: 'right', gapStep: 6, maxLines: 3, fontWeight: 700, textAlign: 'right', adScale: 1.5 }, subline: { typeStyle: 'heading04', cols: 10, align: 'right', gapStep: 8, textAlign: 'right', adScale: 1.8 }, cta: { typeStyle: 'heading03', cols: 8, align: 'right', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.4 }, tag: { typeStyle: 'label02', cols: 8, align: 'right', gapStep: 5, textAlign: 'right', adScale: 1.6 } }),
    'top-heavy':       sq({ verticalBias: 'top', headline: { typeStyle: 'display03', cols: 14, align: 'center', gapStep: 4, maxLines: 2, fontWeight: 800, textAlign: 'center', adScale: 1.7 }, subline: { typeStyle: 'heading04', cols: 12, align: 'center', gapStep: 5, textAlign: 'center', adScale: 1.7 }, cta: { typeStyle: 'heading03', cols: 10, align: 'center', gapStep: 6, fontWeight: 600, textAlign: 'center', adScale: 1.8 } }),
    'bottom-stack':    sq({ verticalBias: 'bottom', headline: { typeStyle: 'display03', cols: 14, align: 'center', gapStep: 5, maxLines: 3, fontWeight: 700, textAlign: 'center', adScale: 1.5 }, subline: { typeStyle: 'heading04', cols: 13, align: 'center', gapStep: 6, textAlign: 'center', adScale: 1.7 } }),
    'split-left':      sq({ headline: { typeStyle: 'display03', cols: 8, align: 'left', gapStep: 5, maxLines: 4, fontWeight: 700, textAlign: 'left', adScale: 1.4 }, subline: { typeStyle: 'heading04', cols: 7, align: 'left', gapStep: 7, textAlign: 'left', adScale: 1.7 }, cta: { typeStyle: 'heading03', cols: 6, align: 'left', gapStep: 8, fontWeight: 600, textAlign: 'center', adScale: 1.8 }, tag: { typeStyle: 'label02', cols: 6, align: 'left', gapStep: 4, textAlign: 'left', adScale: 1.5 } }),
    'minimal-center':  sq({ headline: { typeStyle: 'heading04', cols: 10, align: 'center', gapStep: 4, maxLines: 2, fontWeight: 400, textAlign: 'center', adScale: 1.8 }, subline: { typeStyle: 'label02', cols: 8, align: 'center', gapStep: 5, textAlign: 'center', adScale: 1.4 }, cta: { typeStyle: 'label02', cols: 6, align: 'center', gapStep: 7, fontWeight: 500, textAlign: 'center', adScale: 1.8 }, ctaHeightFactor: 0.045 }),
    'bold-statement':  sq({ contentOrder: 'headline-first', headline: { typeStyle: 'display03', cols: 15, align: 'center', gapStep: 3, maxLines: 2, fontWeight: 900, textAlign: 'center', adScale: 2.0 }, subline: { typeStyle: 'label02', cols: 10, align: 'center', gapStep: 6, textAlign: 'center', adScale: 1.6 }, cta: { typeStyle: 'heading03', cols: 8, align: 'center', gapStep: 7, fontWeight: 600, textAlign: 'center', adScale: 1.7 }, ctaHeightFactor: 0.045 }),
    'editorial':       sq({ headline: { typeStyle: 'display03', cols: 12, align: 'left', gapStep: 5, maxLines: 3, fontWeight: 300, textAlign: 'left', adScale: 1.6 }, subline: { typeStyle: 'heading04', cols: 10, align: 'left', gapStep: 7, textAlign: 'left', adScale: 1.7 }, cta: { typeStyle: 'heading03', cols: 7, align: 'left', gapStep: 8, fontWeight: 500, textAlign: 'center', adScale: 1.8 }, tag: { typeStyle: 'label02', cols: 6, align: 'left', gapStep: 4, textAlign: 'left', adScale: 1.4 } }),
    'compact-bar':     sq({ verticalBias: 'bottom', headline: { typeStyle: 'expressiveHeading06', cols: 14, align: 'center', gapStep: 3, maxLines: 1, fontWeight: 700, textAlign: 'center', adScale: 1.4 }, subline: { typeStyle: 'label02', cols: 12, align: 'center', gapStep: 4, textAlign: 'center', adScale: 1.6 }, cta: { typeStyle: 'productiveHeading02', cols: 8, align: 'center', gapStep: 5, fontWeight: 600, textAlign: 'center', adScale: 1.7 }, ctaHeightFactor: 0.04 }),
};

// ── Landscape Rules (10 variants) ────────────────

const LANDSCAPE: Record<LayoutVariant, LayoutRuleSet> = {
    'centered':        ls({}),
    'left-hero':       ls({ headline: { typeStyle: 'expressiveHeading06', cols: 10, align: 'left', gapStep: 5, maxLines: 2, fontWeight: 700, textAlign: 'left', adScale: 1.4 }, subline: { typeStyle: 'heading04', cols: 9, align: 'left', gapStep: 6, textAlign: 'left', adScale: 1.7 }, cta: { typeStyle: 'productiveHeading03', cols: 6, align: 'left', gapStep: 7, fontWeight: 600, textAlign: 'center', adScale: 1.8 }, tag: { typeStyle: 'label02', cols: 6, align: 'left', gapStep: 4, textAlign: 'left', adScale: 1.8 }, ctaHeightFactor: 0.08 }),
    'offset-right':    ls({ headline: { typeStyle: 'expressiveHeading06', cols: 10, align: 'right', gapStep: 5, maxLines: 2, fontWeight: 700, textAlign: 'right', adScale: 1.4 }, subline: { typeStyle: 'heading04', cols: 9, align: 'right', gapStep: 6, textAlign: 'right', adScale: 1.7 }, cta: { typeStyle: 'productiveHeading03', cols: 6, align: 'right', gapStep: 7, fontWeight: 600, textAlign: 'center', adScale: 1.8 }, tag: { typeStyle: 'label02', cols: 6, align: 'right', gapStep: 4, textAlign: 'right', adScale: 1.8 }, ctaHeightFactor: 0.08 }),
    'top-heavy':       ls({ verticalBias: 'top', headline: { typeStyle: 'expressiveHeading06', cols: 14, align: 'center', gapStep: 3, maxLines: 1, fontWeight: 800, textAlign: 'center', adScale: 1.6 }, subline: { typeStyle: 'heading04', cols: 10, align: 'center', gapStep: 4, textAlign: 'center', adScale: 1.6 }, ctaHeightFactor: 0.09 }),
    'bottom-stack':    ls({ verticalBias: 'bottom', ctaHeightFactor: 0.08 }),
    'split-left':      ls({ headline: { typeStyle: 'expressiveHeading06', cols: 8, align: 'left', gapStep: 4, maxLines: 2, fontWeight: 700, textAlign: 'left', adScale: 1.8 }, subline: { typeStyle: 'heading04', cols: 7, align: 'left', gapStep: 5, textAlign: 'left', adScale: 1.6 }, cta: { typeStyle: 'productiveHeading03', cols: 5, align: 'left', gapStep: 6, fontWeight: 600, textAlign: 'center', adScale: 1.7 }, tag: { typeStyle: 'label02', cols: 5, align: 'left', gapStep: 3, textAlign: 'left', adScale: 1.7 }, ctaHeightFactor: 0.09 }),
    'minimal-center':  ls({ headline: { typeStyle: 'heading04', cols: 10, align: 'center', gapStep: 3, maxLines: 1, fontWeight: 400, textAlign: 'center', adScale: 1.6 }, subline: { typeStyle: 'label02', cols: 8, align: 'center', gapStep: 4, textAlign: 'center', adScale: 1.8 }, cta: { typeStyle: 'label02', cols: 5, align: 'center', gapStep: 5, fontWeight: 500, textAlign: 'center', adScale: 1.7 }, ctaHeightFactor: 0.06 }),
    'bold-statement':  ls({ contentOrder: 'headline-first', headline: { typeStyle: 'expressiveHeading06', cols: 15, align: 'center', gapStep: 3, maxLines: 1, fontWeight: 900, textAlign: 'center', adScale: 1.8 }, subline: { typeStyle: 'label02', cols: 8, align: 'center', gapStep: 5, textAlign: 'center', adScale: 1.0 }, ctaHeightFactor: 0.08 }),
    'editorial':       ls({ headline: { typeStyle: 'expressiveHeading06', cols: 10, align: 'left', gapStep: 4, maxLines: 2, fontWeight: 300, textAlign: 'left', adScale: 1.5 }, subline: { typeStyle: 'heading04', cols: 8, align: 'left', gapStep: 5, textAlign: 'left', adScale: 1.6 }, cta: { typeStyle: 'productiveHeading03', cols: 5, align: 'left', gapStep: 6, fontWeight: 500, textAlign: 'center', adScale: 1.7 }, ctaHeightFactor: 0.08 }),
    'compact-bar':     ls({ verticalBias: 'center', headline: { typeStyle: 'expressiveHeading05', cols: 6, align: 'left', gapStep: 2, maxLines: 1, fontWeight: 700, textAlign: 'left', adScale: 1.8 }, subline: { typeStyle: 'expressiveHeading03', cols: 5, align: 'center', gapStep: 2, textAlign: 'center', adScale: 1.6 }, cta: { typeStyle: 'productiveHeading02', cols: 4, align: 'right', gapStep: 2, fontWeight: 600, textAlign: 'center', adScale: 1.7 }, tag: { typeStyle: 'label01', cols: 3, align: 'left', gapStep: 1, textAlign: 'left', adScale: 1.7 }, ctaHeightFactor: 0.3 }),
};

// ── Portrait Rules (10 variants) ─────────────────

const PORTRAIT: Record<LayoutVariant, LayoutRuleSet> = {
    'centered':        pt({}),
    'left-hero':       pt({ headline: { typeStyle: 'display01', cols: 13, align: 'left', gapStep: 6, maxLines: 4, fontWeight: 700, textAlign: 'left', adScale: 1.4 }, subline: { typeStyle: 'heading04', cols: 12, align: 'left', gapStep: 8, textAlign: 'left', adScale: 1.8 }, cta: { typeStyle: 'productiveHeading03', cols: 10, align: 'left', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.8 }, tag: { typeStyle: 'label02', cols: 10, align: 'left', gapStep: 5, textAlign: 'left', adScale: 1.5 } }),
    'offset-right':    pt({ headline: { typeStyle: 'display01', cols: 12, align: 'right', gapStep: 6, maxLines: 4, fontWeight: 700, textAlign: 'right', adScale: 1.4 }, subline: { typeStyle: 'heading04', cols: 11, align: 'right', gapStep: 8, textAlign: 'right', adScale: 1.8 }, cta: { typeStyle: 'productiveHeading03', cols: 10, align: 'right', gapStep: 9, fontWeight: 600, textAlign: 'center', adScale: 1.8 }, tag: { typeStyle: 'label02', cols: 10, align: 'right', gapStep: 5, textAlign: 'right', adScale: 1.5 } }),
    'top-heavy':       pt({ verticalBias: 'top', headline: { typeStyle: 'display01', cols: 14, align: 'center', gapStep: 4, maxLines: 3, fontWeight: 800, textAlign: 'center', adScale: 1.6 }, subline: { typeStyle: 'heading04', cols: 12, align: 'center', gapStep: 5, textAlign: 'center', adScale: 1.7 } }),
    'bottom-stack':    pt({ verticalBias: 'bottom' }),
    'split-left':      pt({ headline: { typeStyle: 'display01', cols: 10, align: 'left', gapStep: 5, maxLines: 5, fontWeight: 700, textAlign: 'left', adScale: 1.8 }, subline: { typeStyle: 'heading04', cols: 9, align: 'left', gapStep: 7, textAlign: 'left', adScale: 1.7 }, cta: { typeStyle: 'productiveHeading03', cols: 8, align: 'left', gapStep: 8, fontWeight: 600, textAlign: 'center', adScale: 1.7 }, tag: { typeStyle: 'label02', cols: 8, align: 'left', gapStep: 4, textAlign: 'left', adScale: 1.4 } }),
    'minimal-center':  pt({ headline: { typeStyle: 'heading04', cols: 10, align: 'center', gapStep: 4, maxLines: 3, fontWeight: 400, textAlign: 'center', adScale: 1.7 }, subline: { typeStyle: 'label02', cols: 8, align: 'center', gapStep: 5, textAlign: 'center', adScale: 1.8 }, cta: { typeStyle: 'label02', cols: 7, align: 'center', gapStep: 7, fontWeight: 500, textAlign: 'center', adScale: 1.7 }, ctaHeightFactor: 0.05 }),
    'bold-statement':  pt({ contentOrder: 'headline-first', headline: { typeStyle: 'display01', cols: 15, align: 'center', gapStep: 3, maxLines: 3, fontWeight: 900, textAlign: 'center', adScale: 1.9 }, subline: { typeStyle: 'label02', cols: 10, align: 'center', gapStep: 6, textAlign: 'center', adScale: 1.0 } }),
    'editorial':       pt({ headline: { typeStyle: 'display01', cols: 12, align: 'left', gapStep: 5, maxLines: 4, fontWeight: 300, textAlign: 'left', adScale: 1.5 }, subline: { typeStyle: 'heading04', cols: 10, align: 'left', gapStep: 7, textAlign: 'left', adScale: 1.7 }, cta: { typeStyle: 'productiveHeading03', cols: 9, align: 'left', gapStep: 8, fontWeight: 500, textAlign: 'center', adScale: 1.7 } }),
    'compact-bar':     pt({ verticalBias: 'bottom', headline: { typeStyle: 'expressiveHeading06', cols: 14, align: 'center', gapStep: 3, maxLines: 2, fontWeight: 700, textAlign: 'center', adScale: 1.8 }, subline: { typeStyle: 'label02', cols: 12, align: 'center', gapStep: 4, textAlign: 'center', adScale: 1.6 }, cta: { typeStyle: 'productiveHeading02', cols: 10, align: 'center', gapStep: 5, fontWeight: 600, textAlign: 'center', adScale: 1.6 }, ctaHeightFactor: 0.04 }),
};

// ── Ultra-Wide (horizontal bar — all variants map to same) ──

const ULTRA_WIDE_BASE: LayoutRuleSet = {
    headline: { typeStyle: 'expressiveHeading05', cols: 6, align: 'left', gapStep: 3, maxLines: 1, fontWeight: 700, textAlign: 'left', adScale: 1.4 },
    subline:  { typeStyle: 'expressiveHeading03', cols: 5, align: 'center', gapStep: 3, textAlign: 'center', adScale: 1.7 },
    cta:      { typeStyle: 'productiveHeading02', cols: 3, align: 'right', gapStep: 3, fontWeight: 600, textAlign: 'center', adScale: 1.8 },
    tag:      { typeStyle: 'label01', cols: 3, align: 'left', gapStep: 2, textAlign: 'left', adScale: 1.8 },
    ctaHeightFactor: 0.35,
};

// Ultra-wide is inherently horizontal — fewer meaningful variants
const ULTRA_WIDE: Record<LayoutVariant, LayoutRuleSet> = Object.fromEntries(
    (['centered', 'left-hero', 'offset-right', 'top-heavy', 'bottom-stack',
      'split-left', 'minimal-center', 'bold-statement', 'editorial', 'compact-bar'] as LayoutVariant[])
        .map(v => [v, ULTRA_WIDE_BASE])
) as Record<LayoutVariant, LayoutRuleSet>;

// ── Variant Map ──────────────────────────────────

const VARIANT_MAP: Record<AspectCategory, Record<LayoutVariant, LayoutRuleSet>> = {
    'square': SQUARE,
    'landscape': LANDSCAPE,
    'portrait': PORTRAIT,
    'ultra-wide': ULTRA_WIDE,
};

const VARIANTS: LayoutVariant[] = [
    'centered', 'left-hero', 'offset-right',
    'top-heavy', 'bottom-stack', 'split-left',
    'minimal-center', 'bold-statement', 'editorial', 'compact-bar',
];

/** ★ Variant history — prevents consecutive duplicate layouts.
 * Tracks last 3 variants used. Random selection excludes recent ones. */
const _recentVariants: LayoutVariant[] = [];
const MAX_HISTORY = 3;

/** Get a specific layout variant, or random-without-repeat if not specified. */
export function getLayoutRules(
    category: AspectCategory,
    variant?: LayoutVariant,
): { rules: LayoutRuleSet; variant: LayoutVariant } {
    let picked: LayoutVariant;
    if (variant) {
        picked = variant;
    } else {
        // Filter out recently used variants to ensure diversity
        const available = VARIANTS.filter(v => !_recentVariants.includes(v));
        const pool = available.length > 0 ? available : VARIANTS;
        picked = pool[Math.floor(Math.random() * pool.length)]!;
    }
    // Track history
    _recentVariants.push(picked);
    if (_recentVariants.length > MAX_HISTORY) _recentVariants.shift();

    console.log(`[Layout] Variant: ${picked} (recent: [${_recentVariants.join(', ')}])`);
    return { rules: VARIANT_MAP[category][picked], variant: picked };
}

/** Legacy compat: single rules map (always returns centered). */
export const RULES_MAP: Record<AspectCategory, LayoutRuleSet> = {
    'square': SQUARE['centered'],
    'landscape': LANDSCAPE['centered'],
    'portrait': PORTRAIT['centered'],
    'ultra-wide': ULTRA_WIDE_BASE,
};
