// ─────────────────────────────────────────────────
// fontPairings.ts — Deterministic font pair selection
// ─────────────────────────────────────────────────
// ★ v744: Font selection is a DESIGN decision, not an AI guess.
// Curated mood × industry → font pair mapping.
// AI font output is treated as a HINT, code makes final decision.
// ─────────────────────────────────────────────────

export interface FontPair {
    primary: string;   // Headlines
    secondary: string; // Body / subheadline / labels
}

// ── Mood-based font pairs (primary selection) ────

const MOOD_FONTS: Record<string, FontPair> = {
    elegant:    { primary: 'Playfair Display', secondary: 'DM Sans' },
    luxurious:  { primary: 'Cormorant Garamond', secondary: 'DM Sans' },
    bold:       { primary: 'Bebas Neue', secondary: 'Inter' },
    minimal:    { primary: 'Space Grotesk', secondary: 'DM Sans' },
    fun:        { primary: 'Outfit', secondary: 'Nunito' },
    warm:       { primary: 'Lora', secondary: 'DM Sans' },
    urgent:     { primary: 'Oswald', secondary: 'Inter' },
    dramatic:   { primary: 'Anton', secondary: 'Inter' },
    clean:      { primary: 'Inter', secondary: 'DM Sans' },
    futuristic: { primary: 'Sora', secondary: 'Space Grotesk' },
    premium:    { primary: 'DM Serif Display', secondary: 'DM Sans' },
    general:    { primary: 'Montserrat', secondary: 'DM Sans' },
};

// ── Industry overrides (when mood is too generic) ─

const INDUSTRY_FONTS: Record<string, FontPair> = {
    tech:          { primary: 'Space Grotesk', secondary: 'Inter' },
    fashion:       { primary: 'Playfair Display', secondary: 'DM Sans' },
    finance:       { primary: 'DM Serif Display', secondary: 'Inter' },
    fitness:       { primary: 'Oswald', secondary: 'Inter' },
    food:          { primary: 'Fraunces', secondary: 'DM Sans' },
    travel:        { primary: 'Cormorant Garamond', secondary: 'DM Sans' },
    entertainment: { primary: 'Outfit', secondary: 'Nunito' },
    gaming:        { primary: 'Bebas Neue', secondary: 'Inter' },
    automotive:    { primary: 'Roboto Condensed', secondary: 'Roboto' },
    realestate:    { primary: 'DM Serif Display', secondary: 'DM Sans' },
    ecommerce:     { primary: 'Montserrat', secondary: 'Inter' },
    education:     { primary: 'Raleway', secondary: 'DM Sans' },
    health:        { primary: 'Nunito', secondary: 'Inter' },
    event:         { primary: 'Sora', secondary: 'DM Sans' },
    music:         { primary: 'Anton', secondary: 'Inter' },
};

// ── CJK font pairs (Korean/Chinese/Japanese) ─────
// ★ v745: When content language is CJK, use CJK-optimized Google Fonts.
// Pairing rule: CJK headline font + CJK body font for proper glyph coverage.

const CJK_MOOD_FONTS: Record<string, FontPair> = {
    elegant:    { primary: 'Noto Serif KR', secondary: 'Noto Sans KR' },
    luxurious:  { primary: 'Noto Serif KR', secondary: 'Noto Sans KR' },
    bold:       { primary: 'Black Han Sans', secondary: 'Noto Sans KR' },
    minimal:    { primary: 'Noto Sans KR', secondary: 'Noto Sans KR' },
    fun:        { primary: 'Jua', secondary: 'Noto Sans KR' },
    warm:       { primary: 'Nanum Myeongjo', secondary: 'Noto Sans KR' },
    urgent:     { primary: 'Black Han Sans', secondary: 'Noto Sans KR' },
    dramatic:   { primary: 'Black Han Sans', secondary: 'Noto Sans KR' },
    clean:      { primary: 'Noto Sans KR', secondary: 'Noto Sans KR' },
    premium:    { primary: 'Noto Serif KR', secondary: 'Noto Sans KR' },
    general:    { primary: 'Noto Sans KR', secondary: 'Noto Sans KR' },
};

/** Detect if text contains CJK characters */
function hasCJK(text: string): boolean {
    return /[\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(text);
}

// ── Diversity guard — never return same font for both ─

const FALLBACK_PAIRS: Record<string, string> = {
    'Inter': 'DM Sans', 'DM Sans': 'Inter', 'Poppins': 'DM Sans',
    'Roboto': 'Space Grotesk', 'Montserrat': 'DM Sans', 'Outfit': 'Inter',
    'Playfair Display': 'DM Sans', 'DM Serif Display': 'Inter',
    'Bebas Neue': 'DM Sans', 'Anton': 'Inter', 'Oswald': 'DM Sans',
    'Sora': 'Inter', 'Space Grotesk': 'DM Sans', 'Nunito': 'Space Grotesk',
    'Raleway': 'DM Sans', 'Cormorant Garamond': 'Inter', 'Lora': 'DM Sans',
    'Fraunces': 'DM Sans', 'Roboto Condensed': 'DM Sans',
};

/**
 * Select a font pair based on mood, industry, and content language.
 * Priority: CJK override > mood match > industry match > general default.
 * AI hint is used ONLY if it's a valid Google Font not already in our map.
 * ★ v745: contentHint allows CJK detection from headline text.
 */
export function selectFontPair(
    mood: string,
    industry: string,
    aiHint?: { primary?: string; secondary?: string },
    contentHint?: string,
): FontPair {
    // 0. CJK detection — if content contains Korean/Chinese/Japanese, use CJK fonts
    const isCJK = contentHint ? hasCJK(contentHint) : false;
    if (isCJK) {
        const cjkPair = CJK_MOOD_FONTS[mood] ?? CJK_MOOD_FONTS.general!;
        console.log(`[FontPair] CJK detected → ${cjkPair.primary} / ${cjkPair.secondary}`);
        // Diversity guard for CJK
        if (cjkPair.primary === cjkPair.secondary && mood !== 'minimal' && mood !== 'clean') {
            return { primary: cjkPair.primary, secondary: 'Noto Sans KR' };
        }
        return { ...cjkPair };
    }

    // 1. Try mood-based selection (most specific)
    let pair = MOOD_FONTS[mood];

    // 2. Fall back to industry if mood is generic
    if (!pair || mood === 'general') {
        pair = INDUSTRY_FONTS[industry] ?? MOOD_FONTS.general!;
    }

    // 3. AI hint override — only if AI suggested a valid, different font
    const result = { ...pair };
    if (aiHint?.primary && aiHint.primary !== aiHint.secondary) {
        // Accept AI hint if it's a real Google Font (not "Arial", "Helvetica")
        if (!SYSTEM_FONTS.has(aiHint.primary.toLowerCase())) {
            result.primary = aiHint.primary;
        }
    }

    // 4. Diversity guard — primary ≠ secondary
    if (result.primary === result.secondary) {
        result.secondary = FALLBACK_PAIRS[result.primary] ?? 'DM Sans';
    }

    return result;
}

/** Fonts that are NOT available in Google Fonts — reject AI suggestions of these */
const SYSTEM_FONTS = new Set([
    'arial', 'helvetica', 'times new roman', 'times', 'courier',
    'courier new', 'verdana', 'georgia', 'trebuchet ms', 'comic sans ms',
    'impact', 'lucida sans', 'palatino', 'garamond', 'tahoma',
    'segoe ui', 'calibri', 'cambria', 'consolas',
]);
