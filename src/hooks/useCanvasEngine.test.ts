// useCanvasEngine.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useCanvasEngine.ts'), 'utf-8');

describe('useCanvasEngine.ts — exports', () => {
    it('exports type ', () => { expect(src).toContain('export type '); });
    it('exports useCanvasEngine', () => { expect(src).toContain('export function useCanvasEngine'); });
});

describe('useCanvasEngine.ts — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from loader', () => { expect(src).toContain("loader"); });
    it('imports from editorStore', () => { expect(src).toContain("editorStore"); });
    it('imports from useCanvasKeyboard', () => { expect(src).toContain("useCanvasKeyboard"); });
    it('imports from canvasEngineActions', () => { expect(src).toContain("canvasEngineActions"); });
    it('imports from canvasTypes', () => { expect(src).toContain("canvasTypes"); });
});

