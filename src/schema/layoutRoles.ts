// ─────────────────────────────────────────────────
// Layout Roles — Semantic element roles for Smart Sizing
// ─────────────────────────────────────────────────
// Every design element can be tagged with a LayoutRole.
// The Smart Layout engine uses this role to intelligently
// reposition elements when resizing to different aspect ratios.

/**
 * Semantic role of a design element.
 * Used by the Smart Layout engine to determine positioning
 * based on canvas aspect ratio.
 */
export type LayoutRole =
    | 'logo'        // Brand logo — anchored to edge/corner
    | 'headline'    // Main message — large, prominent text
    | 'subline'     // Secondary text (dates, taglines)
    | 'cta'         // Call-to-action button
    | 'tnc'         // Terms & conditions — always small, always bottom
    | 'hero'        // Hero image/video — fills available space
    | 'accent'      // Decorative element (divider, bar, shape)
    | 'background'  // Full-canvas background
    | 'detail'      // Detail text line (prize info, features, etc.)
    | 'badge';      // Badge/sticker overlay (e.g. "NEW", "50% OFF")

/**
 * Aspect ratio categories for layout rules.
 * The Smart Layout engine selects a category based on w/h ratio.
 */
export type AspectCategory =
    | 'ultra-wide'  // w/h > 2.5  (970×250, 728×90)
    | 'landscape'   // 1.3 < w/h ≤ 2.5  (300×250, 336×280, 468×60)
    | 'square'      // 0.7 ≤ w/h ≤ 1.3  (250×250, 300×300)
    | 'portrait';   // w/h < 0.7  (160×600, 120×600, 300×600)

/**
 * Determine the aspect category for a given canvas size.
 */
export function getAspectCategory(width: number, height: number): AspectCategory {
    const ratio = width / height;
    if (ratio > 2.5) return 'ultra-wide';
    if (ratio > 1.3) return 'landscape';
    if (ratio >= 0.7) return 'square';
    return 'portrait';
}

/**
 * Human-readable label for each role (used in UI/property panels).
 */
export const ROLE_LABELS: Record<LayoutRole, string> = {
    logo: 'Logo',
    headline: 'Headline',
    subline: 'Sub-headline',
    cta: 'CTA Button',
    tnc: 'Terms & Conditions',
    hero: 'Hero Image',
    accent: 'Accent / Divider',
    background: 'Background',
    detail: 'Detail Text',
    badge: 'Badge',
};

/**
 * Default z-index ordering per role (lower = further back).
 * Used to ensure correct layer order when AI creates elements.
 */
export const ROLE_ZINDEX: Record<LayoutRole, number> = {
    background: 0,
    hero: 1,
    accent: 2,
    logo: 5,
    headline: 10,
    subline: 11,
    detail: 12,
    cta: 15,
    tnc: 16,
    badge: 20,
};
