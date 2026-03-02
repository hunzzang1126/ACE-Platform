// ─────────────────────────────────────────────────
// ProjectCard — Card-based project display (Figma-inspired)
// ─────────────────────────────────────────────────
import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';

interface ProjectCardProps {
    id: string;
    name: string;
    variantCount: number;
    createdAt: string;
    createdBy: string;
    type: 'set' | 'folder';
    onOpen: (id: string) => void;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ProjectCard({ id, name, variantCount, createdAt, createdBy, type, onOpen }: ProjectCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [renaming, setRenaming] = useState(false);
    const [renameName, setRenameName] = useState(name);
    const renameRef = useRef<HTMLInputElement>(null);

    const renameCreativeSet = useProjectStore(s => s.renameCreativeSet);
    const renameFolder = useProjectStore(s => s.renameFolder);
    const deleteCreativeSet = useProjectStore(s => s.deleteCreativeSet);
    const deleteFolder = useProjectStore(s => s.deleteFolder);
    const duplicateCreativeSet = useProjectStore(s => s.duplicateCreativeSet);

    // suppress unused-var lint (createdBy used for future avatars)
    void createdBy;

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
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

    // Generate preview grid rectangles
    const previewSizes = Array.from({ length: Math.min(variantCount, 6) }, (_, i) => {
        const layouts = [
            { w: 45, h: 35 }, { w: 30, h: 45 }, { w: 55, h: 20 },
            { w: 20, h: 50 }, { w: 40, h: 40 }, { w: 50, h: 25 },
        ];
        return layouts[i % layouts.length]!;
    });

    return (
        <>
            <div
                className="project-card"
                onDoubleClick={() => onOpen(id)}
                onContextMenu={handleContextMenu}
            >
                {/* Preview Area */}
                <div className="project-card__preview">
                    <div className="project-card__preview-grid">
                        {previewSizes.map((size, i) => (
                            <div
                                key={i}
                                className="project-card__preview-rect"
                                style={{ width: size.w, height: size.h }}
                            />
                        ))}
                    </div>
                    {variantCount > 6 && (
                        <span className="project-card__preview-more">
                            +{variantCount - 6} more
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
                        <span className="project-card__name" onClick={() => onOpen(id)}>
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
                        {type === 'set' && <button className="context-item" onClick={handleDuplicate}>Duplicate</button>}
                        <div className="context-divider" />
                        <button className="context-item danger" onClick={handleDelete}>Delete</button>
                    </div>
                </>
            )}
        </>
    );
}
