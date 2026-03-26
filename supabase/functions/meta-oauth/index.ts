// @ts-nocheck — Deno runtime (Supabase Edge Function)
// ─────────────────────────────────────────────────
// Edge Function: meta-oauth
// ─────────────────────────────────────────────────
// Exchanges Meta (FB/IG) OAuth authorization code for
// long-lived token and stores in user_social_accounts.
// Deploy: supabase functions deploy meta-oauth
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_GRAPH = 'https://graph.facebook.com/v19.0';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { code, userId, redirectUri, platform } = await req.json();

        if (!code || !userId || !platform) {
            return new Response(
                JSON.stringify({ error: 'code, userId, and platform required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const appId = Deno.env.get('VITE_META_APP_ID');
        const appSecret = Deno.env.get('META_APP_SECRET');

        if (!appId || !appSecret) {
            return new Response(
                JSON.stringify({ error: 'Meta App credentials not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // 1. Exchange code for short-lived token
        const tokenUrl = `${META_GRAPH}/oauth/access_token?` +
            `client_id=${appId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri || 'https://glid.studio/auth/callback/meta')}` +
            `&client_secret=${appSecret}` +
            `&code=${code}`;

        const tokenRes = await fetch(tokenUrl);
        if (!tokenRes.ok) {
            const errBody = await tokenRes.text();
            console.error('[MetaOAuth] Token exchange failed:', errBody);
            return new Response(
                JSON.stringify({ error: 'Token exchange failed' }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }
        const shortToken = await tokenRes.json();

        // 2. Exchange for long-lived token (60-day)
        const longUrl = `${META_GRAPH}/oauth/access_token?` +
            `grant_type=fb_exchange_token` +
            `&client_id=${appId}` +
            `&client_secret=${appSecret}` +
            `&fb_exchange_token=${shortToken.access_token}`;

        const longRes = await fetch(longUrl);
        const longToken = longRes.ok ? await longRes.json() : shortToken;
        const accessToken = longToken.access_token || shortToken.access_token;

        // 3. Get user info
        const meRes = await fetch(`${META_GRAPH}/me?fields=id,name&access_token=${accessToken}`);
        const me = meRes.ok ? await meRes.json() : { id: '', name: 'Meta Account' };

        // 4. For Instagram: get IG Business Account ID
        let igAccountId = '';
        if (platform === 'instagram') {
            const pagesRes = await fetch(
                `${META_GRAPH}/me/accounts?fields=instagram_business_account&access_token=${accessToken}`,
            );
            if (pagesRes.ok) {
                const pagesData = await pagesRes.json();
                for (const page of (pagesData.data || [])) {
                    if (page.instagram_business_account) {
                        igAccountId = page.instagram_business_account.id;
                        break;
                    }
                }
            }
        }

        // 5. Store in DB
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const { data: account, error: upsertErr } = await supabase
            .from('user_social_accounts')
            .upsert({
                user_id: userId,
                platform,
                platform_user_id: platform === 'instagram' ? igAccountId : me.id,
                account_name: me.name || 'Meta Account',
                access_token: accessToken,
                refresh_token: null,
                token_expires_at: longToken.expires_in
                    ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
                    : null,
            }, {
                onConflict: 'user_id,platform',
            })
            .select()
            .single();

        if (upsertErr) {
            console.error('[MetaOAuth] Upsert error:', upsertErr);
            return new Response(
                JSON.stringify({ error: 'Failed to save account' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        return new Response(
            JSON.stringify({
                id: account.id,
                accountName: account.account_name,
                platform,
                platformUserId: account.platform_user_id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[MetaOAuth] Error:', err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
