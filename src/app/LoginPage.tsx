import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { GlidLogo } from '@/components/brand/GlidLogo';
import './login.css';

type Mode = 'signin' | 'signup';

export function LoginPage() {
    const navigate = useNavigate();
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGitHub, isLoading, error } = useAuthStore();
    const user = useAuthStore((s) => s.user);

    const [mode, setMode] = useState<Mode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [focused, setFocused] = useState('');

    useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);
    useEffect(() => { window.history.replaceState(null, '', '/login'); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'signin') {
            await signInWithEmail(email, password);
        } else {
            await signUpWithEmail(email, password, name);
        }
        const { isAuthenticated, user: authUser } = useAuthStore.getState();
        if (isAuthenticated()) {
            const { loadUserPrefs } = await import('@/stores/userPrefs');
            const prefs = loadUserPrefs(authUser?.id);
            navigate(prefs.hasCompletedOnboarding ? '/dashboard' : '/onboarding', { replace: true });
        }
    };

    return (
        <div className="login-page">
            {/* ★ CSS-only animated background — replaces Three.js SpiralVortex */}
            <div className="login-bg-anim" />

            {/* Ambient glow blobs */}
            <div className="login-glow login-glow--1" />
            <div className="login-glow login-glow--2" />

            {/* Card */}
            <div className="login-card">
                {/* Gradient border animation */}
                <div className="login-card-border" />

                {/* Logo */}
                <div className="login-logo">
                    <GlidLogo size={36} onClick={() => navigate('/')} />
                    <h1 className="login-heading">
                        {mode === 'signin' ? 'Welcome back' : 'Get started'}
                    </h1>
                    <p className="login-sub">
                        {mode === 'signin'
                            ? 'Sign in to your creative workspace'
                            : 'Create your Glid account'}
                    </p>
                </div>

                {/* OAuth */}
                <div className="login-oauth">
                    <button className="login-oauth-btn login-oauth-btn--google"
                        onClick={() => signInWithGoogle()} disabled={isLoading}>
                        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Continue with Google
                    </button>
                    <button className="login-oauth-btn login-oauth-btn--github"
                        onClick={() => signInWithGitHub()} disabled={isLoading}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                        Continue with GitHub
                    </button>
                </div>

                {/* Divider */}
                <div className="login-divider">
                    <div className="login-divider-line" />
                    <span>or</span>
                    <div className="login-divider-line" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {mode === 'signup' && (
                        <div className={`login-input-wrap ${focused === 'name' ? 'focused' : ''}`}>
                            <input type="text" placeholder="Full Name" value={name}
                                onChange={e => setName(e.target.value)} required
                                onFocus={() => setFocused('name')} onBlur={() => setFocused('')} />
                        </div>
                    )}
                    <div className={`login-input-wrap ${focused === 'email' ? 'focused' : ''}`}>
                        <input type="email" placeholder="Email" value={email}
                            onChange={e => setEmail(e.target.value)} required
                            onFocus={() => setFocused('email')} onBlur={() => setFocused('')} />
                    </div>
                    <div className={`login-input-wrap ${focused === 'pw' ? 'focused' : ''}`}>
                        <input type="password" placeholder="Password" value={password}
                            onChange={e => setPassword(e.target.value)} required minLength={6}
                            onFocus={() => setFocused('pw')} onBlur={() => setFocused('')} />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="login-submit" disabled={isLoading}>
                        {isLoading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {/* Toggle */}
                <div className="login-toggle">
                    {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                    <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                        {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
}
