// ─────────────────────────────────────────────────
// imageComposition.ts — BG Image Subject Position Analysis
// ─────────────────────────────────────────────────
// ★ v737: Analyzes prompt to infer subject placement,
// then scores templates based on text-subject compatibility.
// Zero API cost — pure heuristic analysis.
// ─────────────────────────────────────────────────

/**
 * Subject placement zone in the image.
 * 'left' = subject occupies left 40% of canvas
 * 'right' = subject occupies right 40%
 * 'center' = subject is centered
 * 'full' = subject fills entire image (landscape/abstract)
 * 'unknown' = can't determine
 */
export type SubjectZone = 'left' | 'right' | 'center' | 'full' | 'unknown';

export interface ImageComposition {
    subjectZone: SubjectZone;
    hasHumanSubject: boolean;
    safeTextZone: 'left' | 'right' | 'center' | 'any';
    confidence: 'high' | 'medium' | 'low';
}

// ── Subject detection from prompt keywords ──────

// ★ Use both \b for Latin and direct presence for Korean (CJK has no word boundaries)
const HUMAN_KEYWORDS = /(?:\b(?:person|people|woman|man|girl|boy|model|portrait|athlete|runner|player|worker|dancer|doctor|nurse|chef|teacher|musician|engineer|lawyer|pilot|dentist|therapist|barista|waiter|stylist|trainer|coach)\b|의사|간호사|요리사|선수|교사|운동|여자|남자|사람|모델|얼굴|달리|선생님|치과|약사)/i;

// ★ Multi-word phrases FIRST to avoid "looking left" matching "left" for LEFT_PLACEMENT
const RIGHT_PLACEMENT = /(?:looking left|facing left|running left|walking left|moving left|오른쪽|우측)/i;
const LEFT_PLACEMENT = /(?:looking right|facing right|running right|walking right|moving right|side profile|profile shot|왼쪽|좌측)/i;
const CENTER_PLACEMENT = /(?:\b(?:center|front|symmetr|balanced|close.?up|closeup|headshot)\b|가운데|중앙|정면)/i;

const FULL_COVERAGE = /(?:\b(?:landscape|scenery|skyline|aerial|panoram|abstract|pattern|texture|gradient|nature|ocean|mountain|forest|field|beach|sunset|sunrise)\b|풍경|하늘|전경|도시|야경)/i;

/**
 * Analyze the image prompt to infer where the subject will be placed.
 * This runs BEFORE template selection so we can pick a compatible layout.
 */
export function analyzeImageComposition(
    imagePrompt: string,
    userPrompt: string,
): ImageComposition {
    const combined = `${imagePrompt} ${userPrompt}`.toLowerCase();
    const hasHuman = HUMAN_KEYWORDS.test(combined);

    // Full-coverage images (landscapes, abstracts) → text anywhere
    if (FULL_COVERAGE.test(combined) && !hasHuman) {
        return { subjectZone: 'full', hasHumanSubject: false, safeTextZone: 'any', confidence: 'high' };
    }

    if (!hasHuman) {
        // Product/object images — harder to predict placement
        return { subjectZone: 'unknown', hasHumanSubject: false, safeTextZone: 'any', confidence: 'low' };
    }

    // Human subject detected — check multi-word directional phrases FIRST
    // ★ "looking left" → subject is on RIGHT (looking toward left side)
    if (RIGHT_PLACEMENT.test(combined)) {
        return { subjectZone: 'right', hasHumanSubject: true, safeTextZone: 'left', confidence: 'high' };
    }
    // ★ "looking right" → subject is on LEFT (looking toward right side)
    if (LEFT_PLACEMENT.test(combined)) {
        return { subjectZone: 'left', hasHumanSubject: true, safeTextZone: 'right', confidence: 'high' };
    }
    if (CENTER_PLACEMENT.test(combined)) {
        return { subjectZone: 'center', hasHumanSubject: true, safeTextZone: 'any', confidence: 'medium' };
    }

    // ★ Default for human subjects: AI image generators tend to center-left
    return { subjectZone: 'left', hasHumanSubject: true, safeTextZone: 'right', confidence: 'medium' };
}

// ── Template Compatibility Scoring ──────────────

interface TemplateTextZone {
    id: string;
    name: string;
    textZone: 'left' | 'right' | 'center' | 'spread';
}

/**
 * Analyze a template's text placement zone from its resolved elements.
 * Returns where the majority of text elements are positioned.
 */
export function analyzeTemplateTextZone(
    elements: Array<{ type?: string; x?: number; w?: number; name?: string }>,
    canvasW: number,
): 'left' | 'right' | 'center' | 'spread' {
    const textEls = elements.filter(el => el.type === 'text');
    if (textEls.length === 0) return 'spread';

    let leftCount = 0, rightCount = 0, centerCount = 0;
    const midX = canvasW / 2;

    for (const el of textEls) {
        const elCenterX = (el.x ?? 0) + ((el.w ?? 0) / 2);
        if (elCenterX < midX * 0.7) leftCount++;
        else if (elCenterX > midX * 1.3) rightCount++;
        else centerCount++;
    }

    const total = textEls.length;
    if (leftCount / total >= 0.6) return 'left';
    if (rightCount / total >= 0.6) return 'right';
    if (centerCount / total >= 0.6) return 'center';
    return 'spread';
}

/**
 * Score how well a template's text zone avoids the subject zone.
 * Higher score = better compatibility.
 */
export function scoreTemplateComposition(
    textZone: 'left' | 'right' | 'center' | 'spread',
    composition: ImageComposition,
): number {
    if (composition.safeTextZone === 'any') return 5; // No preference

    // Perfect: text is on the opposite side from subject
    if (composition.safeTextZone === textZone) return 10;

    // Good: text is centered (partial overlap but acceptable)
    if (textZone === 'center') return 4;

    // Spread templates — moderate risk
    if (textZone === 'spread') return 3;

    // Bad: text directly overlaps subject
    if (composition.subjectZone === textZone) return 0;

    return 5; // Default neutral
}
