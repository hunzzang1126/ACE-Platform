// ─────────────────────────────────────────────────
// PublishModal — Bulk publish with auto-routing
// ─────────────────────────────────────────────────
// Opens from Size Dashboard. Shows all variants grouped
// by platform with caption/tag inputs per channel.
// ─────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { groupVariantsByPlatform } from '@/services/publish/sizeRouter';
import { getConnectedAccounts } from '@/services/publish/socialAccountService';
import { publishVariant } from '@/services/publish/publishService';
import type { SocialAccount, PublishPlatform } from '@/services/publish/publishTypes';

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    creativeSetId: string;
    variants: Array<{ id: string; label: string; width: number; height: number }>;
    onExportVariant: (variantId: string) => Promise<string>; // returns dataUrl
}

const PLATFORM_LABELS: Record<PublishPlatform, { name: string; color: string; desc: string }> = {
    instagram: { name: 'Instagram', color: '#E1306C', desc: 'Feed, Stories, Reels' },
    facebook: { name: 'Facebook', color: '#1877F2', desc: 'Feed, Stories, Link Ads' },
    google_ads: { name: 'Google Ads', color: '#34A853', desc: 'Display Network banners' },
};

interface ChannelData {
    enabled: boolean;
    caption: string;
    hashtags: string;
    headlines: string;
    accountId: string;
}

