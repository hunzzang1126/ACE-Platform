// ─────────────────────────────────────────────────
// ProtectedRoute — Route guard for auth + RBAC
// ─────────────────────────────────────────────────

import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /** Require admin role */
    adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
    const user = useAuthStore((s) => s.user);
    const role = useAuthStore((s) => s.role);
    const isLoading = useAuthStore((s) => s.isLoading);
    const isSessionValid = useAuthStore((s) => s.isSessionValid);
    const syncSession = useAuthStore((s) => s.syncSessionFromSupabase);
    const signOut = useAuthStore((s) => s.signOut);

    // ★ Always re-sync session on mount to pick up plan changes (e.g., after Stripe checkout)
    useEffect(() => {
        if (user) {
            syncSession();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentional mount-only

    // Check 24h TTL on mount — force re-auth if stale
    useEffect(() => {
        if (user && !isSessionValid()) {
            console.log('[ProtectedRoute] Session expired (24h TTL) — signing out');
            signOut();
        }
    }, [user, isSessionValid, signOut]);

    // Show loading while session is being resolved
    if (isLoading || (user && !role)) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100vh', background: '#0a0a0a', color: '#888',
                fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif',
            }}>
                Loading...
            </div>
        );
    }

    // Not logged in → login page
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but not approved → pending page
    if (role !== 'admin' && role !== 'user') {
        return <Navigate to="/pending" replace />;
    }

    // Admin route but not admin → dashboard
    if (adminOnly && role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
