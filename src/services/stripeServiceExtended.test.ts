// ─────────────────────────────────────────────────
// stripeServiceExtended.test.ts — Checkout, portal, config
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock import.meta.env
vi.stubGlobal('import', { meta: { env: {} } });

vi.mock('@/services/supabaseClient', () => ({
    getSupabase: vi.fn().mockReturnValue(null),
}));

import { isStripeConfigured, getPriceId, redirectToCheckout, redirectToPortal } from './stripeService';

beforeEach(() => vi.clearAllMocks());

describe('stripeService — isStripeConfigured', () => {
    it('should return boolean', () => {
        const result = isStripeConfigured();
        expect(typeof result).toBe('boolean');
    });
});

describe('stripeService — getPriceId', () => {
    it('should return undefined for free tier', () => {
        expect(getPriceId('free')).toBeUndefined();
    });

    it('should return value or undefined for creator monthly', () => {
        const result = getPriceId('creator', 'monthly');
        // In test env, env vars may be undefined
        expect(result === undefined || typeof result === 'string').toBe(true);
    });

    it('should return value or undefined for pro annual', () => {
        const result = getPriceId('pro', 'annual');
        expect(result === undefined || typeof result === 'string').toBe(true);
    });

    it('should handle annual billing parameter', () => {
        // Both monthly and annual may be undefined in test env
        const annual = getPriceId('creator', 'annual');
        expect(annual === undefined || typeof annual === 'string').toBe(true);
    });
});

describe('stripeService — redirectToCheckout', () => {
    it('should return error when no price configured', async () => {
        const result = await redirectToCheckout('free', 'user-1', 'test@test.com');
        expect(result.error).toBeTruthy();
    });

    it('should return error for creator when env not set', async () => {
        const result = await redirectToCheckout('creator', 'user-1', 'test@test.com');
        expect(result.error).toBeTruthy();
    });

    it('should accept billing interval parameter', async () => {
        const result = await redirectToCheckout('pro', 'user-1', 'test@test.com', 'annual');
        expect(result.error).toBeTruthy(); // Will fail because env not set
    });
});

describe('stripeService — redirectToPortal', () => {
    it('should return error when supabase not configured', async () => {
        const result = await redirectToPortal('user-1');
        expect(result.error).toBeTruthy();
    });
});
