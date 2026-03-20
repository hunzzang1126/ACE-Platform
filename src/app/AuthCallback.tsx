// ─────────────────────────────────────────────────
// AuthCallback — Handles OAuth redirect from Supabase
// ─────────────────────────────────────────────────

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { getSupabase } from '@/services/supabaseClient';

export function AuthCallback() {
    const navigate = useNavigate();
    const syncSession = useAuthStore((s) => s.syncSessionFromSupabase);

    useEffect(() => {
        const handleCallback = async () => {
            const sb = getSupabase();

            // ★ PKCE flow: exchange authorization code for session
            const url = new URL(window.location.href);
            const code = url.searchParams.get('code');

            if (code && sb) {
                console.log('[AuthCallback] PKCE code detected, exchanging...');
                const { error } = await sb.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error('[AuthCallback] Code exchange failed:', error.message);
                    navigate('/login', { replace: true });
                    return;
                }
                console.log('[AuthCallback] Code exchange OK');
            }

            // Now sync the session (should find it after exchange)
            await syncSession();

            const { isAuthenticated, isApproved, user } = useAuthStore.getState();
            if (isAuthenticated()) {
                if (!isApproved()) {
                    navigate('/pending', { replace: true });
                } else {
                    // Check Supabase first (cross-device), fallback to localStorage
                    const { fetchOnboardingStatus } = await import('@/services/supabaseClient');
                    const { loadUserPrefs, saveUserPrefs } = await import('@/stores/userPrefs');
                    const userId = user?.id;

                    let hasOnboarded = false;
                    if (userId) {
                        const sbStatus = await fetchOnboardingStatus(userId);
                        if (sbStatus) {
                            hasOnboarded = sbStatus.hasCompletedOnboarding;
                            // Sync Supabase prefs to localStorage
                            if (hasOnboarded) {
                                const prefs = loadUserPrefs(userId);
                                prefs.hasCompletedOnboarding = true;
                                prefs.preferredLanguage = sbStatus.preferredLanguage as typeof prefs.preferredLanguage;
                                saveUserPrefs(prefs, userId);
                            }
                        } else {
                            // Supabase unavailable — check localStorage
                            hasOnboarded = loadUserPrefs(userId).hasCompletedOnboarding;
                        }
                    }
                    navigate(hasOnboarded ? '/dashboard' : '/onboarding', { replace: true });
                }
            } else {
                console.warn('[AuthCallback] No session after exchange — redirecting to login');
                navigate('/login', { replace: true });
            }
        };

        handleCallback();
    }, [syncSession, navigate]);

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

