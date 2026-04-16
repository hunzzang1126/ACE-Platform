// BrandCloudSection.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './BrandCloudSection.tsx'), 'utf-8');

describe('BrandCloudSection — exports', () => {
    it('exports BrandCloudSection component', () => { expect(src).toContain('export function BrandCloudSection'); });
});

describe('BrandCloudSection — brand kit integration', () => {
    it('uses brand kit store', () => { expect(src).toContain('useBrandKitStore'); });
    it('supports asset categories', () => { expect(src).toContain('AssetCategory'); });
});

describe('BrandCloudSection — state', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
});
