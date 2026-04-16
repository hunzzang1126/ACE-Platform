// loader.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './loader.ts'), 'utf-8');

describe('loader — exports', () => {
    it('exports loadAceEngine', () => { expect(src).toContain('export async function loadAceEngine'); });
    it('exports clearEngineCache', () => { expect(src).toContain('export function clearEngineCache'); });
});

