// ─────────────────────────────────────────────────
// goldenExamples.test.ts — Design example prompt builder
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { GOLDEN_EXAMPLES, buildGoldenExamplePrompt } from './goldenExamples';

describe('GOLDEN_EXAMPLES', () => {
    it('has at least 3 examples', () => {
        expect(GOLDEN_EXAMPLES.length).toBeGreaterThanOrEqual(3);
    });

    it('each example has required fields', () => {
        for (const ex of GOLDEN_EXAMPLES) {
            expect(ex.id).toBeDefined();
            expect(ex.canvasW).toBeGreaterThan(0);
            expect(ex.canvasH).toBeGreaterThan(0);
            expect(ex.elements.length).toBeGreaterThan(0);
        }
    });
});

describe('buildGoldenExamplePrompt', () => {
    it('returns non-empty string', () => {
        const prompt = buildGoldenExamplePrompt('premium-dark', 300, 250);
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
    });

    it('includes element descriptions', () => {
        const prompt = buildGoldenExamplePrompt('premium-dark', 300, 250);
        expect(prompt).toContain('type');
    });

    it('handles unknown style guide gracefully', () => {
        const prompt = buildGoldenExamplePrompt('nonexistent-style', 300, 250);
        expect(typeof prompt).toBe('string');
    });
});
