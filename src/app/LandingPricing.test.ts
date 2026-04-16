// LandingPricing.test.ts — Contract tests (auto-generated)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './LandingPricing.tsx'), 'utf-8');

describe('LandingPricing — exports', () => {
    it('exports LandingPricing', () => { expect(src).toContain('export function LandingPricing'); });
});

describe('LandingPricing — dependencies', () => {
    it('imports react-router-dom', () => { expect(src).toContain("react-router-dom"); });
    it('imports landingI18n', () => { expect(src).toContain("landingI18n"); });
});

