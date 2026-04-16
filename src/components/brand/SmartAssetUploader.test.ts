// SmartAssetUploader.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SmartAssetUploader.tsx'), 'utf-8');

describe('SmartAssetUploader.tsx — exports', () => {
    it('exports SmartAssetUploader', () => { expect(src).toContain('export const SmartAssetUploader'); });
});

describe('SmartAssetUploader.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
});

describe('SmartAssetUploader.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
