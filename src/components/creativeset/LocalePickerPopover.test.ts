// ─────────────────────────────────────────────────
// LocalePickerPopover.test.ts — Locale selection + AI bridge
// ─────────────────────────────────────────────────
// Covers: global bridge usage, originalLocale enforcement,
// no DOM manipulation, language options
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LocalePickerPopover.tsx'), 'utf-8');

describe('LocalePickerPopover — AI bridge integration', () => {
    it('★ REGRESSION: uses global bridge, not DOM querySelector', () => {
        expect(src).toContain('__aceGlobalAi');
        expect(src).toContain('bridge.send');
    });

    it('★ REGRESSION: does NOT use querySelector for AI input', () => {
        expect(src).not.toContain("querySelector('.ai-panel-textarea')");
        expect(src).not.toContain('nativeInputValueSetter');
    });

    it('★ REGRESSION: instructs AI to translate from ORIGINAL locale only', () => {
        expect(src).toContain('ORIGINAL locale');
        // Should not allow translating from current/derived locale
        expect(src).toContain('not the currently active locale');
    });

    it('includes marketing-appropriate translation instruction', () => {
        expect(src).toContain('marketing-appropriate');
        expect(src).toContain('not literal translation');
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
