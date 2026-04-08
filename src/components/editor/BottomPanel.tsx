// ─────────────────────────────────────────────────
// BottomPanel — Integrated Layers + Timeline (AE-style)
// ─────────────────────────────────────────────────
// State/logic → useBottomPanelState.ts
// ─────────────────────────────────────────────────
import { useState, useCallback, useMemo, useRef } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import type { CanvasEngineActions, EngineNode } from '@/hooks/useCanvasEngine';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { IcStop, IcPlay, IcPause, IcLoop } from '@/components/ui/Icons';
import { presetLabel, outPresetLabel } from '@/hooks/useAnimationPresets';
import { useLayerDrag } from '@/hooks/useLayerDrag';
import { type Engine, type UnifiedLayer, BAR_COLORS, nodeLabel } from './bottomPanelHelpers';
import { OverlayLayerRow, EngineLayerRow } from './LayerRow';
import { TimelineBar } from './TimelineBar';
import { useBottomPanelState } from './useBottomPanelState';

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
    const layerScrollRef = useRef<HTMLDivElement>(null);
    const timelineScrollRef = useRef<HTMLDivElement>(null);

    const st = useBottomPanelState(engine, nodes, overlayElements);
    const { animPresets, playing, currentTime, duration, looping, speed, timelineBarsRef } = st;

    const getBarLabel = useCallback((elementId: string, fallback: string) => {
        const config = animPresets.getPreset(elementId);
        return config.anim !== 'none' ? presetLabel(config.anim) : fallback;
    }, [animPresets]);

    const getBarOutLabel = useCallback((elementId: string) => {
        const config = animPresets.getPreset(elementId);
        return (config.animOut ?? 'none') !== 'none' ? outPresetLabel(config.animOut) : '';
    }, [animPresets]);

    const getBarCursor = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        return (localX <= 8 || localX >= rect.width - 8) ? 'ew-resize' : 'grab';
    }, []);

    // ── Build unified layer list ──
    const maxEngineZ = nodes.length > 0 ? Math.max(...nodes.map(n => n.z_index)) : -1;
    const unifiedLayers: UnifiedLayer[] = useMemo(() => {
        const layers: UnifiedLayer[] = [];
        for (const node of nodes) layers.push({ kind: 'engine', id: String(node.id), globalZ: node.z_index, node });
        for (const el of overlayElements) { const z = el.zIndex ?? (maxEngineZ + 1 + overlayElements.indexOf(el)); layers.push({ kind: 'overlay', id: el.id, globalZ: z, overlay: el }); }
        layers.sort((a, b) => b.globalZ - a.globalZ);
        return layers;
    }, [nodes, overlayElements, maxEngineZ]);

    const handleUnifiedReorder = useCallback((sourceId: string, targetIndex: number) => {
        const currentOrder = [...unifiedLayers];
        const srcIdx = currentOrder.findIndex(l => l.id === sourceId);
        if (srcIdx < 0 || srcIdx === targetIndex) return;
        const moved = currentOrder.splice(srcIdx, 1)[0]; if (!moved) return;
        currentOrder.splice(targetIndex, 0, moved);
        const count = currentOrder.length;
        for (let i = 0; i < count; i++) { const layer = currentOrder[i]; if (!layer) continue; const newZ = count - 1 - i; if (layer.kind === 'engine' && engine) { try { engine.set_z_index_and_reorder(parseInt(layer.id), newZ); } catch { /* */ } } else if (layer.kind === 'overlay') { onOverlaySetZIndex?.(layer.id, newZ); } }
        try { engine?.render_frame?.(); } catch { /* */ }
        if (actions) { const first = currentOrder.find(l => l.kind === 'engine'); if (first) actions.selectNode(parseInt(first.id)); }
    }, [unifiedLayers, engine, actions, onOverlaySetZIndex]);

    const { dragState, startDrag, justDragged } = useLayerDrag(unifiedLayers.length, handleUnifiedReorder);

    const handleLayerScroll = useCallback(() => { if (layerScrollRef.current && timelineScrollRef.current) timelineScrollRef.current.scrollTop = layerScrollRef.current.scrollTop; }, []);
    const handleTimelineScroll = useCallback(() => { if (layerScrollRef.current && timelineScrollRef.current) layerScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop; }, []);
    const handleSelect = useCallback((id: number) => { actions?.selectNode(id); }, [actions]);
    const handleDelete = useCallback((id: number) => { if (!actions) return; actions.selectNode(id); actions.deleteSelected(); }, [actions]);

    if (collapsed) return (<div className="bp-root bp-collapsed"><button className="bp-expand-btn" onClick={() => setCollapsed(false)}>▲ Layers &amp; Timeline</button></div>);

    const isDragOver = (idx: number) => dragState?.active && dragState.overIdx === idx && dragState.srcIdx !== idx;
    const isDraggingFn = (id: string) => dragState?.active && dragState.srcId === id;



    return (
        <div className="bp-root">
            <div className="bp-controls">
                <div className="bp-layer-header"><span className="bp-header-label">LAYERS</span><span className="bp-node-count">{nodes.length + overlayElements.length}</span></div>
                <div className="bp-timeline-header">
                    <div className="bp-playback">
                        <button className="bp-play-btn" title="Stop" onClick={st.handleStop}><IcStop size={11} /></button>
                        <button className="bp-play-btn" title={playing ? 'Pause' : 'Play'} onClick={playing ? st.handlePause : st.handlePlay}>{playing ? <IcPause size={11} /> : <IcPlay size={11} />}</button>
                        <button className="bp-play-btn" title="Loop" onClick={st.handleToggleLoop} style={looping ? { color: '#4a9eff' } : {}}><IcLoop size={11} color={looping ? '#4a9eff' : undefined} /></button>
                    </div>
                    <span className="bp-time">{currentTime.toFixed(2)} / {duration.toFixed(2)}s</span>
                    <div className="bp-speed-group"><span>Speed:</span>{[0.5, 1, 2].map(s => (<button key={s} className="bp-play-btn" style={{ fontSize: 10, padding: '1px 4px', ...(speed === s ? { color: '#4a9eff' } : {}) }} onClick={() => st.handleSpeedChange(s)}>{s}x</button>))}</div>
                    <div className="bp-dur-group"><span>Dur:</span><input type="number" className="bp-dur-input" min="0.5" max="20" step="0.5" value={duration} onChange={e => st.handleDurationChange(parseFloat(e.target.value) || 5)} /></div>
                    <button className="bp-collapse-btn" onClick={() => setCollapsed(true)} title="Collapse">▼</button>
                </div>
            </div>

            <div className="bp-ruler-row">
                <div className="bp-ruler-spacer" />
                <div className="bp-ruler" style={{ position: 'relative' }} onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); st.handleSeek(((e.clientX - rect.left) / rect.width) * duration); }}>
                    {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
                        <span key={i} className="bp-ruler-tick" style={{ position: 'absolute', left: `${(i / duration) * 100}%`, transform: 'translateX(-50%)' }}>{i}.0</span>
                    ))}
                    <div className="bp-playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />
                </div>
            </div>

            <div className="bp-rows">
                <div className="bp-layer-list" ref={layerScrollRef} onScroll={handleLayerScroll}>
                    {unifiedLayers.map((layer, idx) => {
                        const dc = isDraggingFn(layer.id) ? 'bp-dragging' : '';
                        const dtc = isDragOver(idx) ? 'bp-drop-target' : '';
                        if (layer.kind === 'overlay' && layer.overlay) return (<OverlayLayerRow key={layer.overlay.id} el={layer.overlay} isSelected={layer.overlay.id === selectedOverlayId} isRenaming={renamingId === layer.overlay.id} renameValue={renameValue} draggedClass={dc} dropTargetClass={dtc} onStartDrag={startDrag} idx={idx} justDragged={justDragged} onSelect={(id) => onOverlaySelect?.(id)} onRenameStart={(id, name) => { setRenamingId(id); setRenameValue(name); }} onRenameChange={setRenameValue} onRenameCommit={(id, val) => { onOverlayRename?.(id, val); setRenamingId(null); }} onRenameCancel={() => setRenamingId(null)} onToggleLock={onOverlayToggleLock} onToggleVisibility={onOverlayToggleVisibility} onDelete={onOverlayDelete} />);
                        if (layer.kind === 'engine' && layer.node) return (<EngineLayerRow key={`eng-${layer.node.id}`} node={layer.node} isSelected={selection.includes(layer.node.id)} isRenaming={renamingId === String(layer.node.id)} renameValue={renameValue} draggedClass={dc} dropTargetClass={dtc} onStartDrag={startDrag} idx={idx} justDragged={justDragged} onSelect={handleSelect} onDelete={handleDelete} onRenameStart={(id, name) => { setRenamingId(id); setRenameValue(name); }} onRenameChange={setRenameValue} onRenameCommit={(id, val) => { try { engine?.set_name(parseInt(id), val); } catch { /* */ } setRenamingId(null); }} onRenameCancel={() => setRenamingId(null)} />);
                        return null;
                    })}
                    {unifiedLayers.length === 0 && <div className="bp-empty">No layers yet</div>}
                </div>

                <div className="bp-timeline-bars" ref={(el) => { timelineScrollRef.current = el; (timelineBarsRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }} onScroll={handleTimelineScroll}>
                    {unifiedLayers.map((layer, idx) => {
                        const dc = isDraggingFn(layer.id) ? 'bp-dragging' : '';
                        const dtc = isDragOver(idx) ? 'bp-drop-target' : '';
                        const barColor = BAR_COLORS[idx % BAR_COLORS.length] ?? '#4a9eff';
                        const config = animPresets.getPreset(layer.id);
                        const stTime = config.startTime;
                        const etTime = config.endTime < 0 ? 5 : config.endTime;
                        const barLeft = `${(stTime / duration) * 100}%`;
                        const barWidth = `${((etTime - stTime) / duration) * 100}%`;
                        const elId = layer.kind === 'overlay' ? layer.overlay?.id ?? '' : String(layer.node?.id ?? '');
                        const label = getBarLabel(layer.id, layer.kind === 'overlay' ? (layer.overlay?.type === 'text' ? 'Text' : 'Image') : nodeLabel(layer.node!));
                        const outLabel = getBarOutLabel(layer.id);
                        const isSelected = layer.kind === 'overlay' ? layer.overlay?.id === selectedOverlayId : selection.includes(layer.node?.id ?? -1);
                        const nodeId = layer.kind === 'engine' ? (layer.node?.id ?? -1) : -1;
                        return (<TimelineBar key={`tl-${layer.id}`} elementId={elId} label={label} outLabel={outLabel} isSelected={!!isSelected} draggedClass={dc} dropTargetClass={dtc} barLeft={barLeft} barWidth={barWidth} barColor={barColor} currentTime={currentTime} duration={duration} hasAnim={config.anim !== 'none'} hasAnimOut={(config.animOut ?? 'none') !== 'none'} opacityStyle={layer.kind === 'overlay' ? 0.7 : undefined} justDragged={justDragged} onSelect={() => layer.kind === 'overlay' ? onOverlaySelect?.(elId) : handleSelect(layer.node!.id)} onBarMouseDown={st.handleBarMouseDown} onBarCursor={getBarCursor} onAnimClick={() => {}} nodeId={nodeId} />);
                    })}
                    {unifiedLayers.length === 0 && <div className="bp-empty">Press R, E, T, or I to add elements</div>}
                </div>
            </div>


        </div>
    );
}
