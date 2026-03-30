// @ts-nocheck — Deno runtime (Supabase Edge Function), not Node.js
// ─────────────────────────────────────────────────
// Supabase Edge Function: stripe-webhook
// ─────────────────────────────────────────────────
// Handles Stripe webhook events to sync subscription
// status with our database.
// Deploy: supabase functions deploy stripe-webhook
// Set secret: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Map Stripe price IDs → plan tiers
const PRICE_TO_PLAN: Record<string, string> = {
    [Deno.env.get('STRIPE_PRICE_PRO_MONTHLY') ?? '']: 'pro',
    [Deno.env.get('STRIPE_PRICE_ENTERPRISE_MONTHLY') ?? '']: 'enterprise',
};

serve(async (req) => {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
        return new Response('Missing signature', { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
        console.error('Webhook verification failed:', err);
        return new Response('Invalid signature', { status: 400 });
    }

    console.log(`[webhook] ${event.type}`);

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.supabase_user_id;
            if (!userId || !session.subscription) break;

            const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string,
            );
            const priceId = subscription.items.data[0]?.price.id ?? '';
            const plan = PRICE_TO_PLAN[priceId] ?? 'pro';

            // Upsert subscription in our DB
            await supabase.from('subscriptions').upsert({
                user_id: userId,
                plan: plan,
                status: 'active',
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

            console.log(`[webhook] Updated user ${userId} to ${plan}`);
            break;
        }

        case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            const userId = subscription.metadata?.supabase_user_id;
            if (!userId) break;

            const priceId = subscription.items.data[0]?.price.id ?? '';
            const plan = PRICE_TO_PLAN[priceId] ?? 'pro';
            const status = subscription.status === 'active' ? 'active'
                : subscription.status === 'past_due' ? 'past_due'
                : subscription.status === 'canceled' ? 'canceled'
                : 'inactive';

            await supabase.from('subscriptions').update({
                plan: plan,
                status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
            }).eq('user_id', userId);

            console.log(`[webhook] Subscription updated for ${userId}: ${plan} (${status})`);
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            const userId = subscription.metadata?.supabase_user_id;
            if (!userId) break;

            // Downgrade to starter (free)
            await supabase.from('subscriptions').update({
                plan: 'starter',
                status: 'canceled',
                updated_at: new Date().toISOString(),
            }).eq('user_id', userId);

            console.log(`[webhook] Subscription canceled for ${userId}, downgraded to starter`);
            break;
        }

        default:
            console.log(`[webhook] Unhandled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
});
