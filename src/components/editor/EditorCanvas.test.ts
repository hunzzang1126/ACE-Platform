// EditorCanvas.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './EditorCanvas.tsx'), 'utf-8');

describe('EditorCanvas.tsx — exports', () => {
    it('exports EditorCanvas', () => { expect(src).toContain('export function EditorCanvas'); });
});

describe('EditorCanvas.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
    it('imports from useOverlayElements', () => { expect(src).toContain("useOverlayElements"); });
    it('imports from useAnimationPresets', () => { expect(src).toContain("useAnimationPresets"); });
    it('imports from editorStore', () => { expect(src).toContain("editorStore"); });
    it('imports from uiStore', () => { expect(src).toContain("uiStore"); });
    it('imports from useAiMcpBridge', () => { expect(src).toContain("useAiMcpBridge"); });
    it('imports from ResizeHandles', () => { expect(src).toContain("ResizeHandles"); });
    it('imports from CanvasRuler', () => { expect(src).toContain("CanvasRuler"); });
});

describe('EditorCanvas.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
