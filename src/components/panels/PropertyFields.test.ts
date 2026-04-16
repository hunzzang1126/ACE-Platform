// PropertyFields.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './PropertyFields.tsx'), 'utf-8');

describe('PropertyFields.tsx — exports', () => {
    it('exports Section', () => { expect(src).toContain('export function Section'); });
    it('exports ScrubField', () => { expect(src).toContain('export function ScrubField'); });
    it('exports PropField', () => { expect(src).toContain('export function PropField'); });
    it('exports OpacitySlider', () => { expect(src).toContain('export function OpacitySlider'); });
});

describe('PropertyFields.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
});

describe('PropertyFields.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
