// ─────────────────────────────────────────────────
// SizeSidebar – Left panel with size list + toggles
// ─────────────────────────────────────────────────
import { useState } from 'react';
import type { BannerVariant } from '@/schema/design.types';

interface Props {
    variants: BannerVariant[];
    visibleIds: Set<string>;
    onToggleVisibility: (id: string) => void;
    onAddSizeClick: () => void;
}

interface StatusCounts {
    noStatus: number;
    notApproved: number;
    inProgress: number;
    forReview: number;
    approved: number;
}

export function SizeSidebar({ variants, visibleIds, onToggleVisibility, onAddSizeClick }: Props) {
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
                    + ADD SIZE
                </button>
            </div>

            {/* Quick Filters */}
            <div className="cs-sidebar-section">
                <button className="cs-sidebar-section-header">
                    <span>Settings: Quick filters</span>
                    <span className="cs-sidebar-chevron">›</span>
                </button>
            </div>

            {/* Sizes List */}
            <div className="cs-sidebar-section">
                <button
                    className="cs-sidebar-section-header"
                    onClick={() => setSizesExpanded(!sizesExpanded)}
                >
                    <span>Sizes</span>
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
                                    title={`${v.preset.width} × ${v.preset.height} — Click to ${isVisible ? 'hide' : 'show'}`}
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
                    <span>Status</span>
                    <span className={`cs-sidebar-chevron ${statusExpanded ? 'expanded' : ''}`}>›</span>
                </button>
                {statusExpanded && (
                    <div className="cs-sidebar-status">
                        <div className="cs-status-row"><span className="cs-status-dot neutral" />No status<span className="cs-status-count">{statusCounts.noStatus}</span></div>
                        <div className="cs-status-row"><span className="cs-status-dot red" />Not approved<span className="cs-status-count">{statusCounts.notApproved}</span></div>
                        <div className="cs-status-row"><span className="cs-status-dot yellow" />In progress<span className="cs-status-count">{statusCounts.inProgress}</span></div>
                        <div className="cs-status-row"><span className="cs-status-dot blue" />For review<span className="cs-status-count">{statusCounts.forReview}</span></div>
                        <div className="cs-status-row"><span className="cs-status-dot green" />Approved<span className="cs-status-count">{statusCounts.approved}</span></div>
                    </div>
                )}
            </div>
        </aside>
    );
}
