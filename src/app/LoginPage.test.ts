// LoginPage.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LoginPage.tsx'), 'utf-8');

describe('LoginPage.tsx — exports', () => {
    it('exports LoginPage', () => { expect(src).toContain('export function LoginPage'); });
});

describe('LoginPage.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from authStore', () => { expect(src).toContain("authStore"); });
    it('imports from GlidLogo', () => { expect(src).toContain("GlidLogo"); });
});

describe('LoginPage.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
});
