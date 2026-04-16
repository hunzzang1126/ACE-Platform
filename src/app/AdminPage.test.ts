// AdminPage.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './AdminPage.tsx'), 'utf-8');

describe('AdminPage.tsx — exports', () => {
    it('exports AdminPage', () => { expect(src).toContain('export function AdminPage'); });
});

describe('AdminPage.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from authStore', () => { expect(src).toContain("authStore"); });
    it('imports from supabaseClient', () => { expect(src).toContain("supabaseClient"); });
    it('imports from GlidLogo', () => { expect(src).toContain("GlidLogo"); });
});

describe('AdminPage.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
