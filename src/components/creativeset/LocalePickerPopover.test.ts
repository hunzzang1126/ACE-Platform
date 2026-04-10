// ─────────────────────────────────────────────────
// LocalePickerPopover.test.ts — Locale translation architecture
// ─────────────────────────────────────────────────
// Covers: direct translator usage, store integration,
// no DOM manipulation, language options, marketing quality
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LocalePickerPopover.tsx'), 'utf-8');
const translatorSrc = readFileSync(resolve(__dirname, '../../services/localeTranslator.ts'), 'utf-8');

describe('LocalePickerPopover — direct translator architecture', () => {
    it('★ REGRESSION: uses dedicated translateAdCopy, NOT AI agent bridge', () => {
        expect(src).toContain('translateAdCopy');
        expect(src).not.toContain('__aceGlobalAi');
        expect(src).not.toContain('bridge.send');
    });

    it('★ REGRESSION: does NOT use querySelector for AI input', () => {
        expect(src).not.toContain("querySelector('.ai-panel-textarea')");
        expect(src).not.toContain('nativeInputValueSetter');
    });

    it('★ REGRESSION: reads from ORIGINAL locale via designStore', () => {
        expect(src).toContain('originalLocale');
        expect(src).toContain('useDesignStore');
        expect(src).toContain('setLocaleData');
        expect(src).toContain('switchLocale');
    });

    it('★ REGRESSION: reads original texts from stored localeData, NOT current canvas', () => {
        // When adding a 3rd language (e.g. DE after KO), the canvas shows KO text.
        // Must read from stored localeData[originalLocale], not from current elements.
        expect(src).toContain('existingOriginalTexts');
        expect(src).toContain("cs.localeData?.locales[originalLocale]");
        // Should use sourceTexts derived from stored data
        expect(src).toContain('sourceTexts');
        expect(src).not.toContain('textElements');
    });

    it('translator has marketing-specific instructions per language', () => {
        expect(translatorSrc).toContain('advertising copy');
        expect(translatorSrc).toContain('ADVERTISING COPY');
        expect(translatorSrc).toContain('emotional impact');
        expect(translatorSrc).toContain('call-to-action');
    });

    it('translator uses low temperature for consistent quality', () => {
        expect(translatorSrc).toContain('temperature: 0.3');
    });
});

describe('LocalePickerPopover — language options', () => {
    it('supports 20 languages', () => {
        const matches = src.match(/{ code: '/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(20);
    });

    it('includes major Asian languages', () => {
        expect(src).toContain("code: 'ko'");
        expect(src).toContain("code: 'ja'");
        expect(src).toContain("code: 'zh-cn'");
    });

    it('includes major European languages', () => {
        expect(src).toContain("code: 'fr'");
        expect(src).toContain("code: 'es'");
        expect(src).toContain("code: 'de'");
    });

    it('displays native language names', () => {
        expect(src).toContain('native');
    });
});

describe('LocalePickerPopover — UI behavior', () => {
    it('closes on Escape key', () => {
        expect(src).toContain("e.key === 'Escape'");
    });

    it('closes on click outside', () => {
        expect(src).toContain('mousedown');
        expect(src).toContain('contains');
    });

    it('filters out already-added locales', () => {
        expect(src).toContain('existingLocales');
        expect(src).toContain('.filter');
    });

    it('shows empty state when all languages added', () => {
        expect(src).toContain('All languages already added');
    });
});
