// LinkedBadge.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LinkedBadge.tsx'), 'utf-8');

describe('LinkedBadge.tsx — exports', () => {
    it('exports LinkedBadge', () => { expect(src).toContain('export function LinkedBadge'); });
});

describe('LinkedBadge.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
});

describe('LinkedBadge.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
