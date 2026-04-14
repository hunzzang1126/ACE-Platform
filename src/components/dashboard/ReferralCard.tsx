// ─────────────────────────────────────────────────
// ReferralCard — Invite friends + earn credits
// ─────────────────────────────────────────────────
// Displays referral code, copy link, and referral stats.
// Brand palette: Indigo→Mint gradient accent.
// ─────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAppI18n } from '@/i18n';

export function ReferralCard() {
    const { t } = useAppI18n();
    const user = useAuthStore(s => s.user);
    const [copied, setCopied] = useState(false);

    // Generate deterministic referral code from userId
    const referralCode = useMemo(() => {
        if (!user?.id) return 'ACE-XXXX';
        const hash = user.id.replace(/-/g, '').slice(0, 6).toUpperCase();
        return `ACE-${hash}`;
    }, [user?.id]);

    const referralUrl = `${window.location.origin}/signup?ref=${referralCode}`;

    const copyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(referralUrl);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = referralUrl;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [referralUrl]);

    // Referral stats (placeholder — will connect to Supabase)
    const stats = { invited: 0, active: 0, creditsEarned: 0 };

    return (
        <div style={{
            background: 'var(--bg-surface)', borderRadius: 12,
            border: '1px solid var(--border)', overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '18px 22px 14px',
                background: 'linear-gradient(145deg, rgba(99,102,241,0.06), rgba(45,212,191,0.03))',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                    </div>
                    <div>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {t('referral.title')}
                        </h3>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            {t('referral.desc')}
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Referral Code */}
                <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>
                        {t('referral.codeLabel')}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8,
                            background: 'var(--bg-hover)', border: '1px solid var(--border)',
                            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                            fontFamily: 'monospace', letterSpacing: '0.1em',
                        }}>
                            {referralCode}
                        </div>
                        <button onClick={copyLink} style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                            background: copied ? '#16a34a' : 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                            color: '#fff', whiteSpace: 'nowrap' as const,
                        }}>
                            {copied ? t('referral.copied') : t('referral.copyLink')}
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                        { label: t('referral.invited'), value: stats.invited },
                        { label: t('referral.active'), value: stats.active },
                        { label: t('referral.credits'), value: stats.creditsEarned },
                    ].map(stat => (
                        <div key={stat.label} style={{
                            padding: '10px 12px', borderRadius: 8,
                            background: 'var(--bg-hover)', textAlign: 'center' as const,
                        }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Reward info */}
                <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(45,212,191,0.04)',
                    border: '1px solid rgba(45,212,191,0.08)',
                    fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5,
                }}>
                    {t('referral.rewardInfo')}
                </div>
            </div>
        </div>
    );
}
