// ─────────────────────────────────────────────────────────────
// bannerDesignGuide.ts — Embedded Banner Design Intelligence
// ─────────────────────────────────────────────────────────────
// Pencil.dev embeds domain-specific style guides directly into
// their MCP server binary (landing pages, mobile apps, SaaS).
// This is our equivalent: deep banner ad design knowledge that
// makes the AI produce "vibe design" quality output.
//
// The guide is injected into the planner system prompt so the AI
// "thinks like a senior art director" rather than a generic LLM.
// ─────────────────────────────────────────────────────────────

// ── IAB Standard Banner Sizes & Personality ──────────────────

export interface BannerProfile {
    width: number;
    height: number;
    iabName: string;
    personality: string;           // design personality for this size
    maxTextElements: number;       // ideal max text blocks
    headlineFontRange: [number, number]; // min-max font size in px
    ctaMinSize: [number, number];  // min width x height
    safeMargin: number;            // px from edge
    compositionHint: string;       // layout suggestion
}

export const BANNER_PROFILES: Record<string, BannerProfile> = {
    '300x250': {
        width: 300, height: 250, iabName: 'Medium Rectangle',
        personality: 'Compact powerhouse. Every pixel counts.',
        maxTextElements: 3,
        headlineFontRange: [18, 28],
        ctaMinSize: [100, 36],
        safeMargin: 12,
        compositionHint: 'Center-stack: headline top-third, visual center, CTA bottom-third. No wasted space.',
    },
    '728x90': {
        width: 728, height: 90, iabName: 'Leaderboard',
        personality: 'Horizontal storytelling. One glance, one message.',
        maxTextElements: 2,
        headlineFontRange: [16, 24],
        ctaMinSize: [110, 32],
        safeMargin: 10,
        compositionHint: 'Left-to-right flow: logo → headline → CTA. Or: hero visual left, text+CTA right.',
    },
    '160x600': {
        width: 160, height: 600, iabName: 'Wide Skyscraper',
        personality: 'Vertical storytelling. Top-down hierarchy.',
        maxTextElements: 3,
        headlineFontRange: [16, 22],
        ctaMinSize: [130, 36],
        safeMargin: 8,
        compositionHint: 'Stack vertically: logo/brand top → headline → visual → CTA at bottom. Use full height.',
    },
    '970x250': {
        width: 970, height: 250, iabName: 'Billboard',
        personality: 'Cinematic. Dramatic visuals with clean typography.',
        maxTextElements: 3,
        headlineFontRange: [24, 40],
        ctaMinSize: [140, 40],
        safeMargin: 20,
        compositionHint: 'Split: hero visual on one side (60%), text block on the other (40%). Or: full-width visual with text overlay.',
    },
    '320x50': {
        width: 320, height: 50, iabName: 'Mobile Leaderboard',
        personality: 'Ultra-compact. One message only.',
        maxTextElements: 1,
        headlineFontRange: [12, 16],
        ctaMinSize: [70, 28],
        safeMargin: 6,
        compositionHint: 'Single line: brand/logo left, short message center, CTA right. No wrapping.',
    },
    '320x480': {
        width: 320, height: 480, iabName: 'Mobile Interstitial',
        personality: 'Full-screen impact. Bold and immersive.',
        maxTextElements: 3,
        headlineFontRange: [22, 36],
        ctaMinSize: [200, 44],
        safeMargin: 16,
        compositionHint: 'Full-screen hero image. Large centered headline. Prominent CTA in bottom third.',
    },
    '1080x1080': {
        width: 1080, height: 1080, iabName: 'Social Square',
        personality: 'Social-first. Bold, thumb-stopping.',
        maxTextElements: 3,
        headlineFontRange: [28, 48],
        ctaMinSize: [180, 48],
        safeMargin: 40,
        compositionHint: 'Large centered text over full-bleed image. Or: split top/bottom. Keep text away from edges for social crop safety.',
    },
    '1200x628': {
        width: 1200, height: 628, iabName: 'Facebook Link Ad',
        personality: 'Storytelling rectangle. Clear value proposition.',
        maxTextElements: 3,
        headlineFontRange: [26, 42],
        ctaMinSize: [160, 44],
        safeMargin: 30,
        compositionHint: 'Split composition: visual left, copy right. Or: centered text over gradient/image background.',
    },
    '1080x1920': {
        width: 1080, height: 1920, iabName: 'Story/Reel',
        personality: 'Vertical immersion. Mobile-native.',
        maxTextElements: 3,
        headlineFontRange: [32, 56],
        ctaMinSize: [240, 48],
        safeMargin: 60,
        compositionHint: 'Full-screen vertical: top safe zone (logo/brand), center (hero text), bottom third (CTA). Avoid top 14% and bottom 20% for platform UI.',
    },
};

