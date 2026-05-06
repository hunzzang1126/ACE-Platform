// ─────────────────────────────────────────────────
// designStrategy.ts — AI Creative Director Output Types
// ─────────────────────────────────────────────────
// Defines the design strategy that the AI determines per prompt.
// This goes BEYOND palette — it controls HOW the design looks.
// ─────────────────────────────────────────────────

/** How to handle text readability over background images. */
export type OverlayApproach =
    | 'gradient-scrim'      // Gradient fading from transparent → bg color (NOT black)
    | 'text-shadow-only'    // No overlay rect — strong text shadows only
    | 'split-zone'          // Image + solid color zone (no overlay needed)
    | 'color-tint'          // Semi-transparent brand color wash
    | 'full-dim'            // Full canvas dim (dark/moody themes)
    | 'none';               // No treatment needed (dark bg, high contrast text)

/** CTA button visual style. */
export type CtaStyle = 'pill' | 'outlined' | 'solid' | 'text-arrow' | 'rounded-square';

/** Typography hierarchy for text elements. */
export interface TextHierarchy {
    /** Headline opacity (0.0-1.0). Usually 1.0. */
    headlineOpacity: number;
    /** Subheadline opacity (0.0-1.0). Usually 0.65-0.85. */
    subheadlineOpacity: number;
    /** Whether tag text should use the accent color instead of foreground. */
    tagIsAccent: boolean;
}

/** Image filter settings for background images. */
export interface ImageFilterHint {
    /** Brightness adjustment (-0.4 to 0). Negative = darker. */
    brightness: number;
    /** Blur amount in px (0-5). 0 = sharp, 3+ = dreamy/soft. */
    blur: number;
}

/** Complete design strategy determined by the AI Creative Director. */
export interface DesignStrategy {
    overlayApproach: OverlayApproach;
    imageFilters: ImageFilterHint;
    ctaStyle: CtaStyle;
    textHierarchy: TextHierarchy;
}

/** Default strategy used when AI doesn't provide one. */
export const DEFAULT_STRATEGY: DesignStrategy = {
    overlayApproach: 'gradient-scrim',
    imageFilters: { brightness: -0.15, blur: 0 },
    ctaStyle: 'pill',
    textHierarchy: {
        headlineOpacity: 1.0,
        subheadlineOpacity: 0.75,
        tagIsAccent: true,
    },
};

/** Parse and validate a raw AI response into a DesignStrategy. */
export function parseDesignStrategy(raw: any): DesignStrategy {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_STRATEGY };

    const validOverlays: OverlayApproach[] = [
        'gradient-scrim', 'text-shadow-only', 'split-zone',
        'color-tint', 'full-dim', 'none',
    ];
    const validCta: CtaStyle[] = ['pill', 'outlined', 'solid', 'text-arrow', 'rounded-square'];

    const overlay = validOverlays.includes(raw.overlayApproach)
        ? raw.overlayApproach : DEFAULT_STRATEGY.overlayApproach;

    const cta = validCta.includes(raw.ctaStyle)
        ? raw.ctaStyle : DEFAULT_STRATEGY.ctaStyle;

    const filters: ImageFilterHint = {
        brightness: typeof raw.imageFilters?.brightness === 'number'
            ? Math.max(-0.4, Math.min(0, raw.imageFilters.brightness))
            : DEFAULT_STRATEGY.imageFilters.brightness,
        blur: typeof raw.imageFilters?.blur === 'number'
            ? Math.max(0, Math.min(5, raw.imageFilters.blur))
            : DEFAULT_STRATEGY.imageFilters.blur,
    };

    const hierarchy: TextHierarchy = {
        headlineOpacity: typeof raw.textHierarchy?.headlineOpacity === 'number'
            ? Math.max(0.5, Math.min(1, raw.textHierarchy.headlineOpacity))
            : DEFAULT_STRATEGY.textHierarchy.headlineOpacity,
        subheadlineOpacity: typeof raw.textHierarchy?.subheadlineOpacity === 'number'
            ? Math.max(0.3, Math.min(1, raw.textHierarchy.subheadlineOpacity))
            : DEFAULT_STRATEGY.textHierarchy.subheadlineOpacity,
        tagIsAccent: typeof raw.textHierarchy?.tagIsAccent === 'boolean'
            ? raw.textHierarchy.tagIsAccent
            : DEFAULT_STRATEGY.textHierarchy.tagIsAccent,
    };

    return { overlayApproach: overlay, imageFilters: filters, ctaStyle: cta, textHierarchy: hierarchy };
}
