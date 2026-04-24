// ─────────────────────────────────────────────────
// backgroundImageDecider — Code-first image decision
// ─────────────────────────────────────────────────
// Decides whether a design needs a background photo.
// High-confidence cases are handled by keyword matching (0 tokens).
// Only ambiguous cases fall through to AI judgment.
// ─────────────────────────────────────────────────

export interface ImageDecision {
    needsImage: boolean;
    confidence: 'high' | 'low';
    reason: string;
}

// ── Keyword lists ──

/** Explicit user request → always yes */
const EXPLICIT_IMAGE_KW = [
    'photo', 'photograph', '사진', '배경 이미지', 'background image',
    'image of', 'picture of', 'hero shot', 'hero image',
    '이미지', '배경사진',
];

/** Physical scenes / events where visuals are essential */
const SCENE_KW = [
    // Events
    'concert', 'festival', 'conference', 'event', 'party',
    '콘서트', '페스티벌', '이벤트', '파티', '행사',
    // Places
    'restaurant', 'cafe', 'hotel', 'resort', 'beach', 'mountain',
    '레스토랑', '카페', '호텔', '리조트', '해변',
    // Real estate
    'interior', 'exterior', 'apartment', 'building', 'architecture',
    '인테리어', '아파트', '건물', '부동산',
    // People
    'athlete', 'model', 'chef', 'doctor', 'dentist', 'trainer',
    '모델', '선수', '의사', '셰프',
    // Automotive
    'car ', 'automobile', 'vehicle', 'SUV', 'sedan',
    '자동차', '차량',
    // Food
    'food', 'dish', 'cuisine', 'recipe', 'meal',
    '음식', '요리', '맛집',
];

/** Abstract/digital concepts where gradients work better */
const ABSTRACT_KW = [
    // Finance
    'finance', 'fintech', 'banking', 'insurance', 'investment',
    '금융', '은행', '보험', '투자',
    // Software
    'SaaS', 'software', 'dashboard', 'analytics', 'API',
    '소프트웨어', '대시보드', '분석',
    // B2B
    'B2B', 'enterprise', 'consulting', 'workflow', 'platform',
    '컨설팅', '플랫폼',
    // Abstract
    'innovation', 'growth', 'AI ', 'artificial intelligence', 'blockchain',
    '혁신', '성장', '인공지능',
    // Pure promo
    'sale', 'discount', 'coupon', 'flash sale',
    '할인', '세일', '쿠폰', '프로모션',
];

/**
 * Decide if a background image is needed, code-first.
 * Returns high-confidence for clear cases, low for ambiguous.
 */
export function decideBackgroundImage(prompt: string): ImageDecision {
    const p = prompt.toLowerCase();

    // 1. Explicit user request → always yes
    for (const kw of EXPLICIT_IMAGE_KW) {
        if (p.includes(kw.toLowerCase())) {
            return { needsImage: true, confidence: 'high', reason: `Explicit request: "${kw}"` };
        }
    }

    // 2. Scene-based → yes
    for (const kw of SCENE_KW) {
        if (p.includes(kw.toLowerCase())) {
            return { needsImage: true, confidence: 'high', reason: `Visual scene: "${kw}"` };
        }
    }

    // 3. Abstract/digital → no
    for (const kw of ABSTRACT_KW) {
        if (p.includes(kw.toLowerCase())) {
            return { needsImage: false, confidence: 'high', reason: `Abstract/digital: "${kw}"` };
        }
    }

    // 4. Ambiguous → let AI decide
    return { needsImage: false, confidence: 'low', reason: 'No strong signal — defer to AI' };
}
