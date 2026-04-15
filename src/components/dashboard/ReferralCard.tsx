// ─────────────────────────────────────────────────
// ReferralCard — Compact inline referral section
// ─────────────────────────────────────────────────
// Single-row design: icon + text + code + copy button.
// Much smaller footprint than the previous card layout.
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

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 20px', borderRadius: 10,
            background: 'linear-gradient(145deg, rgba(99,102,241,0.05), rgba(45,212,191,0.03))',
            border: '1px solid var(--border)',
            marginTop: 8,
        }}>
            {/* Icon */}
            <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t('referral.title')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {t('referral.desc')}
                </div>
            </div>

            {/* Code + Copy */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{
                    padding: '6px 10px', borderRadius: 6,
                    background: 'var(--bg-hover)', border: '1px solid var(--border)',
                    fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                    fontFamily: 'monospace', letterSpacing: '0.08em',
                }}>
                    {referralCode}
                </span>
                <button onClick={copyLink} style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: copied ? '#16a34a' : 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                    color: '#fff', whiteSpace: 'nowrap' as const,
                }}>
                    {copied ? t('referral.copied') : t('referral.copyLink')}
                </button>
            </div>
        </div>
    );
}
