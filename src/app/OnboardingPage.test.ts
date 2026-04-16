// ─────────────────────────────────────────────────
// OnboardingPage.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './OnboardingPage.tsx'), 'utf-8');

describe('OnboardingPage — exports', () => {
    it('exports OnboardingPage component', () => {
        expect(src).toContain('export function OnboardingPage');
    });
});

describe('OnboardingPage — auth integration', () => {
    it('uses auth store', () => {
        expect(src).toContain('useAuthStore');
    });

    it('uses react-router for navigation', () => {
        expect(src).toContain('useNavigate');
    });
});

describe('OnboardingPage — user onboarding flow', () => {
    it('collects user preferences or settings', () => {
        const hasForm = src.includes('useState') && (src.includes('language') || src.includes('industry') || src.includes('step'));
        expect(hasForm).toBe(true);
    });

    it('has multi-step or progression logic', () => {
        const hasSteps = src.includes('step') || src.includes('Step') || src.includes('phase');
        expect(hasSteps).toBe(true);
    });
});
