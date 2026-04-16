// locales.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './locales.ts'), 'utf-8');

describe('locales — exports', () => {
    it('exports type AppLocale', () => { expect(src).toContain('export type AppLocale'); });
    it('exports LANG_TO_LOCALE', () => { expect(src).toContain('export const LANG_TO_LOCALE'); });
    it('exports LOCALE_TO_LANG', () => { expect(src).toContain('export const LOCALE_TO_LANG'); });
    it('exports ALL_LOCALES', () => { expect(src).toContain('export const ALL_LOCALES'); });
    it('exports LOCALE_LABELS', () => { expect(src).toContain('export const LOCALE_LABELS'); });
});

