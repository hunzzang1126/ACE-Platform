// useLayerDrag.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useLayerDrag.ts'), 'utf-8');

describe('useLayerDrag.ts — exports', () => {
    it('exports interface LayerDragState', () => { expect(src).toContain('export interface LayerDragState'); });
    it('exports useLayerDrag', () => { expect(src).toContain('export function useLayerDrag'); });
});

describe('useLayerDrag.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
});

