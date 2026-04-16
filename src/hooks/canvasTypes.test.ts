// canvasTypes.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './canvasTypes.ts'), 'utf-8');

describe('canvasTypes.ts — exports', () => {
    it('exports type Engine', () => { expect(src).toContain('export type Engine'); });
    it('exports interface SelectionBounds', () => { expect(src).toContain('export interface SelectionBounds'); });
    it('exports interface EngineNode', () => { expect(src).toContain('export interface EngineNode'); });
    it('exports interface CanvasEngineState', () => { expect(src).toContain('export interface CanvasEngineState'); });
    it('exports interface CanvasEngineActions', () => { expect(src).toContain('export interface CanvasEngineActions'); });
    it('exports interface UseCanvasEngineResult', () => { expect(src).toContain('export interface UseCanvasEngineResult'); });
});

describe('canvasTypes.ts — dependencies', () => {
    it('imports from elements.types', () => { expect(src).toContain("elements.types"); });
    it('imports from alignElements', () => { expect(src).toContain("alignElements"); });
});

