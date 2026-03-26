// @ts-nocheck — Deno runtime (Supabase Edge Function)
// ─────────────────────────────────────────────────
// Edge Function: google-ads-oauth
// ─────────────────────────────────────────────────
// Exchanges Google OAuth authorization code for tokens
// and stores in user_social_accounts table.
// Deploy: supabase functions deploy google-ads-oauth --no-verify-jwt
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
        const body = await req.json();
        const { code, userId, redirectUri } = body;
        console.log('[google-ads-oauth] Received:', { code: code?.substring(0, 10) + '...', userId, redirectUri });

        if (!code || !userId) {
            return new Response(
                JSON.stringify({ error: 'code and userId required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const clientId = Deno.env.get('VITE_GOOGLE_ADS_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');

        console.log('[google-ads-oauth] Client ID present:', !!clientId);
        console.log('[google-ads-oauth] Client Secret present:', !!clientSecret);

        if (!clientId || !clientSecret) {
            return new Response(
                JSON.stringify({ error: 'Google OAuth credentials not configured on server' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Exchange auth code for tokens
        const tokenBody = new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri || 'https://glid.studio/auth/callback/google-ads',
            grant_type: 'authorization_code',
        });

        console.log('[google-ads-oauth] Token exchange redirect_uri:', redirectUri);

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenBody,
        });

        const tokenText = await tokenRes.text();
        console.log('[google-ads-oauth] Token response status:', tokenRes.status);
        console.log('[google-ads-oauth] Token response:', tokenText);

        if (!tokenRes.ok) {
            return new Response(
                JSON.stringify({ error: 'Token exchange failed', details: tokenText }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const tokens = JSON.parse(tokenText);

        // Get Google user info
        let accountName = 'Google Ads Account';
        let platformUserId = '';

        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` },
        });

        if (userInfoRes.ok) {
            const userInfo = await userInfoRes.json();
            accountName = userInfo.email || userInfo.name || accountName;
            platformUserId = userInfo.id || '';
            console.log('[google-ads-oauth] User info:', { email: userInfo.email, id: userInfo.id });
        }

        // Try to get Google Ads customer ID
        const devToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
        if (devToken) {
            try {
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
                    console.log('[google-ads-oauth] Accessible customers:', resourceNames);
                    if (resourceNames.length > 0) {
                        platformUserId = resourceNames[0].replace('customers/', '');
                    }
                } else {
                    console.log('[google-ads-oauth] Customer list failed:', customerRes.status);
                }
            } catch (e) {
                console.log('[google-ads-oauth] Customer list error:', e);
            }
        }

        // Store in Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        console.log('[google-ads-oauth] Supabase URL present:', !!supabaseUrl);
        console.log('[google-ads-oauth] Service key present:', !!serviceKey);

        const supabase = createClient(supabaseUrl!, serviceKey!);

        const { data: account, error: upsertErr } = await supabase
            .from('user_social_accounts')
            .upsert({
                user_id: userId,
                platform: 'google_ads',
                platform_user_id: platformUserId || 'pending',
                account_name: accountName,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || null,
                token_expires_at: tokens.expires_in
                    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
                    : null,
            }, {
                onConflict: 'user_id,platform,platform_user_id',
            })
            .select()
            .single();

        if (upsertErr) {
            console.error('[google-ads-oauth] DB upsert error:', upsertErr);
            return new Response(
                JSON.stringify({ error: 'Failed to save account', details: upsertErr.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        console.log('[google-ads-oauth] Success! Account ID:', account.id);

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
        console.error('[google-ads-oauth] Unhandled error:', err);
        return new Response(
            JSON.stringify({ error: (err as Error).message, stack: (err as Error).stack }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
