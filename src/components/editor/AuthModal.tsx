// ─────────────────────────────────────────────────
// AuthModal — Authentication UI (login/signup)
// ─────────────────────────────────────────────────
// Provides email/password login, signup, and Google SSO.
// Connects to authStore for Supabase authentication.
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface Props {
    onClose?: () => void;
    onSuccess?: () => void;
}

type Mode = 'login' | 'signup' | 'forgot';

export function AuthModal({ onClose, onSuccess }: Props) {
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, signOut: doSignOut, isLoading, error: storeError, user } = useAuthStore();

    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');

    // If already logged in, show profile
    if (user) {
        return (
            <div style={styles.overlay} onClick={onClose}>
                <div style={styles.card} onClick={e => e.stopPropagation()}>
                    <div style={styles.header}>
                        <span style={styles.title}>Account</span>
                        {onClose && <button style={styles.closeBtn} onClick={onClose}>x</button>}
                    </div>
                    <div style={styles.profileSection}>
                        <div style={styles.avatar}>
                            {(user.email?.[0] ?? 'U').toUpperCase()}
                        </div>
                        <div style={styles.profileInfo}>
                            <span style={styles.profileEmail}>{user.email}</span>
                            <span style={styles.profileMeta}>
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <button style={styles.signOutBtn} onClick={() => doSignOut()}>
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    const error = localError || storeError;

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (!email.trim()) { setLocalError('Email is required'); return; }

        if (mode === 'forgot') {
            setLocalError('Password reset is available in Settings.');
            return;
        }

        if (!password) { setLocalError('Password is required'); return; }

        if (mode === 'signup') {
            if (password.length < 6) { setLocalError('Password must be at least 6 characters'); return; }
            if (password !== confirmPassword) { setLocalError('Passwords do not match'); return; }
            try {
                await signUpWithEmail(email, password, email.split('@')[0] ?? 'User');
                onSuccess?.();
            } catch { /* error handled in store */ }
        } else {
            try {
                await signInWithEmail(email, password);
                onSuccess?.();
            } catch { /* error handled in store */ }
        }
    }, [email, password, confirmPassword, mode, signInWithEmail, signUpWithEmail, onSuccess]);

    const handleGoogle = useCallback(async () => {
        setLocalError('');
        try {
            await signInWithGoogle();
            onSuccess?.();
        } catch { /* error handled in store */ }
    }, [signInWithGoogle, onSuccess]);

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.card} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <span style={styles.title}>
                        {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
                    </span>
                    {onClose && <button style={styles.closeBtn} onClick={onClose}>x</button>}
                </div>

                <form style={styles.form} onSubmit={handleSubmit}>
                    <input
                        style={styles.input}
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="email"
                    />

                    {mode !== 'forgot' && (
                        <input
                            style={styles.input}
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        />
                    )}

                    {mode === 'signup' && (
                        <input
                            style={styles.input}
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                    )}

                    {error && <div style={styles.error}>{error}</div>}

                    <button style={styles.submitBtn} type="submit" disabled={isLoading}>
                        {isLoading ? 'Loading...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
                    </button>
                </form>

                {mode !== 'forgot' && (
                    <>
                        <div style={styles.divider}>
                            <span style={styles.dividerText}>or</span>
                        </div>

                        <button style={styles.googleBtn} onClick={handleGoogle} disabled={isLoading}>
                            Continue with Google
                        </button>
                    </>
                )}

                {/* Mode switcher */}
                <div style={styles.switchRow}>
                    {mode === 'login' && (
                        <>
                            <button style={styles.switchBtn} onClick={() => setMode('signup')}>
                                Create account
                            </button>
                            <button style={styles.switchBtn} onClick={() => setMode('forgot')}>
                                Forgot password?
                            </button>
                        </>
                    )}
                    {mode === 'signup' && (
                        <button style={styles.switchBtn} onClick={() => setMode('login')}>
                            Already have an account? Sign in
                        </button>
                    )}
                    {mode === 'forgot' && (
                        <button style={styles.switchBtn} onClick={() => setMode('login')}>
                            Back to sign in
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        backdropFilter: 'blur(4px)',
    },
    card: {
        width: 380, background: '#1a1f2e', borderRadius: 12,
        border: '1px solid #2a2f3e', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        fontFamily: 'Inter, system-ui, sans-serif',
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.5 },
    closeBtn: {
        background: 'none', border: 'none', color: '#888', cursor: 'pointer',
        fontSize: 18, padding: '2px 6px',
    },
    form: { display: 'flex', flexDirection: 'column', gap: 10 },
    input: {
        padding: '10px 14px', background: '#0f1218', border: '1px solid #2a2f3e',
        borderRadius: 6, color: '#e0e0e0', fontSize: 13, outline: 'none',
        transition: 'border-color 0.15s',
    },
    error: {
        padding: '6px 10px', background: '#ef444420', borderRadius: 4,
        color: '#f87171', fontSize: 11,
    },
    submitBtn: {
        padding: '10px 0', background: '#2563eb', border: 'none', borderRadius: 6,
        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'background 0.15s',
    },
    divider: {
        display: 'flex', alignItems: 'center', gap: 12,
    },
    dividerText: {
        color: '#555', fontSize: 11, flex: 'none',
        padding: '0 4px',
    },
    googleBtn: {
        padding: '10px 0', background: '#ffffff10', border: '1px solid #2a2f3e',
        borderRadius: 6, color: '#ccc', fontSize: 12, fontWeight: 500, cursor: 'pointer',
        transition: 'all 0.15s',
    },
    switchRow: {
        display: 'flex', justifyContent: 'center', gap: 16,
    },
    switchBtn: {
        background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer',
        fontSize: 11, textDecoration: 'underline',
    },
    profileSection: {
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 0',
    },
    avatar: {
        width: 44, height: 44, borderRadius: 22, background: '#2563eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 700, color: '#fff',
    },
    profileInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
    profileEmail: { fontSize: 13, fontWeight: 500, color: '#e0e0e0' },
    profileMeta: { fontSize: 10, color: '#888' },
    signOutBtn: {
        padding: '8px 0', background: 'transparent', border: '1px solid #ef4444',
        borderRadius: 6, color: '#f87171', fontSize: 11, cursor: 'pointer',
    },
};
