// ─────────────────────────────────────────────────
// UpgradeModal — Premium upsell when user hits plan limits
// ─────────────────────────────────────────────────
// Brand-compliant: Indigo→Mint gradient, dark navy BG.
// i18n-ready, shows feature comparison chips.
// ─────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import { useAppI18n } from '@/i18n';

export type UpgradeReason =
    | 'creative_set_limit'
    | 'ai_token_limit'
    | 'export_format'
    | 'variant_limit'
    | 'brand_cloud'
    | 'team_seats';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason: UpgradeReason;
    currentUsage?: number;
    limit?: number;
}

const REASON_KEYS: Record<UpgradeReason, { titleKey: string; descKey: string; icon: string; features: string[] }> = {
    creative_set_limit: {
        titleKey: 'upgrade.setLimit', descKey: 'upgrade.setLimitDesc', icon: '\u25A6',
        features: ['upgrade.featureUnlimitedSets', 'upgrade.featureAllExports', 'upgrade.featureAi300'],
    },
    ai_token_limit: {
        titleKey: 'upgrade.aiLimit', descKey: 'upgrade.aiLimitDesc', icon: '\u2726',
        features: ['upgrade.featureAi300', 'upgrade.featurePriorityAi', 'upgrade.featureAllModels'],
    },
    export_format: {
        titleKey: 'upgrade.exportLimit', descKey: 'upgrade.exportLimitDesc', icon: '\u2B95',
        features: ['upgrade.featureAllExports', 'upgrade.featureNoWatermark', 'upgrade.featureGif'],
    },
    variant_limit: {
        titleKey: 'upgrade.variantLimit', descKey: 'upgrade.variantLimitDesc', icon: '\u29C9',
        features: ['upgrade.featureUnlimitedVariants', 'upgrade.featureSmartSizing', 'upgrade.featureAllExports'],
    },
    brand_cloud: {
        titleKey: 'upgrade.brandCloud', descKey: 'upgrade.brandCloudDesc', icon: '\u2601',
        features: ['upgrade.featureUnlimitedBrands', 'upgrade.featureTeamSharing', 'upgrade.featureAiGuidelines'],
    },
    team_seats: {
        titleKey: 'upgrade.teamSeats', descKey: 'upgrade.teamSeatsDesc', icon: '\u2B24',
        features: ['upgrade.featureUnlimitedSeats', 'upgrade.featureCentralBilling', 'upgrade.featureAdminPanel'],
    },
};

export function UpgradeModal({ isOpen, onClose, reason, currentUsage, limit }: UpgradeModalProps) {
    const navigate = useNavigate();
    const { t } = useAppI18n();

    if (!isOpen) return null;
    const content = REASON_KEYS[reason];

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            }} />
            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', zIndex: 9999,
                background: 'linear-gradient(145deg, #0B0F1A, #131929)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 20, padding: '40px 36px',
                width: 440, maxWidth: '90vw',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.08)',
            }}>
                {/* Gradient glow at top */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, #6366F1, #2DD4BF)',
                    borderRadius: '20px 20px 0 0',
                }} />

                {/* Close */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'rgba(255,255,255,0.06)', border: 'none',
                    color: '#64748b', fontSize: 14, cursor: 'pointer',
                    width: 28, height: 28, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                   onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
                    x
                </button>

                {/* Icon */}
                <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(45,212,191,0.15))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, marginBottom: 20, color: '#818cf8',
                }}>
                    {content.icon}
                </div>

                {/* Title */}
                <h2 style={{
                    fontSize: 20, fontWeight: 700, color: '#F1F5F9',
                    margin: 0, letterSpacing: '-0.3px',
                }}>
                    {t(content.titleKey) || content.titleKey}
                </h2>

                {/* Usage bar */}
                {currentUsage !== undefined && limit !== undefined && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                            <span>{t('upgrade.usage') || 'Usage'}</span>
                            <span>{currentUsage} / {limit}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 3,
                                width: `${Math.min(100, (currentUsage / limit) * 100)}%`,
                                background: currentUsage >= limit
                                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                    : 'linear-gradient(90deg, #6366F1, #2DD4BF)',
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                    </div>
                )}

                {/* Description */}
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: '16px 0 20px' }}>
                    {t(content.descKey) || content.descKey}
                </p>

                {/* Feature chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {content.features.map(fk => (
                        <span key={fk} style={{
                            fontSize: 11, fontWeight: 500, color: '#2DD4BF',
                            background: 'rgba(45,212,191,0.08)',
                            border: '1px solid rgba(45,212,191,0.15)',
                            padding: '4px 10px', borderRadius: 6,
                        }}>
                            {t(fk) || fk.split('.').pop()}
                        </span>
                    ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => { onClose(); navigate('/pricing'); }}
                        style={{
                            flex: 1, padding: '13px 0', borderRadius: 10,
                            background: 'linear-gradient(135deg, #6366F1, #2DD4BF)',
                            border: 'none', color: '#fff', fontSize: 14,
                            fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s',
                            letterSpacing: '-0.2px',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        {t('upgrade.viewPlans') || 'View Plans'}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '13px 20px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#64748b', fontSize: 14,
                            fontWeight: 500, cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    >
                        {t('upgrade.notNow') || 'Not Now'}
                    </button>
                </div>
            </div>
        </>
    );
}
