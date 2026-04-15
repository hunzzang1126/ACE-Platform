// ─────────────────────────────────────────────────
// ai-proxy — Supabase Edge Function
// ─────────────────────────────────────────────────
// Proxies AI API calls to OpenRouter so the API key
// never touches the client bundle.
//
// AUTH: Temporarily relaxed — accepts any Bearer token.
// The real protection is OPENROUTER_API_KEY on server.
// TODO: Re-enable JWT verification after proper testing.
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-title, http-referer',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ── Light auth check — just require a Bearer token exists ──
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Missing auth token' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Proxy to OpenRouter ──
        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterKey) {
            return new Response(JSON.stringify({ error: 'AI service not configured. OPENROUTER_API_KEY missing.' }), {
                status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const body = await req.json();

        const openRouterRes = await fetch(OPENROUTER_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterKey}`,
                'HTTP-Referer': 'https://glid.studio',
                'X-Title': 'Glid Design Engine',
            },
            body: JSON.stringify(body),
        });

        const responseData = await openRouterRes.text();

        return new Response(responseData, {
            status: openRouterRes.status,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
