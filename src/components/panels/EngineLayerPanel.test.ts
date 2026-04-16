// EngineLayerPanel.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './EngineLayerPanel.tsx'), 'utf-8');

describe('EngineLayerPanel.tsx — exports', () => {
    it('exports EngineLayerPanel', () => { expect(src).toContain('export function EngineLayerPanel'); });
});

describe('EngineLayerPanel.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from useCanvasEngine', () => { expect(src).toContain("useCanvasEngine"); });
    it('imports from Icons', () => { expect(src).toContain("Icons"); });
});

describe('EngineLayerPanel.tsx — React patterns', () => {
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
});
