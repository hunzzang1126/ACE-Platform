// ─────────────────────────────────────────────────
// SidebarUploadsTab — Upload library with image grid
// ─────────────────────────────────────────────────
// Shows uploaded + AI-generated images in a grid.
// Click to add to canvas, hover to delete.
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';
import { useUploadStore, type UploadEntry } from '@/stores/uploadStore';
import { resolveAsset, isAssetRef } from '@/services/assetService';
import { saveToBrandKit } from '@/stores/brandKitHelpers';

interface Props {
    onTriggerImageUpload?: () => void;
    onTriggerVideoUpload?: () => void;
    onImageSelect?: (blobUrl: string, entry: UploadEntry) => void;
}

export function SidebarUploadsTab({ onTriggerImageUpload, onTriggerVideoUpload, onImageSelect }: Props) {
    const uploads = useUploadStore(s => s.uploads);
    const removeUpload = useUploadStore(s => s.removeUpload);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

    // Resolve idb:// refs to blob URLs for display + clean up ghost entries
    useEffect(() => {
        let cancelled = false;
        const resolve = async () => {
            const newUrls: Record<string, string> = {};
            const ghostIds: string[] = [];
            for (const u of uploads) {
                if (resolvedUrls[u.id]) { newUrls[u.id] = resolvedUrls[u.id]!; continue; }
                if (isAssetRef(u.idbRef)) {
                    try {
                        const blobUrl = await resolveAsset(u.idbRef);
                        if (blobUrl === u.idbRef) {
                            // ★ Asset not found in IndexedDB — ghost entry
                            ghostIds.push(u.id);
                        } else if (!cancelled) {
                            newUrls[u.id] = blobUrl;
                        }
                    } catch { ghostIds.push(u.id); }
                } else {
                    newUrls[u.id] = u.idbRef;
                }
            }
            if (!cancelled) {
                setResolvedUrls(newUrls);
                // Auto-remove ghost entries (lost after browser clear / re-login)
                if (ghostIds.length > 0) {
                    const { removeUpload } = useUploadStore.getState();
                    for (const gid of ghostIds) removeUpload(gid);
                    console.warn(`[Uploads] Cleaned ${ghostIds.length} ghost entries (idb:// assets not found)`);
                }
            }
        };
        resolve();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uploads.length]);

    const handleImageClick = useCallback((entry: UploadEntry) => {
        const url = resolvedUrls[entry.id];
        if (url && onImageSelect) onImageSelect(url, entry);
    }, [resolvedUrls, onImageSelect]);

    const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        removeUpload(id);
    }, [removeUpload]);

    // ── Drop zone ──
    const dropRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // Drop triggers the file input via callback
        if (onTriggerImageUpload) onTriggerImageUpload();
    }, [onTriggerImageUpload]);

    const aiCount = uploads.filter(u => u.source === 'ai').length;
    const userCount = uploads.filter(u => u.source === 'user').length;

    return (
        <div className="sidebar-uploads">
            <div className="sidebar-upload-actions">
                <button className="sidebar-upload-btn primary" onClick={onTriggerImageUpload}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload Image
                </button>
                <button className="sidebar-upload-btn" onClick={onTriggerVideoUpload}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="15" height="16" rx="2" />
                        <path d="M17 9l5-3v12l-5-3" />
                    </svg>
                    Upload Video
                </button>
            </div>

            {uploads.length > 0 && (
                <>
                    <div className="sidebar-divider" />
                    <div className="uploads-summary">
                        <span className="uploads-count">{uploads.length} images</span>
                        {aiCount > 0 && <span className="uploads-ai-badge">{aiCount} AI</span>}
                        {userCount > 0 && <span className="uploads-user-badge">{userCount} uploaded</span>}
                    </div>
                    <div className="uploads-grid">
                        {uploads.map(entry => {
                            const url = resolvedUrls[entry.id];
                            const isHovered = hoveredId === entry.id;
                            return (
                                <div
                                    key={entry.id}
                                    className={`uploads-grid-item ${isHovered ? 'hovered' : ''}`}
                                    onMouseEnter={() => setHoveredId(entry.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={() => handleImageClick(entry)}
                                    title={`${entry.name}\n${entry.width}x${entry.height}`}
                                >
                                    {url ? (
                                        <img
                                            src={url}
                                            alt={entry.name}
                                            className="uploads-grid-img"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="uploads-grid-placeholder" />
                                    )}
                                    {entry.source === 'ai' && (
                                        <span className="uploads-ai-tag">AI</span>
                                    )}
                                    {isHovered && (
                                        <div className="uploads-hover-actions">
                                            <button
                                                className="uploads-brand-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    saveToBrandKit(entry.idbRef, entry.name, entry.width, entry.height)
                                                        .then(() => console.log('[Uploads] Saved to Brand Kit:', entry.name));
                                                }}
                                                title="Save to Brand Kit"
                                            >
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="uploads-delete-btn"
                                                onClick={(e) => handleDelete(e, entry.id)}
                                                title="Remove from library"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {uploads.length === 0 && (
                <>
                    <div className="sidebar-divider" />
                    <div
                        ref={dropRef}
                        className={`sidebar-drop-zone ${isDragging ? 'dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <p>Drop files here</p>
                        <span>Images, videos, SVGs</span>
                        <span className="drop-zone-hint">AI-generated images appear here automatically</span>
                    </div>
                </>
            )}
        </div>
    );
}
