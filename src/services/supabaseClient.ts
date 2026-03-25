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
    if (!sb) {
        console.warn('[fetchUserRole] Supabase not configured');
        return 'pending';
    }

    console.log('[fetchUserRole] Fetching role for userId:', userId);

    const { data, error } = await sb
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

    console.log('[fetchUserRole] Result:', { data, error: error?.message });

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

// ── Onboarding Status ───────────────────────────

export interface OnboardingStatus {
    hasCompletedOnboarding: boolean;
    preferredLanguage: string;
}

/**
 * Fetch onboarding status from Supabase.
 * Returns null if Supabase is unavailable or column doesn't exist yet.
 */
export async function fetchOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
    const sb = getSupabase();
    if (!sb) return null;

    try {
        const { data, error } = await sb
            .from('user_roles')
            .select('has_completed_onboarding, preferred_language')
            .eq('user_id', userId)
            .maybeSingle();

        if (error || !data) return null;
        return {
            hasCompletedOnboarding: data.has_completed_onboarding ?? false,
            preferredLanguage: data.preferred_language ?? 'English',
        };
    } catch {
        // Column may not exist yet (migration not run)
        return null;
    }
}

/**
 * Mark onboarding as completed in Supabase.
 * Fire-and-forget safe — failures fall back to localStorage.
 */
export async function markOnboardingComplete(
    userId: string,
    preferredLanguage: string,
): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    try {
        const { error, count } = await sb
            .from('user_roles')
            .update({
                has_completed_onboarding: true,
                preferred_language: preferredLanguage,
            })
            .eq('user_id', userId);

        if (error) {
            console.error('[markOnboardingComplete] Supabase update ERROR:', error.message, error.details, error.hint);
        } else {
            console.log('[markOnboardingComplete] Success for userId:', userId, 'rows affected:', count);
        }
    } catch (e) {
        console.error('[markOnboardingComplete] Supabase update EXCEPTION:', e);
    }
}

// ── Template Overrides (Global) ─────────────────

export interface TemplateOverrideRow {
    template_id: string;
    variant_snapshot: any; // JSONB
    width?: number;
    height?: number;
    updated_by: string | null;
    updated_at: string;
}

/**
 * Fetch ALL template overrides from Supabase.
 * Returns a map of templateId → { snapshot, width, height }.
 * Called on app load by ALL users so they see admin-edited templates.
 */
export async function fetchTemplateOverrides(): Promise<
    Record<string, { snapshot: string; width?: number; height?: number }>
> {
    const sb = getSupabase();
    if (!sb) return {};

    try {
        const { data, error } = await sb
            .from('template_overrides')
            .select('template_id, variant_snapshot, width, height');

        if (error || !data) {
            console.warn('[fetchTemplateOverrides] Error:', error?.message);
            return {};
        }

        const result: Record<string, { snapshot: string; width?: number; height?: number }> = {};
        for (const row of data) {
            result[row.template_id] = {
                snapshot: typeof row.variant_snapshot === 'string'
                    ? row.variant_snapshot
                    : JSON.stringify(row.variant_snapshot),
                width: row.width ?? undefined,
                height: row.height ?? undefined,
            };
        }
        console.log('[fetchTemplateOverrides] Loaded', Object.keys(result).length, 'global overrides');
        return result;
    } catch (e) {
        console.warn('[fetchTemplateOverrides] Failed:', e);
        return {};
    }
}

/**
 * Upsert a template override to Supabase (admin only).
 * Fire-and-forget safe — local save is the primary path.
 */
export async function upsertTemplateOverride(
    templateId: string,
    variantSnapshot: string,
    userId: string,
    width?: number,
    height?: number,
): Promise<{ error: string | null }> {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase not configured' };

    try {
        const { error } = await sb
            .from('template_overrides')
            .upsert({
                template_id: templateId,
                variant_snapshot: JSON.parse(variantSnapshot), // store as JSONB
                width: width ?? null,
                height: height ?? null,
                updated_by: userId,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'template_id' });

        if (error) {
            console.warn('[upsertTemplateOverride] Error:', error.message);
            return { error: error.message };
        }
        console.log('[upsertTemplateOverride] Saved override for', templateId);
        return { error: null };
    } catch (e: any) {
        console.warn('[upsertTemplateOverride] Failed:', e);
        return { error: e.message ?? 'Unknown error' };
    }
}

/**
 * Delete a template override from Supabase (admin only).
 * Reverts template to built-in default for all users.
 */
export async function deleteTemplateOverride(
    templateId: string,
): Promise<{ error: string | null }> {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase not configured' };

    try {
        const { error } = await sb
            .from('template_overrides')
            .delete()
            .eq('template_id', templateId);

        if (error) {
            console.warn('[deleteTemplateOverride] Error:', error.message);
            return { error: error.message };
        }
        console.log('[deleteTemplateOverride] Removed override for', templateId);
        return { error: null };
    } catch (e: any) {
        console.warn('[deleteTemplateOverride] Failed:', e);
        return { error: e.message ?? 'Unknown error' };
    }
}