export function PublishModal({ isOpen, onClose, creativeSetId, variants, onExportVariant }: PublishModalProps) {
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [publishResults, setPublishResults] = useState<Array<{ variantId: string; platform: string; status: string }>>([]);

    // Group variants by platform
    const grouped = groupVariantsByPlatform(variants);

    // Per-channel form data
    const [channels, setChannels] = useState<Record<PublishPlatform, ChannelData>>({
        instagram: { enabled: true, caption: '', hashtags: '', headlines: '', accountId: '' },
        facebook: { enabled: true, caption: '', hashtags: '', headlines: '', accountId: '' },
        google_ads: { enabled: true, caption: '', hashtags: '', headlines: '', accountId: '' },
    });

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setPublishResults([]);
            getConnectedAccounts().then(accs => {
                setAccounts(accs);
                // Auto-select first account per platform
                const next = { ...channels };
                for (const acc of accs) {
                    if (next[acc.platform] && !next[acc.platform].accountId) {
                        next[acc.platform].accountId = acc.id;
                    }
                }
                setChannels(next);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const updateChannel = useCallback((platform: PublishPlatform, patch: Partial<ChannelData>) => {
        setChannels(prev => ({
            ...prev,
            [platform]: { ...prev[platform], ...patch },
        }));
    }, []);

    const handlePublish = useCallback(async () => {
        setPublishing(true);
        const results: typeof publishResults = [];

        for (const [platform, variantList] of grouped) {
            const ch = channels[platform];
            if (!ch.enabled || !ch.accountId) continue;

            for (const v of variantList) {
                try {
                    const imageDataUrl = await onExportVariant(v.variantId);
                    const result = await publishVariant({
                        creativeSetId,
                        variantId: v.variantId,
                        variantLabel: v.label,
                        platform,
                        socialAccountId: ch.accountId,
                        imageDataUrl,
                        width: v.width,
                        height: v.height,
                        caption: ch.caption,
                        hashtags: ch.hashtags ? ch.hashtags.split(' ').filter(Boolean) : undefined,
                        headlines: ch.headlines ? ch.headlines.split('\n').filter(Boolean) : undefined,
                    });
                    results.push({
                        variantId: v.variantId,
                        platform,
                        status: result?.status || 'failed',
                    });
                } catch {
                    results.push({ variantId: v.variantId, platform, status: 'failed' });
                }
            }
        }

        setPublishResults(results);
        setPublishing(false);
    }, [grouped, channels, onExportVariant, creativeSetId]);

    if (!isOpen) return null;

    const totalVariants = Array.from(grouped.values()).reduce((sum, list) => sum + list.length, 0);
    const enabledPlatforms = (Object.keys(channels) as PublishPlatform[]).filter(
        p => channels[p].enabled && grouped.has(p)
    );

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 580, maxHeight: '85vh',
                background: '#111318', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                zIndex: 9999, display: 'flex', flexDirection: 'column',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>
                            Publish Creative Set
                        </h2>
                        <p style={{ fontSize: 12, color: '#86868b', margin: '4px 0 0' }}>
                            {totalVariants} size{totalVariants !== 1 ? 's' : ''} auto-routed to {grouped.size} platform{grouped.size !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: '#86868b',
                            cursor: 'pointer', fontSize: 18, padding: '4px 8px',
                        }}
                    >
                        x
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#555' }}>
                            Loading accounts...
                        </div>
                    ) : (
                        <>
                            {(Object.keys(PLATFORM_LABELS) as PublishPlatform[]).map(platform => {
                                const pVariants = grouped.get(platform);
                                if (!pVariants || pVariants.length === 0) return null;

                                const ch = channels[platform];
                                const platformAccounts = accounts.filter(a => a.platform === platform);
                                const config = PLATFORM_LABELS[platform];

                                return (
                                    <div key={platform} style={{
                                        marginBottom: 16, borderRadius: 12,
                                        background: 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${ch.enabled ? config.color + '30' : 'rgba(255,255,255,0.04)'}`,
                                        overflow: 'hidden',
                                        transition: 'border-color 0.2s',
                                    }}>
                                        {/* Platform header */}
                                        <div
                                            style={{
                                                padding: '12px 16px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => updateChannel(platform, { enabled: !ch.enabled })}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: ch.enabled ? config.color : '#333',
                                                    transition: 'background 0.2s',
                                                }} />
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e5e5e7' }}>
                                                        {config.name}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#666' }}>
                                                        {pVariants.length} size{pVariants.length !== 1 ? 's' : ''} — {config.desc}
                                                    </div>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: 11, color: '#555' }}>
                                                {ch.enabled ? 'ON' : 'OFF'}
                                            </span>
                                        </div>

                                        {/* Expanded content */}
                                        {ch.enabled && (
                                            <div style={{ padding: '0 16px 16px' }}>
                                                {/* Variant chips */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                                    {pVariants.map(v => (
                                                        <span key={v.variantId} style={{
                                                            padding: '3px 8px', borderRadius: 4,
                                                            fontSize: 10, fontWeight: 500,
                                                            background: `${config.color}12`,
                                                            color: config.color,
                                                            border: `1px solid ${config.color}25`,
                                                        }}>
                                                            {v.width}x{v.height} — {v.platformLabel}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Account selector */}
                                                {platformAccounts.length > 0 ? (
                                                    <select
                                                        value={ch.accountId}
                                                        onChange={e => updateChannel(platform, { accountId: e.target.value })}
                                                        style={inputStyle}
                                                    >
                                                        {platformAccounts.map(a => (
                                                            <option key={a.id} value={a.id}>
                                                                {a.accountName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div style={{
                                                        padding: '8px 12px', borderRadius: 8,
                                                        background: 'rgba(255,153,0,0.08)',
                                                        border: '1px solid rgba(255,153,0,0.15)',
                                                        fontSize: 12, color: '#ff9500',
                                                    }}>
                                                        No {config.name} account connected — go to Settings to connect
                                                    </div>
                                                )}

                                                {/* Caption / Tags */}
                                                {(platform === 'instagram' || platform === 'facebook') && (
                                                    <>
                                                        <textarea
                                                            placeholder="Caption..."
                                                            value={ch.caption}
                                                            onChange={e => updateChannel(platform, { caption: e.target.value })}
                                                            rows={2}
                                                            style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
                                                        />
                                                        <input
                                                            placeholder="#hashtag1 #hashtag2 #hashtag3"
                                                            value={ch.hashtags}
                                                            onChange={e => updateChannel(platform, { hashtags: e.target.value })}
                                                            style={{ ...inputStyle, marginTop: 6 }}
                                                        />
                                                    </>
                                                )}
                                                {platform === 'google_ads' && (
                                                    <textarea
                                                        placeholder="Headlines (one per line)"
                                                        value={ch.headlines}
                                                        onChange={e => updateChannel(platform, { headlines: e.target.value })}
                                                        rows={2}
                                                        style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Results */}
                            {publishResults.length > 0 && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: 10, marginTop: 8,
                                    background: 'rgba(52,199,89,0.08)',
                                    border: '1px solid rgba(52,199,89,0.15)',
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#34c759', marginBottom: 6 }}>
                                        Publish Results
                                    </div>
                                    {publishResults.map((r, i) => (
                                        <div key={i} style={{ fontSize: 12, color: '#c8c8cc', marginTop: 2 }}>
                                            {r.platform}: {r.status === 'published' ? 'Success' : r.status}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <button onClick={onClose} style={secondaryBtnStyle}>
                        Cancel
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={publishing || enabledPlatforms.length === 0}
                        style={{
                            ...primaryBtnStyle,
                            opacity: (publishing || enabledPlatforms.length === 0) ? 0.5 : 1,
                        }}
                    >
                        {publishing ? 'Publishing...' : `Publish to ${enabledPlatforms.length} Platform${enabledPlatforms.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Styles ──
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e5e5e7', fontSize: 12, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
};

const primaryBtnStyle: React.CSSProperties = {
    padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    background: 'linear-gradient(135deg, #0d99ff, #0077cc)',
    border: 'none', color: '#fff', cursor: 'pointer',
    transition: 'opacity 0.2s',
};

const secondaryBtnStyle: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#86868b', cursor: 'pointer',
};
