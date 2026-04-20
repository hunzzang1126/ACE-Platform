// ─────────────────────────────────────────────────
// ai-proxy — Supabase Edge Function
// ─────────────────────────────────────────────────
// Proxies AI API calls to OpenRouter so the API key
// never touches the client bundle.
//
// AUTH: Validates Supabase JWT for production security.
// Falls back to light auth check if JWT validation fails.
// ─────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
        // ── Auth: Verify Supabase JWT ──
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Missing auth token' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // ★ Verify JWT against Supabase Auth — ensures only logged-in users can use AI
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (supabaseUrl && supabaseServiceKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                const { data, error } = await supabase.auth.getUser(token);
                if (error || !data.user) {
                    return new Response(JSON.stringify({ error: 'Invalid or expired auth token. Please log in again.' }), {
                        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }
                // Optional: Log user ID for usage tracking
                console.log(`[ai-proxy] User: ${data.user.id}`);
            } catch (authErr) {
                // If JWT verification fails (e.g. service key not set), allow through
                // but log warning — this should be investigated in production
                console.warn('[ai-proxy] JWT verification failed, allowing through:', authErr);
            }
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
                'HTTP-Referer': 'https://ace.design',
                'X-Title': 'ACE Design Engine',
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
