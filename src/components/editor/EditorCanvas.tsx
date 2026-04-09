// ─────────────────────────────────────────────────
// EditorCanvas — Fabric.js canvas + HTML overlay elements
// ─────────────────────────────────────────────────
// Overlay drag/resize → useOverlayInteractions.ts
// ─────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import type { CanvasEngineState, CanvasEngineActions } from '@/hooks/canvasTypes';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { useAiMcpBridge } from '@/hooks/useAiMcpBridge';
import { ResizeHandles, type HandleDir, DimensionTooltip, RotationTooltip, overlayMessage, spinnerStyle, statusBarStyle, zoomBtnStyle } from './ResizeHandles';
import { CanvasRuler } from './CanvasRuler';
import { CanvasContextMenu } from './CanvasContextMenu';
import type { SceneNodeInfo } from '@/ai/agentContext';
import { useOverlayInteractions } from './useOverlayInteractions';

interface Props {
    variant: BannerVariant; canvasRef: React.RefObject<HTMLCanvasElement | null>; overlayRef: React.RefObject<HTMLCanvasElement | null>;
    engineRef?: React.RefObject<unknown>; state: CanvasEngineState; actions: CanvasEngineActions; retryInit?: () => void;
    overlayElements?: OverlayElement[]; selectedOverlayId?: string | null;
    onOverlaySelect?: (id: string | null) => void; onOverlayUpdate?: (id: string, updates: Partial<OverlayElement>) => void; onOverlayDelete?: (id: string) => void;
    onAddText?: (x: number, y: number) => void; onTriggerVideoUpload?: (x: number, y: number) => void;
    children?: React.ReactNode;
}

