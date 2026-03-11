// ─────────────────────────────────────────────────
// PendingPage — Shown when user is authenticated but not yet approved
// ─────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import './landing.css';

export function PendingPage() {
    const navigate = useNavigate();
    const { user, signOut, syncSessionFromSupabase, isApproved } = useAuthStore();

    const handleRefresh = async () => {
        await syncSessionFromSupabase();
        if (isApproved()) {
            navigate('/dashboard', { replace: true });
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/', { replace: true });
    };

    return (
        <div className="landing-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div style={{
                maxWidth: 480,
                padding: 48,
                textAlign: 'center',
                background: 'var(--landing-card)',
                border: '1px solid var(--landing-card-border)',
                borderRadius: 20,
            }}>
                {/* Clock icon */}
                <div style={{
                    width: 64, height: 64, borderRadius: 16, margin: '0 auto 24px',
                    background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15), rgba(0, 206, 201, 0.1))',
                    border: '1px solid rgba(108, 92, 231, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>

                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, letterSpacing: -0.5 }}>
                    Access Pending
                </h2>
                <p style={{ fontSize: 15, color: 'var(--landing-text-muted)', lineHeight: 1.6, marginBottom: 32 }}>
                    Your account <strong style={{ color: 'var(--landing-text)' }}>{user?.email}</strong> is awaiting admin approval.
                    You will be able to access the platform once an administrator grants you access.
                </p>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                        onClick={handleRefresh}
                        style={{
                            padding: '10px 24px', borderRadius: 10,
                            background: 'var(--landing-accent)', color: '#fff',
                            border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Check Status
                    </button>
                    <button
                        onClick={handleSignOut}
                        style={{
                            padding: '10px 24px', borderRadius: 10,
                            background: 'transparent', color: 'var(--landing-text-muted)',
                            border: '1px solid var(--landing-card-border)', fontSize: 14,
                            fontWeight: 500, cursor: 'pointer',
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
