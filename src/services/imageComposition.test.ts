// ─────────────────────────────────────────────────
// imageComposition.test.ts — BG Image Composition Analysis
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    analyzeImageComposition, analyzeTemplateTextZone, scoreTemplateComposition,
} from './imageComposition';

// ══════════════════════════════════════════════════
// analyzeImageComposition
// ══════════════════════════════════════════════════
describe('analyzeImageComposition — subject detection', () => {
    it('detects human subject from prompt keywords', () => {
        const result = analyzeImageComposition('A woman running on a track', 'sports ad');
        expect(result.hasHumanSubject).toBe(true);
    });

    it('detects no human subject in landscape prompts', () => {
        const result = analyzeImageComposition('Beautiful sunset over the ocean', 'travel ad');
        expect(result.hasHumanSubject).toBe(false);
        expect(result.subjectZone).toBe('full');
        expect(result.safeTextZone).toBe('any');
    });

    it('detects left placement for "facing right" subjects', () => {
        const result = analyzeImageComposition('Woman facing right, profile shot', 'fitness');
        expect(result.subjectZone).toBe('left');
        expect(result.safeTextZone).toBe('right');
    });

    it('detects right placement for "facing left" subjects', () => {
        const result = analyzeImageComposition('Man looking left with a phone', 'tech ad');
        expect(result.subjectZone).toBe('right');
        expect(result.safeTextZone).toBe('left');
    });

    it('detects center placement for "front facing" subjects', () => {
        const result = analyzeImageComposition('Close-up headshot of a model', 'beauty ad');
        expect(result.subjectZone).toBe('center');
        expect(result.safeTextZone).toBe('any');
    });

    it('defaults human subjects to left (AI generator tendency)', () => {
        const result = analyzeImageComposition('An athlete sprinting', 'sports ad');
        expect(result.hasHumanSubject).toBe(true);
        expect(result.subjectZone).toBe('left');
        expect(result.safeTextZone).toBe('right');
    });

    it('handles Korean prompts for human detection', () => {
        const result = analyzeImageComposition('달리는 여자 선수', '운동 광고');
        expect(result.hasHumanSubject).toBe(true);
    });

    it('non-human product images return unknown with low confidence', () => {
        const result = analyzeImageComposition('A bottle of premium whiskey', 'drinks ad');
        expect(result.hasHumanSubject).toBe(false);
        expect(result.confidence).toBe('low');
        expect(result.safeTextZone).toBe('any');
    });
});

// ══════════════════════════════════════════════════
// analyzeTemplateTextZone
// ══════════════════════════════════════════════════
describe('analyzeTemplateTextZone — text element position analysis', () => {
    it('detects left-aligned text zone', () => {
        const elements = [
            { type: 'text', x: 50, w: 200, name: 'headline' },
            { type: 'text', x: 50, w: 200, name: 'subheadline' },
            { type: 'text', x: 80, w: 150, name: 'cta' },
        ];
        expect(analyzeTemplateTextZone(elements, 1080)).toBe('left');
    });

    it('detects right-aligned text zone', () => {
        const elements = [
            { type: 'text', x: 700, w: 300, name: 'headline' },
            { type: 'text', x: 700, w: 300, name: 'subheadline' },
            { type: 'text', x: 750, w: 200, name: 'cta' },
        ];
        expect(analyzeTemplateTextZone(elements, 1080)).toBe('right');
    });

    it('detects center-aligned text zone', () => {
        const elements = [
            { type: 'text', x: 300, w: 480, name: 'headline' },
            { type: 'text', x: 350, w: 380, name: 'subheadline' },
        ];
        expect(analyzeTemplateTextZone(elements, 1080)).toBe('center');
    });

    it('returns spread when text is scattered', () => {
        const elements = [
            { type: 'text', x: 50, w: 200, name: 'headline' },
            { type: 'text', x: 800, w: 200, name: 'subheadline' },
            { type: 'text', x: 400, w: 200, name: 'cta' },
        ];
        expect(analyzeTemplateTextZone(elements, 1080)).toBe('spread');
    });

    it('ignores non-text elements', () => {
        const elements = [
            { type: 'rect', x: 0, w: 1080, name: 'background' },
            { type: 'text', x: 50, w: 200, name: 'headline' },
            { type: 'text', x: 80, w: 180, name: 'cta' },
        ];
        expect(analyzeTemplateTextZone(elements, 1080)).toBe('left');
    });
});

// ══════════════════════════════════════════════════
// scoreTemplateComposition
// ══════════════════════════════════════════════════
describe('scoreTemplateComposition — compatibility scoring', () => {
    it('gives max score when text zone matches safe zone', () => {
        const comp = { subjectZone: 'left' as const, hasHumanSubject: true, safeTextZone: 'right' as const, confidence: 'high' as const };
        expect(scoreTemplateComposition('right', comp)).toBe(10);
    });

    it('gives zero when text overlaps subject', () => {
        const comp = { subjectZone: 'left' as const, hasHumanSubject: true, safeTextZone: 'right' as const, confidence: 'high' as const };
        expect(scoreTemplateComposition('left', comp)).toBe(0);
    });

    it('gives neutral score when safe zone is "any"', () => {
        const comp = { subjectZone: 'full' as const, hasHumanSubject: false, safeTextZone: 'any' as const, confidence: 'high' as const };
        expect(scoreTemplateComposition('left', comp)).toBe(5);
    });

    it('gives moderate score for center text on directional subject', () => {
        const comp = { subjectZone: 'left' as const, hasHumanSubject: true, safeTextZone: 'right' as const, confidence: 'high' as const };
        expect(scoreTemplateComposition('center', comp)).toBe(4);
    });
});
