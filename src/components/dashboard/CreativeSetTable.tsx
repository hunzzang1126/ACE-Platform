// ─────────────────────────────────────────────────
// CreativeSetTable – File-manager style table
// ─────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectStore, type SortColumn } from '@/stores/projectStore';
import type { CreativeSetSummary, Folder } from '@/schema/design.types';

interface Props {
    items: CreativeSetSummary[];
    folders: Folder[];
    onOpenSet: (id: string) => void;
    onOpenFolder: (id: string) => void;
}

// ── Column definition ──
const COLUMNS: { key: SortColumn | 'checkbox'; label: string; width: string; sortable: boolean }[] = [
    { key: 'checkbox', label: '', width: '40px', sortable: false },
    { key: 'name', label: 'Name', width: '1fr', sortable: true },
    { key: 'variantCount', label: 'Creatives', width: '100px', sortable: true },
    { key: 'createdAt', label: 'Created', width: '160px', sortable: true },
    { key: 'createdBy', label: 'Created by', width: '150px', sortable: true },
];

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function CreativeSetTable({ items, folders, onOpenSet, onOpenFolder }: Props) {
    const sortColumn = useProjectStore((s) => s.sortColumn);
    const sortDirection = useProjectStore((s) => s.sortDirection);
    const selectedIds = useProjectStore((s) => s.selectedIds);
    const setSort = useProjectStore((s) => s.setSort);
    const toggleSelection = useProjectStore((s) => s.toggleSelection);
    const selectAll = useProjectStore((s) => s.selectAll);
    const clearSelection = useProjectStore((s) => s.clearSelection);
    const renameCreativeSet = useProjectStore((s) => s.renameCreativeSet);
    const renameFolder = useProjectStore((s) => s.renameFolder);
    const duplicateCreativeSet = useProjectStore((s) => s.duplicateCreativeSet);
    const deleteCreativeSet = useProjectStore((s) => s.deleteCreativeSet);
    const deleteFolder = useProjectStore((s) => s.deleteFolder);

    const [contextMenu, setContextMenu] = useState<{ id: string; type: 'set' | 'folder'; x: number; y: number } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const editRef = useRef<HTMLInputElement>(null);

    // Close context menu on outside click
    useEffect(() => {
        const handler = () => setContextMenu(null);
        if (contextMenu) {
            document.addEventListener('click', handler);
            return () => document.removeEventListener('click', handler);
        }
    }, [contextMenu]);

    useEffect(() => {
        if (editingId && editRef.current) editRef.current.focus();
    }, [editingId]);

    const allIds = [...folders.map((f) => f.id), ...items.map((s) => s.id)];
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

    const handleHeaderCheckbox = () => {
        if (allSelected) clearSelection();
        else selectAll(allIds);
    };

    const handleKebab = useCallback((e: React.MouseEvent, id: string, type: 'set' | 'folder') => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        // Always open to the left of the button to prevent right-edge clipping
        const menuWidth = 168;
        const menuHeight = 160;
        const x = Math.max(8, rect.left - menuWidth);
        const y = Math.min(rect.bottom, window.innerHeight - menuHeight - 8);
        setContextMenu({ id, type, x, y });
    }, []);

    const handleRenameStart = (id: string, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
        setContextMenu(null);
    };

    const handleRenameSubmit = (id: string, type: 'set' | 'folder') => {
        if (editName.trim()) {
            if (type === 'set') renameCreativeSet(id, editName.trim());
            else renameFolder(id, editName.trim());
        }
        setEditingId(null);
    };

    return (
        <div className="creative-table">
            {/* Header */}
            <div className="table-header">
                {COLUMNS.map((col) => (
                    <div
                        key={col.key}
                        className={`table-cell header-cell ${col.sortable ? 'sortable' : ''}`}
                        style={{ width: col.width, flex: col.width === '1fr' ? 1 : 'none' }}
                        onClick={col.sortable ? () => setSort(col.key as SortColumn) : undefined}
                    >
                        {col.key === 'checkbox' ? (
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleHeaderCheckbox}
                                className="table-checkbox"
                            />
                        ) : (
                            <>
                                {col.label}
                                {sortColumn === col.key && (
                                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                                )}
                            </>
                        )}
                    </div>
                ))}
                {/* Kebab column */}
                <div className="table-cell header-cell" style={{ width: '40px' }} />
            </div>

            {/* Folder rows */}
            {folders.map((folder) => (
                <div
                    key={folder.id}
                    className={`table-row ${selectedIds.has(folder.id) ? 'selected' : ''}`}
                    onDoubleClick={() => onOpenFolder(folder.id)}
                >
                    <div className="table-cell" style={{ width: '40px' }}>
                        <input
                            type="checkbox"
                            checked={selectedIds.has(folder.id)}
                            onChange={() => toggleSelection(folder.id)}
                            className="table-checkbox"
                        />
                    </div>
                    <div className="table-cell name-cell" style={{ flex: 1 }}>
                        <span className="item-icon folder-icon">📁</span>
                        {editingId === folder.id ? (
                            <input
                                ref={editRef}
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => handleRenameSubmit(folder.id, 'folder')}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(folder.id, 'folder'); if (e.key === 'Escape') setEditingId(null); }}
                                className="rename-input"
                            />
                        ) : (
                            <span className="item-name" onClick={() => onOpenFolder(folder.id)}>{folder.name}</span>
                        )}
                    </div>
                    <div className="table-cell" style={{ width: '100px' }}>—</div>
                    <div className="table-cell" style={{ width: '160px' }}>{formatDate(folder.createdAt)}</div>
                    <div className="table-cell" style={{ width: '150px' }}>—</div>
                    <div className="table-cell" style={{ width: '40px' }}>
                        <button className="kebab-btn" onClick={(e) => handleKebab(e, folder.id, 'folder')}>⋮</button>
                    </div>
                </div>
            ))}

            {/* Creative set rows */}
            {items.map((set) => (
                <div
                    key={set.id}
                    className={`table-row ${selectedIds.has(set.id) ? 'selected' : ''}`}
                    onDoubleClick={() => onOpenSet(set.id)}
                >
                    <div className="table-cell" style={{ width: '40px' }}>
                        <input
                            type="checkbox"
                            checked={selectedIds.has(set.id)}
                            onChange={() => toggleSelection(set.id)}
                            className="table-checkbox"
                        />
                    </div>
                    <div className="table-cell name-cell" style={{ flex: 1 }}>
                        <span className="item-icon set-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg></span>
                        {editingId === set.id ? (
                            <input
                                ref={editRef}
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => handleRenameSubmit(set.id, 'set')}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(set.id, 'set'); if (e.key === 'Escape') setEditingId(null); }}
                                className="rename-input"
                            />
                        ) : (
                            <span className="item-name" onClick={() => onOpenSet(set.id)}>{set.name}</span>
                        )}
                    </div>
                    <div className="table-cell" style={{ width: '100px' }}>{set.variantCount}</div>
                    <div className="table-cell" style={{ width: '160px' }}>{formatDate(set.createdAt)}</div>
                    <div className="table-cell" style={{ width: '150px' }}>{set.createdBy}</div>
                    <div className="table-cell" style={{ width: '40px' }}>
                        <button className="kebab-btn" onClick={(e) => handleKebab(e, set.id, 'set')}>⋮</button>
                    </div>
                </div>
            ))}

            {/* Empty state */}
            {folders.length === 0 && items.length === 0 && (
                <div className="table-empty">
                    <span className="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg></span>
                    <p>No creative sets found</p>
                </div>
            )}

            {/* Context menu */}
            {contextMenu && (
                <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    {contextMenu.type === 'set' && (
                        <>
                            <button className="context-item" onClick={() => { onOpenSet(contextMenu.id); setContextMenu(null); }}>Open</button>
                            <button className="context-item" onClick={() => {
                                const s = items.find((i) => i.id === contextMenu.id);
                                if (s) handleRenameStart(contextMenu.id, s.name);
                            }}>Rename</button>
                            <button className="context-item" onClick={() => { duplicateCreativeSet(contextMenu.id); setContextMenu(null); }}>Duplicate</button>
                            <div className="context-divider" />
                            <button className="context-item danger" onClick={() => { deleteCreativeSet(contextMenu.id); setContextMenu(null); }}>Delete</button>
                        </>
                    )}
                    {contextMenu.type === 'folder' && (
                        <>
                            <button className="context-item" onClick={() => { onOpenFolder(contextMenu.id); setContextMenu(null); }}>Open</button>
                            <button className="context-item" onClick={() => {
                                const f = folders.find((f) => f.id === contextMenu.id);
                                if (f) handleRenameStart(contextMenu.id, f.name);
                            }}>Rename</button>
                            <div className="context-divider" />
                            <button className="context-item danger" onClick={() => { deleteFolder(contextMenu.id); setContextMenu(null); }}>Delete</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
