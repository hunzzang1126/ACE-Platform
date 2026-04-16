// CanvasRuler.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './CanvasRuler.tsx'), 'utf-8');

describe('CanvasRuler.tsx — exports', () => {
    it('exports CanvasRuler', () => { expect(src).toContain('export function CanvasRuler'); });
});

describe('CanvasRuler.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
});

describe('CanvasRuler.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
});
