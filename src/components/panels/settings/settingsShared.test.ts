// ─────────────────────────────────────────────────
// settingsShared.test.ts — Settings tab configuration tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { SETTINGS_TABS } from './settingsShared';
import type { SettingsTab } from './settingsShared';

describe('settingsShared — SETTINGS_TABS', () => {
    it('contains appearance tab', () => {
        const keys = SETTINGS_TABS.map(t => t.key);
        expect(keys).toContain('appearance');
    });

    it('contains all expected tabs', () => {
        const keys = SETTINGS_TABS.map(t => t.key);
        const expected: SettingsTab[] = ['general', 'appearance', 'account', 'billing', 'brand', 'connections'];
        for (const tab of expected) {
            expect(keys).toContain(tab);
        }
    });

    it('has correct number of tabs (6)', () => {
        expect(SETTINGS_TABS).toHaveLength(6);
    });

    it('each tab has a non-empty label', () => {
        for (const tab of SETTINGS_TABS) {
            expect(tab.label).toBeTruthy();
            expect(tab.label.length).toBeGreaterThan(0);
        }
    });

    it('appearance tab has label "Appearance"', () => {
        const tab = SETTINGS_TABS.find(t => t.key === 'appearance');
        expect(tab).toBeDefined();
        expect(tab!.label).toBe('Appearance');
    });

    it('no duplicate tab keys', () => {
        const keys = SETTINGS_TABS.map(t => t.key);
        expect(new Set(keys).size).toBe(keys.length);
    });
});
