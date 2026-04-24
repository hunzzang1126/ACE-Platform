// ─────────────────────────────────────────────────
// Hallucination Guard — Unit Tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { verifyRender, hallucinationNarration } from './hallucinationGuard';

describe('Hallucination Guard', () => {
    describe('verifyRender', () => {
        it('passes when all elements rendered', () => {
            const planned = [
                { name: 'background', type: 'rect' },
                { name: 'headline', type: 'text' },
                { name: 'subheadline', type: 'text' },
                { name: 'cta_button', type: 'rounded_rect' },
                { name: 'cta_label', type: 'text' },
            ];
            const result = verifyRender(planned, 5);
            expect(result.passed).toBe(true);
            expect(result.expected).toBe(4); // headline, subheadline, cta_button, cta_label
        });

        it('fails when too few elements rendered', () => {
            const planned = [
                { name: 'headline', type: 'text' },
                { name: 'subheadline', type: 'text' },
                { name: 'cta_button' },
                { name: 'cta_label', type: 'text' },
                { name: 'tag_text', type: 'text' },
            ];
            // Only 1 rendered out of 5 meaningful
            const result = verifyRender(planned, 1);
            expect(result.passed).toBe(false);
        });

        it('passes when at least 70% rendered', () => {
            const planned = [
                { name: 'headline', type: 'text' },
                { name: 'subheadline', type: 'text' },
                { name: 'cta_label', type: 'text' },
                { name: 'tag_text', type: 'text' },
            ];
            // 3/4 meaningful = 75% > 70% threshold
            const result = verifyRender(planned, 3);
            expect(result.passed).toBe(true);
        });

        it('detects missing elements via engine node getter', () => {
            const planned = [
                { name: 'headline', type: 'text' },
                { name: 'subheadline', type: 'text' },
                { name: 'cta_label', type: 'text' },
            ];
            // Engine only has headline
            const getter = () => JSON.stringify([{ name: 'headline' }]);
            const result = verifyRender(planned, 3, getter);
            expect(result.missing).toContain('subheadline');
            expect(result.missing).toContain('cta_label');
        });

        it('passes with no meaningful elements (background only)', () => {
            const planned = [{ name: 'background', type: 'rect' }];
            const result = verifyRender(planned, 1);
            expect(result.passed).toBe(true);
            expect(result.expected).toBe(0);
        });

        it('handles engine getter failure gracefully', () => {
            const planned = [{ name: 'headline', type: 'text' }];
            const getter = () => { throw new Error('Engine not available'); };
            const result = verifyRender(planned, 1, getter);
            expect(result.passed).toBe(true);
            expect(result.missing).toHaveLength(0);
        });

        it('handles empty planned array', () => {
            const result = verifyRender([], 0);
            expect(result.passed).toBe(true);
            expect(result.expected).toBe(0);
        });
    });

    describe('hallucinationNarration', () => {
        it('returns success message when passed', () => {
            const msg = hallucinationNarration({
                passed: true, expected: 3, actual: 3, missing: [],
                summary: 'ok',
            });
            expect(msg).toContain('verified');
        });

        it('returns warning with missing elements when failed', () => {
            const msg = hallucinationNarration({
                passed: false, expected: 3, actual: 1,
                missing: ['cta_button', 'subheadline'],
                summary: 'bad',
            });
            expect(msg).toContain('cta_button');
            expect(msg).toContain('subheadline');
        });

        it('returns generic warning when no specific missing items', () => {
            const msg = hallucinationNarration({
                passed: false, expected: 3, actual: 1, missing: [],
                summary: 'bad',
            });
            expect(msg).toContain('check the canvas');
        });
    });
});
