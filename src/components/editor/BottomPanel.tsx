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
import { useAnimPresetStore, presetLabel } from '@/hooks/useAnimationPresets';
import { useLayerDrag } from '@/hooks/useLayerDrag';
import { type Engine, type UnifiedLayer, BAR_COLORS, nodeLabel } from './bottomPanelHelpers';
import { OverlayLayerRow, EngineLayerRow } from './LayerRow';
import { TimelineBar } from './TimelineBar';
import { AnimDropdown } from './AnimDropdown';

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

    // ── Auto-duration: set duration = max of all bar endTimes ──
    const recalcDuration = useCallback(() => {
        const store = useAnimPresetStore.getState();
        const allIds = [
            ...overlayElements.map(el => el.id),
            ...nodes.map(n => String(n.id)),
        ];
        let maxEnd = 0.5; // minimum 0.5s
        for (const id of allIds) {
            const cfg = store.getPreset(id);
            const et = cfg.endTime < 0 ? duration : cfg.endTime;
            if (et > maxEnd) maxEnd = et;
        }
        const newDuration = Math.round(maxEnd * 10) / 10; // round to 0.1s
        if (Math.abs(newDuration - duration) > 0.05) {
            setDuration(newDuration);
            try { engine?.set_duration(newDuration); } catch { /* ok */ }
        }
    }, [overlayElements, nodes, duration, engine]);

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
                // Allow extending beyond current duration (auto-duration will recalculate)
                newEnd = Math.max(barDrag.origStart + MIN_BAR, barDrag.origEnd + dt);
            }

            animPresets.setTiming(barDrag.elementId, newStart, newEnd);
        };

        const handleUp = () => {
            setBarDrag(null);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            // ── Auto-duration: recalculate from max bar endTime ──
            recalcDuration();
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
                            return (
                                <OverlayLayerRow
                                    key={layer.overlay.id}
                                    el={layer.overlay}
                                    isSelected={layer.overlay.id === selectedOverlayId}
                                    isRenaming={renamingId === layer.overlay.id}
                                    renameValue={renameValue}
                                    draggedClass={draggedClass}
                                    dropTargetClass={dropTargetClass}
                                    onStartDrag={startDrag}
                                    idx={idx}
                                    justDragged={justDragged}
                                    onSelect={(id) => onOverlaySelect?.(id)}
                                    onRenameStart={(id, name) => { setRenamingId(id); setRenameValue(name); }}
                                    onRenameChange={setRenameValue}
                                    onRenameCommit={(id, val) => { onOverlayRename?.(id, val); setRenamingId(null); }}
                                    onRenameCancel={() => setRenamingId(null)}
                                    onToggleLock={onOverlayToggleLock}
                                    onToggleVisibility={onOverlayToggleVisibility}
                                    onDelete={onOverlayDelete}
                                />
                            );
                        } else if (layer.kind === 'engine' && layer.node) {
                            return (
                                <EngineLayerRow
                                    key={`eng-${layer.node.id}`}
                                    node={layer.node}
                                    isSelected={selection.includes(layer.node.id)}
                                    draggedClass={draggedClass}
                                    dropTargetClass={dropTargetClass}
                                    onStartDrag={startDrag}
                                    idx={idx}
                                    justDragged={justDragged}
                                    onSelect={handleSelect}
                                    onDelete={handleDelete}
                                />
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
                        const barColor = BAR_COLORS[idx % BAR_COLORS.length] ?? '#4a9eff';
                        const config = animPresets.getPreset(layer.id);
                        const st = config.startTime;
                        const et = config.endTime < 0 ? duration : config.endTime;
                        const barLeft = `${(st / duration) * 100}%`;
                        const barWidth = `${((et - st) / duration) * 100}%`;

                        if (layer.kind === 'overlay' && layer.overlay) {
                            const el = layer.overlay;
                            return (
                                <TimelineBar
                                    key={`tl-${el.id}`}
                                    elementId={el.id}
                                    label={getBarLabel(el.id, el.type === 'text' ? 'Text' : 'Image')}
                                    isSelected={el.id === selectedOverlayId}
                                    draggedClass={draggedClass}
                                    dropTargetClass={dropTargetClass}
                                    barLeft={barLeft}
                                    barWidth={barWidth}
                                    barColor={barColor}
                                    currentTime={currentTime}
                                    duration={duration}
                                    hasAnim={config.anim !== 'none'}
                                    opacityStyle={0.7}
                                    justDragged={justDragged}
                                    onSelect={() => onOverlaySelect?.(el.id)}
                                    onBarMouseDown={handleBarMouseDown}
                                    onBarCursor={getBarCursor}
                                    onAnimClick={(e, elId, nId) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setAnimDropdown({ elementId: elId, nodeId: nId, x: rect.left, y: rect.top });
                                    }}
                                    nodeId={-1}
                                />
                            );
                        } else if (layer.kind === 'engine' && layer.node) {
                            return (
                                <TimelineBar
                                    key={`tl-eng-${layer.node.id}`}
                                    elementId={String(layer.node.id)}
                                    label={getBarLabel(String(layer.node.id), nodeLabel(layer.node))}
                                    isSelected={selection.includes(layer.node.id)}
                                    draggedClass={draggedClass}
                                    dropTargetClass={dropTargetClass}
                                    barLeft={barLeft}
                                    barWidth={barWidth}
                                    barColor={barColor}
                                    currentTime={currentTime}
                                    duration={duration}
                                    hasAnim={config.anim !== 'none'}
                                    justDragged={justDragged}
                                    onSelect={() => handleSelect(layer.node!.id)}
                                    onBarMouseDown={handleBarMouseDown}
                                    onBarCursor={getBarCursor}
                                    onAnimClick={(e, elId, nId) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setAnimDropdown({ elementId: elId, nodeId: nId, x: rect.left, y: rect.top });
                                    }}
                                    nodeId={layer.node.id}
                                />
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
            {animDropdown && (
                <AnimDropdown
                    dropdown={animDropdown}
                    engine={engine}
                    getPreset={animPresets.getPreset}
                    setPreset={animPresets.setPreset}
                    onClose={() => setAnimDropdown(null)}
                />
            )}
        </div>
    );
}