// ── Typography Intelligence ─────────────────────────────────

export const TYPOGRAPHY_RULES = `
TYPOGRAPHY RULES (Professional Banner Design):
- CONTRAST IS KING: Headline must have 4.5:1+ contrast ratio against background
- HIERARCHY: Maximum 3 text sizes per banner. headline > subhead > CTA label
- FONT PAIRING: Use max 2 font families. Sans-serif for headlines, same or similar for body
- WEIGHT: Headlines: 600-900 weight. Body: 400-500. CTA text: 600-700
- LINE HEIGHT: Headlines: 1.0-1.15 (tight). Body: 1.3-1.5. Single-line CTAs: 1.0
- LETTER SPACING: Headlines: 0 to -0.02em (slightly tight). Body: 0. ALL CAPS: +0.05em
- TEXT OVERFLOW: NEVER let text touch edges. Minimum 12px breathing room
- READABILITY: On 300x250, minimum 14px body text. On 728x90, minimum 12px
- DO NOT: Use more than 2 lines for headlines. Use justified text. Use decorative fonts for body
- PREMIUM FONTS: Inter, DM Sans, Plus Jakarta Sans, Outfit, Manrope, Space Grotesk
`;

// ── Color & Contrast Intelligence ───────────────────────────

export const COLOR_RULES = `
COLOR & CONTRAST RULES:
- BACKGROUND: Never use pure white (#FFF) or pure black (#000). Off-white: #F8F9FA, Dark: #0F1419
- GRADIENT: Use subtle gradients (max 2 stops). Direction: top-to-bottom or 135deg diagonal
- CTA BUTTON: Must POP. Use complementary or accent color. Never same as background
- TEXT ON IMAGE: Add semi-transparent overlay (rgba(0,0,0,0.4-0.6)) before placing text on images
- COLOR PALETTE: Max 3 colors + 1 accent. Primary background, secondary text, accent for CTA
- DARK MODE: Dark backgrounds (#0F1419 to #1A1F2E) with white/light text feel premium
- BRAND COLORS: If brand kit provided, primary color = CTA background, secondary = accents
- VISUAL WEIGHT: Darker/saturated elements draw eye first. Use to guide attention flow
- DO NOT: Use neon colors on white. Use red text on blue. Use low-contrast pastel-on-pastel
`;

// ── Composition & Layout Intelligence ───────────────────────

export const COMPOSITION_RULES = `
COMPOSITION RULES (Art Director Principles):
- VISUAL HIERARCHY: Eye follows: largest element → highest contrast → CTA. Design for this flow
- Z-PATTERN: For horizontal banners — eye scans top-left → top-right → bottom-left → bottom-right
- F-PATTERN: For vertical/square — eye scans top → left side → middle → bottom
- RULE OF THIRDS: Key elements on intersection points of 3x3 grid, NOT dead center
- BREATHING ROOM: 15-20% of banner area should be "empty" space. Crowded = cheap
- CTA PLACEMENT: Bottom-right for horizontal, bottom-center for vertical/square
- LOGO: Top-left or top-right corner. Small (max 15% of banner area). NEVER center-stage
- GROUPING: Related elements (headline + subhead) should be close. Unrelated should be far
- BALANCE: If heavy visual element on left, balance with text/CTA weight on right
- DEPTH: Use shadows (0 2px 8px rgba(0,0,0,0.15)) on CTAs for clickability cue
- BORDER: Add 1px border (#E5E7EB or rgba(0,0,0,0.08)) on light backgrounds for definition
- DO NOT: Center everything. Stack 4+ text blocks. Use multiple CTAs. Make everything bold
`;

// ── CTA Best Practices ──────────────────────────────────────

export const CTA_RULES = `
CTA BUTTON BEST PRACTICES:
- SHAPE: Rounded corners (6-12px border-radius). Never fully rounded (pill shape is dated)
- SIZE: Min 100x36px (desktop), 120x44px (mobile). Comfortable tap target
- COLOR: High-contrast accent. If dark background → bright CTA. If light → dark/saturated CTA
- TEXT: 2-4 words max. Action verbs: "Shop Now", "Get Started", "Learn More", "Try Free"
- PADDING: Horizontal padding = 2x vertical. Example: 24px horizontal, 12px vertical
- POSITION: Last in visual hierarchy. User sees message FIRST, then CTA answers "what do I do?"
- SHADOW: Subtle lift shadow: 0 2px 4px rgba(CTA_color, 0.3)
- DO NOT: Use "Click Here". Make CTA larger than headline. Use multiple CTAs. Use outline-only buttons
`;

