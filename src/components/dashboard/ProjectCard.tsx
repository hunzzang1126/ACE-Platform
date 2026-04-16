// ─────────────────────────────────────────────────
// ProjectCard — Card-based project display (Figma-inspired)
// ─────────────────────────────────────────────────
import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectThumbnail } from './ProjectThumbnail';
import { ShareModal } from './ShareModal';

interface ProjectCardProps {
    id: string;
    name: string;
    variantCount: number;
    createdAt: string;
    createdBy: string;
    type: 'set' | 'folder';
    onOpen: (id: string) => void;
    /** Start in rename mode (for newly created cards) */
    initialRenaming?: boolean;
    /** Grid (cards) or list (rows) display */
    viewMode?: 'grid' | 'list';
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ProjectCard({ id, name, variantCount, createdAt, createdBy, type, onOpen, initialRenaming, viewMode = 'grid' }: ProjectCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [renaming, setRenaming] = useState(!!initialRenaming);
    const [renameName, setRenameName] = useState(name);
    const renameRef = useRef<HTMLInputElement>(null);
    const [shareOpen, setShareOpen] = useState(false);

    // Auto-focus rename input when created in rename mode
    useEffect(() => {
        if (initialRenaming) setTimeout(() => renameRef.current?.select(), 100);
    }, [initialRenaming]);

    const renameCreativeSet = useProjectStore(s => s.renameCreativeSet);
    const renameFolder = useProjectStore(s => s.renameFolder);
    const deleteCreativeSet = useProjectStore(s => s.deleteCreativeSet);
    const deleteFolder = useProjectStore(s => s.deleteFolder);
    const duplicateCreativeSet = useProjectStore(s => s.duplicateCreativeSet);

    // suppress unused-var lint (createdBy used for future avatars)
    void createdBy;

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const MENU_W = 170; const MENU_H = 170;
        const x = Math.min(e.clientX, window.innerWidth - MENU_W);
        const y = Math.min(e.clientY, window.innerHeight - MENU_H);
        setMenuPos({ x, y });
        setMenuOpen(true);
    }, []);

    const handleRename = useCallback(() => {
        setMenuOpen(false);
        setRenaming(true);
        setRenameName(name);
        setTimeout(() => renameRef.current?.select(), 50);
    }, [name]);

    const handleRenameSubmit = useCallback(() => {
        if (renameName.trim()) {
            if (type === 'set') renameCreativeSet(id, renameName.trim());
            else renameFolder(id, renameName.trim());
        }
        setRenaming(false);
    }, [id, type, renameName, renameCreativeSet, renameFolder]);

    const handleDelete = useCallback(() => {
        setMenuOpen(false);
        if (type === 'set') deleteCreativeSet(id);
        else deleteFolder(id);
    }, [id, type, deleteCreativeSet, deleteFolder]);

    const handleDuplicate = useCallback(() => {
        setMenuOpen(false);
        if (type === 'set') duplicateCreativeSet(id);
    }, [id, type, duplicateCreativeSet]);

    // Preview thumbnail uses actual design data
    const showThumbnail = viewMode === 'grid';

    // ── List View ──
    if (viewMode === 'list') {
        return (
            <>
                <div
                    className="project-list-row"
                    onDoubleClick={() => onOpen(id)}
                    onContextMenu={handleContextMenu}
                >
                    {/* Icon */}
                    <div className="project-list-row__icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                        </svg>
                    </div>

                    {/* Name */}
                    <div className="project-list-row__name">
                        {renaming ? (
                            <input
                                ref={renameRef}
                                className="project-card__rename"
                                value={renameName}
                                onChange={e => setRenameName(e.target.value)}
                                onBlur={handleRenameSubmit}
                                onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false); }}
                                autoFocus
                            />
                        ) : (
                            <span onClick={() => onOpen(id)} onDoubleClick={(e) => { e.stopPropagation(); handleRename(); }}>{name}</span>
                        )}
                    </div>

                    {/* Sizes */}
                    <div className="project-list-row__sizes">
                        {variantCount} size{variantCount !== 1 ? 's' : ''}
                    </div>

                    {/* Date */}
                    <div className="project-list-row__date">
                        {formatDate(createdAt)}
                    </div>

                    {/* Kebab */}
                    <button className="project-list-row__menu" onClick={e => { e.stopPropagation(); handleContextMenu(e); }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="4" cy="8" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="12" cy="8" r="1.5" />
                        </svg>
                    </button>
                </div>

                {/* Context Menu (shared) */}
                {menuOpen && (
                    <>
                        <div className="project-card__overlay" onClick={() => setMenuOpen(false)} />
                        <div className="context-menu" style={{ left: menuPos.x, top: menuPos.y }}>
                            <button className="context-item" onClick={() => { setMenuOpen(false); onOpen(id); }}>Open</button>
                            <button className="context-item" onClick={handleRename}>Rename</button>
                            {type === 'set' && <button className="context-item" onClick={() => { setMenuOpen(false); setShareOpen(true); }}>Share</button>}
                            {type === 'set' && <button className="context-item" onClick={handleDuplicate}>Duplicate</button>}
                            <div className="context-divider" />
                            <button className="context-item danger" onClick={handleDelete}>Delete</button>
                        </div>
                    </>
                )}
            </>
        );
    }

    return (
        <>
            <div
                className="project-card"
                onDoubleClick={() => onOpen(id)}
                onContextMenu={handleContextMenu}
            >
                <div className="project-card__preview">
                    <ProjectThumbnail setId={id} width={200} height={120} />
                    {variantCount > 1 && (
                        <span className="project-card__preview-more">
                            {variantCount} sizes
                        </span>
                    )}
                </div>

                {/* Info */}
                <div className="project-card__info">
                    {renaming ? (
                        <input
                            ref={renameRef}
                            className="project-card__rename"
                            value={renameName}
                            onChange={e => setRenameName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false); }}
                            autoFocus
                        />
                    ) : (
                        <span className="project-card__name" onClick={() => onOpen(id)} onDoubleClick={(e) => { e.stopPropagation(); handleRename(); }}>
                            {name}
                        </span>
                    )}
                    <div className="project-card__meta">
                        <span>{variantCount} size{variantCount !== 1 ? 's' : ''}</span>
                        <span className="project-card__dot" />
                        <span>{formatDate(createdAt)}</span>
                    </div>
                </div>

                {/* Kebab */}
                <button className="project-card__menu-btn" onClick={e => { e.stopPropagation(); handleContextMenu(e); }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="8" cy="13" r="1.5" />
                    </svg>
                </button>
            </div>

            {/* Context Menu */}
            {menuOpen && (
                <>
                    <div className="project-card__overlay" onClick={() => setMenuOpen(false)} />
                    <div className="context-menu" style={{ left: menuPos.x, top: menuPos.y }}>
                        <button className="context-item" onClick={() => { setMenuOpen(false); onOpen(id); }}>Open</button>
                        <button className="context-item" onClick={handleRename}>Rename</button>
                        {type === 'set' && <button className="context-item" onClick={() => { setMenuOpen(false); setShareOpen(true); }}>Share</button>}
                        {type === 'set' && <button className="context-item" onClick={handleDuplicate}>Duplicate</button>}
                        <div className="context-divider" />
                        <button className="context-item danger" onClick={handleDelete}>Delete</button>
                    </div>
                </>
            )}
            {/* Share Modal */}
            <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} projectId={id} projectName={name} />
        </>
    );
}
