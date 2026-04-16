// SidebarProjectsTab.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SidebarProjectsTab.tsx'), 'utf-8');

describe('SidebarProjectsTab.tsx — exports', () => {
    it('exports SidebarProjectsTab', () => { expect(src).toContain('export function SidebarProjectsTab'); });
});

describe('SidebarProjectsTab.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
    it('imports from projectStore', () => { expect(src).toContain("projectStore"); });
});

describe('SidebarProjectsTab.tsx — React patterns', () => {
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
});
