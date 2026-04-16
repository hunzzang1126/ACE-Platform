// resizeOrchestrator.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './resizeOrchestrator.ts'), 'utf-8');

describe('resizeOrchestrator.ts — exports', () => {
    it('exports interface ResizePlan', () => { expect(src).toContain('export interface ResizePlan'); });
    it('exports interface OrchestrateResult', () => { expect(src).toContain('export interface OrchestrateResult'); });
    it('exports orchestrateResize', () => { expect(src).toContain('export async function orchestrateResize'); });
});

describe('resizeOrchestrator.ts — dependencies', () => {
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
    it('imports from layoutRoles', () => { expect(src).toContain("layoutRoles"); });
    it('imports from resizeSubAgent', () => { expect(src).toContain("resizeSubAgent"); });
});

