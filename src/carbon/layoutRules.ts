// ─────────────────────────────────────────────────
// Carbon Layout Rules — Aspect-category positioning rules
// ─────────────────────────────────────────────────
// Defines WHERE each element role goes for each aspect ratio.
// Extracted from layoutComposer.ts for cleanliness.
// ─────────────────────────────────────────────────

import type { AspectCategory } from '@/schema/layoutRoles';

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

const SQUARE_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'display03',
        cols: 14, align: 'center',
        gapStep: 6, maxLines: 3, fontWeight: 700,
        textAlign: 'center', adScale: 1.6,
    },
    subline: {
        typeStyle: 'heading04',  // 28px at lg → ×1.3 = 36px (38% of headline)
        cols: 13, align: 'center',
        gapStep: 8, textAlign: 'center', adScale: 1.3,
    },
    cta: {
        typeStyle: 'heading03',
        cols: 10, align: 'center',
        gapStep: 9, fontWeight: 600,
        textAlign: 'center', adScale: 1.4,
    },
    tag: {
        typeStyle: 'label02',
        cols: 10, align: 'center',
        gapStep: 5, textAlign: 'center', adScale: 1.6,
    },
    ctaHeightFactor: 0.055,
};

const LANDSCAPE_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'expressiveHeading06',
        cols: 14, align: 'center',
        gapStep: 6, maxLines: 2, fontWeight: 700,
        textAlign: 'center', adScale: 1.5,
    },
    subline: {
        typeStyle: 'heading04',
        cols: 12, align: 'center',
        gapStep: 7, textAlign: 'center', adScale: 1.3,
    },
    cta: {
        typeStyle: 'productiveHeading03',
        cols: 8, align: 'center',
        gapStep: 8, fontWeight: 600,
        textAlign: 'center', adScale: 1.3,
    },
    tag: {
        typeStyle: 'label02',
        cols: 10, align: 'center',
        gapStep: 4, textAlign: 'center', adScale: 1.4,
    },
    ctaHeightFactor: 0.07,
};

const PORTRAIT_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'display01',
        cols: 14, align: 'center',
        gapStep: 6, maxLines: 4, fontWeight: 700,
        textAlign: 'center', adScale: 1.5,
    },
    subline: {
        typeStyle: 'heading04',
        cols: 13, align: 'center',
        gapStep: 8, textAlign: 'center', adScale: 1.3,
    },
    cta: {
        typeStyle: 'productiveHeading03',
        cols: 12, align: 'center',
        gapStep: 9, fontWeight: 600,
        textAlign: 'center', adScale: 1.3,
    },
    tag: {
        typeStyle: 'label02',
        cols: 12, align: 'center',
        gapStep: 5, textAlign: 'center', adScale: 1.5,
    },
    ctaHeightFactor: 0.06,
};

const ULTRA_WIDE_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'expressiveHeading05',
        cols: 6, align: 'left',
        gapStep: 3, maxLines: 1, fontWeight: 700,
        textAlign: 'left', adScale: 1.4,
    },
    subline: {
        typeStyle: 'expressiveHeading03',
        cols: 5, align: 'center',
        gapStep: 3, textAlign: 'center', adScale: 1.2,
    },
    cta: {
        typeStyle: 'productiveHeading02',
        cols: 3, align: 'right',
        gapStep: 3, fontWeight: 600,
        textAlign: 'center', adScale: 1.3,
    },
    tag: {
        typeStyle: 'label01',
        cols: 3, align: 'left',
        gapStep: 2, textAlign: 'left', adScale: 1.3,
    },
    ctaHeightFactor: 0.35,
};

export const RULES_MAP: Record<AspectCategory, LayoutRuleSet> = {
    'square': SQUARE_RULES,
    'landscape': LANDSCAPE_RULES,
    'portrait': PORTRAIT_RULES,
    'ultra-wide': ULTRA_WIDE_RULES,
};
