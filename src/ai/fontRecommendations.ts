// ─────────────────────────────────────────────────
// fontRecommendations.ts — Industry × mood → font map
// ─────────────────────────────────────────────────
// Static data for AI context injection. No runtime dependency.
// All fonts are Google Fonts (SIL Open Font License = free commercial use).
// ─────────────────────────────────────────────────

export interface FontPairing {
    headline: string;
    body: string;
}

/** Industry × mood → recommended font families */
export const FONT_RECOMMENDATIONS: Record<string, Record<string, string[]>> = {
    luxury: {
        serif: ['Playfair Display', 'Cormorant Garant', 'Libre Baskerville'],
        modern: ['Outfit', 'Space Grotesk', 'DM Sans'],
        elegant: ['Cormorant', 'Lora', 'EB Garamond'],
    },
    tech: {
        clean: ['Inter', 'Manrope', 'Plus Jakarta Sans'],
        bold: ['Space Grotesk', 'Sora', 'Urbanist'],
        futuristic: ['Orbitron', 'Exo 2', 'Rajdhani'],
    },
    food: {
        warm: ['Caveat', 'Pacifico', 'Lobster'],
        clean: ['Nunito', 'Quicksand', 'Comfortaa'],
        premium: ['Playfair Display', 'Lora', 'Merriweather'],
    },
    fashion: {
        editorial: ['Playfair Display', 'Cormorant Garant', 'DM Serif Display'],
        street: ['Bebas Neue', 'Oswald', 'Anton'],
        minimal: ['Outfit', 'Sora', 'Inter'],
    },
    health: {
        clean: ['Nunito Sans', 'Open Sans', 'Lato'],
        organic: ['Quicksand', 'Comfortaa', 'Varela Round'],
        professional: ['Source Sans 3', 'IBM Plex Sans', 'Roboto'],
    },
    finance: {
        trustworthy: ['Merriweather', 'Source Serif 4', 'Libre Baskerville'],
        modern: ['Inter', 'DM Sans', 'Plus Jakarta Sans'],
        corporate: ['IBM Plex Sans', 'Roboto', 'Noto Sans'],
    },
    education: {
        friendly: ['Nunito', 'Quicksand', 'Fredoka'],
        academic: ['Merriweather', 'Libre Baskerville', 'EB Garamond'],
        modern: ['Inter', 'Outfit', 'Manrope'],
    },
    entertainment: {
        fun: ['Fredoka', 'Baloo 2', 'Boogaloo'],
        bold: ['Bebas Neue', 'Anton', 'Staatliches'],
        cinematic: ['Oswald', 'Playfair Display', 'Montserrat'],
    },
    realestate: {
        luxury: ['Playfair Display', 'Cormorant Garant', 'DM Serif Display'],
        modern: ['Outfit', 'Sora', 'Urbanist'],
        clean: ['Inter', 'DM Sans', 'Plus Jakarta Sans'],
    },
    automotive: {
        sporty: ['Rajdhani', 'Exo 2', 'Orbitron'],
        luxury: ['Cormorant Garant', 'Playfair Display', 'DM Serif Display'],
        modern: ['Space Grotesk', 'Outfit', 'Sora'],
    },
};

/** Curated headline + body font pairings */
export const FONT_PAIRINGS: FontPairing[] = [
    { headline: 'Playfair Display', body: 'Inter' },
    { headline: 'Space Grotesk', body: 'DM Sans' },
    { headline: 'Bebas Neue', body: 'Open Sans' },
    { headline: 'Cormorant Garant', body: 'Nunito Sans' },
    { headline: 'Outfit', body: 'Inter' },
    { headline: 'Oswald', body: 'Lato' },
    { headline: 'DM Serif Display', body: 'DM Sans' },
    { headline: 'Sora', body: 'Plus Jakarta Sans' },
    { headline: 'Montserrat', body: 'Roboto' },
    { headline: 'Anton', body: 'Nunito' },
];

/** Korean-friendly font recommendations */
export const KOREAN_FONTS = [
    'Noto Sans KR', 'Noto Serif KR', 'Gothic A1',
    'Nanum Gothic', 'Nanum Myeongjo', 'Nanum Pen Script',
    'Do Hyeon', 'Jua', 'Gamja Flower', 'Black Han Sans',
];

/**
 * Generate font context string for AI injection.
 * Injected into smartContextBuilder so AI knows which fonts to use.
 */
export function getFontContextForAI(industry?: string, lang?: string): string {
    const lines: string[] = [];

    if (industry) {
        const key = industry.toLowerCase().replace(/[\s&-]+/g, '');
        const recs = FONT_RECOMMENDATIONS[key];
        if (recs) {
            lines.push(`Recommended fonts for "${industry}":`);
            for (const [mood, fonts] of Object.entries(recs)) {
                lines.push(`  ${mood}: ${fonts.join(', ')}`);
            }
        }
    }

    if (!lines.length) {
        lines.push('Professional font options by mood:');
        lines.push('  luxury/elegant: Playfair Display, Cormorant Garant');
        lines.push('  modern/clean: Inter, Outfit, Space Grotesk, DM Sans');
        lines.push('  bold/impact: Bebas Neue, Anton, Oswald');
        lines.push('  friendly/warm: Nunito, Quicksand, Caveat');
    }

    // Add pairings
    lines.push('Headline + Body pairings:');
    for (const p of FONT_PAIRINGS.slice(0, 5)) {
        lines.push(`  ${p.headline} + ${p.body}`);
    }

    // Korean fonts if applicable
    if (lang === 'ko' || lang === 'kr') {
        lines.push(`Korean fonts: ${KOREAN_FONTS.slice(0, 5).join(', ')}`);
    }

    lines.push('All Google Fonts are available. Use update_element_property(property: "fontFamily", value: "Font Name") to apply.');
    return lines.join('\n');
}
