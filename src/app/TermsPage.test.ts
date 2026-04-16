// TermsPage.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './TermsPage.tsx'), 'utf-8');

describe('TermsPage — exports', () => {
    it('exports TermsPage', () => { expect(src).toContain('export function TermsPage'); });
});

describe('TermsPage — dependencies', () => {
    it('imports react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports GlidLogo', () => { expect(src).toContain("GlidLogo"); });
});

