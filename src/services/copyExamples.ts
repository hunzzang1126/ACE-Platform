// ─────────────────────────────────────────────────
// copyExamples.ts — Curated Ad Copy + Slot References
// ─────────────────────────────────────────────────
// ★ v743: Content-First harness — Phase 1
// 30+ curated ad copy examples with slot metadata.
// AI sees 3-5 industry-relevant examples as few-shot context.
// Each example teaches: what slots to use, what tone, what length.
//
// DIFFERENT from goldenExamples.ts (RenderElement[] for layout).
// This file is COPY-focused: headline, subheadline, CTA, tag.
// ─────────────────────────────────────────────────

export type ContentSlot = 'headline' | 'subheadline' | 'cta' | 'tag';

export interface CopyExample {
    industry: string;
    mood: string[];
    headline: string;
    subheadline: string;
    cta: string;
    tag: string;
    slots: ContentSlot[];
}

// ── Curated Examples ─────────────────────────────
// Each example is REAL ad-quality copy.
// slots[] tells AI which elements this design type NEEDS.

const EXAMPLES: CopyExample[] = [
    // ══ Entertainment / Movies ══
    { industry: 'entertainment', mood: ['fun', 'family', 'energetic'],
        headline: 'Adventure Awaits With Your Favorite Minions',
        subheadline: 'The most banana-tastic movie experience for the whole family',
        cta: 'Watch Now', tag: 'NEW',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },
    { industry: 'entertainment', mood: ['dramatic', 'epic', 'cinematic'],
        headline: 'Every Hero Has A Beginning',
        subheadline: 'In theaters June 15',
        cta: 'Get Tickets', tag: '',
        slots: ['headline', 'subheadline', 'cta'] },
    { industry: 'entertainment', mood: ['exciting', 'action'],
        headline: 'The Chase Never Ends',
        subheadline: 'Streaming exclusively on Disney+',
        cta: 'Stream Now', tag: 'EXCLUSIVE',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },

    // ══ Tech / Product Launch ══
    { industry: 'tech', mood: ['minimal', 'premium', 'innovative'],
        headline: 'The Future Fits In Your Pocket',
        subheadline: '', cta: 'Pre-Order Now', tag: 'NEW',
        slots: ['headline', 'cta', 'tag'] },
    { industry: 'tech', mood: ['bold', 'powerful'],
        headline: 'Power Meets Precision',
        subheadline: 'M4 chip. 24-hour battery. Zero compromise.',
        cta: 'Learn More', tag: '',
        slots: ['headline', 'subheadline', 'cta'] },
    { industry: 'tech', mood: ['futuristic', 'clean'],
        headline: 'See Everything. Miss Nothing.',
        subheadline: '120Hz ProMotion display with always-on technology',
        cta: 'Explore', tag: 'PRO',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },

    // ══ Fashion / Beauty ══
    { industry: 'fashion', mood: ['elegant', 'luxurious', 'sophisticated'],
        headline: 'Where Style Meets Soul',
        subheadline: 'New collection. Zero compromise.',
        cta: 'Shop Now', tag: '',
        slots: ['headline', 'subheadline', 'cta'] },
    { industry: 'fashion', mood: ['bold', 'streetwear', 'urban'],
        headline: 'Own The Streets',
        subheadline: 'FW26 Drop — Limited quantities',
        cta: 'Shop The Drop', tag: 'LIMITED',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },
    { industry: 'fashion', mood: ['minimal', 'clean'],
        headline: 'Less Is Everything',
        subheadline: '', cta: 'Discover', tag: 'SS26',
        slots: ['headline', 'cta', 'tag'] },

    // ══ Food / Restaurant ══
    { industry: 'food', mood: ['warm', 'inviting', 'cozy'],
        headline: 'Taste the Extraordinary',
        subheadline: 'Fresh ingredients. Bold flavors. Every day.',
        cta: '', tag: '',
        slots: ['headline', 'subheadline'] },
    { industry: 'food', mood: ['premium', 'gourmet'],
        headline: 'A Journey For Your Palate',
        subheadline: 'Michelin-starred tasting menu now available',
        cta: 'Reserve A Table', tag: '',
        slots: ['headline', 'subheadline', 'cta'] },
    { industry: 'food', mood: ['casual', 'fun'],
        headline: 'Burgers Done Right',
        subheadline: 'Smashed, stacked, and loaded with flavor',
        cta: 'Order Now', tag: 'NEW MENU',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },

    // ══ Fitness / Sports ══
    { industry: 'fitness', mood: ['intense', 'motivational', 'bold'],
        headline: 'Your Limits Are An Illusion',
        subheadline: '', cta: 'Start Training', tag: '',
        slots: ['headline', 'cta'] },
    { industry: 'fitness', mood: ['energetic', 'community'],
        headline: 'Stronger Together',
        subheadline: 'Join 10,000+ members transforming their lives',
        cta: 'Join Free', tag: '',
        slots: ['headline', 'subheadline', 'cta'] },

    // ══ Travel / Hospitality ══
    { industry: 'travel', mood: ['adventurous', 'dreamy', 'wanderlust'],
        headline: 'Discover Mallorca',
        subheadline: 'Crystal waters. Ancient villages. Endless sun.',
        cta: 'Book Your Escape', tag: '',
        slots: ['headline', 'subheadline', 'cta'] },
    { industry: 'travel', mood: ['luxurious', 'exclusive'],
        headline: 'Your Private Paradise Awaits',
        subheadline: 'Award-winning resorts across 12 destinations',
        cta: 'Explore Resorts', tag: 'MEMBER EXCLUSIVE',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },

    // ══ Finance / Business ══
    { industry: 'finance', mood: ['trustworthy', 'professional', 'secure'],
        headline: 'Invest With Confidence',
        subheadline: 'AI-powered portfolio management. Zero hidden fees.',
        cta: 'Get Started', tag: '',
        slots: ['headline', 'subheadline', 'cta'] },
    { industry: 'finance', mood: ['bold', 'disruptive'],
        headline: 'Banking Without Boundaries',
        subheadline: '', cta: 'Open Account', tag: 'NO FEES',
        slots: ['headline', 'cta', 'tag'] },

    // ══ Education ══
    { industry: 'education', mood: ['inspiring', 'empowering'],
        headline: 'Master Any Skill In 30 Days',
        subheadline: 'World-class instructors. Your pace. Your path.',
        cta: 'Start Free Trial', tag: '',
        slots: ['headline', 'subheadline', 'cta'] },

    // ══ Health / Wellness ══
    { industry: 'health', mood: ['calming', 'trustworthy', 'clean'],
        headline: 'Your Health. Our Priority.',
        subheadline: 'Telehealth consultations available 24/7',
        cta: 'Book Now', tag: '',
        slots: ['headline', 'subheadline', 'cta'] },

    // ══ Real Estate ══
    { industry: 'realestate', mood: ['luxurious', 'aspirational'],
        headline: 'Live Where Dreams Begin',
        subheadline: 'Waterfront residences starting from $1.2M',
        cta: 'Schedule Tour', tag: 'NOW SELLING',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },

    // ══ Automotive ══
    { industry: 'automotive', mood: ['powerful', 'luxurious', 'performance'],
        headline: 'Born To Perform',
        subheadline: '0-60 in 3.2 seconds. 500 miles per charge.',
        cta: 'Configure Yours', tag: '2026 MODEL',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },
    { industry: 'automotive', mood: ['eco', 'future'],
        headline: 'Drive The Change',
        subheadline: '', cta: 'Test Drive', tag: 'ALL-ELECTRIC',
        slots: ['headline', 'cta', 'tag'] },

    // ══ E-commerce / Sale ══
    { industry: 'ecommerce', mood: ['urgent', 'exciting', 'deal'],
        headline: 'Summer Sale Is Here',
        subheadline: 'Up to 50% off everything. Ends Sunday.',
        cta: 'Shop Sale', tag: 'SALE',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },
    { industry: 'ecommerce', mood: ['flash', 'urgency'],
        headline: 'Flash Deal — 24 Hours Only',
        subheadline: '', cta: 'Grab It Now', tag: '-70%',
        slots: ['headline', 'cta', 'tag'] },

    // ══ Event / Conference ══
    { industry: 'event', mood: ['professional', 'networking'],
        headline: 'Where Innovation Meets Opportunity',
        subheadline: 'March 28, 2026 — San Francisco Moscone Center',
        cta: 'Register Now', tag: 'EARLY BIRD',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },
    { industry: 'event', mood: ['creative', 'artistic'],
        headline: 'Art That Moves You',
        subheadline: 'Interactive exhibition. October 5-20.',
        cta: '', tag: 'FREE ENTRY',
        slots: ['headline', 'subheadline', 'tag'] },

    // ══ Gaming ══
    { industry: 'gaming', mood: ['intense', 'action', 'competitive'],
        headline: 'Enter The Arena',
        subheadline: 'Season 5 launches with 3 new legends',
        cta: 'Play Free', tag: 'SEASON 5',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },

    // ══ Music ══
    { industry: 'music', mood: ['energetic', 'festival'],
        headline: 'Feel The Beat',
        subheadline: '3 stages. 50 artists. One unforgettable weekend.',
        cta: 'Get Passes', tag: 'SOLD OUT SOON',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },

    // ══ Korean-language examples ══
    { industry: 'tech', mood: ['premium', 'innovative'],
        headline: '미래를 손끝에서',
        subheadline: '역대 가장 얇고, 가장 강력한 프로세서',
        cta: '지금 주문하기', tag: 'NEW',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },
    { industry: 'fashion', mood: ['elegant', 'seasonal'],
        headline: '이번 시즌, 당신의 스타일',
        subheadline: '가을 신상 컬렉션 30% 할인',
        cta: '쇼핑하기', tag: 'SALE',
        slots: ['headline', 'subheadline', 'cta', 'tag'] },
    { industry: 'food', mood: ['warm', 'homey'],
        headline: '정성이 맛이 되는 곳',
        subheadline: '매일 아침 직접 반죽하는 수제 빵',
        cta: '', tag: '',
        slots: ['headline', 'subheadline'] },
];

