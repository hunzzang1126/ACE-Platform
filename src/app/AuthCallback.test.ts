// AuthCallback.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './AuthCallback.tsx'), 'utf-8');

describe('AuthCallback.tsx — exports', () => {
    it('exports AuthCallback', () => { expect(src).toContain('export function AuthCallback'); });
});

describe('AuthCallback.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from authStore', () => { expect(src).toContain("authStore"); });
    it('imports from supabaseClient', () => { expect(src).toContain("supabaseClient"); });
});

describe('AuthCallback.tsx — React patterns', () => {
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
