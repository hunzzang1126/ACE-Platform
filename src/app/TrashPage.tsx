// ─────────────────────────────────────────────────
// TrashPage – Recycle Bin for deleted creative sets
// ─────────────────────────────────────────────────
import { useCallback } from 'react';
import { useProjectStore, type TrashedItem } from '@/stores/projectStore';
import { AppSidebar } from '@/components/layout/AppSidebar';

function formatTimeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
}

export function TrashPage() {
    const trash = useProjectStore((s) => s.trash);
    const restoreFromTrash = useProjectStore((s) => s.restoreFromTrash);
    const permanentDelete = useProjectStore((s) => s.permanentDelete);
    const emptyTrash = useProjectStore((s) => s.emptyTrash);

    const handleRestore = useCallback((id: string) => {
        restoreFromTrash(id);
    }, [restoreFromTrash]);

    const handlePermanentDelete = useCallback((id: string) => {
        if (window.confirm('Permanently delete this item? This cannot be undone.')) {
            permanentDelete(id);
        }
    }, [permanentDelete]);

    const handleEmptyTrash = useCallback(() => {
        if (trash.length === 0) return;
        if (window.confirm(`Permanently delete all ${trash.length} items in trash? This cannot be undone.`)) {
            emptyTrash();
        }
    }, [emptyTrash, trash.length]);

    return (
        <div className="dashboard-layout">
            <AppSidebar />
            <main className="dashboard-main">
                {/* Toolbar */}
                <div className="toolbar">
                    <div className="toolbar-left">
                        <h1 className="toolbar-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Trash
                        </h1>
                        <span style={{ fontSize: 13, color: '#5f6368' }}>
                            {trash.length} {trash.length === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                    <div className="toolbar-right">
                        {trash.length > 0 && (
                            <button
                                className="toolbar-btn trash-btn-danger"
                                onClick={handleEmptyTrash}
                            >
                                Empty Trash
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="dashboard-content">
                    {trash.length === 0 ? (
                        <div className="table-empty">
                            <div className="empty-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, color: '#9aa0a6' }}>
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </div>
                            <p>Trash is empty</p>
                            <span style={{ fontSize: 13, color: '#9aa0a6' }}>
                                Deleted creative sets will appear here
                            </span>
                        </div>
                    ) : (
                        <div className="creative-table">
                            {/* Header */}
                            <div className="table-header">
                                <div className="table-cell header-cell" style={{ flex: 3 }}>Name</div>
                                <div className="table-cell header-cell" style={{ flex: 1 }}>Sizes</div>
                                <div className="table-cell header-cell" style={{ flex: 1 }}>Deleted</div>
                                <div className="table-cell header-cell" style={{ flex: 2 }}>Actions</div>
                            </div>
                            {/* Rows */}
                            {trash.map((t: TrashedItem, idx: number) => (
                                <div key={`${t.item.id}-${t.deletedAt}-${idx}`} className="table-row">
                                    <div className="table-cell name-cell" style={{ flex: 3 }}>
                                        <span className="item-icon"></span>
                                        <span className="item-name" style={{ cursor: 'default' }}>{t.item.name}</span>
                                    </div>
                                    <div className="table-cell" style={{ flex: 1 }}>
                                        {t.item.variantCount}
                                    </div>
                                    <div className="table-cell" style={{ flex: 1 }}>
                                        {formatTimeAgo(t.deletedAt)}
                                    </div>
                                    <div className="table-cell" style={{ flex: 2, gap: 8 }}>
                                        <button
                                            className="toolbar-btn secondary"
                                            style={{ height: 28, fontSize: 12, padding: '0 12px' }}
                                            onClick={() => handleRestore(t.item.id)}
                                        >
                                            ↩ Restore
                                        </button>
                                        <button
                                            className="toolbar-btn trash-btn-danger"
                                            style={{ height: 28, fontSize: 12, padding: '0 12px' }}
                                            onClick={() => handlePermanentDelete(t.item.id)}
                                        >
                                            Delete Forever
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
