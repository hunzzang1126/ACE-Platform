// fabricHeadlessRenderer.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './fabricHeadlessRenderer.ts'), 'utf-8');

describe('fabricHeadlessRenderer.ts — exports', () => {
    it('exports renderVariantWithFabric', () => { expect(src).toContain('export async function renderVariantWithFabric'); });
});

describe('fabricHeadlessRenderer.ts — dependencies', () => {
    it('imports from elementConverters', () => { expect(src).toContain("elementConverters"); });
    it('imports from shimTextEffects', () => { expect(src).toContain("shimTextEffects"); });
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
    it('imports from elements.types', () => { expect(src).toContain("elements.types"); });
});

