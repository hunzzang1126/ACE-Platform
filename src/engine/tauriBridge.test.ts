// tauriBridge.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './tauriBridge.ts'), 'utf-8');

describe('tauriBridge.ts — exports', () => {
    it('exports isTauri', () => { expect(src).toContain('export const isTauri'); });
    it('exports interface EngineStatus', () => { expect(src).toContain('export interface EngineStatus'); });
    it('exports ping', () => { expect(src).toContain('export async function ping'); });
    it('exports getEngineStatus', () => { expect(src).toContain('export async function getEngineStatus'); });
    it('exports addRect', () => { expect(src).toContain('export async function addRect'); });
});

describe('tauriBridge.ts — dependencies', () => {
    it('imports from core', () => { expect(src).toContain("core"); });
});

