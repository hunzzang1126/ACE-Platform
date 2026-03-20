// ─────────────────────────────────────────────────
// AuthCallback — Handles OAuth redirect from Supabase
// ─────────────────────────────────────────────────
// Uses onAuthStateChange to reliably detect session
// regardless of flow type (implicit hash or PKCE code).
// ─────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { getSupabase } from '@/services/supabaseClient';

export function AuthCallback() {
    const navigate = useNavigate();
    const syncSession = useAuthStore((s) => s.syncSessionFromSupabase);
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        const sb = getSupabase();
        if (!sb) {
            console.error('[AuthCallback] Supabase not configured');
            navigate('/login', { replace: true });
            return;
        }

        console.log('[AuthCallback] Waiting for auth state change...');
        console.log('[AuthCallback] URL:', window.location.href);

        // ★ PKCE: try code exchange if ?code= exists
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
            console.log('[AuthCallback] PKCE code found, exchanging...');
            sb.auth.exchangeCodeForSession(code).then(({ error }) => {
                if (error) console.warn('[AuthCallback] Code exchange error:', error.message);
                else console.log('[AuthCallback] Code exchange OK');
            });
        }

        // ★ Listen for auth state change (works for both implicit + PKCE)
        const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
            console.log('[AuthCallback] Auth event:', event, '| session:', !!session);

            if (event === 'SIGNED_IN' && session) {
                subscription.unsubscribe();
                clearTimeout(timeout);

                // Sync session to our store
                await syncSession();

                const { isAuthenticated, isApproved, user } = useAuthStore.getState();
                if (!isAuthenticated()) {
                    console.warn('[AuthCallback] syncSession completed but not authenticated');
                    navigate('/login', { replace: true });
                    return;
                }

                if (!isApproved()) {
                    navigate('/pending', { replace: true });
                    return;
                }

                // Check onboarding
                const { fetchOnboardingStatus } = await import('@/services/supabaseClient');
                const { loadUserPrefs, saveUserPrefs } = await import('@/stores/userPrefs');
                const userId = user?.id;
                let hasOnboarded = false;

                if (userId) {
                    const sbStatus = await fetchOnboardingStatus(userId);
                    if (sbStatus) {
                        hasOnboarded = sbStatus.hasCompletedOnboarding;
                        if (hasOnboarded) {
                            const prefs = loadUserPrefs(userId);
                            prefs.hasCompletedOnboarding = true;
                            prefs.preferredLanguage = sbStatus.preferredLanguage as typeof prefs.preferredLanguage;
                            saveUserPrefs(prefs, userId);
                        }
                    } else {
                        hasOnboarded = loadUserPrefs(userId).hasCompletedOnboarding;
                    }
                }

                navigate(hasOnboarded ? '/dashboard' : '/onboarding', { replace: true });
            }
        });

        // ★ Timeout: if no auth event in 10s, redirect to login
        const timeout = setTimeout(() => {
            console.warn('[AuthCallback] Timeout — no auth event in 10s');
            subscription.unsubscribe();
            navigate('/login', { replace: true });
        }, 10000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: '#000', color: '#86868b',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: 16,
        }}>
            Signing you in...
        </div>
    );
}

