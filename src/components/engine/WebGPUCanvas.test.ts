// WebGPUCanvas.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './WebGPUCanvas.tsx'), 'utf-8');

describe('WebGPUCanvas.tsx — exports', () => {
    it('exports WebGPUCanvas', () => { expect(src).toContain('export function WebGPUCanvas'); });
});

describe('WebGPUCanvas.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from loader', () => { expect(src).toContain("loader"); });
});

describe('WebGPUCanvas.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
