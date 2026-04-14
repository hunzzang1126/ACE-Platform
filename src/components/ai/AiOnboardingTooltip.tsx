// ─────────────────────────────────────────────────
// AiOnboardingTooltip — First-time AI hint overlay
// ─────────────────────────────────────────────────
// Shows once on first editor visit, pointing to the AI panel toggle.
// Dismissed permanently via localStorage flag.
// Brand palette: Indigo→Mint gradient accent.
// ─────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useAppI18n } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';

const STORAGE_KEY = 'ace-ai-onboard-seen';

export function AiOnboardingTooltip() {
    const { t } = useAppI18n();
    const userId = useAuthStore(s => s.user?.id ?? 'anon');
    const key = `${STORAGE_KEY}-${userId}`;
    const [show, setShow] = useState(false);

    useEffect(() => {
        const seen = localStorage.getItem(key);
        if (!seen) {
            // Delay to let editor settle
            const timer = setTimeout(() => setShow(true), 1200);
            return () => clearTimeout(timer);
        }
    }, [key]);

    const dismiss = () => {
        setShow(false);
        localStorage.setItem(key, '1');
    };

    if (!show) return null;

    return (
        <>
            {/* Scrim */}
            <div onClick={dismiss} style={{
                position: 'fixed', inset: 0, zIndex: 999,
                background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)',
                animation: 'fadeIn 0.3s ease',
            }} />

            {/* Tooltip card — positioned near right edge (AI panel toggle) */}
            <div style={{
                position: 'fixed', right: 56, top: '50%', transform: 'translateY(-50%)',
                zIndex: 1000, width: 280, padding: '20px 22px',
                background: '#ffffff', borderRadius: 16,
                boxShadow: '0 16px 48px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
                animation: 'slideInRight 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
                {/* Arrow pointing right */}
                <div style={{
                    position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
                    width: 0, height: 0,
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    borderLeft: '8px solid #ffffff',
                }} />

                {/* AI sparkle icon */}
                <div style={{
                    width: 40, height: 40, borderRadius: 10, marginBottom: 14,
                    background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5">
                        <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z" />
                    </svg>
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                    {t('onboard.aiTitle')}
                </h3>
                <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px' }}>
                    {t('onboard.aiDesc')}
                </p>

                {/* Features list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                    {['onboard.feat1', 'onboard.feat2', 'onboard.feat3'].map(key => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="3,8 7,12 13,4" />
                                </svg>
                            </div>
                            <span style={{ fontSize: 11, color: '#334155' }}>{t(key)}</span>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={dismiss} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                        border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', transition: 'opacity 0.2s',
                    }}>
                        {t('onboard.gotIt')}
                    </button>
                </div>

                {/* Keyboard shortcut hint */}
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                        {t('onboard.shortcut')}
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideInRight { from { opacity: 0; transform: translate(20px, -50%); } to { opacity: 1; transform: translate(0, -50%); } }
            `}</style>
        </>
    );
}
