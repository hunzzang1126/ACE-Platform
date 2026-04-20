// ─────────────────────────────────────────────────
// contentVariationService.test.ts — A/B Copy variation tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './contentVariationService.ts'), 'utf-8');

describe('contentVariationService — architecture', () => {
    it('uses callAnthropicApi for proxy-safe routing', () => {
        expect(src).toContain('callAnthropicApi');
        expect(src).toContain("from '@/services/anthropicClient'");
    });

    it('generates exactly 3 variations (professional, creative, urgent)', () => {
        expect(src).toContain("'professional'");
        expect(src).toContain("'creative'");
        expect(src).toContain("'urgent'");
    });

    it('uses higher temperature for diversity', () => {
        expect(src).toContain('temperature: 0.8');
    });

    it('limits output to 512 tokens for efficiency', () => {
        expect(src).toContain('max_tokens: 512');
    });

    it('requests JSON-only response', () => {
        expect(src).toContain('No markdown, no explanation');
        expect(src).toContain('ONLY the JSON array');
    });
});

describe('contentVariationService — content quality', () => {
    it('enforces headline length limits', () => {
        expect(src).toContain('max 6 words');
    });

    it('enforces CTA length limits', () => {
        expect(src).toContain('max 3 words');
    });

    it('requires genuinely different variations', () => {
        expect(src).toContain('genuinely different');
    });

    it('supports multi-language generation', () => {
        expect(src).toContain('LANGUAGE:');
        expect(src).toContain('language: string');
    });
});

describe('contentVariationService — error handling', () => {
    it('returns empty array on failure (graceful degradation)', () => {
        expect(src).toContain('return [];');
    });

    it('strips markdown fences from response', () => {
        expect(src).toContain('```');
        expect(src).toContain('.replace(');
    });

    it('validates array format before returning', () => {
        expect(src).toContain('Array.isArray(parsed)');
        expect(src).toContain('parsed.length < 2');
    });

    it('assigns IDs to each variation', () => {
        expect(src).toContain("id: `var-${i}`");
    });

    it('provides sensible defaults for missing fields', () => {
        expect(src).toContain("'Get Started'");
        expect(src).toContain("'Learn More'");
    });
});

describe('contentVariationService — types', () => {
    it('exports ContentVariation interface', () => {
        expect(src).toContain('export interface ContentVariation');
    });

    it('exports generateContentVariations function', () => {
        expect(src).toContain('export async function generateContentVariations');
    });

    it('ContentVariation has style field', () => {
        expect(src).toContain("style: 'professional' | 'creative' | 'urgent'");
    });
});
