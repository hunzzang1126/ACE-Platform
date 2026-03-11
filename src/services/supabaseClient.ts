// ─────────────────────────────────────────────────
// supabaseClient — Singleton Supabase Client
// ─────────────────────────────────────────────────
// Central Supabase client for auth, database, and storage.
// Provides typed helpers for OAuth and session management.
// ─────────────────────────────────────────────────

import { createClient, type SupabaseClient, type Provider } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client.
 * Returns null if env vars are missing.
 */
export function getSupabase(): SupabaseClient | null {
    if (_client) return _client;

    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    if (!url || !key) {
        console.warn('[supabaseClient] Missing env vars — cloud features disabled');
        return null;
    }

    _client = createClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true, // handles OAuth callback
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

// ── OAuth Helpers ───────────────────────────────

export async function signInWithOAuth(provider: Provider): Promise<{ error: string | null }> {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase not configured' };

    const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    });

    return { error: error?.message ?? null };
}

export async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase not configured' };

    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
}

export async function signUpWithEmail(email: string, password: string, name: string): Promise<{ error: string | null }> {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase not configured' };

    const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { display_name: name, full_name: name } },
    });
    return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
}

// ── Role Fetching ───────────────────────────────

export type UserRole = 'admin' | 'user' | 'pending' | 'rejected';

export async function fetchUserRole(userId: string): Promise<UserRole> {
    const sb = getSupabase();
    if (!sb) return 'pending';

    const { data, error } = await sb
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

    if (error || !data) return 'pending';
    return data.role as UserRole;
}

// ── Admin: User Management ──────────────────────

export interface UserRecord {
    user_id: string;
    role: UserRole;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
    created_at: string;
}

export async function fetchAllUsers(): Promise<UserRecord[]> {
    const sb = getSupabase();
    if (!sb) return [];

    const { data, error } = await sb
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as UserRecord[];
}

export async function updateUserRole(
    userId: string,
    role: UserRole,
    approvedBy: string,
): Promise<{ error: string | null }> {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase not configured' };

    const { error } = await sb
        .from('user_roles')
        .update({
            role,
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    return { error: error?.message ?? null };
}
