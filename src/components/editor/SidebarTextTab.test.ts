// SidebarTextTab.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SidebarTextTab.tsx'), 'utf-8');

describe('SidebarTextTab.tsx — exports', () => {
    it('exports SidebarTextTab', () => { expect(src).toContain('export function SidebarTextTab'); });
});

describe('SidebarTextTab.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
});

describe('SidebarTextTab.tsx — React patterns', () => {
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
