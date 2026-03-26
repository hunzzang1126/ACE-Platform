// ─────────────────────────────────────────────────
// OAuthCallback — Handles OAuth redirects from Meta/Google
// ─────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { handleMetaCallback, handleGoogleAdsCallback } from '@/services/publish/socialAccountService';

export function OAuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Connecting your account...');

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            setMessage(`Authorization denied: ${error}`);
            return;
        }

        if (!code) {
            setStatus('error');
            setMessage('No authorization code received');
            return;
        }

        // Determine platform from path
        const path = location.pathname;
        let handler: Promise<any>;

        if (path.includes('/meta')) {
            handler = handleMetaCallback(code);
        } else if (path.includes('/google-ads')) {
            handler = handleGoogleAdsCallback(code);
        } else {
            setStatus('error');
            setMessage('Unknown callback type');
            return;
        }

        handler.then(account => {
            console.log('[OAuth] Handler result:', account);
            if (account) {
                setStatus('success');
                setMessage(`Connected: ${account.accountName}`);
                // If opened as popup, notify parent and close
                if (window.opener) {
                    try {
                        window.opener.postMessage({ type: 'OAUTH_SUCCESS', platform: account.platform, accountName: account.accountName }, '*');
                    } catch { /* cross-origin */ }
                    setTimeout(() => window.close(), 1500);
                } else {
                    setTimeout(() => navigate('/dashboard'), 2000);
                }
            } else {
                setStatus('error');
                setMessage('Failed to connect account. Check console for details.');
            }
        }).catch(async (err) => {
            console.error('[OAuth] Handler error:', err);
            let detail = err?.message || 'Unknown error';
            try {
                const ctx = (err as any)?.context;
                if (ctx && typeof ctx.json === 'function') {
                    const body = await ctx.json();
                    detail = body?.details || body?.error || detail;
                }
            } catch { /* ignore */ }
            setStatus('error');
            setMessage(`Error: ${detail}`);
        });
    }, [searchParams, location.pathname, navigate]);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: '#0a0a0f',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
        }}>
            <div style={{
                textAlign: 'center', padding: '40px 60px',
                background: '#111318', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.08)',
            }}>
                {status === 'processing' && (
                    <div style={{
                        width: 32, height: 32, margin: '0 auto 16px',
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTopColor: '#0d99ff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                )}
                {status === 'success' && (
                    <div style={{ fontSize: 32, marginBottom: 16, color: '#34c759' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                )}
                {status === 'error' && (
                    <div style={{ fontSize: 32, marginBottom: 16, color: '#ff453a' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </div>
                )}
                <p style={{
                    fontSize: 15, fontWeight: 500,
                    color: status === 'error' ? '#ff453a' : status === 'success' ? '#34c759' : '#e5e5e7',
                    margin: 0,
                }}>
                    {message}
                </p>
                {status === 'error' && (
                    <button
                        onClick={() => {
                            if (window.opener) {
                                window.close();
                            } else {
                                navigate('/dashboard');
                            }
                        }}
                        style={{
                            marginTop: 16, padding: '8px 20px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#c8c8cc', fontSize: 13, cursor: 'pointer',
                        }}
                    >
                        {window.opener ? 'Close' : 'Back to Dashboard'}
                    </button>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    );
}
