// assetProcessor.ts.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './assetProcessor.ts'), 'utf-8');

describe('assetProcessor.ts — exports', () => {
    it('exports type ProcessedAsset', () => { expect(src).toContain('export type ProcessedAsset'); });
    it('exports processUploadedAsset', () => { expect(src).toContain('export async function processUploadedAsset'); });
});

describe('assetProcessor.ts — dependencies', () => {
    it('imports from brandKitStore', () => { expect(src).toContain("brandKitStore"); });
});

