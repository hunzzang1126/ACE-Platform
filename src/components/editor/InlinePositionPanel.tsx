// ─────────────────────────────────────────────────
// InlinePositionPanel — Arrange + Align + Transform (Canva-style)
// ─────────────────────────────────────────────────
// Opens as left-panel overlay when Position button clicked.
// Arrange (z-order), align to page, and transform inputs (W/H/X/Y/Rotation).
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import type { CanvasEngineActions, EngineNode } from '@/hooks/canvasTypes';
import { removeBackgroundFromUrl, blobToDataUrl } from '@/services/backgroundRemovalService';

interface Props {
    selectedNode: EngineNode | null;
    actions: CanvasEngineActions | null;
    onClose: () => void;
}

export function InlinePositionPanel({ selectedNode, actions, onClose }: Props) {
    const [localW, setLocalW] = useState(selectedNode?.w ?? 100);
    const [localH, setLocalH] = useState(selectedNode?.h ?? 100);
    const [localX, setLocalX] = useState(selectedNode?.x ?? 0);
    const [localY, setLocalY] = useState(selectedNode?.y ?? 0);

    // Sync local state when selection changes
    useEffect(() => {
        if (selectedNode) {
            setLocalW(Math.round(selectedNode.w));
            setLocalH(Math.round(selectedNode.h));
            setLocalX(Math.round(selectedNode.x));
            setLocalY(Math.round(selectedNode.y));
        }
    }, [selectedNode?.id, selectedNode?.w, selectedNode?.h, selectedNode?.x, selectedNode?.y]);

    const commitSize = useCallback(() => {
        if (!selectedNode || !actions) return;
        actions.setNodeSize(selectedNode.id, localW, localH);
    }, [selectedNode, actions, localW, localH]);

    const commitPos = useCallback(() => {
        if (!selectedNode || !actions) return;
        actions.setNodePosition(selectedNode.id, localX, localY);
    }, [selectedNode, actions, localX, localY]);

    if (!selectedNode || !actions) return null;

    return (
        <div className="inline-panel">
            <div className="inline-panel-header">
                <h3>Position</h3>
                <button className="inline-panel-close" onClick={onClose}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="inline-panel-body">
                {/* Arrange (z-order) */}
                <p className="sidebar-section-label">Arrange</p>
                <div className="inline-arrange-grid">
                    <button className="inline-arrange-btn" onClick={() => actions.bringForward(selectedNode.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M12 5l-5 5M12 5l5 5"/></svg>
                        Forward
                    </button>
                    <button className="inline-arrange-btn" onClick={() => actions.sendBackward(selectedNode.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M12 19l-5-5M12 19l5-5"/></svg>
                        Backward
                    </button>
                    <button className="inline-arrange-btn" onClick={() => actions.bringToFront(selectedNode.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 11h14M5 7h14"/></svg>
                        To front
                    </button>
                    <button className="inline-arrange-btn" onClick={() => actions.sendToBack(selectedNode.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13h14M5 17h14"/></svg>
                        To back
                    </button>
                </div>

                <div className="inline-divider" />

                {/* Align to page */}
                <p className="sidebar-section-label">Align to page</p>
                <div className="inline-align-grid">
                    {([
                        ['top', 'Top'],
                        ['left', 'Left'],
                        ['center-v', 'Middle'],
                        ['center-h', 'Center'],
                        ['bottom', 'Bottom'],
                        ['right', 'Right'],
                    ] as const).map(([dir, label]) => (
                        <button
                            key={dir}
                            className="inline-align-btn"
                            onClick={() => actions.alignToCanvas(selectedNode.id, dir)}
                        >
                            {getAlignIcon(dir)}
                            {label}
                        </button>
                    ))}
                </div>

                <div className="inline-divider" />

                {/* Advanced — W/H/X/Y */}
                <p className="sidebar-section-label">Advanced</p>
                <div className="inline-transform-grid">
                    <div className="inline-field">
                        <label>Width</label>
                        <div className="inline-field-input">
                            <input
                                type="number"
                                value={localW}
                                onChange={(e) => setLocalW(Number(e.target.value))}
                                onBlur={commitSize}
                                onKeyDown={(e) => e.key === 'Enter' && commitSize()}
                            />
                            <span className="inline-field-unit">px</span>
                        </div>
                    </div>
                    <div className="inline-field">
                        <label>Height</label>
                        <div className="inline-field-input">
                            <input
                                type="number"
                                value={localH}
                                onChange={(e) => setLocalH(Number(e.target.value))}
                                onBlur={commitSize}
                                onKeyDown={(e) => e.key === 'Enter' && commitSize()}
                            />
                            <span className="inline-field-unit">px</span>
                        </div>
                    </div>
                    <div className="inline-field">
                        <label>X</label>
                        <div className="inline-field-input">
                            <input
                                type="number"
                                value={localX}
                                onChange={(e) => setLocalX(Number(e.target.value))}
                                onBlur={commitPos}
                                onKeyDown={(e) => e.key === 'Enter' && commitPos()}
                            />
                            <span className="inline-field-unit">px</span>
                        </div>
                    </div>
                    <div className="inline-field">
                        <label>Y</label>
                        <div className="inline-field-input">
                            <input
                                type="number"
                                value={localY}
                                onChange={(e) => setLocalY(Number(e.target.value))}
                                onBlur={commitPos}
                                onKeyDown={(e) => e.key === 'Enter' && commitPos()}
                            />
                            <span className="inline-field-unit">px</span>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}

// ── Remove Background inline button (image nodes only) ──
function RemoveBgInline({ nodeId, imageSrc, actions }: { nodeId: number; imageSrc: string; actions: CanvasEngineActions }) {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleRemoveBg = async () => {
        if (loading) return;
        setLoading(true);
        setProgress(0);
        try {
            const resultBlob = await removeBackgroundFromUrl(imageSrc, (p) => setProgress(p));
            const dataUrl = await blobToDataUrl(resultBlob);
            await actions.replaceImageSrc(nodeId, dataUrl);
        } catch (err) {
            console.error('[RemoveBG] Failed:', err);
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    return (
        <>
            <div className="inline-divider" />
            <p className="sidebar-section-label">Image</p>
            <button
                onClick={handleRemoveBg}
                disabled={loading}
                className="inline-arrange-btn"
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    justifyContent: 'center',
                    gap: 8,
                    background: loading ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    color: loading ? '#a5b4fc' : '#818cf8',
                    fontWeight: 600,
                    cursor: loading ? 'wait' : 'pointer',
                }}
            >
                {loading ? (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Removing... {Math.round(progress * 100)}%
                    </>
                ) : (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h10" />
                            <rect x="14" y="14" width="8" height="8" rx="2" strokeDasharray="3 2" />
                        </svg>
                        Remove Background
                    </>
                )}
            </button>
        </>
    );
}

// ── Fill to Page inline button (image nodes only) ──
function FillToPageInline({ nodeId, actions }: { nodeId: number; actions: CanvasEngineActions }) {
    return (
        <button
            onClick={() => actions.fillToPage(nodeId)}
            className="inline-arrange-btn"
            style={{
                width: '100%',
                padding: '8px 12px',
                justifyContent: 'center',
                gap: 8,
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.25)',
                color: '#22c55e',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 4,
            }}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 3l8 8M21 21l-8-8" />
                <path d="M15 3h6v6M9 21H3v-6" />
            </svg>
            Fill to Page
        </button>
    );
}

// ── Align icons ──
function getAlignIcon(dir: string): React.ReactNode {
    const s: React.CSSProperties = { width: 14, height: 14, marginRight: 4, flexShrink: 0 };
    switch (dir) {
        case 'top':
            return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16M12 20V8"/></svg>;
        case 'bottom':
            return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16M12 4v12"/></svg>;
        case 'left':
            return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v16M20 12H8"/></svg>;
        case 'right':
            return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 4v16M4 12h12"/></svg>;
        case 'center-h':
            return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M4 12h16"/></svg>;
        case 'center-v':
            return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20M12 4v16"/></svg>;
        default:
            return null;
    }
}
