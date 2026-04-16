// AnimDropdown.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './AnimDropdown.tsx'), 'utf-8');

describe('AnimDropdown — exports', () => {
    it('exports AnimDropdown', () => { expect(src).toContain('export function AnimDropdown'); });
});

describe('AnimDropdown — dependencies', () => {
    it('imports useAnimationPresets', () => { expect(src).toContain("useAnimationPresets"); });
    it('imports bottomPanelHelpers', () => { expect(src).toContain("bottomPanelHelpers"); });
});

