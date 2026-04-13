// ─────────────────────────────────────────────────
// ActivityPage — Publish History + Analytics
// ─────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { getRecentPublishes } from '@/services/publish/publishService';
import type { PublishRecord, PublishPlatform } from '@/services/publish/publishTypes';
import { useAppI18n } from '@/i18n';

// ── Platform label + color ──
const PLATFORM_CONFIG: Record<PublishPlatform, { label: string; color: string; icon: string }> = {
    instagram: { label: 'Instagram', color: '#E1306C', icon: 'IG' },
    facebook: { label: 'Facebook', color: '#1877F2', icon: 'FB' },
    google_ads: { label: 'Google Ads', color: '#34A853', icon: 'GA' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    published: { label: 'Published', color: '#34c759', bg: 'rgba(52,199,89,0.12)' },
    publishing: { label: 'Publishing', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    scheduled: { label: 'Scheduled', color: '#0d99ff', bg: 'rgba(13,153,255,0.12)' },
    failed: { label: 'Failed', color: '#ff453a', bg: 'rgba(255,69,58,0.12)' },
    pending: { label: 'Pending', color: '#86868b', bg: 'rgba(134,134,139,0.12)' },
};

export function ActivityPage() {
    const [records, setRecords] = useState<PublishRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'activity' | 'analytics'>('activity');
    const { t } = useAppI18n();

    useEffect(() => {
        getRecentPublishes(50).then(data => {
            setRecords(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <AppSidebar />
            <div style={{
                flex: 1, minWidth: 0, overflow: 'auto',
                background: '#0a0a0f',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
            }}>
                {/* Header */}
                <div style={{
                    padding: '32px 40px 0',
                    maxWidth: 960, margin: '0 auto',
                }}>
                    <h1 style={{
                        fontSize: 28, fontWeight: 700, color: '#f5f5f7',
                        margin: '0 0 8px',
                    }}>
                        {t('activity.title')}
                    </h1>
                    <p style={{ fontSize: 14, color: '#86868b', margin: '0 0 24px' }}>
                        {t('activity.subtitle')}
                    </p>

                    {/* Tab Switcher */}
                    <div style={{
                        display: 'flex', gap: 0,
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        {(['activity', 'analytics'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '10px 20px', fontSize: 13, fontWeight: 600,
                                    background: 'none', border: 'none',
                                    color: activeTab === tab ? '#f5f5f7' : '#555',
                                    borderBottom: activeTab === tab ? '2px solid #0d99ff' : '2px solid transparent',
                                    cursor: 'pointer', textTransform: 'capitalize',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {tab === 'activity' ? t('activity.publishHistory') : t('activity.analytics')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px 40px', maxWidth: 960, margin: '0 auto' }}>
                    {activeTab === 'activity' ? (
                        <ActivityTab records={records} loading={loading} />
                    ) : (
                        <AnalyticsTab records={records} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Activity Tab ──
function ActivityTab({ records, loading }: { records: PublishRecord[]; loading: boolean }) {
    const { t } = useAppI18n();
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#555' }}>
                {t('activity.loading')}
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div style={{
                textAlign: 'center', padding: '80px 20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 16, border: '1px dashed rgba(255,255,255,0.06)',
            }}>
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#555' }}>
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                </div>
                <h3 style={{ color: '#86868b', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
                    {t('activity.noPublished')}
                </h3>
                <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
                    {t('activity.noPublishedHint')}
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {records.map(record => (
                <PublishRow key={record.id} record={record} />
            ))}
        </div>
    );
}

// ── Single publish record row ──
function PublishRow({ record }: { record: PublishRecord }) {
    const { t } = useAppI18n();
    const platform = PLATFORM_CONFIG[record.platform];
    const status = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.pending;
    const date = new Date(record.createdAt);
    const timeAgo = formatTimeAgo(date);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            transition: 'background 0.2s',
        }}>
            {/* Platform badge */}
            <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${platform.color}15`,
                border: `1px solid ${platform.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: platform.color,
                flexShrink: 0,
            }}>
                {platform.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e5e5e7' }}>
                    {record.variantLabel || `${record.platform} post`}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                    {record.caption ? record.caption.slice(0, 60) + (record.caption.length > 60 ? '...' : '') : t('activity.noCaption')}
                </div>
            </div>

            {/* Status */}
            <span style={{
                padding: '3px 10px', borderRadius: 6,
                fontSize: 11, fontWeight: 600,
                color: status.color, background: status.bg,
            }}>
                {status.label}
            </span>

            {/* Time */}
            <span style={{ fontSize: 11, color: '#555', flexShrink: 0, width: 70, textAlign: 'right' }}>
                {timeAgo}
            </span>
        </div>
    );
}

// ── Analytics Tab (placeholder with summary) ──
function AnalyticsTab({ records }: { records: PublishRecord[] }) {
    const { t } = useAppI18n();
    const published = records.filter(r => r.status === 'published');
    const byPlatform = new Map<PublishPlatform, number>();
    for (const r of published) {
        byPlatform.set(r.platform, (byPlatform.get(r.platform) || 0) + 1);
    }

    if (published.length === 0) {
        return (
            <div style={{
                textAlign: 'center', padding: '80px 20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 16, border: '1px dashed rgba(255,255,255,0.06)',
            }}>
                <h3 style={{ color: '#86868b', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
                    {t('activity.noAnalytics')}
                </h3>
                <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
                    {t('activity.noAnalyticsHint')}
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                <MetricCard label={t('activity.totalPublished')} value={published.length.toString()} color="#0d99ff" />
                <MetricCard label={t('activity.platformsUsed')} value={byPlatform.size.toString()} color="#34c759" />
                <MetricCard label={t('activity.thisWeek')} value={
                    published.filter(r => {
                        const d = new Date(r.createdAt);
                        const now = new Date();
                        return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
                    }).length.toString()
                } color="#F59E0B" />
            </div>

            {/* Platform breakdown */}
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#c8c8cc', margin: '0 0 12px' }}>
                {t('activity.platformBreakdown')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from(byPlatform.entries()).map(([platform, count]) => {
                    const config = PLATFORM_CONFIG[platform];
                    const pct = Math.round((count / published.length) * 100);
                    return (
                        <div key={platform} style={{
                            padding: '12px 16px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: config.color }}>
                                    {config.label}
                                </span>
                                <span style={{ fontSize: 12, color: '#86868b' }}>{count} {t('activity.published')}</span>
                            </div>
                            <div style={{
                                height: 4, borderRadius: 2,
                                background: 'rgba(255,255,255,0.06)',
                            }}>
                                <div style={{
                                    height: '100%', borderRadius: 2,
                                    background: config.color,
                                    width: `${pct}%`,
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Placeholder for charts */}
            <div style={{
                marginTop: 24, padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12, border: '1px dashed rgba(255,255,255,0.06)',
            }}>
                <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
                    {t('activity.chartHint')}
                </p>
            </div>
        </div>
    );
}

// ── Summary metric card ──
function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{
            padding: '20px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.04)',
        }}>
            <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 12, color: '#86868b' }}>{label}</div>
        </div>
    );
}

// ── Time ago helper ──
function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
