// ─────────────────────────────────────────────────
// SizeSidebar – Left panel with size list + toggles
// ─────────────────────────────────────────────────
import { useState } from 'react';
import type { BannerVariant, SizingMode } from '@/schema/design.types';
import { useAppI18n } from '@/i18n';

interface Props {
    variants: BannerVariant[];
    visibleIds: Set<string>;
    onToggleVisibility: (id: string) => void;
    onAddSizeClick: () => void;
    sizingMode?: SizingMode;
    onSizingModeChange?: (mode: SizingMode) => void;
    isPlaying?: boolean;
    onTogglePlay?: () => void;
}

interface StatusCounts {
    noStatus: number;
    notApproved: number;
    inProgress: number;
    forReview: number;
    approved: number;
}

export function SizeSidebar({ variants, visibleIds, onToggleVisibility, onAddSizeClick, sizingMode = 'uniform', onSizingModeChange, isPlaying = false, onTogglePlay }: Props) {
    const { t } = useAppI18n();
    const [sizesExpanded, setSizesExpanded] = useState(true);
    const [statusExpanded, setStatusExpanded] = useState(true);

    const statusCounts: StatusCounts = {
        noStatus: variants.length,
        notApproved: 0,
        inProgress: 0,
        forReview: 0,
        approved: 0,
    };

    return (
        <aside className="cs-sidebar">
            {/* Add Size Button */}
            <div className="cs-sidebar-header">
                <button className="cs-sidebar-add-btn" onClick={onAddSizeClick}>
                    {t('size.addSize')}
                </button>
            </div>

            {/* Sizing Mode Toggle */}
            <div className="cs-sidebar-section">
                <div className="cs-sidebar-section-header" style={{ cursor: 'default', fontSize: 11, color: '#8b949e', padding: '6px 12px' }}>
                    {t('size.sizingMode')}
                </div>
                <div style={{ display: 'flex', gap: 4, padding: '0 12px 8px' }}>
                    {(['uniform', 'edge-pin'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => onSizingModeChange?.(mode)}
                            style={{
                                flex: 1, padding: '5px 8px', fontSize: 10, fontWeight: 600,
                                borderRadius: 4, border: '1px solid',
                                borderColor: sizingMode === mode ? '#0D99FF' : 'rgba(255,255,255,0.08)',
                                background: sizingMode === mode ? 'rgba(13,153,255,0.15)' : 'rgba(255,255,255,0.03)',
                                color: sizingMode === mode ? '#0D99FF' : '#8b949e',
                                cursor: 'pointer', transition: 'all 0.15s',
                                letterSpacing: '0.03em',
                            }}
                        >
                            {mode === 'uniform' ? t('size.uniform') : t('size.edgePin')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Playback Controls */}
            <div className="cs-sidebar-section">
                <div className="cs-sidebar-playback">
                    <button
                        className={`cs-play-btn ${isPlaying ? 'cs-play-btn--active' : ''}`}
                        onClick={onTogglePlay}
                        title={isPlaying ? 'Stop preview (Space)' : 'Play preview (Space)'}
                    >
                        {isPlaying ? t('size.stop') : t('size.play')}
                    </button>
                    <span className="cs-play-hint">Space</span>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="cs-sidebar-section">
                <button className="cs-sidebar-section-header">
                    <span>{t('size.settings')}: {t('size.quickFilters')}</span>
                    <span className="cs-sidebar-chevron">›</span>
                </button>
            </div>

            {/* Sizes List */}
            <div className="cs-sidebar-section">
                <button
                    className="cs-sidebar-section-header"
                    onClick={() => setSizesExpanded(!sizesExpanded)}
                >
                    <span>{t('size.sizes')}</span>
                    <span className={`cs-sidebar-chevron ${sizesExpanded ? 'expanded' : ''}`}>›</span>
                </button>
                {sizesExpanded && (
                    <div className="cs-sidebar-sizes">
                        {variants.map((v) => {
                            const isVisible = visibleIds.has(v.id);
                            return (
                                <button
                                    key={v.id}
                                    className={`cs-size-item ${isVisible ? 'visible' : 'hidden'}`}
                                    onClick={() => onToggleVisibility(v.id)}
                                    title={`${v.preset.width} × ${v.preset.height}`}
                                >
                                    <span className={`cs-size-indicator ${isVisible ? 'on' : 'off'}`} />
                                    <span className="cs-size-label">
                                        {v.preset.width} × {v.preset.height}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Status */}
            <div className="cs-sidebar-section">
                <button
                    className="cs-sidebar-section-header"
                    onClick={() => setStatusExpanded(!statusExpanded)}
                >
                    <span>{t('size.status')}</span>
                    <span className={`cs-sidebar-chevron ${statusExpanded ? 'expanded' : ''}`}>›</span>
                </button>
                {statusExpanded && (
                    <div className="cs-sidebar-status">
                        <div className="cs-status-row"><span className="cs-status-dot neutral" />{t('size.noStatus')}<span className="cs-status-count">{statusCounts.noStatus}</span></div>
                        <div className="cs-status-row"><span className="cs-status-dot red" />{t('size.notApproved')}<span className="cs-status-count">{statusCounts.notApproved}</span></div>
                        <div className="cs-status-row"><span className="cs-status-dot yellow" />{t('size.inProgress')}<span className="cs-status-count">{statusCounts.inProgress}</span></div>
                        <div className="cs-status-row"><span className="cs-status-dot blue" />{t('size.forReview')}<span className="cs-status-count">{statusCounts.forReview}</span></div>
                        <div className="cs-status-row"><span className="cs-status-dot green" />{t('size.approved')}<span className="cs-status-count">{statusCounts.approved}</span></div>
                    </div>
                )}
            </div>
        </aside>
    );
}
