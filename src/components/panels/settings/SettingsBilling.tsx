// ─────────────────────────────────────────────────
// SettingsBilling — Subscription management + Stripe Portal
// ─────────────────────────────────────────────────

import { useState } from 'react';
import type { User } from '@/stores/authStore';
import { redirectToPortal } from '@/services/stripeService';
import { Section } from './settingsShared';

interface Props {
    user: User | null;
}

export function SettingsBilling({ user }: Props) {
    const [portalLoading, setPortalLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sub = user?.subscription;

    // State derivation
    const isPaid = sub && sub.plan !== 'starter' && sub.status === 'active' && !sub.cancelAtPeriodEnd;
    const isCanceling = sub && sub.status === 'active' && sub.cancelAtPeriodEnd;
    const isCanceled = sub?.status === 'canceled';
    const isFree = !sub || sub.plan === 'starter';

    const handleManageSubscription = async () => {
        if (!user?.id) return;
        setPortalLoading(true);
        setError(null);
        const result = await redirectToPortal(user.id);
        if (result.error) {
            setError(result.error);
            setPortalLoading(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch { return '-'; }
    };

    // Determine display state
    const statusLabel = isCanceling ? 'Canceling' : isPaid ? 'Active' : isCanceled ? 'Canceled' : 'Free';
    const statusColor = isCanceling ? '#ff9f0a' : isPaid ? '#34c759' : isCanceled ? '#ff6b6b' : '#86868b';
    const statusBg = isCanceling ? 'rgba(255,159,10,0.12)' : isPaid ? 'rgba(52,199,89,0.12)' : isCanceled ? 'rgba(255,59,48,0.1)' : 'rgba(255,255,255,0.06)';
    const cardBg = (isPaid || isCanceling) ? 'linear-gradient(135deg, rgba(13,153,255,0.08), rgba(99,102,241,0.08))' : 'rgba(255,255,255,0.03)';
    const cardBorder = (isPaid || isCanceling) ? 'rgba(13,153,255,0.15)' : 'rgba(255,255,255,0.06)';

    return (
        <>
            <Section title="Current Plan">
                <div style={{
                    padding: '16px 20px', borderRadius: 12,
                    background: cardBg, border: `1px solid ${cardBorder}`,
                    marginBottom: 16,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f7', textTransform: 'capitalize' }}>
                                {sub?.plan ?? 'Starter'}
                            </div>
                            <div style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>
                                {isCanceling ? 'Scheduled to cancel'
                                    : isPaid ? 'Active subscription'
                                    : isCanceled ? 'Subscription ended'
                                    : 'Free plan'}
                            </div>
                        </div>
                        <div style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: statusBg, color: statusColor,
                        }}>
                            {statusLabel}
                        </div>
                    </div>

                    {sub?.currentPeriodEnd && (
                        <div style={{ fontSize: 12, color: isCanceling ? '#ff9f0a' : '#86868b' }}>
                            {isCanceling
                                ? `Access until ${formatDate(sub.currentPeriodEnd)}. After this date your plan will be downgraded to Starter.`
                                : isCanceled
                                ? `Your paid access ended on ${formatDate(sub.currentPeriodEnd)}.`
                                : `Next billing date: ${formatDate(sub.currentPeriodEnd)}`
                            }
                        </div>
                    )}
                </div>
            </Section>

            <Section title="Manage">
                {isCanceling ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p style={{ fontSize: 13, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
                            Your subscription will be canceled at the end of the current billing period. You can reactivate it before then.
                        </p>
                        <button onClick={handleManageSubscription} disabled={portalLoading} style={primaryBtnStyle}>
                            {portalLoading ? 'Opening...' : 'Reactivate Subscription'}
                        </button>
                        <p style={{ fontSize: 11, color: '#555', margin: 0, lineHeight: 1.4 }}>
                            Opens Stripe's secure portal to manage your subscription.
                        </p>
                    </div>
                ) : isPaid ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button onClick={handleManageSubscription} disabled={portalLoading} style={primaryBtnStyle}>
                            {portalLoading ? 'Opening...' : 'Manage Subscription'}
                        </button>
                        <p style={{ fontSize: 11, color: '#555', margin: 0, lineHeight: 1.4 }}>
                            Change plan, update payment method, or cancel via Stripe's secure portal.
                        </p>
                    </div>
                ) : isCanceled ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p style={{ fontSize: 13, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
                            Your subscription has ended and your plan has been downgraded to Starter.
                        </p>
                        <button
                            onClick={() => window.location.href = '/pricing'}
                            style={primaryBtnStyle}
                        >
                            Resubscribe
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p style={{ fontSize: 13, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
                            Upgrade to unlock unlimited creative sets, AI generations, and export formats.
                        </p>
                        <button
                            onClick={() => window.location.href = '/pricing'}
                            style={primaryBtnStyle}
                        >
                            View Plans
                        </button>
                    </div>
                )}

                {error && (
                    <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.15)', color: '#ff6b6b', fontSize: 12 }}>
                        {error}
                    </div>
                )}
            </Section>
        </>
    );
}

const primaryBtnStyle: React.CSSProperties = {
    padding: '10px 16px', borderRadius: 10,
    background: 'rgba(13,153,255,0.1)',
    border: '1px solid rgba(13,153,255,0.2)',
    color: '#0d99ff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
    width: '100%',
};
