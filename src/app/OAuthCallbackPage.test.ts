// OAuthCallbackPage.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './OAuthCallbackPage.tsx'), 'utf-8');

describe('OAuthCallbackPage.tsx — exports', () => {
    it('exports OAuthCallbackPage', () => { expect(src).toContain('export function OAuthCallbackPage'); });
});

describe('OAuthCallbackPage.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from socialAccountService', () => { expect(src).toContain("socialAccountService"); });
});

describe('OAuthCallbackPage.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
});
