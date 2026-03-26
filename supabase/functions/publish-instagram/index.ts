// @ts-nocheck — Deno runtime (Supabase Edge Function)
// ─────────────────────────────────────────────────
// Edge Function: publish-instagram
// ─────────────────────────────────────────────────
// Publishes image to Instagram via Container API.
// Deploy: supabase functions deploy publish-instagram
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
            .eq('platform', 'instagram')
            .single();

        if (accErr || !account) {
            return new Response(
                JSON.stringify({ error: 'Instagram account not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const igUserId = account.platform_user_id;
        const token = account.access_token;

        // Build caption with hashtags
        let fullCaption = caption || '';
        if (hashtags && hashtags.length > 0) {
            fullCaption += '\n\n' + hashtags.join(' ');
        }

        // 1. Create media container
        const containerRes = await fetch(
            `${META_GRAPH}/${igUserId}/media`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_url: imageUrl,
                    caption: fullCaption,
                    access_token: token,
                }),
            },
        );

        if (!containerRes.ok) {
            const errBody = await containerRes.text();
            console.error('[Instagram] Container creation failed:', errBody);
            return new Response(
                JSON.stringify({ error: 'Container creation failed', details: errBody }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const container = await containerRes.json();
        const containerId = container.id;

        // 2. Wait for container to be ready (poll status)
        let ready = false;
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(
                `${META_GRAPH}/${containerId}?fields=status_code&access_token=${token}`,
            );
            if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.status_code === 'FINISHED') {
                    ready = true;
                    break;
                }
                if (statusData.status_code === 'ERROR') {
                    return new Response(
                        JSON.stringify({ error: 'Container processing failed' }),
                        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                    );
                }
            }
        }

        if (!ready) {
            return new Response(
                JSON.stringify({ error: 'Container processing timeout' }),
                { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // 3. Publish the container
        const publishRes = await fetch(
            `${META_GRAPH}/${igUserId}/media_publish`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creation_id: containerId,
                    access_token: token,
                }),
            },
        );

        if (!publishRes.ok) {
            const errBody = await publishRes.text();
            console.error('[Instagram] Publish failed:', errBody);
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
                platform_post_id: published.id,
                published_at: new Date().toISOString(),
            })
            .eq('id', publishId);

        return new Response(
            JSON.stringify({ post_id: published.id, status: 'published' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err) {
        console.error('[Instagram] Error:', err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