// ── Build the Complete Style Guide for a Specific Size ──────

export function buildBannerStyleGuide(width: number, height: number): string {
    const key = `${width}x${height}`;
    const profile = BANNER_PROFILES[key];

    const sizeSection = profile
        ? `
BANNER PROFILE: ${profile.iabName} (${key})
Personality: ${profile.personality}
Max text elements: ${profile.maxTextElements}
Headline font size: ${profile.headlineFontRange[0]}-${profile.headlineFontRange[1]}px
CTA minimum size: ${profile.ctaMinSize[0]}x${profile.ctaMinSize[1]}px
Safe margin: ${profile.safeMargin}px from all edges
Composition: ${profile.compositionHint}
`
        : `
BANNER SIZE: ${key} (custom)
Aspect ratio: ${(width / height).toFixed(2)}
${width > height * 2 ? 'WIDE format: horizontal left-to-right flow, keep text compact' : ''}
${height > width * 2 ? 'TALL format: vertical top-to-bottom hierarchy, stack elements' : ''}
${Math.abs(width - height) < Math.min(width, height) * 0.3 ? 'SQUARE-ISH: centered composition, bold typography' : ''}
Safe margin: ${Math.max(8, Math.round(Math.min(width, height) * 0.04))}px from edges
`;

    return `
═══════════════════════════════════════════
BANNER DESIGN INTELLIGENCE (Art Director Mode)
═══════════════════════════════════════════
${sizeSection}
${TYPOGRAPHY_RULES}
${COLOR_RULES}
${COMPOSITION_RULES}
${CTA_RULES}
═══════════════════════════════════════════
CRITICAL: You are designing a PROFESSIONAL advertisement.
This must look like it came from a premium design agency.
Think Apple, Nike, Airbnb quality — not generic template.
═══════════════════════════════════════════
`;
}

// ── Industry-Specific Design Variants (Phase 2+) ────────────

export type IndustryVertical =
    | 'ecommerce'
    | 'saas'
    | 'finance'
    | 'travel'
    | 'food'
    | 'fashion'
    | 'automotive'
    | 'real_estate'
    | 'education'
    | 'entertainment'
    | 'generic';

export function getIndustryHints(vertical: IndustryVertical): string {
    const hints: Record<IndustryVertical, string> = {
        ecommerce: 'Show product image prominently. Price/discount should be visible. Urgency words: "Limited", "Sale Ends", "%OFF"',
        saas: 'Clean, minimal. Focus on value proposition. Use mockup/screenshot of product. CTA: "Start Free Trial", "Get Started"',
        finance: 'Trust signals: security icons, professional imagery. Blue/green tones. Conservative typography. No flashy effects',
        travel: 'Hero destination photo. Warm colors. Price + destination prominent. CTA: "Book Now", "Explore"',
        food: 'High-quality food photography. Warm, appetizing colors (reds, oranges, browns). CTA: "Order Now", "View Menu"',
        fashion: 'Editorial photography. Black/white + one accent. Minimal text. Brand name prominent. "Shop Collection" CTA',
        automotive: 'Vehicle as hero. Dark/metallic tones. Bold sans-serif. Performance stats if relevant. "Configure", "Test Drive"',
        real_estate: 'Property photo hero. Clean layout. Price prominent. Location text. "View Listing", "Schedule Tour"',
        education: 'Aspirational imagery. Approachable fonts. Warm blues/greens. "Enroll Now", "Learn More"',
        entertainment: 'Dynamic, energetic. Bold colors. Large imagery. Date/time if event. "Get Tickets", "Watch Now"',
        generic: 'Follow brand guidelines. Clean and professional. Clear value proposition. Strong CTA',
    };
    return hints[vertical] ?? hints.generic;
}

// ── Design Quality Checklist (Post-Generation Verification) ─

export const DESIGN_QUALITY_CHECKLIST = [
    'Is there a clear visual hierarchy? (Elements guide the eye in order)',
    'Does the headline have sufficient contrast against its background?',
    'Is the CTA visually distinct and positioned for action?',
    'Is there adequate breathing room (whitespace)?',
    'Are all text elements within safe margins?',
    'Does the color palette feel harmonious (max 3+1 accent)?',
    'Would this banner stop someone scrolling?',
    'Is the message understandable in under 3 seconds?',
] as const;
