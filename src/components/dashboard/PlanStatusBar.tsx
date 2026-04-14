// ─────────────────────────────────────────────────
// PlanStatusBar — Displays current plan, AI usage, upgrade CTA
// ─────────────────────────────────────────────────
// Reusable bar showing plan badge, AI token progress, and action button.
// Brand-palette: admin=amber, starter=muted, paid=accent.
// ─────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useAppI18n } from '@/i18n';

export function PlanStatusBar() {
    const navigate = useNavigate();
    const { t } = useAppI18n();
    const { planName, remainingTokens, isStarter, isAdmin, aiUsagePercent } = usePlanLimits();

    return (
        <div style={{
            display: 'flex', gap: 12, padding: '10px 24px', marginBottom: 12,
            fontSize: 13, alignItems: 'center',
            background: 'var(--bg-surface)', borderRadius: 8,
            border: '1px solid var(--border)',
        }}>
            {/* Plan badge */}
            <span style={{
                padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: 11,
                letterSpacing: '0.05em', textTransform: 'uppercase' as const,
                background: isAdmin ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                           isStarter ? 'var(--bg-hover)' :
                           'var(--accent-muted)',
                color: isAdmin ? '#fff' : isStarter ? 'var(--text-muted)' : 'var(--accent)',
            }}>
                {planName}
            </span>

            {/* Usage or admin label */}
            {isAdmin ? (
                <span style={{ color: '#d97706', fontWeight: 600 }}>{t('dash.unlimitedAccess')}</span>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' as const }}>{t('dash.aiTokens')}</span>
                    <div style={{ width: 120, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.min(100, aiUsagePercent)}%`, height: '100%', borderRadius: 3,
                            transition: 'width 0.3s ease',
                            background: aiUsagePercent > 80 ? 'var(--error)' : aiUsagePercent > 50 ? '#f59e0b' : 'var(--accent)',
                        }} />
                    </div>
                    <span style={{ color: aiUsagePercent > 80 ? 'var(--error)' : 'var(--text-primary)', fontWeight: 600, fontSize: 12 }}>
                        {remainingTokens.toLocaleString()} {t('dash.left')}
                    </span>
                </div>
            )}

            {/* Action button */}
            <button
                onClick={() => navigate('/pricing')}
                style={{
                    background: 'none', border: '1px solid var(--accent-muted)',
                    color: 'var(--accent)', fontSize: 12, cursor: 'pointer',
                    padding: '4px 12px', borderRadius: 6, marginLeft: 'auto',
                    transition: 'all 0.2s ease', fontWeight: 500,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-muted)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
                {isStarter ? t('dash.upgrade') : t('dash.managePlan')}
            </button>
        </div>
    );
}
