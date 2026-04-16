// PlugCanvas.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './PlugCanvas.tsx'), 'utf-8');

describe('PlugCanvas.tsx — exports', () => {
    it('exports PlugCanvas', () => { expect(src).toContain('export function PlugCanvas'); });
});

describe('PlugCanvas.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from designStore', () => { expect(src).toContain("designStore"); });
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
});

describe('PlugCanvas.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
