// SettingsConnections.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SettingsConnections.tsx'), 'utf-8');

describe('SettingsConnections.tsx — exports', () => {
    it('exports SettingsConnections', () => { expect(src).toContain('export function SettingsConnections'); });
});

describe('SettingsConnections.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from publishTypes', () => { expect(src).toContain("publishTypes"); });
    it('imports from settingsShared', () => { expect(src).toContain("settingsShared"); });
});

describe('SettingsConnections.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
});