// ── Industry Detection ───────────────────────────

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
    entertainment: ['movie', 'film', 'theater', 'cinema', 'streaming', 'disney', 'netflix', 'marvel', 'animation', 'minion', 'pixar', 'show', 'series', 'trailer', '영화', '극장', '개봉', '시리즈'],
    tech: ['iphone', 'samsung', 'apple', 'google', 'pixel', 'macbook', 'laptop', 'phone', 'ai', 'app', 'software', 'saas', 'startup', 'chip', 'processor', '아이폰', '갤럭시', '기술', '앱'],
    fashion: ['fashion', 'clothing', 'style', 'wear', 'collection', 'runway', 'dress', 'outfit', 'brand', 'luxury', 'designer', 'shoe', '패션', '옷', '스타일', '컬렉션'],
    food: ['food', 'restaurant', 'menu', 'dish', 'cuisine', 'chef', 'recipe', 'burger', 'pizza', 'coffee', 'bakery', 'drink', '음식', '맛집', '레스토랑', '카페', '빵', '요리'],
    fitness: ['fitness', 'gym', 'workout', 'training', 'yoga', 'run', 'marathon', 'exercise', 'muscle', 'sport', '운동', '헬스', '피트니스', '트레이닝'],
    travel: ['travel', 'hotel', 'resort', 'vacation', 'trip', 'destination', 'flight', 'beach', 'island', 'tour', 'explore', '여행', '호텔', '리조트', '관광'],
    finance: ['finance', 'bank', 'invest', 'stock', 'crypto', 'insurance', 'credit', 'loan', 'fintech', 'wealth', 'portfolio', '금융', '투자', '은행', '주식'],
    education: ['education', 'learn', 'course', 'class', 'university', 'school', 'skill', 'tutor', 'academy', 'bootcamp', '교육', '학원', '강좌', '수업'],
    health: ['health', 'medical', 'doctor', 'clinic', 'therapy', 'wellness', 'care', 'telehealth', 'pharmacy', '건강', '병원', '의료', '클리닉'],
    realestate: ['real estate', 'property', 'apartment', 'condo', 'home', 'house', 'residence', 'penthouse', '부동산', '아파트', '분양'],
    automotive: ['car', 'auto', 'vehicle', 'drive', 'ev', 'electric vehicle', 'suv', 'sedan', 'tesla', 'bmw', 'porsche', '자동차', '차량'],
    ecommerce: ['sale', 'discount', 'deal', 'shop', 'store', 'buy', 'price', 'offer', 'coupon', 'free shipping', '할인', '세일', '쇼핑', '구매'],
    event: ['event', 'conference', 'summit', 'meetup', 'workshop', 'webinar', 'exhibition', 'concert', 'festival', '이벤트', '행사', '컨퍼런스', '전시'],
    gaming: ['game', 'gaming', 'esport', 'player', 'console', 'steam', 'playstation', 'xbox', 'nintendo', '게임', '플레이'],
    music: ['music', 'album', 'artist', 'song', 'band', 'tour', 'spotify', '음악', '앨범'],
};

