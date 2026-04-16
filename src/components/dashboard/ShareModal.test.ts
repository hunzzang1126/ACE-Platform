// ShareModal.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ShareModal.tsx'), 'utf-8');

describe('ShareModal.tsx — exports', () => {
    it('exports ShareModal', () => { expect(src).toContain('export function ShareModal'); });
});

describe('ShareModal.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from i18n', () => { expect(src).toContain("i18n"); });
});

describe('ShareModal.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
