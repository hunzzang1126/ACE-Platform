// ─────────────────────────────────────────────────
// authStore.test.ts — Auth store tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock supabaseClient ──
const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/services/supabaseClient', () => ({
    getSupabase: () => ({
        auth: {
            getSession: mockGetSession,
            refreshSession: mockRefreshSession,
            signOut: mockSignOut,
        },
        from: mockFrom,
    }),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    signInWithEmail: vi.fn().mockResolvedValue({ error: null }),
    signUpWithEmail: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    fetchUserRole: vi.fn().mockResolvedValue('user'),
    fetchOnboardingStatus: vi.fn().mockResolvedValue(null),
}));

vi.mock('./idbStorageAdapter', () => ({
    idbStorage: {
        getItem: vi.fn().mockResolvedValue(null),
        setItem: vi.fn().mockResolvedValue(undefined),
        removeItem: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/stores/userPrefs', () => ({
    loadUserPrefs: vi.fn(() => ({ hasCompletedOnboarding: false, preferredLanguage: 'en' })),
    saveUserPrefs: vi.fn(),
}));

import { useAuthStore } from './authStore';
import {
    signInWithEmail as sbSignInWithEmail,
    signUpWithEmail as sbSignUpWithEmail,
    signInWithOAuth,
    signOut as sbSignOut,
    fetchUserRole,
} from '@/services/supabaseClient';

// ── Helpers ──

function resetStore() {
    useAuthStore.setState({
        user: null,
        session: null,
        role: null,
        isLoading: false,
        error: null,
    });
}

const mockSupabaseSession = (overrides: Record<string, unknown> = {}) => ({
    access_token: 'tok-123',
    refresh_token: 'ref-456',
    expires_in: 3600,
    user: {
        id: 'user-001',
        email: 'test@ace.design',
        created_at: '2026-01-01T00:00:00Z',
        user_metadata: {
            full_name: 'Test User',
            avatar_url: 'https://example.com/avatar.png',
        },
        ...overrides,
    },
});

// ── Tests ──

describe('authStore', () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Initial State ──

    describe('initial state', () => {
        it('should start with null user, session, and role', () => {
            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.session).toBeNull();
            expect(state.role).toBeNull();
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    // ── Setters ──

    describe('setters', () => {
        it('should set user', () => {
            const user = { id: 'u1', email: 'a@b.c', displayName: 'A', plan: 'starter' as const, createdAt: '' };
            useAuthStore.getState().setUser(user);
            expect(useAuthStore.getState().user).toEqual(user);
        });

        it('should set loading', () => {
            useAuthStore.getState().setLoading(true);
            expect(useAuthStore.getState().isLoading).toBe(true);
        });

        it('should set error', () => {
            useAuthStore.getState().setError('Something broke');
            expect(useAuthStore.getState().error).toBe('Something broke');
        });

        it('should set role', () => {
            useAuthStore.getState().setRole('admin');
            expect(useAuthStore.getState().role).toBe('admin');
        });
    });

    // ── signInWithEmail ──

    describe('signInWithEmail', () => {
        it('should set loading=true and clear error before calling API', async () => {
            mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession() } });
            mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) });

            const promise = useAuthStore.getState().signInWithEmail('test@ace.design', 'password');
            // isLoading is set synchronously before the awaited call
            expect(useAuthStore.getState().isLoading).toBe(true);
            expect(useAuthStore.getState().error).toBeNull();
            await promise;
        });

        it('should set error when signIn fails', async () => {
            vi.mocked(sbSignInWithEmail).mockResolvedValueOnce({ error: 'Invalid credentials' });
            await useAuthStore.getState().signInWithEmail('bad@email.com', 'wrong');
            expect(useAuthStore.getState().error).toBe('Invalid credentials');
            expect(useAuthStore.getState().isLoading).toBe(false);
        });

        it('should sync session from Supabase on success', async () => {
            vi.mocked(sbSignInWithEmail).mockResolvedValueOnce({ error: null });
            mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession() } });
            mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) });

            await useAuthStore.getState().signInWithEmail('test@ace.design', 'password');
            const state = useAuthStore.getState();
            expect(state.user?.email).toBe('test@ace.design');
            expect(state.user?.displayName).toBe('Test User');
            expect(state.session?.accessToken).toBe('tok-123');
            expect(state.isLoading).toBe(false);
        });
    });

    // ── signUpWithEmail ──

    describe('signUpWithEmail', () => {
        it('should set loading during signup', async () => {
            vi.mocked(sbSignUpWithEmail).mockResolvedValueOnce({ error: null });
            await useAuthStore.getState().signUpWithEmail('new@ace.design', 'password', 'New User');
            expect(useAuthStore.getState().isLoading).toBe(false);
            expect(useAuthStore.getState().error).toBeNull();
        });

        it('should set error when signup fails', async () => {
            vi.mocked(sbSignUpWithEmail).mockResolvedValueOnce({ error: 'Email taken' });
            await useAuthStore.getState().signUpWithEmail('existing@ace.design', 'password', 'Existing');
            expect(useAuthStore.getState().error).toBe('Email taken');
        });
    });

    // ── OAuth Flows ──

    describe('signInWithGoogle', () => {
        it('should call signInWithOAuth with google provider', async () => {
            await useAuthStore.getState().signInWithGoogle();
            expect(signInWithOAuth).toHaveBeenCalledWith('google');
        });

        it('should set error on OAuth failure', async () => {
            vi.mocked(signInWithOAuth).mockResolvedValueOnce({ error: 'OAuth failed' });
            await useAuthStore.getState().signInWithGoogle();
            expect(useAuthStore.getState().error).toBe('OAuth failed');
        });
    });

    describe('signInWithGitHub', () => {
        it('should call signInWithOAuth with github provider', async () => {
            await useAuthStore.getState().signInWithGitHub();
            expect(signInWithOAuth).toHaveBeenCalledWith('github');
        });
    });

    // ── signOut ──

    describe('signOut', () => {
        it('should clear user, session, role, and error', async () => {
            useAuthStore.setState({
                user: { id: 'u1', email: 'a@b.c', displayName: 'A', plan: 'starter', createdAt: '' },
                session: { accessToken: 'tok', refreshToken: 'ref', expiresAt: Date.now(), lastAuthenticatedAt: Date.now() },
                role: 'user',
                error: 'old error',
            });

            await useAuthStore.getState().signOut();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.session).toBeNull();
            expect(state.role).toBeNull();
            expect(state.error).toBeNull();
        });

        it('should call Supabase signOut', async () => {
            await useAuthStore.getState().signOut();
            expect(sbSignOut).toHaveBeenCalled();
        });

        it('should clear login timestamp from localStorage', async () => {
            useAuthStore.setState({
                user: { id: 'user-99', email: 'a@b.c', displayName: 'A', plan: 'starter', createdAt: '' },
            });
            localStorage.setItem('ace_login_ts_user-99', '12345');

            await useAuthStore.getState().signOut();
            expect(localStorage.getItem('ace_login_ts_user-99')).toBeNull();
        });
    });

    // ── syncSessionFromSupabase ──

    describe('syncSessionFromSupabase', () => {
        it('should clear state when no session exists', async () => {
            mockGetSession.mockResolvedValue({ data: { session: null } });
            await useAuthStore.getState().syncSessionFromSupabase();
            expect(useAuthStore.getState().user).toBeNull();
            expect(useAuthStore.getState().isLoading).toBe(false);
        });

        it('should populate user from Supabase session', async () => {
            mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession() } });
            mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) });

            await useAuthStore.getState().syncSessionFromSupabase();

            const state = useAuthStore.getState();
            expect(state.user?.id).toBe('user-001');
            expect(state.user?.email).toBe('test@ace.design');
            expect(state.user?.displayName).toBe('Test User');
            expect(state.user?.plan).toBe('starter'); // default when no subscription
        });

        it('should set plan from active subscription', async () => {
            mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession() } });
            mockFrom.mockReturnValue({
                select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { plan: 'pro' } }) }) }) }),
            });

            await useAuthStore.getState().syncSessionFromSupabase();
            expect(useAuthStore.getState().user?.plan).toBe('pro');
        });

        it('should override plan to admin when role is admin', async () => {
            mockGetSession.mockResolvedValue({ data: { session: mockSupabaseSession() } });
            mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) });
            vi.mocked(fetchUserRole).mockResolvedValueOnce('admin');

            await useAuthStore.getState().syncSessionFromSupabase();
            expect(useAuthStore.getState().user?.plan).toBe('admin');
            expect(useAuthStore.getState().role).toBe('admin');
        });

        it('★ REGRESSION: should force re-login for sessions older than 7 days', async () => {
            const session = mockSupabaseSession();
            mockGetSession.mockResolvedValue({ data: { session } });

            // Set a login timestamp > 7 days old
            const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
            localStorage.setItem(`ace_login_ts_user-001`, String(eightDaysAgo));

            await useAuthStore.getState().syncSessionFromSupabase();
            expect(useAuthStore.getState().user).toBeNull();
            expect(mockSignOut).toHaveBeenCalled();
        });

        it('should use email prefix as displayName when full_name is missing', async () => {
            const session = mockSupabaseSession({ user_metadata: {} });
            mockGetSession.mockResolvedValue({ data: { session } });
            mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) });

            await useAuthStore.getState().syncSessionFromSupabase();
            expect(useAuthStore.getState().user?.displayName).toBe('test');
        });
    });

    // ── Session Validity ──

    describe('isSessionValid', () => {
        it('should return false when no session', () => {
            expect(useAuthStore.getState().isSessionValid()).toBe(false);
        });

        it('should return true for valid session within TTL', () => {
            useAuthStore.setState({
                session: {
                    accessToken: 'tok',
                    refreshToken: 'ref',
                    expiresAt: Date.now() + 3600_000,
                    lastAuthenticatedAt: Date.now(),
                },
            });
            expect(useAuthStore.getState().isSessionValid()).toBe(true);
        });

        it('should return false when token expired', () => {
            useAuthStore.setState({
                session: {
                    accessToken: 'tok',
                    refreshToken: 'ref',
                    expiresAt: Date.now() - 1000,
                    lastAuthenticatedAt: Date.now(),
                },
            });
            expect(useAuthStore.getState().isSessionValid()).toBe(false);
        });

        it('should return false when session is older than 24h TTL', () => {
            useAuthStore.setState({
                session: {
                    accessToken: 'tok',
                    refreshToken: 'ref',
                    expiresAt: Date.now() + 3600_000,
                    lastAuthenticatedAt: Date.now() - 25 * 60 * 60 * 1000,
                },
            });
            expect(useAuthStore.getState().isSessionValid()).toBe(false);
        });
    });

    // ── Role Checks ──

    describe('isAuthenticated', () => {
        it('should return false when no user', () => {
            expect(useAuthStore.getState().isAuthenticated()).toBe(false);
        });
        it('should return true when user exists', () => {
            useAuthStore.setState({
                user: { id: 'u1', email: 'a@b.c', displayName: 'A', plan: 'starter', createdAt: '' },
            });
            expect(useAuthStore.getState().isAuthenticated()).toBe(true);
        });
    });

    describe('isAdmin', () => {
        it('should return true when role is admin', () => {
            useAuthStore.setState({ role: 'admin' });
            expect(useAuthStore.getState().isAdmin()).toBe(true);
        });
        it('should return false when role is user', () => {
            useAuthStore.setState({ role: 'user' });
            expect(useAuthStore.getState().isAdmin()).toBe(false);
        });
    });

    describe('isApproved', () => {
        it('should return true for admin', () => {
            useAuthStore.setState({ role: 'admin' });
            expect(useAuthStore.getState().isApproved()).toBe(true);
        });
        it('should return true for user', () => {
            useAuthStore.setState({ role: 'user' });
            expect(useAuthStore.getState().isApproved()).toBe(true);
        });
        it('should return false for pending', () => {
            useAuthStore.setState({ role: 'pending' as any });
            expect(useAuthStore.getState().isApproved()).toBe(false);
        });
    });

    // ── refreshSession ──

    describe('refreshSession', () => {
        it('should sign out when TTL exceeded', async () => {
            useAuthStore.setState({
                session: {
                    accessToken: 'tok',
                    refreshToken: 'ref',
                    expiresAt: Date.now() + 3600_000,
                    lastAuthenticatedAt: Date.now() - 25 * 60 * 60 * 1000,
                },
            });

            await useAuthStore.getState().refreshSession();
            // Should have called signOut (which clears state)
            expect(sbSignOut).toHaveBeenCalled();
        });

        it('should update tokens on successful refresh', async () => {
            const lastAuth = Date.now();
            useAuthStore.setState({
                session: {
                    accessToken: 'old-tok',
                    refreshToken: 'old-ref',
                    expiresAt: Date.now() + 3600_000,
                    lastAuthenticatedAt: lastAuth,
                },
            });

            mockRefreshSession.mockResolvedValue({
                data: { session: { access_token: 'new-tok', refresh_token: 'new-ref', expires_in: 3600 } },
            });

            await useAuthStore.getState().refreshSession();

            const session = useAuthStore.getState().session;
            expect(session?.accessToken).toBe('new-tok');
            expect(session?.refreshToken).toBe('new-ref');
            // lastAuthenticatedAt should be preserved, not reset
            expect(session?.lastAuthenticatedAt).toBe(lastAuth);
        });

        it('should sign out when refresh returns no session', async () => {
            useAuthStore.setState({
                session: {
                    accessToken: 'tok',
                    refreshToken: 'ref',
                    expiresAt: Date.now() + 3600_000,
                    lastAuthenticatedAt: Date.now(),
                },
            });

            mockRefreshSession.mockResolvedValue({ data: { session: null } });

            await useAuthStore.getState().refreshSession();
            expect(sbSignOut).toHaveBeenCalled();
        });
    });
});
