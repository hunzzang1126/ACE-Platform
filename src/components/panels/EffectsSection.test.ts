// EffectsSection.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './EffectsSection.tsx'), 'utf-8');

describe('EffectsSection.tsx — exports', () => {
    it('exports EffectsSection', () => { expect(src).toContain('export function EffectsSection'); });
});

describe('EffectsSection.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from useCanvasEngine', () => { expect(src).toContain("useCanvasEngine"); });
    it('imports from i18n', () => { expect(src).toContain("i18n"); });
});

describe('EffectsSection.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
