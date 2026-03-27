// ─────────────────────────────────────────────────
// layoutBlueprints — Banner + Social Media layout data
// ─────────────────────────────────────────────────

export interface LayoutBlueprint {
    sizeLabel: string; width: number; height: number;
    layout: 'stack-center' | 'horizontal' | 'vertical' | 'split' | 'single-row';
    description: string; elementPositions: Record<string, string>;
    typographyScale: { headline: [number, number]; subhead: [number, number]; cta: [number, number]; body: [number, number]; legal: [number, number] };
    padding: number; maxElements: number;
}

export const BANNER_BLUEPRINTS: Record<string, LayoutBlueprint> = {
    '300x250': {
        sizeLabel: '300×250 Medium Rectangle', width: 300, height: 250, layout: 'stack-center',
        description: 'Most common ad format (40% of global impressions). Center-stacked vertical layout.',
        elementPositions: { logo: 'Top-right corner, max 45×45px', headline: 'Center, largest text, visual weight anchor', subheadline: 'Below headline, 8px gap', cta: 'Bottom center, full-width or 60% width, 36-44px height', background: 'Full bleed or center fill' },
        typographyScale: { headline: [22, 28], subhead: [14, 16], cta: [14, 16], body: [12, 14], legal: [8, 10] }, padding: 12, maxElements: 5,
    },
    '728x90': {
        sizeLabel: '728×90 Leaderboard', width: 728, height: 90, layout: 'horizontal',
        description: 'Wide horizontal. Left-to-right flow: logo → headline → CTA.',
        elementPositions: { logo: 'Left side, 10% of width, vertically centered', headline: 'Center 60%, vertically centered, single line', subheadline: 'Below headline if space (font smaller), or omit', cta: 'Right 25%, vertically centered, pill/rounded button', background: 'Subtle gradient or solid, avoid busy images' },
        typographyScale: { headline: [18, 22], subhead: [12, 14], cta: [12, 14], body: [11, 12], legal: [8, 8] }, padding: 8, maxElements: 4,
    },
    '160x600': {
        sizeLabel: '160×600 Wide Skyscraper', width: 160, height: 600, layout: 'vertical',
        description: 'Tall narrow vertical. Top-to-bottom flow with generous spacing.',
        elementPositions: { logo: 'Top center, max 100×40px', headline: 'Upper third, centered, 2-3 lines max', background: 'Bottom half image or gradient fill', subheadline: 'Below headline, single sentence', cta: 'Bottom quarter, full-width button, 36px height' },
        typographyScale: { headline: [18, 24], subhead: [13, 15], cta: [13, 15], body: [11, 13], legal: [8, 8] }, padding: 10, maxElements: 5,
    },
    '970x250': {
        sizeLabel: '970×250 Billboard', width: 970, height: 250, layout: 'split',
        description: 'Ultra-wide 3-column. Visual weight distributed left-to-right.',
        elementPositions: { background: 'Left 40%, hero image or visual', logo: 'Top-right corner of text area', headline: 'Center 35%, left-aligned, bold', subheadline: 'Below headline, max 2 lines', cta: 'Right 25%, vertically centered, prominent button' },
        typographyScale: { headline: [24, 32], subhead: [14, 18], cta: [14, 18], body: [13, 15], legal: [9, 10] }, padding: 16, maxElements: 5,
    },
    '320x50': {
        sizeLabel: '320×50 Mobile Banner', width: 320, height: 50, layout: 'single-row',
        description: 'Tiny mobile banner. Single row: logo + headline + CTA.',
        elementPositions: { logo: 'Left 15%, 30×30px max', headline: 'Center 55%, single line, no wrapping', cta: 'Right 30%, compact pill button' },
        typographyScale: { headline: [12, 14], subhead: [10, 11], cta: [11, 13], body: [10, 11], legal: [7, 8] }, padding: 6, maxElements: 3,
    },
    '468x60': {
        sizeLabel: '468×60 Full Banner', width: 468, height: 60, layout: 'horizontal',
        description: 'Horizontal strip. Logo + headline block + CTA.',
        elementPositions: { logo: 'Left 12%, vertically centered', headline: 'Center 55%, vertically centered', cta: 'Right 28%, vertically centered' },
        typographyScale: { headline: [14, 18], subhead: [11, 13], cta: [12, 14], body: [11, 12], legal: [8, 8] }, padding: 8, maxElements: 4,
    },
    '336x280': {
        sizeLabel: '336×280 Large Rectangle', width: 336, height: 280, layout: 'stack-center',
        description: 'Like 300×250 but wider. More breathing room for text.',
        elementPositions: { logo: 'Top-right corner, max 50×50px', headline: 'Center, bold, up to 3 lines', subheadline: 'Below headline, 8px gap', cta: 'Bottom center, 60-70% width', background: 'Full bleed or center visual' },
        typographyScale: { headline: [24, 30], subhead: [14, 17], cta: [14, 17], body: [13, 15], legal: [9, 10] }, padding: 14, maxElements: 5,
    },
    '320x480': {
        sizeLabel: '320×480 Mobile Interstitial', width: 320, height: 480, layout: 'vertical',
        description: 'Mobile full-screen. Vertical stack similar to social 4:5.',
        elementPositions: { logo: 'Top center, 80×30px', headline: 'Upper 30%, centered, large', background: 'Center 40%, hero image', subheadline: 'Below image, short sentence', cta: 'Bottom 20%, full-width, prominent' },
        typographyScale: { headline: [24, 32], subhead: [14, 18], cta: [16, 20], body: [14, 16], legal: [9, 10] }, padding: 16, maxElements: 5,
    },
};

