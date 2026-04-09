// ─────────────────────────────────────────────────
// themeInit.test.ts — Verify theme initialization happens
// ─────────────────────────────────────────────────
// Guards against initTheme() being accidentally removed from main.tsx

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readFile(relativePath: string): string {
    try {
        return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
    } catch {
        return readFileSync(resolve(process.cwd(), relativePath), 'utf-8');
    }
}

describe('★ REGRESSION: Theme Initialization in main.tsx', () => {
    const mainContent = readFile('src/main.tsx');

    it('imports initTheme from themeStore', () => {
        expect(mainContent).toContain('initTheme');
        expect(mainContent).toMatch(/import.*initTheme.*from.*themeStore/);
    });

    it('calls initTheme() before createRoot renders', () => {
        const lines = mainContent.split('\n');
        const initLine = lines.findIndex(l => l.includes('initTheme()') && !l.trim().startsWith('//'));
        // Look for the actual createRoot().render() call, not the import
        const createRootLine = lines.findIndex(l => l.includes('createRoot('));
        expect(initLine).toBeGreaterThan(-1);
        expect(createRootLine).toBeGreaterThan(-1);
        expect(initLine).toBeLessThan(createRootLine);
    });
});

describe('★ REGRESSION: SettingsPanel mounts SettingsAppearance', () => {
    const panelContent = readFile('src/components/panels/SettingsPanel.tsx');

    it('imports SettingsAppearance', () => {
        expect(panelContent).toContain('SettingsAppearance');
    });

    it('renders appearance tab content', () => {
        expect(panelContent).toContain("activeTab === 'appearance'");
    });
});
