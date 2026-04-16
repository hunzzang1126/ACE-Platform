// autoDesignPrompts.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './autoDesignPrompts.ts'), 'utf-8');

describe('autoDesignPrompts.ts — exports', () => {
    it('exports buildFromScratchPrompt', () => { expect(src).toContain('export function buildFromScratchPrompt'); });
    it('exports buildAssetContextPrompt', () => { expect(src).toContain('export function buildAssetContextPrompt'); });
});

describe('autoDesignPrompts.ts — dependencies', () => {
    it('imports from smartSizing', () => { expect(src).toContain("smartSizing"); });
    it('imports from designStyleGuides', () => { expect(src).toContain("designStyleGuides"); });
    it('imports from goldenExamples', () => { expect(src).toContain("goldenExamples"); });
    it('imports from autoDesignTypes', () => { expect(src).toContain("autoDesignTypes"); });
});

