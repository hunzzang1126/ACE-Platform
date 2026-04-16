// DashboardToolbar.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './DashboardToolbar.tsx'), 'utf-8');

describe('DashboardToolbar.tsx — exports', () => {
    it('exports DashboardToolbar', () => { expect(src).toContain('export function DashboardToolbar'); });
});

describe('DashboardToolbar.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from projectStore', () => { expect(src).toContain("projectStore"); });
});

describe('DashboardToolbar.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
