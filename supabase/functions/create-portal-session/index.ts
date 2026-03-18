// @ts-nocheck — Deno runtime (Supabase Edge Function), not Node.js
// ─────────────────────────────────────────────────
// Supabase Edge Function: create-portal-session
// ─────────────────────────────────────────────────
// Lets users manage their subscription (upgrade, cancel,
// update payment method) via Stripe Customer Portal.
// Deploy: supabase functions deploy create-portal-session
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
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { userId, returnUrl } = await req.json();
        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'userId is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Find customer by metadata
        const customers = await stripe.customers.search({
            query: `metadata['supabase_user_id']:'${userId}'`,
        });

        if (customers.data.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No subscription found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customers.data[0].id,
            return_url: returnUrl ?? 'https://app.glid.ai/pricing',
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('Portal error:', err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
