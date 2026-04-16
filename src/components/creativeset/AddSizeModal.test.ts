// AddSizeModal.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './AddSizeModal.tsx'), 'utf-8');

describe('AddSizeModal — exports', () => {
    it('exports AddSizeModal component', () => { expect(src).toContain('export function AddSizeModal'); });
});

describe('AddSizeModal — preset system', () => {
    it('uses BANNER_PRESETS', () => { expect(src).toContain('BANNER_PRESETS'); });
    it('uses BannerPreset type', () => { expect(src).toContain('BannerPreset'); });
    it('filters existing presets', () => { expect(src).toContain('existingPresetIds'); });
});

describe('AddSizeModal — interactions', () => {
    it('has add handler', () => { expect(src).toContain('onAdd'); });
    it('has close handler', () => { expect(src).toContain('onClose'); });
    it('uses useState for selections', () => { expect(src).toContain('useState'); });
    it('uses useMemo for filtering', () => { expect(src).toContain('useMemo'); });
});
