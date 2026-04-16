// BottomPanel.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './BottomPanel.tsx'), 'utf-8');

describe('BottomPanel.tsx — exports', () => {
    it('exports BottomPanel', () => { expect(src).toContain('export function BottomPanel'); });
});

describe('BottomPanel.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
    it('imports from useCanvasEngine', () => { expect(src).toContain("useCanvasEngine"); });
    it('imports from useOverlayElements', () => { expect(src).toContain("useOverlayElements"); });
    it('imports from Icons', () => { expect(src).toContain("Icons"); });
    it('imports from useAnimationPresets', () => { expect(src).toContain("useAnimationPresets"); });
    it('imports from useLayerDrag', () => { expect(src).toContain("useLayerDrag"); });
    it('imports from bottomPanelHelpers', () => { expect(src).toContain("bottomPanelHelpers"); });
    it('imports from LayerRow', () => { expect(src).toContain("LayerRow"); });
    it('imports from TimelineBar', () => { expect(src).toContain("TimelineBar"); });
});

describe('BottomPanel.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
