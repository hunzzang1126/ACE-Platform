// SpiralVortex.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SpiralVortex.tsx'), 'utf-8');

describe('SpiralVortex.tsx — exports', () => {
    it('exports setScrollVelocity', () => { expect(src).toContain('export function setScrollVelocity'); });
    it('exports SpiralVortex', () => { expect(src).toContain('export function SpiralVortex'); });
    it('exports OrbitalAccent', () => { expect(src).toContain('export function OrbitalAccent'); });
});

describe('SpiralVortex.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from fiber', () => { expect(src).toContain("fiber"); });
    it('imports from three', () => { expect(src).toContain("three"); });
});

describe('SpiralVortex.tsx — React patterns', () => {
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
