// ─────────────────────────────────────────────────
// backgroundImageDecider — Deterministic image decision
// ─────────────────────────────────────────────────
// ★ v748: Image-First pipeline requires EARLY image decision.
// Uses 3 tiers: explicit request → brief-based → defer to AI.
// Brief-based catches 80%+ of cases deterministically.
// ─────────────────────────────────────────────────

export interface ImageDecision {
    needsImage: boolean;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}

/** Tier 1: Explicit user request patterns */
const EXPLICIT_IMAGE_RE = /\b(photo|photograph|picture|hero shot|hero image|background image|lifestyle|reali)\b|사진|배경\s?이미지|이미지\s?넣|실사/i;

/** Tier 1b: Explicit NO-image patterns */
const EXPLICIT_NO_IMAGE_RE = /\b(flat|gradient only|no photo|no image|solid color|minimal background|text only|typography only)\b|그라디언트|단색|이미지\s?없/i;

/** Tier 2: Industries that almost always need background images */
const IMAGE_INDUSTRIES = new Set([
    'athletic', 'fitness', 'fashion', 'food', 'travel', 'automotive',
    'realestate', 'health', 'beauty', 'hotel', 'restaurant', 'sports',
    'entertainment', 'music', 'gaming', 'outdoor', 'lifestyle',
]);

/** Industries that rarely need images (gradient/solid usually better) */
const NO_IMAGE_INDUSTRIES = new Set([
    'tech', 'saas', 'fintech', 'crypto', 'blockchain',
]);

/** Moods that imply photographic/realistic backgrounds */
const IMAGE_MOODS = new Set([
    'dramatic', 'cinematic', 'warm', 'motivational', 'intense',
    'luxurious', 'elegant', 'premium',
]);

/** Tier 2b: Prompt keywords suggesting product/people/place → needs image */
const PRODUCT_PEOPLE_RE = /\b(nike|adidas|puma|shoe|sneaker|watch|car|hotel|resort|gym|yoga|run|swim|cook|burger|pizza|coffee|wine|beer|cocktail|perfume|cosmetic|makeup|skincare|samsung|apple|iphone|macbook|laptop|phone|camera)\b|나이키|아디다스|신발|운동화|헬스|요가|호텔|리조트|레스토랑|카페|음식|맥주|와인|커피|화장품|향수|자동차/i;

/**
 * Deterministic background image decision.
 * ★ v748: 3-tier approach for Image-First pipeline.
 *
 * Tier 1: Explicit request/rejection (confidence: high)
 * Tier 2: Brief metadata + prompt keywords (confidence: medium)
 * Tier 3: Defer to AI (confidence: low)
 */
export function decideBackgroundImage(
    prompt: string,
    briefMood?: string,
    briefIndustry?: string,
): ImageDecision {
    // ── Tier 1: Explicit user request ──
    if (EXPLICIT_NO_IMAGE_RE.test(prompt)) {
        return { needsImage: false, confidence: 'high', reason: 'User explicitly rejected image' };
    }
    if (EXPLICIT_IMAGE_RE.test(prompt)) {
        return { needsImage: true, confidence: 'high', reason: 'User explicitly requested image' };
    }

    // ── Tier 2: Brief-based (mood + industry + prompt keywords) ──
    const industry = (briefIndustry ?? '').toLowerCase();
    const mood = (briefMood ?? '').toLowerCase();

    // Industry strongly suggests image
    if (IMAGE_INDUSTRIES.has(industry)) {
        return { needsImage: true, confidence: 'medium', reason: `Industry "${industry}" typically needs imagery` };
    }

    // Industry strongly suggests NO image
    if (NO_IMAGE_INDUSTRIES.has(industry)) {
        return { needsImage: false, confidence: 'medium', reason: `Industry "${industry}" works better with gradients` };
    }

    // Mood suggests image
    if (IMAGE_MOODS.has(mood)) {
        return { needsImage: true, confidence: 'medium', reason: `Mood "${mood}" benefits from photographic background` };
    }

    // Product/brand/people keywords in prompt
    if (PRODUCT_PEOPLE_RE.test(prompt)) {
        return { needsImage: true, confidence: 'medium', reason: 'Prompt mentions product/brand/people' };
    }

    // ── Tier 3: Can't decide deterministically → defer to AI ──
    return { needsImage: false, confidence: 'low', reason: 'Defer to AI' };
}
