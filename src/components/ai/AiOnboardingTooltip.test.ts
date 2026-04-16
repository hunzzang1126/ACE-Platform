// AiOnboardingTooltip.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './AiOnboardingTooltip.tsx'), 'utf-8');

describe('AiOnboardingTooltip.tsx — exports', () => {
    it('exports AiOnboardingTooltip', () => { expect(src).toContain('export function AiOnboardingTooltip'); });
});

describe('AiOnboardingTooltip.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from i18n', () => { expect(src).toContain("i18n"); });
    it('imports from authStore', () => { expect(src).toContain("authStore"); });
});

describe('AiOnboardingTooltip.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useEffect', () => { expect(src).toContain('useEffect'); });
});
