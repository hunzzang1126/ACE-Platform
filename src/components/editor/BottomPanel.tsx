// ─────────────────────────────────────────────────
// BottomPanel — Integrated Layers + Timeline (AE-style)
// Left column: layer list  |  Right column: timeline + keyframes
// Drag any layer row OR its timeline bar to reorder.
// ─────────────────────────────────────────────────
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import type { CanvasEngineActions, EngineNode } from '@/hooks/useCanvasEngine';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { IcStop, IcPlay, IcPause, IcLoop } from '@/components/ui/Icons';
import { IcClose } from '@/components/ui/Icons';
import { useAnimPresetStore, ANIM_PRESETS, type AnimPresetType, presetLabel } from '@/hooks/useAnimationPresets';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

/** Unified layer item combining overlays and engine nodes */
interface UnifiedLayer {
    kind: 'overlay' | 'engine';
    id: string;        // overlay string id or engine node id as string
    globalZ: number;   // shared z-index for ordering
    overlay?: OverlayElement;
    node?: EngineNode;
}

interface Props {
    variant: BannerVariant;
    engine?: Engine;
    nodes: EngineNode[];
    selection: number[];
    actions: CanvasEngineActions | null;
    overlayElements?: OverlayElement[];
    selectedOverlayId?: string | null;
    onOverlaySelect?: (id: string | null) => void;
    onOverlayMoveUp?: (id: string) => void;
    onOverlayMoveDown?: (id: string) => void;
    onOverlayReorderTo?: (sourceId: string, targetIndex: number) => void;
    onOverlaySetZIndex?: (id: string, z: number) => void;
    onOverlayToggleLock?: (id: string) => void;
    onOverlayToggleVisibility?: (id: string) => void;
    onOverlayDuplicate?: (id: string) => string | null;
    onOverlayRename?: (id: string, name: string) => void;
    onOverlayDelete?: (id: string) => void;
}

// Color palette for timeline bars
const BAR_COLORS = ['#4285f4', '#34a853', '#f9a825', '#ea4335', '#ab47bc', '#00acc1', '#ff7043'];

/** Pretty label for node type */
function nodeLabel(node: EngineNode): string {
    const types: Record<string, string> = {
        rect: 'Rectangle',
        rounded_rect: 'Rounded Rect',
        ellipse: 'Ellipse',
    };
    return `${types[node.type] || node.type} #${node.id + 1}`;
}

/** Type icon for node */
function nodeIcon(type: string): string {
    switch (type) {
        case 'ellipse': return '○';
        case 'rounded_rect': return '▢';
        default: return '□';
    }
}

// ── Custom drag-to-reorder hook ──
// Uses mousedown/mousemove/mouseup for reliable drag (not HTML5 DnD).
// Works for both overlay elements AND engine nodes via '.bp-drag-row'.
function useLayerDrag(
    totalCount: number,
    onReorder?: (sourceId: string, targetIndex: number) => void,
) {
    const [dragState, setDragState] = useState<{
        srcId: string;
        srcIdx: number;
        overIdx: number | null;
        active: boolean;
    } | null>(null);

    // Ref to suppress click after drag
    const justDragged = useRef(false);

    const startDrag = useCallback((e: React.MouseEvent, id: string, idx: number) => {
        // Only left mouse button
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const startY = e.clientY;
        let activated = false;
        let currentOverIdx: number | null = null;

        setDragState({ srcId: id, srcIdx: idx, overIdx: null, active: false });

        const handleMove = (ev: MouseEvent) => {
            const dy = ev.clientY - startY;

            // Require 5px of movement before activating drag
            if (!activated && Math.abs(dy) < 5) return;
            activated = true;

            // Query ALL draggable rows for hit-testing (overlays + engine)
            const rows = document.querySelectorAll('.bp-layer-drag-row');
            let bestIdx = idx;
            let bestDist = Infinity;

            rows.forEach((row, i) => {
                const rect = row.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const dist = Math.abs(ev.clientY - centerY);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            });

            if (bestIdx !== currentOverIdx) {
                currentOverIdx = bestIdx;
                setDragState({ srcId: id, srcIdx: idx, overIdx: bestIdx, active: true });
            }
        };

        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            if (activated && currentOverIdx !== null && currentOverIdx !== idx) {
                onReorder?.(id, currentOverIdx);
                // Suppress the next click (mouseup -> click would re-select)
                justDragged.current = true;
                setTimeout(() => { justDragged.current = false; }, 50);
            }

            setDragState(null);
        };

        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    }, [totalCount, onReorder]);

    return { dragState, startDrag, justDragged };
}

