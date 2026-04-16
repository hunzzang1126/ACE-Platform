// ProtectedRoute.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ProtectedRoute.tsx'), 'utf-8');

describe('ProtectedRoute.tsx — exports', () => {
    it('exports ProtectedRoute', () => { expect(src).toContain('export function ProtectedRoute'); });
});

describe('ProtectedRoute.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from authStore', () => { expect(src).toContain("authStore"); });
});

describe('ProtectedRoute.tsx — React patterns', () => {
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
});
