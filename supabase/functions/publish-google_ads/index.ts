// @ts-nocheck — Deno runtime (Supabase Edge Function)
// ─────────────────────────────────────────────────
// Edge Function: publish-google_ads
// ─────────────────────────────────────────────────
// Uploads image asset to Google Ads via API and creates
// a Responsive Display Ad asset. Called from publishService.
// Deploy: supabase functions deploy publish-google_ads
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v16';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { publishId, socialAccountId, imageUrl, headlines } = await req.json();

        if (!publishId || !socialAccountId || !imageUrl) {
            return new Response(
                JSON.stringify({ error: 'publishId, socialAccountId, and imageUrl required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Get auth token from request
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Init Supabase admin client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        // Get the user's Google Ads OAuth token from DB
        const { data: account, error: accErr } = await supabase
            .from('user_social_accounts')
            .select('access_token, refresh_token, account_name, platform_user_id')
            .eq('id', socialAccountId)
            .eq('platform', 'google_ads')
            .single();

        if (accErr || !account) {
            return new Response(
                JSON.stringify({ error: 'Google Ads account not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Refresh token if needed
        let accessToken = account.access_token;
        const clientId = Deno.env.get('VITE_GOOGLE_ADS_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');
        const devToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');

        if (account.refresh_token) {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId!,
                    client_secret: clientSecret!,
                    refresh_token: account.refresh_token,
                    grant_type: 'refresh_token',
                }),
            });

            if (tokenRes.ok) {
                const tokenData = await tokenRes.json();
                accessToken = tokenData.access_token;

                // Update stored token
                await supabase
                    .from('user_social_accounts')
                    .update({ access_token: accessToken })
                    .eq('id', socialAccountId);
            }
        }

        // Download the image from Supabase Storage
        const imageRes = await fetch(imageUrl);
        const imageBlob = await imageRes.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

        // Get Google Ads customer ID (from platform_user_id)
        const customerId = account.platform_user_id?.replace(/-/g, '');
        if (!customerId) {
            return new Response(
                JSON.stringify({ error: 'No Google Ads customer ID found' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // 1. Upload image asset to Google Ads
        const assetResponse = await fetch(
            `${GOOGLE_ADS_API}/customers/${customerId}/assets:mutate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'developer-token': devToken!,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operations: [{
                        create: {
                            name: `GLID_Creative_${publishId}_${Date.now()}`,
                            type: 'IMAGE',
                            imageAsset: {
                                data: imageBase64,
                            },
                        },
                    }],
                }),
            },
        );

        if (!assetResponse.ok) {
            const errBody = await assetResponse.text();
            console.error('[GoogleAds] Asset upload failed:', errBody);
            return new Response(
                JSON.stringify({ error: 'Asset upload failed', details: errBody }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const assetResult = await assetResponse.json();
        const assetResourceName = assetResult?.results?.[0]?.resourceName || '';

        // 2. Optionally upload headline text assets
        const headlineAssetNames: string[] = [];
        if (headlines && headlines.length > 0) {
            for (const headline of headlines.slice(0, 5)) {
                const headlineRes = await fetch(
                    `${GOOGLE_ADS_API}/customers/${customerId}/assets:mutate`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'developer-token': devToken!,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            operations: [{
                                create: {
                                    name: `GLID_Headline_${Date.now()}`,
                                    type: 'TEXT',
                                    textAsset: { text: headline },
                                },
                            }],
                        }),
                    },
                );

                if (headlineRes.ok) {
                    const headResult = await headlineRes.json();
                    headlineAssetNames.push(headResult?.results?.[0]?.resourceName || '');
                }
            }
        }

        // Update publish record
        await supabase
            .from('publish_history')
            .update({
                status: 'published',
                platform_post_id: assetResourceName,
                published_at: new Date().toISOString(),
            })
            .eq('id', publishId);

        return new Response(
            JSON.stringify({
                post_id: assetResourceName,
                headlines: headlineAssetNames,
                status: 'published',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[GoogleAds] Error:', err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
