// ─────────────────────────────────────────────────
// designTemplates.test.ts — Content prompt + type tests
// ─────────────────────────────────────────────────
// Tests the buildContentPrompt function and verifies
// the prompt contains critical prohibitions.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildContentPrompt } from './designTemplates';
import type { GeneratedContent, DesignTemplate } from './designTemplates';

describe('designTemplates — buildContentPrompt', () => {
    it('should include canvas dimensions in prompt', () => {
        const prompt = buildContentPrompt('iPhone ad', 1080, 1080, 'modern');
        expect(prompt).toContain('1080x1080');
    });

    it('should include user prompt in brief', () => {
        const prompt = buildContentPrompt('Samsung Galaxy S25 sale', 300, 250, 'classic');
        expect(prompt).toContain('Samsung Galaxy S25 sale');
    });

    it('should include template name', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'AI Pipeline');
        expect(prompt).toContain('AI Pipeline');
    });

    it('should include language instruction', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'modern', 'Korean');
        expect(prompt).toContain('Korean');
    });

    it('should default to English language', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'modern');
        expect(prompt).toContain('English');
    });

    // ── Headline limits based on aspect ratio ──

    it('should use single-line limit for wide canvas', () => {
        const prompt = buildContentPrompt('test', 728, 90, 'modern');
        expect(prompt).toContain('single line');
    });

    it('should allow multi-line for tall canvas', () => {
        const prompt = buildContentPrompt('test', 160, 600, 'modern');
        expect(prompt).toContain('2-3 lines');
    });

    it('should suppress subheadline for very small canvas', () => {
        const prompt = buildContentPrompt('test', 88, 31, 'modern');
        expect(prompt).toContain('empty string');
    });

    // ── Prohibition rules ──

    it('should prohibit font names as copy', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'modern');
        expect(prompt).toContain('NEVER output font names');
    });

    it('should prohibit Korean UI terms as copy', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'modern');
        expect(prompt).toContain('"버튼"');
        expect(prompt).toContain('"헤드라인"');
    });

    it('should prohibit echoing product name as headline', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'modern');
        expect(prompt).toContain('NEVER just echo the product name');
    });

    it('★ REGRESSION: should prohibit color/visual instructions in copy (v704 fix)', () => {
        // The AI was generating "In Gold/Yellow" as headline text because
        // it confused color specifications from the prompt with ad copy.
        const prompt = buildContentPrompt('iPhone 17 in gold', 1080, 1080, 'modern');
        expect(prompt).toContain('NEVER include color/visual instructions as text content');
        expect(prompt).toContain('"in gold"');
        expect(prompt).toContain('"in yellow"');
        expect(prompt).toContain('"with gradient"');
        expect(prompt).toContain('"neon glow"');
    });

    it('★ REGRESSION: prompt must state colors handled by separate system', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'modern');
        expect(prompt).toContain('Colors and visual styling are handled by a SEPARATE system');
        expect(prompt).toContain('Your job is WORDS ONLY');
    });

    it('should require JSON output format', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'modern');
        expect(prompt).toContain('Return ONLY valid JSON');
    });

    it('should include CTA good/bad examples', () => {
        const prompt = buildContentPrompt('test', 300, 250, 'modern');
        expect(prompt).toContain('Shop Now');
        expect(prompt).toContain('Pre-Order Today');
    });
});

describe('designTemplates — types', () => {
    it('GeneratedContent interface should have all 4 fields', () => {
        const content: GeneratedContent = {
            headline: 'Test',
            subheadline: 'Sub',
            cta: 'Click',
            tag: 'NEW',
        };
        expect(content.headline).toBe('Test');
        expect(content.subheadline).toBe('Sub');
        expect(content.cta).toBe('Click');
        expect(content.tag).toBe('NEW');
    });

    it('DesignTemplate interface should require build function', () => {
        const template: DesignTemplate = {
            id: 'test',
            name: 'Test',
            description: 'desc',
            aspectRatios: ['square'],
            build: () => [],
        };
        expect(template.build(300, 250, {} as any, {} as any)).toEqual([]);
    });
});
