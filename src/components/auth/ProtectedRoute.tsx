// ─────────────────────────────────────────────────
// ProtectedRoute — Route guard for auth + RBAC
// ─────────────────────────────────────────────────

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /** Require admin role */
    adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
    const { isAuthenticated, isApproved, isAdmin } = useAuthStore();

    // Not logged in → login page
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but not approved → pending page
    if (!isApproved()) {
        return <Navigate to="/pending" replace />;
    }

    // Admin route but not admin → dashboard
    if (adminOnly && !isAdmin()) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
