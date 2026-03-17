// ─────────────────────────────────────────────────
// UpgradeModal — Shown when user hits a plan limit
// ─────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';

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

const REASON_CONTENT: Record<UpgradeReason, { title: string; description: string; icon: string }> = {
    creative_set_limit: {
        title: 'Creative Set Limit Reached',
        description: 'Upgrade to Pro for unlimited creative sets and accelerate your creative output.',
        icon: '\u25A6', // grid icon
    },
    ai_token_limit: {
        title: 'AI Generation Limit Reached',
        description: 'You\'ve used all your AI generations this month. Upgrade for 1,000+ monthly generations.',
        icon: '\u2726', // sparkle
    },
    export_format: {
        title: 'Export Format Unavailable',
        description: 'This export format requires a Pro plan. Upgrade to access JPG, HTML5, and more.',
        icon: '\u2B95', // arrow
    },
    variant_limit: {
        title: 'Size Variant Limit Reached',
        description: 'Upgrade to Pro for unlimited size variants per creative set.',
        icon: '\u29C9', // overlapping boxes
    },
    brand_cloud: {
        title: 'Brand Cloud is an Enterprise Feature',
        description: 'Get team-wide brand consistency with shared colors, fonts, logos, and AI guidelines.',
        icon: '\u2601', // cloud
    },
    team_seats: {
        title: 'Team Seats Require Enterprise',
        description: 'Invite your team with unlimited seats and centralized billing.',
        icon: '\u2B24', // circle
    },
};

export function UpgradeModal({ isOpen, onClose, reason, currentUsage, limit }: UpgradeModalProps) {
    const navigate = useNavigate();

    if (!isOpen) return null;
    const content = REASON_CONTENT[reason];

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                }}
            />
            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', zIndex: 9999,
                background: 'linear-gradient(135deg, #1e2231, #171c2d)',
                border: '1px solid rgba(129,140,248,0.2)',
                borderRadius: 20, padding: '40px 36px',
                width: 420, maxWidth: '90vw',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}>
                {/* Close */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'none', border: 'none', color: '#64748b',
                        fontSize: 18, cursor: 'pointer', padding: 4,
                    }}
                >
                    x
                </button>

                {/* Icon */}
                <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(192,132,252,0.15))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, marginBottom: 20,
                }}>
                    {content.icon}
                </div>

                {/* Title */}
                <h2 style={{
                    fontSize: 22, fontWeight: 700, color: '#f1f5f9',
                    margin: 0, letterSpacing: '-0.3px',
                }}>
                    {content.title}
                </h2>

                {/* Usage bar (if applicable) */}
                {currentUsage !== undefined && limit !== undefined && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: 12, color: '#94a3b8', marginBottom: 6,
                        }}>
                            <span>Usage</span>
                            <span>{currentUsage} / {limit}</span>
                        </div>
                        <div style={{
                            height: 6, borderRadius: 3,
                            background: 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%', borderRadius: 3,
                                width: `${Math.min(100, (currentUsage / limit) * 100)}%`,
                                background: currentUsage >= limit
                                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                    : 'linear-gradient(90deg, #818cf8, #c084fc)',
                                transition: 'width 0.3s',
                            }} />
                        </div>
                    </div>
                )}

                {/* Description */}
                <p style={{
                    color: '#94a3b8', fontSize: 14, lineHeight: 1.6,
                    margin: '16px 0 28px',
                }}>
                    {content.description}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => { onClose(); navigate('/pricing'); }}
                        style={{
                            flex: 1, padding: '12px 0', borderRadius: 10,
                            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                            border: 'none', color: '#fff', fontSize: 14,
                            fontWeight: 600, cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        View Plans
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 20px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8', fontSize: 14,
                            fontWeight: 500, cursor: 'pointer',
                        }}
                    >
                        Not Now
                    </button>
                </div>
            </div>
        </>
    );
}