export const SOCIAL_BLUEPRINTS: Record<string, LayoutBlueprint> = {
    '9:16': {
        sizeLabel: '9:16 Story / Reel (1080×1920)', width: 1080, height: 1920, layout: 'vertical',
        description: 'Full-screen vertical story. Big headline top, visual center, CTA bottom.',
        elementPositions: { headline: 'Top 35%, centered, bold 42-56px, max 3 lines', subheadline: 'Below headline, 16px gap, lighter weight', background: 'Center 40%, hero image or full bleed', cta: 'Bottom 15%, centered, pill button, 56px height', logo: 'Top-left or top-right corner, 80×80px max' },
        typographyScale: { headline: [42, 56], subhead: [24, 32], cta: [22, 28], body: [18, 22], legal: [12, 14] }, padding: 40, maxElements: 5,
    },
    '1:1': {
        sizeLabel: '1:1 Square Post (1080×1080)', width: 1080, height: 1080, layout: 'stack-center',
        description: 'Square post. Centered stack, balanced margins, clean hierarchy.',
        elementPositions: { headline: 'Center top, centered, bold 32-42px', subheadline: 'Below headline, 12px gap', background: 'Full bleed or bottom 50% visual', cta: 'Bottom center, 60% width, 48px height', logo: 'Top-left or top-right, 60×60px max' },
        typographyScale: { headline: [32, 42], subhead: [20, 24], cta: [18, 22], body: [16, 18], legal: [10, 12] }, padding: 40, maxElements: 5,
    },
    '4:5': {
        sizeLabel: '4:5 Portrait Feed (1080×1350)', width: 1080, height: 1350, layout: 'vertical',
        description: 'Vertical feed post. Headline top, image fill center, CTA bottom.',
        elementPositions: { headline: 'Top 25%, centered, bold', subheadline: 'Below headline, 12px gap', background: 'Center 45%, hero image fill', cta: 'Bottom 15%, centered, prominent', logo: 'Top-right corner, 60×60px' },
        typographyScale: { headline: [36, 48], subhead: [22, 28], cta: [20, 24], body: [16, 20], legal: [11, 13] }, padding: 40, maxElements: 5,
    },
    '16:9': {
        sizeLabel: '16:9 Landscape (1920×1080)', width: 1920, height: 1080, layout: 'split',
        description: 'Landscape. Left-right split: text 62% / visual 38% (Golden Ratio).',
        elementPositions: { headline: 'Left 58%, top 40%, left-aligned, bold', subheadline: 'Below headline, 16px gap', cta: 'Left 58%, below subheadline, pill button', background: 'Right 38%, hero image or visual fill', logo: 'Top-left corner, 100×40px' },
        typographyScale: { headline: [42, 56], subhead: [24, 32], cta: [22, 28], body: [18, 22], legal: [12, 14] }, padding: 60, maxElements: 5,
    },
};
