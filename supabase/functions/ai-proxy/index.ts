// ─────────────────────────────────────────────────
// ai-proxy — Supabase Edge Function
// ─────────────────────────────────────────────────
// Proxies AI API calls to OpenRouter so the API key
// never touches the client bundle.
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
        // ── Auth check ──
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing auth token' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Verify JWT via Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                detail: authError?.message ?? 'No user returned',
                tokenPrefix: authHeader.substring(0, 20) + '...',
                hasSupabaseUrl: !!supabaseUrl,
                hasAnonKey: !!supabaseKey,
            }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Rate limit check (simple per-user) ──
        // Future: check user's plan token budget from DB
        // For now: just verify they're authenticated

        // ── Proxy to OpenRouter ──
        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterKey) {
            return new Response(JSON.stringify({ error: 'AI service not configured' }), {
                status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const body = await req.json();

        // Security: strip any attempt to override model to expensive ones
        // (future: check plan limits to restrict model access)

        const openRouterRes = await fetch(OPENROUTER_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterKey}`,
                'HTTP-Referer': 'https://ace.design',
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
