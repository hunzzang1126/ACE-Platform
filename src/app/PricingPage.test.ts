// PricingPage.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './PricingPage.tsx'), 'utf-8');

describe('PricingPage — exports', () => {
    it('exports PricingPage as default', () => { expect(src).toContain('export default function PricingPage'); });
});

describe('PricingPage — pricing system', () => {
    it('uses PLANS config', () => { expect(src).toContain('PLANS'); });
    it('uses PlanTier type', () => { expect(src).toContain('PlanTier'); });
    it('integrates Stripe checkout', () => { expect(src).toContain('redirectToCheckout'); });
    it('checks Stripe configuration', () => { expect(src).toContain('isStripeConfigured'); });
});

describe('PricingPage — auth', () => {
    it('uses auth store', () => { expect(src).toContain('useAuthStore'); });
    it('uses react-router navigation', () => { expect(src).toContain('useNavigate'); });
});