export function EditorCanvas({ variant, canvasRef, overlayRef, engineRef, state, actions, retryInit, overlayElements = [], selectedOverlayId, onOverlaySelect, onOverlayUpdate, onOverlayDelete, onAddText, onTriggerVideoUpload, children }: Props) {
    const { width, height } = variant.preset;
    const activeTool = useEditorStore(s => s.activeTool);
    const setTool = useEditorStore(s => s.setTool);
    const canvasRulerVisible = useUIStore(s => s.canvasRulerVisible);
    const animCurrentTime = useAnimPresetStore(s => s.currentTime);
    const animIsPlaying = useAnimPresetStore(s => s.isPlaying);
    const getAnimStyle = useAnimPresetStore(s => s.getAnimStyle);

    // MCP bridge
    const mcpTrackedNodes = useRef<SceneNodeInfo[]>([]);
    useAiMcpBridge({ engine: (engineRef?.current as any) ?? null, trackedNodes: mcpTrackedNodes.current });

    // Video refs + sync
    const videoRefsMap = useRef<Map<string, HTMLVideoElement>>(new Map());
    useEffect(() => {
        const store = useAnimPresetStore.getState();
        videoRefsMap.current.forEach((videoEl, elId) => {
            const config = store.getPreset(elId);
            const barStart = config.startTime, barEnd = config.endTime < 0 ? Infinity : config.endTime;
            const localTime = Math.max(0, animCurrentTime - barStart);
            const inRange = animCurrentTime >= barStart && animCurrentTime <= barEnd;
            try { if (animIsPlaying && inRange) { if (Math.abs(videoEl.currentTime - localTime) > 0.3) videoEl.currentTime = localTime; if (videoEl.paused) videoEl.play().catch(() => {}); } else { if (!videoEl.paused) videoEl.pause(); if (inRange) videoEl.currentTime = localTime; else if (animCurrentTime < barStart) videoEl.currentTime = 0; } } catch { /* */ }
        });
    }, [animCurrentTime, animIsPlaying]);

    // Overlay interactions (drag + resize)
    const oi = useOverlayInteractions(onOverlaySelect, onOverlayUpdate, actions);

    // Canvas area click
    const handleCanvasAreaMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!(target.tagName === 'CANVAS' || target.classList.contains('ed-canvas-area'))) return;
        if (activeTool === 'video') { e.preventDefault(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); onTriggerVideoUpload?.(e.clientX - rect.left, e.clientY - rect.top); setTool('select'); return; }
        if (activeTool === 'select') onOverlaySelect?.(null);
    }, [activeTool, onTriggerVideoUpload, onOverlaySelect, setTool]);

    // Escape deselect
    useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { onOverlaySelect?.(null); actions.deselectAll(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onOverlaySelect, actions]);

    // Viewport sync
    const [zoom, setZoomDisplay] = useState(1);
    const [overlayTransform, setOverlayTransform] = useState('none');
    useEffect(() => {
        const sync = () => { const eng = engineRef?.current as any; if (eng?.get_viewport_transform) { const vpt: number[] = eng.get_viewport_transform(); setZoomDisplay(vpt[0] ?? 1); setOverlayTransform(`matrix(${vpt[0]},0,0,${vpt[0]},${vpt[4] ?? 0},${vpt[5] ?? 0})`); } };
        const iv = setInterval(sync, 16); sync(); return () => clearInterval(iv);
    }, [canvasRef, engineRef]);

    const totalCount = state.nodeCount + overlayElements.length;
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

    // Overlay element style builder
    const overlayStyle = (el: OverlayElement, isSelected: boolean) => ({ position: 'absolute' as const, left: el.x, top: el.y, width: el.w, height: el.h, opacity: el.opacity, zIndex: el.zIndex + 10, outline: isSelected ? '1px solid #0D99FF' : 'none', cursor: el.locked ? 'not-allowed' : (activeTool === 'select' ? 'move' : 'default'), pointerEvents: (activeTool === 'select' ? 'auto' : 'none') as any, overflow: isSelected ? 'visible' : 'hidden', borderRadius: 2 });

    return (
        <div className="ed-canvas-area" onMouseDown={handleCanvasAreaMouseDown} onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }} style={{ position: 'relative', overflow: 'hidden', cursor: activeTool === 'hand' ? 'grab' : 'default' }}>
            {state.status === 'loading' && <div style={overlayMessage}><div style={spinnerStyle} /><span>Initializing Fabric.js Canvas...</span></div>}
            {state.status === 'error' && <div style={overlayMessage}><span style={{ marginBottom: 12 }}>Canvas error: {state.errorMsg}</span>{retryInit && <button onClick={retryInit} style={{ marginTop: 8, padding: '8px 24px', background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>↻ Retry</button>}</div>}
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

            <div className="ed-overlay-layer" style={{ position: 'absolute', top: 0, left: 0, width, height, pointerEvents: 'none', overflow: 'visible', transformOrigin: '0 0', transform: overlayTransform }}>
                {overlayElements.filter(el => el.type === 'image' && (el.visible ?? true)).map(el => {
                    const isSel = el.id === selectedOverlayId;
                    const isDrag = oi.isDragging.current && oi.dragId.current === el.id;
                    const isResize = oi.isResizing.current && oi.resizeId.current === el.id;
                    const anim = (animIsPlaying && !isDrag && !isResize) ? getAnimStyle(el.id) : {};
                    return (<div key={el.id} onMouseDown={e => oi.handleOverlayMouseDown(e, el)} style={{ ...overlayStyle(el, isSel), ...anim }}><img src={el.src} alt={el.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: el.objectFit || 'cover', pointerEvents: 'none', display: 'block' }} />{isSel && !el.locked && <ResizeHandles el={el} onResizeStart={oi.handleResizeMouseDown} onRotateStart={oi.handleRotateMouseDown} />}</div>);
                })}
                {overlayElements.filter(el => el.type === 'video' && (el.visible ?? true)).map(el => {
                    const isSel = el.id === selectedOverlayId;
                    const isDrag = oi.isDragging.current && oi.dragId.current === el.id;
                    const isResize = oi.isResizing.current && oi.resizeId.current === el.id;
                    const anim = (animIsPlaying && !isDrag && !isResize) ? getAnimStyle(el.id) : {};
                    return (<div key={el.id} onMouseDown={e => oi.handleOverlayMouseDown(e, el)} style={{ ...overlayStyle(el, isSel), background: '#000', ...anim }}><video ref={videoEl => { if (videoEl) { videoRefsMap.current.set(el.id, videoEl); if (!animIsPlaying) { videoEl.pause(); videoEl.currentTime = 0; } } else { videoRefsMap.current.delete(el.id); } }} src={el.videoSrc} poster={el.posterSrc} muted={el.muted ?? true} playsInline preload="metadata" onLoadedData={e => { if (!useAnimPresetStore.getState().isPlaying) { e.currentTarget.pause(); e.currentTarget.currentTime = 0; } }} style={{ width: '100%', height: '100%', objectFit: el.objectFit || 'cover', pointerEvents: 'none', display: 'block' }} />{isSel && !el.locked && <ResizeHandles el={el} onResizeStart={oi.handleResizeMouseDown} onRotateStart={oi.handleRotateMouseDown} />}</div>);
                })}
            </div>

            {canvasRulerVisible && <CanvasRuler width={width} height={height} zoom={zoom} showGrid={true} onToggleGrid={() => useUIStore.getState().toggleCanvasRuler()} />}
            <div style={statusBarStyle}>
                <span>{totalCount} element{totalCount !== 1 ? 's' : ''}</span><span>·</span><span>{width}×{height}</span>
                {state.selection.length > 0 && <><span>·</span><span style={{ color: '#4a9eff' }}>{state.selection.length} selected</span></>}
                {selectedOverlayId && <><span>·</span><span style={{ color: '#34a853' }}>overlay selected</span></>}
                {state.canUndo && <span style={{ color: '#8b949e' }}>Cmd+Z undo</span>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ fontSize: 10, color: '#8b949e', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span></span>
                <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 8 }}>{activeTool.toUpperCase()}</span>
            </div>
            {ctxMenu && <CanvasContextMenu x={ctxMenu.x} y={ctxMenu.y} actions={actions} hasSelection={state.selection.length > 0} selectionCount={state.selection.length} selectedIds={state.selection} nodes={state.nodes} onClose={() => setCtxMenu(null)} />}
            {children}
        </div>
    );
}
