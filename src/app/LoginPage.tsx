// ─────────────────────────────────────────────────
// LoginPage — Sign In / Sign Up with OAuth + Email
// ─────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import './landing.css';

type Mode = 'signin' | 'signup';

export function LoginPage() {
    const navigate = useNavigate();
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGitHub, isLoading, error } = useAuthStore();

    const [mode, setMode] = useState<Mode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'signin') {
            await signInWithEmail(email, password);
        } else {
            await signUpWithEmail(email, password, name);
        }
        // Navigation handled by AuthCallback or syncSession
        const { isAuthenticated, isApproved } = useAuthStore.getState();
        if (isAuthenticated()) {
            navigate(isApproved() ? '/dashboard' : '/pending', { replace: true });
        }
    };

    return (
        <div className="landing-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            {/* Background glow */}
            <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'var(--landing-gradient-1)', filter: 'blur(200px)', opacity: 0.08, top: '20%', left: '30%', pointerEvents: 'none' }} />

            <div style={{
                width: '100%',
                maxWidth: 420,
                padding: 40,
                background: 'var(--landing-card)',
                border: '1px solid var(--landing-card-border)',
                borderRadius: 20,
                backdropFilter: 'blur(40px)',
                position: 'relative',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div
                        style={{
                            fontSize: 28,
                            fontWeight: 700,
                            letterSpacing: -1,
                            background: 'linear-gradient(135deg, var(--landing-gradient-1), var(--landing-gradient-2))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: 8,
                            cursor: 'pointer',
                        }}
                        onClick={() => navigate('/')}
                    >
                        ACE
                    </div>
                    <div style={{ fontSize: 15, color: 'var(--landing-text-muted)' }}>
                        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                    </div>
                </div>

                {/* OAuth Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    <button
                        onClick={() => signInWithGoogle()}
                        disabled={isLoading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            padding: '12px 16px', borderRadius: 12,
                            background: '#fff', color: '#333', border: 'none',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Continue with Google
                    </button>

                    <button
                        onClick={() => signInWithGitHub()}
                        disabled={isLoading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            padding: '12px 16px', borderRadius: 12,
                            background: '#24292e', color: '#fff', border: 'none',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                        Continue with GitHub
                    </button>
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--landing-card-border)' }} />
                    <span style={{ fontSize: 12, color: 'var(--landing-text-muted)' }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--landing-card-border)' }} />
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {mode === 'signup' && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={inputStyle}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        style={inputStyle}
                    />

                    {error && (
                        <div style={{ fontSize: 13, color: '#ff6b6b', padding: '8px 12px', borderRadius: 8, background: 'rgba(255, 107, 107, 0.1)' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: '12px 16px', borderRadius: 12,
                            background: 'linear-gradient(135deg, var(--landing-gradient-1), var(--landing-accent-2))',
                            color: '#fff', border: 'none', fontSize: 14, fontWeight: 600,
                            cursor: isLoading ? 'wait' : 'pointer',
                            opacity: isLoading ? 0.7 : 1,
                            transition: 'all 0.2s', marginTop: 4,
                        }}
                    >
                        {isLoading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {/* Toggle */}
                <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--landing-text-muted)' }}>
                    {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                        style={{
                            background: 'none', border: 'none', color: 'var(--landing-accent-2)',
                            cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0,
                        }}
                    >
                        {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#f5f5f7',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
};
