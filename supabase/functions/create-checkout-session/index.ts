// @ts-nocheck — Deno runtime (Supabase Edge Function), not Node.js
// ─────────────────────────────────────────────────
// Supabase Edge Function: create-checkout-session
// ─────────────────────────────────────────────────
// Called from frontend stripeService.ts to create a
// Stripe Checkout session securely (secret key on server).
// Deploy: supabase functions deploy create-checkout-session
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { priceId, userId, email, quantity, successUrl, cancelUrl } = await req.json();

        if (!priceId || !userId) {
            return new Response(
                JSON.stringify({ error: 'priceId and userId are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Create or retrieve Stripe customer
        const customers = await stripe.customers.list({ email, limit: 1 });
        let customer: Stripe.Customer;
        if (customers.data.length > 0) {
            customer = customers.data[0];
        } else {
            customer = await stripe.customers.create({
                email,
                metadata: { supabase_user_id: userId },
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            mode: 'subscription',
            line_items: [{
                price: priceId,
                quantity: quantity ?? 1,
            }],
            success_url: successUrl ?? 'https://app.glid.ai/dashboard?checkout=success',
            cancel_url: cancelUrl ?? 'https://app.glid.ai/pricing?checkout=canceled',
            subscription_data: {
                metadata: { supabase_user_id: userId },
            },
            metadata: { supabase_user_id: userId },
        });

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('Checkout error:', err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
