// EditorSidebar.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './EditorSidebar.tsx'), 'utf-8');

describe('EditorSidebar — exports', () => {
    it('exports as component', () => {
        const has = src.includes('export function') || src.includes('export default');
        expect(has).toBe(true);
    });
});

describe('EditorSidebar — tab composition', () => {
    it('includes template tab', () => { expect(src).toContain('SidebarTemplateTab'); });
    it('includes elements tab', () => { expect(src).toContain('SidebarElementsTab'); });
    it('includes text tab', () => { expect(src).toContain('SidebarTextTab'); });
    it('includes uploads tab', () => { expect(src).toContain('SidebarUploadsTab'); });
    it('includes brand tab', () => { expect(src).toContain('SidebarBrandTab'); });
    it('includes projects tab', () => { expect(src).toContain('SidebarProjectsTab'); });
});

describe('EditorSidebar — state', () => {
    it('uses UI store for active tab', () => { expect(src).toContain('useUIStore'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
