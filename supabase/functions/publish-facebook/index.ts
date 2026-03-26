// @ts-nocheck — Deno runtime (Supabase Edge Function)
// ─────────────────────────────────────────────────
// Edge Function: publish-facebook
// ─────────────────────────────────────────────────
// Publishes image as a Page post on Facebook.
// Deploy: supabase functions deploy publish-facebook
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
        const { publishId, socialAccountId, imageUrl, caption, hashtags } = await req.json();

        if (!publishId || !socialAccountId || !imageUrl) {
            return new Response(
                JSON.stringify({ error: 'publishId, socialAccountId, and imageUrl required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Get account from DB
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const { data: account, error: accErr } = await supabase
            .from('user_social_accounts')
            .select('access_token, platform_user_id')
            .eq('id', socialAccountId)
            .eq('platform', 'facebook')
            .single();

        if (accErr || !account) {
            return new Response(
                JSON.stringify({ error: 'Facebook account not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const token = account.access_token;

        // Get user's pages (posts go to Pages, not personal profiles)
        const pagesRes = await fetch(
            `${META_GRAPH}/me/accounts?fields=id,name,access_token&access_token=${token}`,
        );

        if (!pagesRes.ok) {
            return new Response(
                JSON.stringify({ error: 'Failed to fetch Facebook pages' }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const pagesData = await pagesRes.json();
        const pages = pagesData.data || [];

        if (pages.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No Facebook Pages found. Create a Page first.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Use first page (or could be specified in params)
        const page = pages[0];
        const pageToken = page.access_token;
        const pageId = page.id;

        // Build message
        let message = caption || '';
        if (hashtags && hashtags.length > 0) {
            message += '\n\n' + hashtags.join(' ');
        }

        // Publish photo to Page
        const publishRes = await fetch(
            `${META_GRAPH}/${pageId}/photos`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: imageUrl,
                    message,
                    access_token: pageToken,
                }),
            },
        );

        if (!publishRes.ok) {
            const errBody = await publishRes.text();
            console.error('[Facebook] Publish failed:', errBody);
            return new Response(
                JSON.stringify({ error: 'Publish failed', details: errBody }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const published = await publishRes.json();

        // Update DB
        await supabase
            .from('publish_history')
            .update({
                status: 'published',
                platform_post_id: published.id || published.post_id,
                published_at: new Date().toISOString(),
            })
            .eq('id', publishId);

        return new Response(
            JSON.stringify({ post_id: published.id || published.post_id, status: 'published' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[Facebook] Error:', err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
