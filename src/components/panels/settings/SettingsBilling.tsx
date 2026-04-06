// ─────────────────────────────────────────────────
// SettingsBilling — Subscription management + Stripe Portal
// ─────────────────────────────────────────────────

import { useState } from 'react';
import type { User, SubscriptionInfo } from '@/stores/authStore';
import { redirectToPortal } from '@/services/stripeService';
import { Section } from './settingsShared';

interface Props {
    user: User | null;
}

export function SettingsBilling({ user }: Props) {
    const [portalLoading, setPortalLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sub = user?.subscription;
    const isPaid = sub && sub.plan !== 'starter' && sub.status === 'active';
    const isCanceled = sub?.status === 'canceled';

    const handleManageSubscription = async () => {
        if (!user?.id) return;
        setPortalLoading(true);
        setError(null);
        const result = await redirectToPortal(user.id);
        if (result.error) {
            setError(result.error);
            setPortalLoading(false);
        }
        // If no error, page redirects to Stripe Portal
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch { return '-'; }
    };

    return (
        <>
            <Section title="Current Plan">
                <div style={{
                    padding: '16px 20px', borderRadius: 12,
                    background: isPaid ? 'linear-gradient(135deg, rgba(13,153,255,0.08), rgba(99,102,241,0.08))' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isPaid ? 'rgba(13,153,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    marginBottom: 16,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f7', textTransform: 'capitalize' }}>
                                {sub?.plan ?? 'Starter'}
                            </div>
                            <div style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>
                                {isPaid ? 'Active subscription' : isCanceled ? 'Canceled' : 'Free plan'}
                            </div>
                        </div>
                        <div style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: isPaid ? 'rgba(52,199,89,0.12)' : isCanceled ? 'rgba(255,59,48,0.1)' : 'rgba(255,255,255,0.06)',
                            color: isPaid ? '#34c759' : isCanceled ? '#ff6b6b' : '#86868b',
                        }}>
                            {isPaid ? 'Active' : isCanceled ? 'Canceled' : 'Free'}
                        </div>
                    </div>

                    {sub?.currentPeriodEnd && (
                        <div style={{ fontSize: 12, color: '#86868b' }}>
                            {isCanceled
                                ? `Access until ${formatDate(sub.currentPeriodEnd)}`
                                : `Next billing date: ${formatDate(sub.currentPeriodEnd)}`
                            }
                        </div>
                    )}
                </div>
            </Section>

            <Section title="Manage">
                {isPaid ? (
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
                            Your subscription has been canceled. You can still access paid features until the end of your billing period.
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