/** Detect industry from prompt using keyword matching */
export function detectIndustry(prompt: string): string {
    const lower = prompt.toLowerCase();
    let bestIndustry = 'general';
    let bestScore = 0;

    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) score += kw.length;
        }
        if (score > bestScore) {
            bestScore = score;
            bestIndustry = industry;
        }
    }
    return bestIndustry;
}

/** Detect mood keywords from prompt */
export function detectMood(prompt: string): string[] {
    const lower = prompt.toLowerCase();
    const MOOD_MAP: Record<string, string[]> = {
        fun: ['fun', 'playful', 'cheerful', 'happy', '재밌', '즐거운'],
        elegant: ['elegant', 'luxury', 'premium', 'sophisticated', '고급', '럭셔리', '프리미엄'],
        bold: ['bold', 'strong', 'powerful', 'intense', '강렬', '대담'],
        minimal: ['minimal', 'clean', 'simple', '미니멀', '깔끔', '심플'],
        urgent: ['sale', 'limited', 'hurry', 'flash', 'deal', '세일', '한정', '급매'],
        warm: ['warm', 'cozy', 'homey', 'comfort', '따뜻', '편안'],
    };
    const moods: string[] = [];
    for (const [mood, keywords] of Object.entries(MOOD_MAP)) {
        if (keywords.some(kw => lower.includes(kw))) moods.push(mood);
    }
    return moods.length > 0 ? moods : ['general'];
}

