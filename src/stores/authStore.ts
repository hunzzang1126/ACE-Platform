// ─────────────────────────────────────────────────
// authStore — Authentication state management
// ─────────────────────────────────────────────────
// Zustand store for user auth. Supports email/password
// and Google SSO via Supabase.
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    isLoading: boolean;
    error: string | null;

    // Actions
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Auth flows
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;

    // Helpers
    isAuthenticated: () => boolean;
    isSessionValid: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            session: null,
            isLoading: false,
            error: null,

            setUser: (user) => set({ user }),
            setSession: (session) => set({ session }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),

            signInWithEmail: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                    if (!supabaseUrl || !supabaseKey) {
                        // Offline mode: create mock session
                        set({
                            user: { id: 'local', email, displayName: email.split('@')[0] ?? 'User', plan: 'free', createdAt: new Date().toISOString() },
                            session: { accessToken: 'local', refreshToken: 'local', expiresAt: Date.now() + 86400000 },
                            isLoading: false,
                        });
                        return;
                    }

                    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', apikey: supabaseKey },
                        body: JSON.stringify({ email, password }),
                    });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.error_description || 'Sign in failed'); }
                    const data = await res.json();
                    set({
                        user: {
                            id: data.user.id,
                            email: data.user.email,
                            displayName: data.user.user_metadata?.display_name ?? email.split('@')[0] ?? 'User',
                            avatarUrl: data.user.user_metadata?.avatar_url,
                            plan: 'free',
                            createdAt: data.user.created_at,
                        },
                        session: {
                            accessToken: data.access_token,
                            refreshToken: data.refresh_token,
                            expiresAt: Date.now() + data.expires_in * 1000,
                        },
                        isLoading: false,
                    });
                } catch (err) {
                    set({ error: String(err instanceof Error ? err.message : err), isLoading: false });
                }
            },

            signUpWithEmail: async (email, password, name) => {
                set({ isLoading: true, error: null });
                try {
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                    if (!supabaseUrl || !supabaseKey) {
                        set({
                            user: { id: 'local', email, displayName: name, plan: 'free', createdAt: new Date().toISOString() },
                            session: { accessToken: 'local', refreshToken: 'local', expiresAt: Date.now() + 86400000 },
                            isLoading: false,
                        });
                        return;
                    }

                    const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', apikey: supabaseKey },
                        body: JSON.stringify({ email, password, data: { display_name: name } }),
                    });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.error_description || 'Sign up failed'); }
                    const data = await res.json();
                    set({
                        user: { id: data.user?.id ?? 'pending', email, displayName: name, plan: 'free', createdAt: new Date().toISOString() },
                        isLoading: false,
                    });
                } catch (err) {
                    set({ error: String(err instanceof Error ? err.message : err), isLoading: false });
                }
            },

            signInWithGoogle: async () => {
                set({ isLoading: true, error: null });
                try {
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                    if (!supabaseUrl || !supabaseKey) {
                        set({ error: 'Supabase not configured. Using offline mode.', isLoading: false });
                        return;
                    }
                    // Redirect to Supabase Google OAuth
                    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${window.location.origin}/auth/callback&apikey=${supabaseKey}`;
                } catch (err) {
                    set({ error: String(err instanceof Error ? err.message : err), isLoading: false });
                }
            },

            signOut: async () => {
                set({ user: null, session: null, error: null });
            },

            refreshSession: async () => {
                const { session } = get();
                if (!session) return;
                try {
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                    if (!supabaseUrl || !supabaseKey) return;

                    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', apikey: supabaseKey },
                        body: JSON.stringify({ refresh_token: session.refreshToken }),
                    });
                    if (!res.ok) { get().signOut(); return; }
                    const data = await res.json();
                    set({
                        session: {
                            accessToken: data.access_token,
                            refreshToken: data.refresh_token,
                            expiresAt: Date.now() + data.expires_in * 1000,
                        },
                    });
                } catch {
                    // Silent fail on refresh
                }
            },

            isAuthenticated: () => get().user !== null,
            isSessionValid: () => {
                const { session } = get();
                if (!session) return false;
                return session.expiresAt > Date.now();
            },
        }),
        { name: 'ace-auth' },
    ),
);
