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

export interface User {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    plan: 'free' | 'pro' | 'team';
    createdAt: string;
}

export interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // Unix timestamp
}

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
                    set({ isLoading: false });
                    return;
                }

                const { data: { session } } = await sb.auth.getSession();
                if (!session) {
                    set({ user: null, session: null, role: null, isLoading: false });
                    return;
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
                    plan: 'free',
                    createdAt: supaUser.created_at,
                };

                const role = await fetchUserRole(supaUser.id);

                set({
                    user,
                    session: {
                        accessToken: session.access_token,
                        refreshToken: session.refresh_token,
                        expiresAt: Date.now() + (session.expires_in ?? 3600) * 1000,
                    },
                    role,
                    isLoading: false,
                    error: null,
                });
            },

            refreshSession: async () => {
                const sb = getSupabase();
                if (!sb) return;

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
                    },
                });
            },

            isAuthenticated: () => get().user !== null,
            isSessionValid: () => {
                const { session } = get();
                if (!session) return false;
                return session.expiresAt > Date.now();
            },
            isAdmin: () => get().role === 'admin',
            isApproved: () => {
                const role = get().role;
                return role === 'admin' || role === 'user';
            },
        }),
        {
            name: 'ace-auth',
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
