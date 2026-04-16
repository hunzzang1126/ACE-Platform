// Pagination.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './Pagination.tsx'), 'utf-8');

describe('Pagination — exports', () => {
    it('exports Pagination', () => { expect(src).toContain('export function Pagination'); });
});

describe('Pagination — dependencies', () => {
    it('imports projectStore', () => { expect(src).toContain("projectStore"); });
});

