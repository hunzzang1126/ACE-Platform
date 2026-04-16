// SettingsGeneral.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SettingsGeneral.tsx'), 'utf-8');

describe('SettingsGeneral — exports', () => {
    it('exports SettingsGeneral', () => { expect(src).toContain('export function SettingsGeneral'); });
});

describe('SettingsGeneral — dependencies', () => {
    it('imports userPrefs', () => { expect(src).toContain("userPrefs"); });
    it('imports settingsShared', () => { expect(src).toContain("settingsShared"); });
    it('imports i18n', () => { expect(src).toContain("i18n"); });
    it('imports locales', () => { expect(src).toContain("locales"); });
});