export function BottomPanel({ variant, engine, nodes, selection, actions, overlayElements = [], selectedOverlayId, onOverlaySelect, onOverlayMoveUp, onOverlayMoveDown, onOverlayReorderTo, onOverlaySetZIndex, onOverlayToggleLock, onOverlayToggleVisibility, onOverlayDuplicate, onOverlayRename, onOverlayDelete }: Props) {
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(5.0);
    const [looping, setLooping] = useState(false);
    const [speed, setSpeed] = useState(1.0);
    const rafRef = useRef<number>(0);
    const layerScrollRef = useRef<HTMLDivElement>(null);
    const timelineScrollRef = useRef<HTMLDivElement>(null);

    // ── Animation preset state ──
    const animPresets = useAnimPresetStore();
    const [animDropdown, setAnimDropdown] = useState<{
        elementId: string;
        nodeId: number; // engine node id (-1 for overlay)
        x: number;
        y: number;
    } | null>(null);

    // ── Bar drag state (timeline bar move/resize) ──
    const [barDrag, setBarDrag] = useState<{
        elementId: string;
        mode: 'move' | 'resize-left' | 'resize-right';
        startX: number;
        origStart: number;
        origEnd: number;
    } | null>(null);
    const timelineBarsRef = useRef<HTMLDivElement>(null);

    // ── Bar drag handlers ──
    const handleBarMouseDown = useCallback((e: React.MouseEvent, elementId: string, barEl: HTMLElement) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = barEl.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const EDGE_PX = 8;
        let mode: 'move' | 'resize-left' | 'resize-right' = 'move';
        if (localX <= EDGE_PX) mode = 'resize-left';
        else if (localX >= rect.width - EDGE_PX) mode = 'resize-right';

        const config = animPresets.getPreset(elementId);
        const origStart = config.startTime;
        const origEnd = config.endTime < 0 ? duration : config.endTime;

        setBarDrag({ elementId, mode, startX: e.clientX, origStart, origEnd });
    }, [animPresets, duration]);

    useEffect(() => {
        if (!barDrag) return;
        const container = timelineBarsRef.current ?? timelineScrollRef.current;
        if (!container) return;
        const containerWidth = container.clientWidth;
        const pxToTime = (px: number) => (px / containerWidth) * duration;
        const MIN_BAR = 0.1; // minimum 0.1s bar length

        const handleMove = (e: MouseEvent) => {
            const dx = e.clientX - barDrag.startX;
            const dt = pxToTime(dx);
            let newStart = barDrag.origStart;
            let newEnd = barDrag.origEnd;

            if (barDrag.mode === 'move') {
                const barLen = barDrag.origEnd - barDrag.origStart;
                newStart = Math.max(0, barDrag.origStart + dt);
                newEnd = newStart + barLen;
                if (newEnd > duration) { newEnd = duration; newStart = newEnd - barLen; }
                if (newStart < 0) { newStart = 0; newEnd = barLen; }
            } else if (barDrag.mode === 'resize-left') {
                newStart = Math.max(0, Math.min(barDrag.origStart + dt, barDrag.origEnd - MIN_BAR));
            } else if (barDrag.mode === 'resize-right') {
                newEnd = Math.min(duration, Math.max(barDrag.origEnd + dt, barDrag.origStart + MIN_BAR));
            }

            animPresets.setTiming(barDrag.elementId, newStart, newEnd);
        };

        const handleUp = () => {
            setBarDrag(null);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = barDrag.mode === 'move' ? 'grabbing' : 'ew-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
    }, [barDrag, duration, animPresets]);

    /** Get bar label from animation presets */
    const getBarLabel = useCallback((elementId: string, fallback: string) => {
        const config = animPresets.getPreset(elementId);
        if (config.anim !== 'none') return presetLabel(config.anim);
        return fallback;
    }, [animPresets]);

    /** Get bar cursor based on mouse position within bar */
    const getBarCursor = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const EDGE_PX = 8;
        if (localX <= EDGE_PX || localX >= rect.width - EDGE_PX) return 'ew-resize';
        return 'grab';
    }, []);

    // ── Build unified layer list ──
    const maxEngineZ = nodes.length > 0 ? Math.max(...nodes.map(n => n.z_index)) : -1;
    const unifiedLayers: UnifiedLayer[] = useMemo(() => {
        const layers: UnifiedLayer[] = [];
        // Engine nodes keep their z_index
        for (const node of nodes) {
            layers.push({ kind: 'engine', id: String(node.id), globalZ: node.z_index, node });
        }
        // Overlays get z above engine nodes (unless already assigned lower)
        for (const el of overlayElements) {
            const z = el.zIndex ?? (maxEngineZ + 1 + overlayElements.indexOf(el));
            layers.push({ kind: 'overlay', id: el.id, globalZ: z, overlay: el });
        }
        // Sort descending: highest z on top
        layers.sort((a, b) => b.globalZ - a.globalZ);
        return layers;
    }, [nodes, overlayElements, maxEngineZ]);

    const totalRows = unifiedLayers.length;

    // ── Unified drag-to-reorder ──
    const handleUnifiedReorder = useCallback((sourceId: string, targetIndex: number) => {
        // Build current display order (highest z first)
        const currentOrder = [...unifiedLayers];
        const srcIdx = currentOrder.findIndex(l => l.id === sourceId);
        if (srcIdx < 0 || srcIdx === targetIndex) return;

        // Move source to target position
        const moved = currentOrder.splice(srcIdx, 1)[0];
        if (!moved) return;
        currentOrder.splice(targetIndex, 0, moved);

        // Reassign z-indices: top of list = highest z, bottom = 0
        const count = currentOrder.length;
        for (let i = 0; i < count; i++) {
            const layer = currentOrder[i];
            if (!layer) continue;
            const newZ = count - 1 - i; // top=highest, bottom=0

            if (layer.kind === 'engine' && engine) {
                try {
                    engine.set_z_index(parseInt(layer.id), newZ);
                } catch { /* ok */ }
            } else if (layer.kind === 'overlay') {
                onOverlaySetZIndex?.(layer.id, newZ);
            }
        }

        // Refresh engine state
        try { engine?.render_frame?.(); } catch { /* ok */ }
        if (actions) {
            // Trigger syncState by selecting something
            const firstEngine = currentOrder.find(l => l.kind === 'engine');
            if (firstEngine) actions.selectNode(parseInt(firstEngine.id));
        }
    }, [unifiedLayers, engine, actions, onOverlaySetZIndex]);

    const { dragState, startDrag, justDragged } = useLayerDrag(totalRows, handleUnifiedReorder);

    // ---------- Engine sync ----------
    const syncTime = useCallback(() => {
        if (!engine) return;
        try {
            const t = engine.anim_time?.() ?? 0;
            const p = engine.anim_playing?.() ?? false;
            setCurrentTime(t);
            setPlaying(p);
            setDuration(engine.anim_duration?.() ?? 5.0);
            setLooping(engine.anim_looping?.() ?? false);
            // Sync to global store for CSS animation
            animPresets.setCurrentTime(t);
            animPresets.setIsPlaying(p);
        } catch { /* engine not ready */ }
    }, [engine, animPresets]);

    // Always-running poll loop — syncs playing state from engine
    // This is needed because Spacebar or external code calls anim_toggle() directly
    useEffect(() => {
        if (!engine) return;
        const tick = () => {
            try {
                const enginePlaying = engine.anim_playing?.() ?? false;
                setPlaying(enginePlaying);
                if (enginePlaying) {
                    const t = engine.anim_time?.() ?? 0;
                    setCurrentTime(t);
                    animPresets.setCurrentTime(t);
                }
                animPresets.setIsPlaying(enginePlaying);
            } catch { /* ignore */ }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [engine, animPresets]);

    useEffect(() => { syncTime(); }, [syncTime]);

    // ---------- Synchronized scrolling ----------
    const handleLayerScroll = useCallback(() => {
        if (layerScrollRef.current && timelineScrollRef.current) {
            timelineScrollRef.current.scrollTop = layerScrollRef.current.scrollTop;
        }
    }, []);

    const handleTimelineScroll = useCallback(() => {
        if (layerScrollRef.current && timelineScrollRef.current) {
            layerScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop;
        }
    }, []);

    // ---------- Playback controls ----------
    const handlePlay = useCallback(() => {
        if (!engine) return;
        try { engine.anim_play(); setPlaying(true); } catch { /* ignore */ }
    }, [engine]);

    const handlePause = useCallback(() => {
        if (!engine) return;
        try { engine.anim_pause(); setPlaying(false); } catch { /* ignore */ }
    }, [engine]);

    const handleStop = useCallback(() => {
        if (!engine) return;
        try { engine.anim_stop(); setPlaying(false); setCurrentTime(0); animPresets.setCurrentTime(0); animPresets.setIsPlaying(false); } catch { /* ignore */ }
    }, [engine]);

    const handleSeek = useCallback((time: number) => {
        if (!engine) return;
        try { engine.anim_seek(time); setCurrentTime(time); animPresets.setCurrentTime(time); } catch { /* ignore */ }
    }, [engine]);

    const handleDurationChange = useCallback((d: number) => {
        if (!engine) return;
        try { engine.set_duration(d); setDuration(d); } catch { /* ignore */ }
    }, [engine]);

    const handleToggleLoop = useCallback(() => {
        if (!engine) return;
        const next = !looping;
        try { engine.set_looping(next); setLooping(next); } catch { /* ignore */ }
    }, [engine, looping]);

    const handleSpeedChange = useCallback((s: number) => {
        if (!engine) return;
        try { engine.anim_set_speed(s); setSpeed(s); } catch { /* ignore */ }
    }, [engine]);

    // ---------- Layer actions ----------
    const handleSelect = useCallback((id: number) => {
        actions?.selectNode(id);
    }, [actions]);

    const handleDelete = useCallback((id: number) => {
        if (!actions) return;
        actions.selectNode(id);
        actions.deleteSelected();
    }, [actions]);

    // ---------- Collapsed state ----------
    if (collapsed) {
        return (
            <div className="bp-root bp-collapsed">
                <button className="bp-expand-btn" onClick={() => setCollapsed(false)}>
                    ▲ Layers &amp; Timeline
                </button>
            </div>
        );
    }

    // ── Helper: is this row the drag-over target? ──
    const isDragOver = (idx: number) => dragState?.active && dragState.overIdx === idx && dragState.srcIdx !== idx;
    const isDragging = (id: string) => dragState?.active && dragState.srcId === id;

    return (
        <div className="bp-root">
            {/* ── Controls row ── */}
            <div className="bp-controls">
                {/* Left: layer header area */}
                <div className="bp-layer-header">
                    <span className="bp-header-label">LAYERS</span>
                    <span className="bp-node-count">{nodes.length + overlayElements.length}</span>
                </div>

                {/* Right: playback controls */}
                <div className="bp-timeline-header">
                    <div className="bp-playback">
                        <button className="bp-play-btn" title="Stop" onClick={handleStop}><IcStop size={11} /></button>
                        <button className="bp-play-btn" title={playing ? 'Pause' : 'Play'} onClick={playing ? handlePause : handlePlay}>
                            {playing ? <IcPause size={11} /> : <IcPlay size={11} />}
                        </button>
                        <button className="bp-play-btn" title="Loop" onClick={handleToggleLoop}
                            style={looping ? { color: '#4a9eff' } : {}}>
                            <IcLoop size={11} color={looping ? '#4a9eff' : undefined} />
                        </button>
                    </div>

                    <span className="bp-time">{currentTime.toFixed(2)} / {duration.toFixed(2)}s</span>

                    <div className="bp-speed-group">
                        <span>Speed:</span>
                        {[0.5, 1, 2].map(s => (
                            <button
                                key={s}
                                className="bp-play-btn"
                                style={{ fontSize: 10, padding: '1px 4px', ...(speed === s ? { color: '#4a9eff' } : {}) }}
                                onClick={() => handleSpeedChange(s)}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>

                    <div className="bp-dur-group">
                        <span>Dur:</span>
                        <input
                            type="number"
                            className="bp-dur-input"
                            min="0.1" max="30" step="0.5"
                            value={duration}
                            onChange={e => handleDurationChange(parseFloat(e.target.value) || 5)}
                        />
                    </div>

                    <button className="bp-collapse-btn" onClick={() => setCollapsed(true)} title="Collapse">▼</button>
                </div>
            </div>

            {/* ── Ruler row — matches the 2-column layout of layers+bars ── */}
            <div className="bp-ruler-row">
                <div className="bp-ruler-spacer" />
                <div
                    className="bp-ruler"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const frac = (e.clientX - rect.left) / rect.width;
                        handleSeek(frac * duration);
                    }}
                >
                    {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
                        <span key={i} className="bp-ruler-tick">{i}.0</span>
                    ))}
                    {/* Playhead */}
                    <div className="bp-playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />
                </div>
            </div>

            {/* ── Rows area (layers + timeline bars) ── */}
            <div className="bp-rows">
                {/* Layer names column */}
                <div className="bp-layer-list" ref={layerScrollRef} onScroll={handleLayerScroll}>
                    {/* Unified layer list — overlays and engine nodes interleaved by z-index */}
                    {unifiedLayers.map((layer, idx) => {
                        const draggedClass = isDragging(layer.id) ? 'bp-dragging' : '';
                        const dropTargetClass = isDragOver(idx) ? 'bp-drop-target' : '';

                        if (layer.kind === 'overlay' && layer.overlay) {
                            const el = layer.overlay;
                            const isSelected = el.id === selectedOverlayId;
                            const isLocked = el.locked ?? false;
                            const isVisible = el.visible ?? true;
                            const isRenaming = renamingId === el.id;
                            return (
                                <div
                                    key={el.id}
                                    className={`bp-layer-row bp-layer-drag-row bp-overlay-row ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''} ${!isVisible ? 'hidden-layer' : ''} ${draggedClass} ${dropTargetClass}`}
                                    onMouseDown={(e) => {
                                        const tag = (e.target as HTMLElement).tagName;
                                        if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SVG' || tag === 'PATH') return;
                                        startDrag(e, el.id, idx);
                                    }}
                                    onClick={() => { if (justDragged.current) return; onOverlaySelect?.(el.id); }}
                                >
                                    <span className="bp-layer-icon">{el.type === 'text' ? 'T' : '🖼'}</span>
                                    {isRenaming ? (
                                        <input
                                            className="bp-rename-input"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={() => { onOverlayRename?.(el.id, renameValue); setRenamingId(null); }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { onOverlayRename?.(el.id, renameValue); setRenamingId(null); }
                                                if (e.key === 'Escape') setRenamingId(null);
                                                e.stopPropagation();
                                            }}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span
                                            className="bp-layer-name"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setRenamingId(el.id);
                                                setRenameValue(el.name || (el.type === 'text' ? 'Text' : 'Image'));
                                            }}
                                        >
                                            {el.name || (el.type === 'text' ? (el.content?.slice(0, 20) || 'Text') : (el.fileName || 'Image'))}
                                        </span>
                                    )}
                                    <div className="bp-layer-actions">
                                        <button className="bp-layer-action-btn" title={isLocked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); onOverlayToggleLock?.(el.id); }}>
                                            {isLocked ? '🔒' : '🔓'}
                                        </button>
                                        <button className="bp-layer-action-btn" title={isVisible ? 'Hide' : 'Show'} onClick={(e) => { e.stopPropagation(); onOverlayToggleVisibility?.(el.id); }}>
                                            {isVisible ? '👁' : '👁‍🗨'}
                                        </button>
                                        <button className="bp-layer-action-btn" title="Delete" onClick={(e) => { e.stopPropagation(); onOverlayDelete?.(el.id); }}>
                                            <IcClose size={9} />
                                        </button>
                                    </div>
                                </div>
                            );
                        } else if (layer.kind === 'engine' && layer.node) {
                            const node = layer.node;
                            const isSelected = selection.includes(node.id);
                            return (
                                <div
                                    key={`eng-${node.id}`}
                                    className={`bp-layer-row bp-layer-drag-row ${isSelected ? 'selected' : ''} ${draggedClass} ${dropTargetClass}`}
                                    onMouseDown={(e) => {
                                        const tag = (e.target as HTMLElement).tagName;
                                        if (tag === 'BUTTON' || tag === 'SVG' || tag === 'PATH') return;
                                        startDrag(e, String(node.id), idx);
                                    }}
                                    onClick={() => { if (justDragged.current) return; handleSelect(node.id); }}
                                >
                                    <span className="bp-layer-icon">{nodeIcon(node.type)}</span>
                                    <span className="bp-layer-name">{nodeLabel(node)}</span>
                                    <div className="bp-layer-actions">
                                        <button className="bp-layer-action-btn" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }}>
                                            <IcClose size={9} />
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })}
                    {unifiedLayers.length === 0 && (
                        <div className="bp-empty">No layers yet</div>
                    )}
                </div>

                {/* Timeline bars column */}
                <div className="bp-timeline-bars" ref={(el) => { timelineScrollRef.current = el; (timelineBarsRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }} onScroll={handleTimelineScroll}>
                    {/* Unified timeline rows — overlays and engine nodes interleaved */}
                    {unifiedLayers.map((layer, idx) => {
                        const draggedClass = isDragging(layer.id) ? 'bp-dragging' : '';
                        const dropTargetClass = isDragOver(idx) ? 'bp-drop-target' : '';
                        const barColor = BAR_COLORS[idx % BAR_COLORS.length];

                        // Per-element timing
                        const config = animPresets.getPreset(layer.id);
                        const st = config.startTime;
                        const et = config.endTime < 0 ? duration : config.endTime;
                        const barLeft = `${(st / duration) * 100}%`;
                        const barWidth = `${((et - st) / duration) * 100}%`;

                        if (layer.kind === 'overlay' && layer.overlay) {
                            const el = layer.overlay;
                            const isSelected = el.id === selectedOverlayId;
                            const label = getBarLabel(el.id, el.type === 'text' ? 'Text' : 'Image');
                            return (
                                <div
                                    key={`tl-${el.id}`}
                                    className={`bp-bar-row ${isSelected ? 'selected' : ''} ${draggedClass} ${dropTargetClass}`}
                                    onClick={() => { if (justDragged.current) return; onOverlaySelect?.(el.id); }}
                                >
                                    <div
                                        className="bp-bar bp-bar-draggable"
                                        style={{ left: barLeft, width: barWidth, backgroundColor: barColor, opacity: 0.7, position: 'relative' }}
                                        onMouseDown={(e) => {
                                            // Only drag if not clicking the label button
                                            const tag = (e.target as HTMLElement).tagName;
                                            if (tag === 'BUTTON') return;
                                            handleBarMouseDown(e, el.id, e.currentTarget);
                                        }}
                                        onMouseMove={(e) => {
                                            const tag = (e.target as HTMLElement).tagName;
                                            if (tag === 'BUTTON') { e.currentTarget.style.cursor = 'pointer'; return; }
                                            e.currentTarget.style.cursor = getBarCursor(e);
                                        }}
                                    >
                                        <div
                                            className="bp-bar-handle bp-bar-handle-left"
                                            title="Drag to resize start"
                                        />
                                        <button
                                            className="bp-bar-anim-btn"
                                            title="Click to set animation"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setAnimDropdown({ elementId: el.id, nodeId: -1, x: rect.left, y: rect.top });
                                            }}
                                        >
                                            {config.anim !== 'none' && <span className="bp-anim-dot" />}
                                            {label}
                                        </button>
                                        <div
                                            className="bp-bar-handle bp-bar-handle-right"
                                            title="Drag to resize end"
                                        />
                                    </div>
                                    <div className="bp-bar-playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />
                                </div>
                            );
                        } else if (layer.kind === 'engine' && layer.node) {
                            const node = layer.node;
                            const isSelected = selection.includes(node.id);
                            const label = getBarLabel(String(node.id), nodeLabel(node));
                            return (
                                <div
                                    key={`tl-eng-${node.id}`}
                                    className={`bp-bar-row ${isSelected ? 'selected' : ''} ${draggedClass} ${dropTargetClass}`}
                                    onClick={() => { if (justDragged.current) return; handleSelect(node.id); }}
                                >
                                    <div
                                        className="bp-bar bp-bar-draggable"
                                        style={{ left: barLeft, width: barWidth, backgroundColor: barColor, position: 'relative' }}
                                        onMouseDown={(e) => {
                                            const tag = (e.target as HTMLElement).tagName;
                                            if (tag === 'BUTTON') return;
                                            handleBarMouseDown(e, String(node.id), e.currentTarget);
                                        }}
                                        onMouseMove={(e) => {
                                            const tag = (e.target as HTMLElement).tagName;
                                            if (tag === 'BUTTON') { e.currentTarget.style.cursor = 'pointer'; return; }
                                            e.currentTarget.style.cursor = getBarCursor(e);
                                        }}
                                    >
                                        <div
                                            className="bp-bar-handle bp-bar-handle-left"
                                            title="Drag to resize start"
                                        />
                                        <button
                                            className="bp-bar-anim-btn"
                                            title="Click to set animation"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setAnimDropdown({ elementId: String(node.id), nodeId: node.id, x: rect.left, y: rect.top });
                                            }}
                                        >
                                            {config.anim !== 'none' && <span className="bp-anim-dot" />}
                                            {label}
                                        </button>
                                        <div
                                            className="bp-bar-handle bp-bar-handle-right"
                                            title="Drag to resize end"
                                        />
                                    </div>
                                    <div className="bp-bar-playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />
                                </div>
                            );
                        }
                        return null;
                    })}
                    {unifiedLayers.length === 0 && (
                        <div className="bp-empty">Press R, E, T, or I to add elements</div>
                    )}
                </div>
            </div>

            {/* ── Animation preset dropdown ── */}
            {animDropdown && (() => {
                const dd = animDropdown; // local const for TS null-safety
                return (
                    <div
                        className="bp-anim-dropdown-backdrop"
                        onClick={() => setAnimDropdown(null)}
                    >
                        <div
                            className="bp-anim-dropdown"
                            style={{ left: dd.x, top: dd.y - 8 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bp-anim-dropdown-title">
                                Animation
                            </div>
                            {ANIM_PRESETS.map((p) => {
                                const config = animPresets.getPreset(dd.elementId);
                                const isActive = config.anim === p.value;
                                return (
                                    <button
                                        key={p.value}
                                        className={`bp-anim-dropdown-item ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            animPresets.setPreset(dd.elementId, { anim: p.value as AnimPresetType });
                                            // Apply keyframes to engine if this is an engine node
                                            if (dd.nodeId >= 0 && engine) {
                                                try {
                                                    // ── CLEAR existing keyframes for this node first ──
                                                    engine.clear_node_keyframes(dd.nodeId);

                                                    if (p.value !== 'none') {
                                                        const animDur = 0.3;
                                                        const st = 0;
                                                        const et = animDur;
                                                        const ease = 'ease_out';

                                                        if (p.value === 'fade') {
                                                            engine.add_keyframe(dd.nodeId, 'opacity', st, 0, ease);
                                                            engine.add_keyframe(dd.nodeId, 'opacity', et, 1, ease);
                                                        } else if (p.value.startsWith('slide-')) {
                                                            const prop = p.value.includes('left') || p.value.includes('right') ? 'x' : 'y';
                                                            const offset = p.value.includes('left') || p.value.includes('up') ? -200 : 200;
                                                            engine.add_keyframe(dd.nodeId, prop, st, offset, ease);
                                                            engine.add_keyframe(dd.nodeId, prop, et, 0, ease);
                                                        } else if (p.value === 'scale') {
                                                            engine.add_keyframe(dd.nodeId, 'scale_x', st, 0, ease);
                                                            engine.add_keyframe(dd.nodeId, 'scale_x', et, 1, ease);
                                                            engine.add_keyframe(dd.nodeId, 'scale_y', st, 0, ease);
                                                            engine.add_keyframe(dd.nodeId, 'scale_y', et, 1, ease);
                                                        } else if (p.value === 'ascend') {
                                                            engine.add_keyframe(dd.nodeId, 'y', st, 100, ease);
                                                            engine.add_keyframe(dd.nodeId, 'y', et, 0, ease);
                                                            engine.add_keyframe(dd.nodeId, 'opacity', st, 0, ease);
                                                            engine.add_keyframe(dd.nodeId, 'opacity', et, 1, ease);
                                                        } else if (p.value === 'descend') {
                                                            engine.add_keyframe(dd.nodeId, 'y', st, -100, ease);
                                                            engine.add_keyframe(dd.nodeId, 'y', et, 0, ease);
                                                            engine.add_keyframe(dd.nodeId, 'opacity', st, 0, ease);
                                                            engine.add_keyframe(dd.nodeId, 'opacity', et, 1, ease);
                                                        }
                                                    }

                                                    // Reset timeline to start and re-render
                                                    engine.anim_stop?.();
                                                    engine.anim_seek?.(0);
                                                    engine.render_frame?.();
                                                } catch { /* engine not ready */ }
                                            }
                                            setAnimDropdown(null);
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
