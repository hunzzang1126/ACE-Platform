// CreativeSetTopBar.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './CreativeSetTopBar.tsx'), 'utf-8');

describe('CreativeSetTopBar.tsx — exports', () => {
    it('exports CreativeSetTopBar', () => { expect(src).toContain('export function CreativeSetTopBar'); });
});

describe('CreativeSetTopBar.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports from AuthModal', () => { expect(src).toContain("AuthModal"); });
    it('imports from i18n', () => { expect(src).toContain("i18n"); });
});

describe('CreativeSetTopBar.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
});
