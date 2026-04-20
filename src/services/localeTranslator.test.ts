// ─────────────────────────────────────────────────
// localeTranslator.test.ts — Translation service tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './localeTranslator.ts'), 'utf-8');

describe('localeTranslator — architecture', () => {
    it('makes a single API call with no tool schemas', () => {
        expect(src).not.toContain('"tools"');
        expect(src).toContain('max_tokens: 1024');
    });

    it('★ REGRESSION: uses callOpenRouterApi proxy, never direct fetch with key', () => {
        expect(src).toContain('callOpenRouterApi');
        expect(src).not.toContain("'Authorization': `Bearer ${apiKey}`");
        expect(src).not.toContain('openrouter.ai/api/v1/chat/completions');
    });

    it('uses low temperature for consistent quality', () => {
        expect(src).toContain('temperature: 0.3');
    });

    it('requests JSON-only response', () => {
        expect(src).toContain('ONLY the JSON object');
        expect(src).toContain('No markdown, no explanation');
    });
});

describe('localeTranslator — marketing quality', () => {
    it('instructs advertising copy, not literal translation', () => {
        expect(src).toContain('ADVERTISING COPY');
        expect(src).toContain('not literal translation');
    });

    it('enforces text length matching for layout', () => {
        expect(src).toContain('Match the original text LENGTH');
    });

    it('protects brand names from transliteration', () => {
        expect(src).toContain('Never transliterate brand names');
    });

    it('requires strong CTA verbs', () => {
        expect(src).toContain('strong action verbs');
    });

    it('has per-language ad style guidelines', () => {
        expect(src).toContain('짧고 강렬한 광고 문구');      // Korean
        expect(src).toContain('広告コピー');                  // Japanese
        expect(src).toContain('publicitaire');               // French
        expect(src).toContain('Werbetext');                  // German
        expect(src).toContain('publicitario');               // Spanish
    });
});

describe('localeTranslator — supported languages', () => {
    it('supports Korean, Japanese, Chinese', () => {
        expect(src).toContain("ko:");
        expect(src).toContain("ja:");
        expect(src).toContain("'zh-cn':");
    });

    it('supports European languages', () => {
        expect(src).toContain("fr:");
        expect(src).toContain("es:");
        expect(src).toContain("de:");
        expect(src).toContain("pt:");
        expect(src).toContain("it:");
    });
});

describe('localeTranslator — error handling', () => {
    it('handles missing AI availability gracefully', () => {
        expect(src).toContain("'AI not available'");
    });

    it('strips markdown fences from response', () => {
        expect(src).toContain('```json');
        expect(src).toContain('.replace(');
    });

    it('returns error on API failure', () => {
        expect(src).toContain('Translation failed');
    });
});
