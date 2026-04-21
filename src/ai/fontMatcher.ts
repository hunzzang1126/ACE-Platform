// ─────────────────────────────────────────────────
// fontMatcher.ts — Cosine-similarity font matching
// ─────────────────────────────────────────────────
// Pure functions — no side effects, no network calls.
// Used by: AI context, FontPicker mood search.
// ─────────────────────────────────────────────────

import { FONT_ATTRIBUTE_DB, MOOD_AXES, type FontAttributes } from './fontAttributeDb';

export interface FontMatch {
    family: string;
    score: number;      // 0–1 cosine similarity
    hasVariable: boolean;
}

/** Mood keywords → axis mapping for natural language queries */
const KEYWORD_TO_AXIS: Record<string, (keyof Omit<FontAttributes, 'family' | 'hasVariable'>)[]> = {
    // English
    luxury: ['luxury', 'elegant'],
    luxurious: ['luxury', 'elegant'],
    premium: ['luxury', 'elegant', 'corporate'],
    elegant: ['elegant', 'luxury'],
    modern: ['modern', 'tech'],
    clean: ['modern', 'corporate'],
    minimal: ['modern', 'corporate'],
    friendly: ['friendly', 'playful'],
    warm: ['friendly', 'organic'],
    fun: ['playful', 'friendly'],
    playful: ['playful', 'friendly'],
    bold: ['boldImpact'],
    impact: ['boldImpact'],
    strong: ['boldImpact', 'corporate'],
    editorial: ['editorial', 'elegant'],
    magazine: ['editorial', 'luxury'],
    tech: ['tech', 'modern'],
    futuristic: ['tech', 'modern'],
    coding: ['tech'],
    organic: ['organic', 'friendly'],
    natural: ['organic', 'friendly'],
    handwritten: ['organic', 'playful'],
    corporate: ['corporate', 'modern'],
    professional: ['corporate', 'modern'],
    business: ['corporate'],
    // Korean
    '고급': ['luxury', 'elegant'],
    '럭셔리': ['luxury', 'elegant'],
    '모던': ['modern', 'tech'],
    '현대적': ['modern', 'tech'],
    '친근': ['friendly', 'playful'],
    '따뜻': ['friendly', 'organic'],
    '강렬': ['boldImpact'],
    '임팩트': ['boldImpact'],
    '에디토리얼': ['editorial', 'elegant'],
    '우아': ['elegant', 'luxury'],
    '테크': ['tech', 'modern'],
    '자연': ['organic', 'friendly'],
    '전문': ['corporate', 'modern'],
    '귀여운': ['playful', 'friendly'],
    '깔끔': ['modern', 'corporate'],
};

/**
 * Parse a natural-language mood query into a numeric vector.
 * Example: "luxury modern" → { luxury: 1.0, elegant: 1.0, modern: 1.0, tech: 1.0 }
 */
export function parseMoodQuery(text: string): Record<string, number> {
    const query: Record<string, number> = {};
    const words = text.toLowerCase().split(/[\s,;]+/).filter(Boolean);

    for (const word of words) {
        const axes = KEYWORD_TO_AXIS[word];
        if (axes) {
            for (const axis of axes) {
                query[axis] = (query[axis] || 0) + 1.0;
            }
        }
    }

    // Normalize so max = 1.0
    const maxVal = Math.max(...Object.values(query), 1);
    for (const key of Object.keys(query)) {
        query[key] /= maxVal;
    }

    return query;
}

/**
 * Cosine similarity between a mood query and a font's attribute vector.
 */
function cosineSimilarity(
    query: Record<string, number>,
    font: FontAttributes,
): number {
    let dotProduct = 0;
    let queryMag = 0;
    let fontMag = 0;

    for (const axis of MOOD_AXES) {
        const q = query[axis] || 0;
        const f = font[axis];
        dotProduct += q * f;
        queryMag += q * q;
        fontMag += f * f;
    }

    const magnitude = Math.sqrt(queryMag) * Math.sqrt(fontMag);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Match fonts by mood query vector.
 * Returns top N fonts sorted by cosine similarity (descending).
 */
export function matchFonts(
    moodQuery: Record<string, number>,
    topN = 5,
): FontMatch[] {
    if (Object.keys(moodQuery).length === 0) return [];

    return FONT_ATTRIBUTE_DB
        .map(font => ({
            family: font.family,
            score: cosineSimilarity(moodQuery, font),
            hasVariable: font.hasVariable,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
}

/**
 * Match fonts from a natural-language text query.
 * Main entry point for AI context and FontPicker.
 *
 * Example: matchFontsFromText("luxury modern") → ["Outfit", "Playfair Display", ...]
 */
export function matchFontsFromText(text: string, topN = 5): string[] {
    const query = parseMoodQuery(text);
    if (Object.keys(query).length === 0) return [];
    return matchFonts(query, topN).map(m => m.family);
}

/**
 * Check if a query string contains any recognized mood keywords.
 * Used by FontPicker to decide whether to show mood results.
 */
export function hasMoodKeywords(text: string): boolean {
    const words = text.toLowerCase().split(/[\s,;]+/).filter(Boolean);
    return words.some(w => w in KEYWORD_TO_AXIS);
}
