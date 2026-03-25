// ─────────────────────────────────────────────────
// CampaignDashboard — Multi-format campaign overview
// ─────────────────────────────────────────────────
// Shows all campaigns with format thumbnails, status,
// and progress. Click a campaign to expand and edit
// individual creative sets.
// ─────────────────────────────────────────────────

import React, { useState } from 'react';
import { useCampaignStore } from '@/stores/campaignStore';
import { getPackById } from '@/schema/campaignPacks';
import { getPresetById } from '@/schema/presets';
import type { Campaign } from '@/schema/campaignTypes';

// ── Status Badge ──

function StatusBadge({ status }: { status: Campaign['status'] }) {
    const config = {
        generating: { label: 'Generating', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
        ready: { label: 'Ready', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
        error: { label: 'Error', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    }[status];

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            color: config.color, background: config.bg,
            padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em',
        }}>
            <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: config.color,
                animation: status === 'generating' ? 'pulse 1.5s infinite' : 'none',
            }} />
            {config.label}
        </span>
    );
}

// ── Campaign Card ──

function CampaignCard({
    campaign,
    onOpenCreativeSet,
}: {
    campaign: Campaign;
    onOpenCreativeSet?: (csId: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const pack = getPackById(campaign.packId);
    const deleteCampaign = useCampaignStore(s => s.deleteCampaign);

    return (
        <div style={{
            background: '#1E1E2E',
            border: '1px solid #2D2D3D',
            borderRadius: 12,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
        }}>
            {/* Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
            >
                <div>
                    <h3 style={{ color: '#F8FAFC', fontSize: 16, fontWeight: 600, margin: 0 }}>
                        {campaign.name}
                    </h3>
                    <p style={{ color: '#64748B', fontSize: 13, margin: '4px 0 0' }}>
                        {campaign.prompt.length > 80 ? campaign.prompt.slice(0, 80) + '...' : campaign.prompt}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <StatusBadge status={campaign.status} />
                    <span style={{ color: '#64748B', fontSize: 14 }}>
                        {expanded ? '\u25B2' : '\u25BC'}
                    </span>
                </div>
            </div>

            {/* Progress Bar (generating) */}
            {campaign.status === 'generating' && (
                <div style={{ padding: '0 20px 12px' }}>
                    <div style={{
                        height: 3, borderRadius: 2,
                        background: '#2D2D3D', overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 2,
                            background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                            width: `${campaign.progress * 100}%`,
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                </div>
            )}

            {/* DNA Palette Preview */}
            <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6 }}>
                {Object.values(campaign.dna.palette).map((color, i) => (
                    <div
                        key={i}
                        style={{
                            width: 20, height: 20, borderRadius: 4,
                            background: color,
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        title={color}
                    />
                ))}
                <span style={{ color: '#64748B', fontSize: 12, marginLeft: 8, alignSelf: 'center' }}>
                    {pack?.name ?? campaign.packId} · {campaign.creativeSetIds.length} formats
                </span>
            </div>

            {/* Expanded: Format Grid */}
            {expanded && (
                <div style={{
                    padding: '12px 20px 20px',
                    borderTop: '1px solid #2D2D3D',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 12,
                }}>
                    {campaign.creativeSetIds.map((csId, idx) => {
                        const presetId = pack?.presetIds[idx];
                        const preset = presetId ? getPresetById(presetId) : undefined;
                        return (
                            <button
                                key={csId}
                                onClick={() => onOpenCreativeSet?.(csId)}
                                style={{
                                    background: '#16162A',
                                    border: '1px solid #2D2D3D',
                                    borderRadius: 8, padding: 12,
                                    cursor: 'pointer', textAlign: 'center',
                                    transition: 'border-color 0.2s, transform 0.15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = '#6366F1';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = '#2D2D3D';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                {/* Size preview box */}
                                <div style={{
                                    width: '100%', height: 60,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 8,
                                }}>
                                    <div style={{
                                        background: campaign.dna.palette.background,
                                        border: `1px solid ${campaign.dna.palette.primary}`,
                                        borderRadius: 4,
                                        width: Math.min(60, preset ? (preset.width / preset.height) * 40 : 40),
                                        height: Math.min(60, preset ? (preset.height / preset.width) * 40 : 40),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 8, color: campaign.dna.palette.text,
                                    }}>
                                        {preset ? `${preset.width}` : ''}
                                    </div>
                                </div>
                                <div style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 500 }}>
                                    {preset?.name ?? `Format ${idx + 1}`}
                                </div>
                                <div style={{ color: '#64748B', fontSize: 10 }}>
                                    {preset ? `${preset.width} x ${preset.height}` : ''}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Footer Actions */}
            {expanded && (
                <div style={{
                    padding: '0 20px 16px',
                    display: 'flex', justifyContent: 'flex-end', gap: 8,
                }}>
                    <button
                        onClick={() => deleteCampaign(campaign.id)}
                        style={{
                            background: 'transparent', border: '1px solid #EF4444',
                            color: '#EF4444', padding: '6px 16px', borderRadius: 6,
                            fontSize: 12, cursor: 'pointer', fontWeight: 500,
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main Dashboard ──

export function CampaignDashboard({
    onOpenCreativeSet,
}: {
    onOpenCreativeSet?: (csId: string) => void;
}) {
    const campaigns = useCampaignStore(s => s.campaigns);

    return (
        <div style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 24,
            }}>
                <h2 style={{ color: '#F8FAFC', fontSize: 22, fontWeight: 700, margin: 0 }}>
                    Campaigns
                </h2>
                <span style={{ color: '#64748B', fontSize: 13 }}>
                    {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
                </span>
            </div>

            {campaigns.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: '#1E1E2E', borderRadius: 12,
                    border: '1px dashed #2D2D3D',
                }}>
                    <p style={{ color: '#64748B', fontSize: 15, margin: '0 0 8px' }}>
                        No campaigns yet
                    </p>
                    <p style={{ color: '#475569', fontSize: 13 }}>
                        Use AI chat to create one: "Create a Black Friday campaign"
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[...campaigns].reverse().map(c => (
                        <CampaignCard
                            key={c.id}
                            campaign={c}
                            onOpenCreativeSet={onOpenCreativeSet}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