/**
 * Select the most relevant examples for a prompt.
 * Priority: exact industry > mood overlap > language match > diversity
 */
export function selectExamples(prompt: string, maxCount = 4): CopyExample[] {
    const industry = detectIndustry(prompt);
    const moods = detectMood(prompt);

    const scored = EXAMPLES.map(ex => {
        let score = 0;
        if (ex.industry === industry) score += 10;
        const moodOverlap = ex.mood.filter(m => moods.includes(m)).length;
        score += moodOverlap * 3;
        const isKorean = /[가-힣]/.test(prompt);
        const exIsKorean = /[가-힣]/.test(ex.headline);
        if (isKorean && exIsKorean) score += 5;
        if (!isKorean && !exIsKorean) score += 1;
        return { example: ex, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const selected: CopyExample[] = [];
    const industryCounts = new Map<string, number>();
    for (const { example } of scored) {
        if (selected.length >= maxCount) break;
        const count = industryCounts.get(example.industry) ?? 0;
        if (count >= 2) continue;
        selected.push(example);
        industryCounts.set(example.industry, count + 1);
    }

    return selected;
}

/** Format examples as few-shot prompt text */
export function formatExamplesForPrompt(examples: CopyExample[]): string {
    if (examples.length === 0) return '';
    const lines = examples.map((ex, i) => {
        const parts = [`  headline: "${ex.headline}"`];
        if (ex.subheadline) parts.push(`  subheadline: "${ex.subheadline}"`);
        else parts.push('  subheadline: "" (not needed for this design)');
        if (ex.cta) parts.push(`  cta: "${ex.cta}"`);
        else parts.push('  cta: "" (not needed)');
        if (ex.tag) parts.push(`  tag: "${ex.tag}"`);
        else parts.push('  tag: ""');
        parts.push(`  slots: [${ex.slots.map(s => `"${s}"`).join(', ')}]`);
        return `Example ${i + 1} (${ex.industry}, ${ex.mood.join('/')}):\n${parts.join('\n')}`;
    });
    return `REFERENCE EXAMPLES — match this quality and structure:\n${lines.join('\n\n')}`;
}

/** Get all examples (for testing) */
export function getAllExamples(): readonly CopyExample[] {
    return EXAMPLES;
}
