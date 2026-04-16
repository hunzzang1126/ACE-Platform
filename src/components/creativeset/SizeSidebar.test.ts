// SizeSidebar.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SizeSidebar.tsx'), 'utf-8');

describe('SizeSidebar.tsx — exports', () => {
    it('exports SizeSidebar', () => { expect(src).toContain('export function SizeSidebar'); });
});

describe('SizeSidebar.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
    it('imports from i18n', () => { expect(src).toContain("i18n"); });
});

describe('SizeSidebar.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
});
