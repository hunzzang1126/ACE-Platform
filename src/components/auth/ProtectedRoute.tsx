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
    const syncSession = useAuthStore((s) => s.syncSessionFromSupabase);

    // Auto-sync session on mount if user exists but role is missing
    useEffect(() => {
        if (user && !role) {
            syncSession();
        }
    }, [user, role, syncSession]);

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
