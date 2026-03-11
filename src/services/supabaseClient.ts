// ─────────────────────────────────────────────────
// supabaseClient — Singleton Supabase Client
// ─────────────────────────────────────────────────
// Single client instance for all cloud operations.
// Returns null if env vars are not configured.
// ─────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client.
 * Returns null if VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing.
 */
export function getSupabase(): SupabaseClient | null {
    if (_client) return _client;

    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    if (!url || !key) {
        console.warn('[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled');
        return null;
    }

    _client = createClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    });

    return _client;
}

/**
 * Check if Supabase is configured and available.
 */
export function isCloudEnabled(): boolean {
    return getSupabase() !== null;
}
