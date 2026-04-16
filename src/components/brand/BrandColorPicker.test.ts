// BrandColorPicker.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './BrandColorPicker.tsx'), 'utf-8');

describe('BrandColorPicker.tsx — exports', () => {
    it('exports BrandColorPicker', () => { expect(src).toContain('export const BrandColorPicker'); });
});

describe('BrandColorPicker.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from brandPalette', () => { expect(src).toContain("brandPalette"); });
});

describe('BrandColorPicker.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
});
