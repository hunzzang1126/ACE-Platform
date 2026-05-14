// ─────────────────────────────────────────────────
// copyExamples.test.ts — Tests for Content-First copy examples
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    detectIndustry, detectMood, selectExamples,
    formatExamplesForPrompt, getAllExamples,
} from '@/services/copyExamples';

describe('detectIndustry', () => {
    it('detects entertainment from movie-related prompts', () => {
        expect(detectIndustry('Minions movie ad')).toBe('entertainment');
        expect(detectIndustry('Netflix series promo')).toBe('entertainment');
        expect(detectIndustry('영화 개봉 광고')).toBe('entertainment');
    });

    it('detects tech from product prompts', () => {
        expect(detectIndustry('iPhone 17 launch ad')).toBe('tech');
        expect(detectIndustry('new MacBook Pro campaign')).toBe('tech');
        expect(detectIndustry('AI SaaS startup')).toBe('tech');
    });

    it('detects fashion from style prompts', () => {
        expect(detectIndustry('luxury fashion collection')).toBe('fashion');
        expect(detectIndustry('패션 컬렉션 광고')).toBe('fashion');
    });

    it('detects food from restaurant prompts', () => {
        expect(detectIndustry('Italian restaurant menu')).toBe('food');
        expect(detectIndustry('카페 음식 광고')).toBe('food');
    });

    it('detects ecommerce from sale prompts', () => {
        expect(detectIndustry('Summer sale 50% discount')).toBe('ecommerce');
        expect(detectIndustry('할인 세일 쇼핑')).toBe('ecommerce');
    });

    it('returns general for ambiguous prompts', () => {
        expect(detectIndustry('something creative')).toBe('general');
    });

    it('handles empty prompt', () => {
        expect(detectIndustry('')).toBe('general');
    });
});

describe('detectMood', () => {
    it('detects fun mood', () => {
        expect(detectMood('fun playful banner')).toContain('fun');
    });

    it('detects elegant mood', () => {
        expect(detectMood('luxury premium design')).toContain('elegant');
    });

    it('detects urgent mood from sale keywords', () => {
        expect(detectMood('flash sale limited time')).toContain('urgent');
    });

    it('detects Korean mood keywords', () => {
        expect(detectMood('고급 프리미엄 디자인')).toContain('elegant');
    });

    it('returns general for no mood match', () => {
        expect(detectMood('random words')).toEqual(['general']);
    });
});

describe('selectExamples', () => {
    it('returns up to 4 examples by default', () => {
        const examples = selectExamples('Minions movie ad');
        expect(examples.length).toBeLessThanOrEqual(4);
        expect(examples.length).toBeGreaterThan(0);
    });

    it('prioritizes same-industry examples', () => {
        const examples = selectExamples('iPhone launch ad');
        const techCount = examples.filter(ex => ex.industry === 'tech').length;
        expect(techCount).toBeGreaterThanOrEqual(1);
    });

    it('limits to maxCount', () => {
        const examples = selectExamples('test ad', 2);
        expect(examples.length).toBeLessThanOrEqual(2);
    });

    it('max 2 from same industry for diversity', () => {
        const examples = selectExamples('entertainment movie film', 4);
        const entCount = examples.filter(ex => ex.industry === 'entertainment').length;
        expect(entCount).toBeLessThanOrEqual(2);
    });

    it('Korean prompt boosts Korean examples', () => {
        const examples = selectExamples('아이폰 광고 만들어줘');
        const hasKorean = examples.some(ex => /[가-힣]/.test(ex.headline));
        expect(hasKorean).toBe(true);
    });
});

describe('formatExamplesForPrompt', () => {
    it('returns empty string for no examples', () => {
        expect(formatExamplesForPrompt([])).toBe('');
    });

    it('formats examples with industry and mood', () => {
        const examples = selectExamples('movie ad', 2);
        const formatted = formatExamplesForPrompt(examples);
        expect(formatted).toContain('REFERENCE EXAMPLES');
        expect(formatted).toContain('headline:');
        expect(formatted).toContain('slots:');
    });

    it('shows "not needed" for empty slots', () => {
        const examples = getAllExamples().filter(ex => !ex.subheadline);
        if (examples.length > 0) {
            const formatted = formatExamplesForPrompt([examples[0]!]);
            expect(formatted).toContain('not needed');
        }
    });
});

describe('getAllExamples — data quality', () => {
    const examples = getAllExamples();

    it('has 30+ curated examples', () => {
        expect(examples.length).toBeGreaterThanOrEqual(30);
    });

    it('all examples have non-empty headline', () => {
        for (const ex of examples) {
            expect(ex.headline.length).toBeGreaterThan(0);
        }
    });

    it('all examples have valid slots array', () => {
        for (const ex of examples) {
            expect(ex.slots).toContain('headline');
            // If subheadline exists, it must be in slots
            if (ex.subheadline) expect(ex.slots).toContain('subheadline');
            // If sub is empty, it must NOT be in slots
            if (!ex.subheadline) expect(ex.slots).not.toContain('subheadline');
            // Same for cta and tag
            if (ex.cta) expect(ex.slots).toContain('cta');
            if (!ex.cta) expect(ex.slots).not.toContain('cta');
        }
    });

    it('covers at least 8 industries', () => {
        const industries = new Set(examples.map(ex => ex.industry));
        expect(industries.size).toBeGreaterThanOrEqual(8);
    });

    it('includes Korean examples', () => {
        const korean = examples.filter(ex => /[가-힣]/.test(ex.headline));
        expect(korean.length).toBeGreaterThanOrEqual(2);
    });

    it('has variety in slot patterns (not all 4-slot)', () => {
        const slotLengths = new Set(examples.map(ex => ex.slots.length));
        expect(slotLengths.size).toBeGreaterThanOrEqual(3); // 2, 3, 4 slot designs
    });
});
