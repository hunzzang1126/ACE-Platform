// ─────────────────────────────────────────────────
// authStore — Authentication + Role Management
// ─────────────────────────────────────────────────
// Zustand store for user auth, session, and RBAC.
// Supports: Email, Google SSO, GitHub SSO via Supabase.
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorageAdapter';
import {
    getSupabase,
    signInWithOAuth,
    signInWithEmail as sbSignInWithEmail,
    signUpWithEmail as sbSignUpWithEmail,
    signOut as sbSignOut,
    fetchUserRole,
    type UserRole,
} from '@/services/supabaseClient';
import type { PlanTier } from '@/schema/planTypes';

export interface User {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    plan: PlanTier;
    createdAt: string;
}

export interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // Unix timestamp (Supabase token expiry)
    /** When the user last performed an actual sign-in (OAuth, email, etc.) */
    lastAuthenticatedAt: number; // Unix timestamp
}

/** Hard limit: users must re-authenticate after 24 hours */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface AuthState {
    user: User | null;
    session: Session | null;
    role: UserRole | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setRole: (role: UserRole | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Auth flows
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithGitHub: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;

    // Session sync (called after OAuth callback)
    syncSessionFromSupabase: () => Promise<void>;

    // Helpers
    isAuthenticated: () => boolean;
    isSessionValid: () => boolean;
    isAdmin: () => boolean;
    isApproved: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            session: null,
            role: null,
            isLoading: false,
            error: null,

            setUser: (user) => set({ user }),
            setSession: (session) => set({ session }),
            setRole: (role) => set({ role }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),

            signInWithEmail: async (email, password) => {
                set({ isLoading: true, error: null });
                const { error } = await sbSignInWithEmail(email, password);
                if (error) {
                    set({ error, isLoading: false });
                    return;
                }
                // syncSessionFromSupabase will be called by auth listener
                await get().syncSessionFromSupabase();
            },

            signUpWithEmail: async (email, password, name) => {
                set({ isLoading: true, error: null });
                const { error } = await sbSignUpWithEmail(email, password, name);
                if (error) {
                    set({ error, isLoading: false });
                    return;
                }
                set({ isLoading: false, error: null });
            },

            signInWithGoogle: async () => {
                set({ isLoading: true, error: null });
                const { error } = await signInWithOAuth('google');
                if (error) set({ error, isLoading: false });
                // Redirect happens — page will reload at /auth/callback
            },

            signInWithGitHub: async () => {
                set({ isLoading: true, error: null });
                const { error } = await signInWithOAuth('github');
                if (error) set({ error, isLoading: false });
                // Redirect happens — page will reload at /auth/callback
            },

            signOut: async () => {
                await sbSignOut();
                set({ user: null, session: null, role: null, error: null });
            },

            syncSessionFromSupabase: async () => {
                const sb = getSupabase();
                if (!sb) {
                    console.warn('[syncSession] Supabase not configured');
                    set({ isLoading: false });
                    return;
                }

                console.log('[syncSession] Getting session from Supabase SDK...');
                const { data: { session } } = await sb.auth.getSession();
                console.log('[syncSession] Session found:', !!session, session?.user?.email);

                if (!session) {
                    set({ user: null, session: null, role: null, isLoading: false });
                    return;
                }

                // ★ 7-day session expiry check
                const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
                const LOGIN_TS_KEY = `ace_login_ts_${session.user.id}`;
                const loginTs = localStorage.getItem(LOGIN_TS_KEY);

                if (loginTs) {
                    const age = Date.now() - parseInt(loginTs, 10);
                    if (age > SESSION_MAX_AGE_MS) {
                        console.log('[syncSession] Session expired (>7 days). Forcing re-login.');
                        localStorage.removeItem(LOGIN_TS_KEY);
                        await sb.auth.signOut();
                        set({ user: null, session: null, role: null, isLoading: false });
                        return;
                    }
                } else {
                    // First load after login — record timestamp
                    localStorage.setItem(LOGIN_TS_KEY, String(Date.now()));
                }

                const supaUser = session.user;
                const user: User = {
                    id: supaUser.id,
                    email: supaUser.email ?? '',
                    displayName:
                        supaUser.user_metadata?.full_name ??
                        supaUser.user_metadata?.name ??
                        supaUser.email?.split('@')[0] ?? 'User',
                    avatarUrl: supaUser.user_metadata?.avatar_url,
                    plan: 'starter', // default, will be updated below
                    createdAt: supaUser.created_at,
                };

                // ★ Load plan from subscriptions table
                let userPlan: PlanTier = 'starter';
                try {
                    const { data: sub } = await sb.from('subscriptions')
                        .select('plan')
                        .eq('user_id', supaUser.id)
                        .eq('status', 'active')
                        .maybeSingle();
                    if (sub?.plan) userPlan = sub.plan as PlanTier;
                } catch { /* no subscription = starter */ }
                user.plan = userPlan;

                console.log('[syncSession] Fetching role for:', supaUser.id);
                const role = await fetchUserRole(supaUser.id);
                console.log('[syncSession] Role result:', role);

                set({
                    user,
                    session: {
                        accessToken: session.access_token,
                        refreshToken: session.refresh_token,
                        expiresAt: Date.now() + (session.expires_in ?? 3600) * 1000,
                        lastAuthenticatedAt: Date.now(),
                    },
                    role,
                    isLoading: false,
                    error: null,
                });
            },

            refreshSession: async () => {
                const sb = getSupabase();
                if (!sb) return;

                // ★ 24h TTL: Do NOT refresh if session is older than 24 hours
                const { session: currentSession } = get();
                if (currentSession && (Date.now() - currentSession.lastAuthenticatedAt > SESSION_TTL_MS)) {
                    console.log('[refreshSession] 24h TTL exceeded — forcing sign out');
                    get().signOut();
                    return;
                }

                const { data: { session } } = await sb.auth.refreshSession();
                if (!session) {
                    get().signOut();
                    return;
                }

                set({
                    session: {
                        accessToken: session.access_token,
                        refreshToken: session.refresh_token,
                        expiresAt: Date.now() + (session.expires_in ?? 3600) * 1000,
                        // Keep original lastAuthenticatedAt — NOT refreshed
                        lastAuthenticatedAt: currentSession?.lastAuthenticatedAt ?? Date.now(),
                    },
                });
            },

            isAuthenticated: () => get().user !== null,
            isSessionValid: () => {
                const { session } = get();
                if (!session) return false;
                // Check both: Supabase token AND 24h hard TTL
                const tokenValid = session.expiresAt > Date.now();
                const withinTTL = (Date.now() - session.lastAuthenticatedAt) < SESSION_TTL_MS;
                return tokenValid && withinTTL;
            },
            isAdmin: () => get().role === 'admin',
            isApproved: () => {
                const role = get().role;
                return role === 'admin' || role === 'user';
            },
        }),
        {
            name: 'glid-auth',
            storage: createJSONStorage(() => idbStorage),
            // Don't persist transient state — always starts fresh
            partialize: (state) => ({
                user: state.user,
                session: state.session,
                role: state.role,
            }),
        },
    ),
);
