// SettingsPanel.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SettingsPanel.tsx'), 'utf-8');

describe('SettingsPanel.tsx — exports', () => {
    it('exports SettingsPanel', () => { expect(src).toContain('export function SettingsPanel'); });
});

describe('SettingsPanel.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from userPrefs', () => { expect(src).toContain("userPrefs"); });
    it('imports from authStore', () => { expect(src).toContain("authStore"); });
    it('imports from publishTypes', () => { expect(src).toContain("publishTypes"); });
    it('imports from settingsShared', () => { expect(src).toContain("settingsShared"); });
    it('imports from SettingsGeneral', () => { expect(src).toContain("SettingsGeneral"); });
    it('imports from SettingsAccount', () => { expect(src).toContain("SettingsAccount"); });
    it('imports from SettingsBilling', () => { expect(src).toContain("SettingsBilling"); });
    it('imports from SettingsBrand', () => { expect(src).toContain("SettingsBrand"); });
});

describe('SettingsPanel.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
