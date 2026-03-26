// @ts-nocheck — Deno runtime (Supabase Edge Function)
// ─────────────────────────────────────────────────
// Edge Function: google-ads-oauth
// ─────────────────────────────────────────────────
// Exchanges Google OAuth authorization code for tokens
// and stores in user_social_accounts table.
// Deploy: supabase functions deploy google-ads-oauth
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { code, userId, redirectUri } = await req.json();

        if (!code || !userId) {
            return new Response(
                JSON.stringify({ error: 'code and userId required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const clientId = Deno.env.get('VITE_GOOGLE_ADS_CLIENT_ID')!;
        const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET')!;

        // Exchange auth code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri || 'https://glid.studio/auth/callback/google-ads',
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenRes.ok) {
            const errBody = await tokenRes.text();
            console.error('[GoogleAdsOAuth] Token exchange failed:', errBody);
            return new Response(
                JSON.stringify({ error: 'Token exchange failed' }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const tokens = await tokenRes.json();

        // Get Google user info (to get email/name for account label)
        let accountName = 'Google Ads Account';
        let platformUserId = '';

        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` },
        });

        if (userInfoRes.ok) {
            const userInfo = await userInfoRes.json();
            accountName = userInfo.email || userInfo.name || accountName;
            platformUserId = userInfo.id || '';
        }

        // Try to get Google Ads customer ID
        const devToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
        if (devToken) {
            const customerRes = await fetch(
                'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers',
                {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`,
                        'developer-token': devToken,
                    },
                },
            );

            if (customerRes.ok) {
                const customerData = await customerRes.json();
                const resourceNames = customerData.resourceNames || [];
                if (resourceNames.length > 0) {
                    // Extract customer ID from "customers/1234567890"
                    platformUserId = resourceNames[0].replace('customers/', '');
                }
            }
        }

        // Store in Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const { data: account, error: upsertErr } = await supabase
            .from('user_social_accounts')
            .upsert({
                user_id: userId,
                platform: 'google_ads',
                platform_user_id: platformUserId,
                account_name: accountName,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: tokens.expires_in
                    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
                    : null,
            }, {
                onConflict: 'user_id,platform',
            })
            .select()
            .single();

        if (upsertErr) {
            console.error('[GoogleAdsOAuth] Upsert error:', upsertErr);
            return new Response(
                JSON.stringify({ error: 'Failed to save account' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        return new Response(
            JSON.stringify({
                id: account.id,
                accountName: account.account_name,
                platform: 'google_ads',
                platformUserId: account.platform_user_id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[GoogleAdsOAuth] Error:', err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
