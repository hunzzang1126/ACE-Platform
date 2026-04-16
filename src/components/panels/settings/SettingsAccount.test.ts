// SettingsAccount.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SettingsAccount.tsx'), 'utf-8');

describe('SettingsAccount — exports', () => {
    it('exports SettingsAccount', () => { expect(src).toContain('export function SettingsAccount'); });
});

describe('SettingsAccount — dependencies', () => {
    it('imports authStore', () => { expect(src).toContain("authStore"); });
    it('imports userPrefs', () => { expect(src).toContain("userPrefs"); });
    it('imports settingsShared', () => { expect(src).toContain("settingsShared"); });
});

