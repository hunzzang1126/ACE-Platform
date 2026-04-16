// LayerRow.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LayerRow.tsx'), 'utf-8');

describe('LayerRow.tsx — exports', () => {
    it('exports OverlayLayerRow', () => { expect(src).toContain('export function OverlayLayerRow'); });
    it('exports EngineLayerRow', () => { expect(src).toContain('export function EngineLayerRow'); });
});

describe('LayerRow.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from useOverlayElements', () => { expect(src).toContain("useOverlayElements"); });
    it('imports from useCanvasEngine', () => { expect(src).toContain("useCanvasEngine"); });
    it('imports from Icons', () => { expect(src).toContain("Icons"); });
    it('imports from bottomPanelHelpers', () => { expect(src).toContain("bottomPanelHelpers"); });
});

describe('LayerRow.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
});
