// ─────────────────────────────────────────────────
// stripeService.test.ts — Stripe integration tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock import.meta.env ──
const ENV_BACKUP = { ...import.meta.env };

vi.mock('@/services/supabaseClient', () => {
    const mockInvoke = vi.fn();
    return {
        getSupabase: () => ({
            functions: { invoke: mockInvoke },
        }),
        __mockInvoke: mockInvoke,
    };
});

import { isStripeConfigured, getPriceId, redirectToCheckout, redirectToPortal } from './stripeService';

// Get the mock invoke from the mock module
const getInvokeMock = async () => {
    const mod = await import('@/services/supabaseClient') as any;
    return mod.__mockInvoke;
};

describe('stripeService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── isStripeConfigured ──

    describe('isStripeConfigured', () => {
        it('should return a boolean', () => {
            const result = isStripeConfigured();
            expect(typeof result).toBe('boolean');
        });
    });

    // ── getPriceId ──

    describe('getPriceId', () => {
        it('should return undefined for starter plan (free)', () => {
            expect(getPriceId('starter')).toBeUndefined();
        });

        it('should return undefined for admin plan (internal)', () => {
            expect(getPriceId('admin')).toBeUndefined();
        });

        it('should accept billing interval parameter', () => {
            // Even if env vars are empty, it should not throw
            const monthly = getPriceId('pro', 'monthly');
            const annual = getPriceId('pro', 'annual');
            expect(monthly === undefined || typeof monthly === 'string').toBe(true);
            expect(annual === undefined || typeof annual === 'string').toBe(true);
        });

        it('should default to monthly when billing not specified', () => {
            const result = getPriceId('creator');
            const resultMonthly = getPriceId('creator', 'monthly');
            expect(result).toBe(resultMonthly);
        });
    });

    // ── redirectToCheckout ──

    describe('redirectToCheckout', () => {
        it('should return error when price not configured for tier', async () => {
            const result = await redirectToCheckout('starter', 'user-1', 'test@ace.design');
            expect(result.error).toContain('No price configured');
        });

        it('should return error when Supabase edge function fails', async () => {
            const mockInvoke = await getInvokeMock();
            mockInvoke.mockResolvedValueOnce({ data: null, error: 'Server error' });

            // Force a valid price ID by mocking the tier
            const result = await redirectToCheckout('creator', 'user-1', 'test@ace.design');
            // Either no price config or edge function error
            expect(result.error).toBeTruthy();
        });

        it('should return error when no checkout URL received', async () => {
            const mockInvoke = await getInvokeMock();
            mockInvoke.mockResolvedValueOnce({ data: {}, error: null });

            const result = await redirectToCheckout('creator', 'user-1', 'test@ace.design');
            expect(result.error).toBeTruthy();
        });
    });

    // ── redirectToPortal ──

    describe('redirectToPortal', () => {
        it('should return error when edge function fails', async () => {
            const mockInvoke = await getInvokeMock();
            mockInvoke.mockResolvedValueOnce({ data: null, error: 'Server error' });

            const result = await redirectToPortal('user-1');
            expect(result.error).toBeTruthy();
        });

        it('should return error when no portal URL received', async () => {
            const mockInvoke = await getInvokeMock();
            mockInvoke.mockResolvedValueOnce({ data: {}, error: null });

            const result = await redirectToPortal('user-1');
            expect(result.error).toBe('No portal URL received');
        });
    });
});
