// SidebarElementsTab.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SidebarElementsTab.tsx'), 'utf-8');

describe('SidebarElementsTab.tsx — exports', () => {
    it('exports SidebarElementsTab', () => { expect(src).toContain('export function SidebarElementsTab'); });
});

describe('SidebarElementsTab.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
});

describe('SidebarElementsTab.tsx — React patterns', () => {
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
