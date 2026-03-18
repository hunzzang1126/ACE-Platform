// ─────────────────────────────────────────────────
// Stripe Service — Checkout + Portal integration
// ─────────────────────────────────────────────────
// Uses Stripe.js (client-side) with publishable key.
// For checkout session creation, calls Supabase Edge Function.
// MVP: uses Stripe Payment Links / redirect.
// ─────────────────────────────────────────────────

import type { PlanTier } from '@/schema/planTypes';

// Price ID mapping from environment
const PRICE_IDS: Partial<Record<PlanTier, string>> = {
    pro: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY as string,
    enterprise: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY as string,
};

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

let stripePromise: Promise<any> | null = null;

/**
 * Load Stripe.js lazily (only when needed).
 */
async function getStripe() {
    if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY === 'pk_test_REPLACE_ME') {
        console.warn('[stripe] Publishable key not configured');
        return null;
    }

    if (!stripePromise) {
        // Dynamic import to avoid loading Stripe.js on every page
        const { loadStripe } = await import('@stripe/stripe-js');
        stripePromise = loadStripe(PUBLISHABLE_KEY);
    }
    return stripePromise;
}

/**
 * Check if Stripe is configured.
 */
export function isStripeConfigured(): boolean {
    return !!PUBLISHABLE_KEY && PUBLISHABLE_KEY !== 'pk_test_REPLACE_ME';
}

/**
 * Get the Stripe Price ID for a given plan tier.
 */
export function getPriceId(tier: PlanTier): string | undefined {
    return PRICE_IDS[tier];
}

/**
 * Redirect to Stripe Checkout for the given plan.
 * MVP approach: creates a checkout session via Supabase Edge Function.
 * Fallback: direct Stripe Checkout link.
 */
export async function redirectToCheckout(
    tier: PlanTier,
    userId: string,
    email: string,
    quantity = 1,
): Promise<{ error: string | null }> {
    const priceId = PRICE_IDS[tier];
    if (!priceId) {
        return { error: `No price configured for ${tier} plan` };
    }

    if (!PUBLISHABLE_KEY) {
        return { error: 'Stripe is not configured. Please set your publishable key.' };
    }

    try {
        // ★ Create checkout session via Supabase Edge Function
        const { getSupabase } = await import('@/services/supabaseClient');
        const sb = getSupabase();

        if (sb) {
            const { data, error } = await sb.functions.invoke('create-checkout-session', {
                body: {
                    priceId,
                    userId,
                    email,
                    quantity,
                    successUrl: `${window.location.origin}/dashboard?checkout=success`,
                    cancelUrl: `${window.location.origin}/pricing?checkout=canceled`,
                },
            });

            if (error) {
                console.error('[stripe] Edge function error:', error);
                return { error: 'Failed to create checkout session. Please try again.' };
            }

            // Redirect to Stripe Checkout page via URL
            if (data?.url) {
                window.location.href = data.url;
                return { error: null };
            }

            return { error: 'No checkout URL received. Please try again.' };
        }

        return { error: 'Could not connect to payment service. Please try again.' };
    } catch (err) {
        console.error('[stripe] Checkout error:', err);
        return { error: 'Payment service error. Please try again later.' };
    }
}

/**
 * Redirect to Stripe Customer Portal for managing subscription.
 */
export async function redirectToPortal(
    userId: string,
): Promise<{ error: string | null }> {
    try {
        const { getSupabase } = await import('@/services/supabaseClient');
        const sb = getSupabase();
        if (!sb) return { error: 'Cloud not configured' };

        const { data, error } = await sb.functions.invoke('create-portal-session', {
            body: {
                userId,
                returnUrl: `${window.location.origin}/pricing`,
            },
        });

        if (error) return { error: 'Failed to open billing portal' };
        if (data?.url) {
            window.location.href = data.url;
            return { error: null };
        }
        return { error: 'No portal URL received' };
    } catch {
        return { error: 'Billing portal error' };
    }
}
