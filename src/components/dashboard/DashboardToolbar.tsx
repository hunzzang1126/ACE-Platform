// ─────────────────────────────────────────────────
// DashboardToolbar – Top bar with actions
// ─────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore, type ViewMode } from '@/stores/projectStore';

interface Props {
    breadcrumb: string[];
    onNewCreativeSet: () => void;
    onNewFolder: () => void;
    onNavigateUp: () => void;
}

const VIEW_ICONS: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'list', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>, label: 'List view' },
    { mode: 'grid', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>, label: 'Grid view' },
    { mode: 'compact', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="5" x2="21" y2="5" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="3" y1="20" x2="21" y2="20" /></svg>, label: 'Compact view' },
];

export function DashboardToolbar({ breadcrumb, onNewCreativeSet, onNewFolder, onNavigateUp }: Props) {
    const searchQuery = useProjectStore((s) => s.searchQuery);
    const setSearchQuery = useProjectStore((s) => s.setSearchQuery);
    const viewMode = useProjectStore((s) => s.viewMode);
    const setViewMode = useProjectStore((s) => s.setViewMode);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (searchOpen && searchRef.current) searchRef.current.focus();
    }, [searchOpen]);

    return (
        <div className="toolbar">
            {/* Breadcrumb + Title */}
            <div className="toolbar-left">
                <div className="toolbar-breadcrumb">
                    {breadcrumb.map((crumb, i) => (
                        <span key={i}>
                            {i > 0 && <span className="breadcrumb-sep">›</span>}
                            {i < breadcrumb.length - 1 ? (
                                <button className="breadcrumb-link" onClick={onNavigateUp}>{crumb}</button>
                            ) : (
                                <span className="breadcrumb-current">{crumb}</span>
                            )}
                        </span>
                    ))}
                </div>
                <h1 className="toolbar-title">{breadcrumb[breadcrumb.length - 1]}</h1>

                {/* View mode toggle */}
                <div className="toolbar-view-modes">
                    {VIEW_ICONS.map(({ mode, icon, label }) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`view-mode-btn ${viewMode === mode ? 'active' : ''}`}
                            title={label}
                        >
                            {icon}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right actions */}
            <div className="toolbar-right">
                {/* Search */}
                <div className={`toolbar-search ${searchOpen ? 'open' : ''}`}>
                    {searchOpen ? (
                        <input
                            ref={searchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                            placeholder="Search creative sets..."
                            className="search-input"
                        />
                    ) : (
                        <button onClick={() => setSearchOpen(true)} className="toolbar-icon-btn" title="Search">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        </button>
                    )}
                </div>

                <button className="toolbar-icon-btn" title="Filter">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                </button>

                {/* Action buttons */}
                <button onClick={onNewFolder} className="toolbar-btn secondary">
                    + New folder
                </button>
                <button onClick={onNewCreativeSet} className="toolbar-btn primary">
                    + New Creative Set
                </button>
            </div>
        </div>
    );
}
