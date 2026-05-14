import { describe, it, expect } from 'vitest';
import { decideBackgroundImage } from './backgroundImageDecider';

describe('decideBackgroundImage — Tier 1: Explicit requests', () => {
    it('detects explicit "photo" request → high YES', () => {
        const r = decideBackgroundImage('Make a banner with a photo background');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('detects Korean "사진" request → high YES', () => {
        const r = decideBackgroundImage('배경 사진 있는 광고 만들어줘');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('detects "background image" request → high YES', () => {
        const r = decideBackgroundImage('I need a background image for my ad');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('detects "hero shot" request → high YES', () => {
        const r = decideBackgroundImage('Create a hero shot ad');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('high');
    });

    it('detects explicit "no photo" → high NO', () => {
        const r = decideBackgroundImage('Make a flat design, no photo needed');
        expect(r.needsImage).toBe(false);
        expect(r.confidence).toBe('high');
    });

    it('detects "gradient only" → high NO', () => {
        const r = decideBackgroundImage('Simple gradient only background');
        expect(r.needsImage).toBe(false);
        expect(r.confidence).toBe('high');
    });
});

describe('decideBackgroundImage — Tier 2: Brief-based (mood/industry)', () => {
    it('★ Nike ad with athletic industry → medium YES', () => {
        const r = decideBackgroundImage('나이키 광고 만들어줘', 'motivational', 'athletic');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('medium');
    });

    it('fashion industry → medium YES', () => {
        const r = decideBackgroundImage('Summer collection ad', 'elegant', 'fashion');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('medium');
    });

    it('food/restaurant industry → medium YES', () => {
        const r = decideBackgroundImage('Italian restaurant opening', 'warm', 'restaurant');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('medium');
    });

    it('SaaS/tech industry → medium NO', () => {
        const r = decideBackgroundImage('SaaS dashboard promo', 'professional', 'saas');
        expect(r.needsImage).toBe(false);
        expect(r.confidence).toBe('medium');
    });

    it('dramatic mood without industry → medium YES', () => {
        const r = decideBackgroundImage('Create a bold ad', 'dramatic', '');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('medium');
    });

    it('product keyword "나이키" in prompt → medium YES', () => {
        const r = decideBackgroundImage('나이키 운동화 광고');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('medium');
    });

    it('product keyword "coffee" in prompt → medium YES', () => {
        const r = decideBackgroundImage('New coffee shop grand opening');
        expect(r.needsImage).toBe(true);
        expect(r.confidence).toBe('medium');
    });
});

describe('decideBackgroundImage — Tier 3: Defer to AI', () => {
    it('ambiguous prompt with no brief → low', () => {
        const r = decideBackgroundImage('Make a cool ad');
        expect(r.confidence).toBe('low');
    });

    it('empty prompt → low', () => {
        const r = decideBackgroundImage('');
        expect(r.confidence).toBe('low');
    });

    it('generic text ad → low', () => {
        const r = decideBackgroundImage('Sale 50% off everything');
        expect(r.confidence).toBe('low');
    });
});
