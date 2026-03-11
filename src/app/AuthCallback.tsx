// ─────────────────────────────────────────────────
// AuthCallback — Handles OAuth redirect from Supabase
// ─────────────────────────────────────────────────

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function AuthCallback() {
    const navigate = useNavigate();
    const syncSession = useAuthStore((s) => s.syncSessionFromSupabase);

    useEffect(() => {
        const handleCallback = async () => {
            await syncSession();

            const { isAuthenticated, isApproved } = useAuthStore.getState();
            if (isAuthenticated()) {
                navigate(isApproved() ? '/dashboard' : '/pending', { replace: true });
            } else {
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
