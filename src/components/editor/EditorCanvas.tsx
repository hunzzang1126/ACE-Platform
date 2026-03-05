// ─────────────────────────────────────────────────
// EditorCanvas — Fabric.js canvas + HTML overlay elements
// Canvas fills workspace, artboard is a visual guide, shapes extend beyond
// ─────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import type { CanvasEngineState, CanvasEngineActions } from '@/hooks/canvasTypes';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';
import { useEditorStore } from '@/stores/editorStore';
import { useAiMcpBridge } from '@/hooks/useAiMcpBridge';
import { ResizeHandles, type HandleDir, overlayMessage, spinnerStyle, statusBarStyle, zoomBtnStyle } from './ResizeHandles';
import type { SceneNodeInfo } from '@/ai/agentContext';

interface Props {
    variant: BannerVariant;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    overlayRef: React.RefObject<HTMLCanvasElement | null>;
    /** Direct ref to the Fabric/engine instance — used for viewport transform sync */
    engineRef?: React.RefObject<unknown>;
    state: CanvasEngineState;
    actions: CanvasEngineActions;
    retryInit?: () => void;
    overlayElements?: OverlayElement[];
    selectedOverlayId?: string | null;
    onOverlaySelect?: (id: string | null) => void;
    onOverlayUpdate?: (id: string, updates: Partial<OverlayElement>) => void;
    onOverlayDelete?: (id: string) => void;
    onAddText?: (x: number, y: number) => void;
    onTriggerImageUpload?: (x: number, y: number) => void;
    onTriggerVideoUpload?: (x: number, y: number) => void;
}

export function EditorCanvas({
    variant, canvasRef, overlayRef, engineRef, state, actions, retryInit,
    overlayElements = [], selectedOverlayId, onOverlaySelect,
    onOverlayUpdate, onOverlayDelete, onAddText, onTriggerImageUpload, onTriggerVideoUpload,
}: Props) {
    const { width, height } = variant.preset;
    const activeTool = useEditorStore((s) => s.activeTool);
    const setTool = useEditorStore((s) => s.setTool);

    // Animation
    const animCurrentTime = useAnimPresetStore((s) => s.currentTime);
    const animIsPlaying = useAnimPresetStore((s) => s.isPlaying);
    const getAnimStyle = useAnimPresetStore((s) => s.getAnimStyle);

    // MCP bridge — receive tool calls from Claude Desktop
    const mcpTrackedNodes = useRef<SceneNodeInfo[]>([]);
    useAiMcpBridge({
        engine: (engineRef?.current as any) ?? null,
        trackedNodes: mcpTrackedNodes.current,
    });

    // Video refs
    const videoRefsMap = useRef<Map<string, HTMLVideoElement>>(new Map());

    // Sync videos with animation timeline
    useEffect(() => {
        const store = useAnimPresetStore.getState();
        videoRefsMap.current.forEach((videoEl, elId) => {
            const config = store.getPreset(elId);
            const barStart = config.startTime;
            const barEnd = config.endTime < 0 ? Infinity : config.endTime;
            const localTime = Math.max(0, animCurrentTime - barStart);
            const inRange = animCurrentTime >= barStart && animCurrentTime <= barEnd;
            try {
                if (animIsPlaying && inRange) {
                    if (Math.abs(videoEl.currentTime - localTime) > 0.3) {
                        videoEl.currentTime = localTime;
                    }
                    if (videoEl.paused) videoEl.play().catch(() => { });
                } else {
                    if (!videoEl.paused) videoEl.pause();
                    if (inRange) {
                        videoEl.currentTime = localTime;
                    } else if (animCurrentTime < barStart) {
                        videoEl.currentTime = 0;
                    }
                }
            } catch { /* video not ready */ }
        });
    }, [animCurrentTime, animIsPlaying]);

    // ── Overlay drag state ──
    const isDraggingOverlay = useRef(false);
    const dragOverlayId = useRef<string | null>(null);
    const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });

    // ── Overlay resize state ──
    type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
    const isResizingOverlay = useRef(false);
    const resizeDir = useRef<ResizeDir>('se');
    const resizeOverlayId = useRef<string | null>(null);
    const resizeStart = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

    // ── Get viewport offset for overlay positioning ──
    // The Fabric canvas manages its own viewport transform. Overlays (HTML) must
    // be positioned to match by applying the same transform via CSS.
    const getOverlayTransform = useCallback((): string => {
        const el = canvasRef.current;
        if (!el) return '';
        // Get the Fabric upper-canvas sibling (Fabric creates a second canvas)
        const wrapper = el.parentElement;
        if (!wrapper) return '';
        // Read Fabric's viewport transform from the data attribute or compute from canvas
        // For simplicity, we'll compute from the canvas wrapper's position
        return '';
    }, [canvasRef]);

    // ── Click on canvas area to trigger overlay tools ──
    // Text/Image/Shape creation now handled natively by Fabric in useFabricCanvas.
    // Only video tool still uses overlay system.
    const handleCanvasAreaMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isCanvasEl = target.tagName === 'CANVAS' || target.classList.contains('ed-canvas-area');
        if (!isCanvasEl) return;

        // Video tool → overlay
        if (activeTool === 'video') {
            e.preventDefault();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onTriggerVideoUpload?.(e.clientX - rect.left, e.clientY - rect.top);
            setTool('select');
            return;
        }

        // Click on empty → deselect overlays (Fabric handles its own deselect)
        if (activeTool === 'select') {
            onOverlaySelect?.(null);
        }
    }, [activeTool, onTriggerVideoUpload, onOverlaySelect, setTool]);

    // ── Video overlay element mousedown (drag) ──
    const handleOverlayMouseDown = useCallback((e: React.MouseEvent, el: OverlayElement) => {
        e.stopPropagation();
        if (el.locked) return;
        actions.deselectAll();
        onOverlaySelect?.(el.id);
        isDraggingOverlay.current = true;
        dragOverlayId.current = el.id;
        dragStart.current = { x: e.clientX, y: e.clientY, elX: el.x, elY: el.y };
    }, [onOverlaySelect, actions]);

    // ── Resize handle mousedown (video overlays only) ──
    const handleResizeMouseDown = useCallback((e: React.MouseEvent, el: OverlayElement, dir: HandleDir) => {
        e.stopPropagation();
        e.preventDefault();
        isResizingOverlay.current = true;
        resizeDir.current = dir;
        resizeOverlayId.current = el.id;
        resizeStart.current = { mx: e.clientX, my: e.clientY, x: el.x, y: el.y, w: el.w, h: el.h };
    }, []);

    // ── Global mouse move / up for overlay drag/resize ──
    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (isDraggingOverlay.current && dragOverlayId.current) {
                const dx = e.clientX - dragStart.current.x;
                const dy = e.clientY - dragStart.current.y;
                onOverlayUpdate?.(dragOverlayId.current, {
                    x: dragStart.current.elX + dx,
                    y: dragStart.current.elY + dy,
                });
            }
            if (isResizingOverlay.current && resizeOverlayId.current) {
                const dx = e.clientX - resizeStart.current.mx;
                const dy = e.clientY - resizeStart.current.my;
                const s = resizeStart.current;
                const dir = resizeDir.current;
                let nx = s.x, ny = s.y, nw = s.w, nh = s.h;
                if (dir.includes('e')) nw = Math.max(10, s.w + dx);
                if (dir.includes('w')) { nw = Math.max(10, s.w - dx); nx = s.x + (s.w - nw); }
                if (dir.includes('s')) nh = Math.max(10, s.h + dy);
                if (dir.includes('n')) { nh = Math.max(10, s.h - dy); ny = s.y + (s.h - nh); }
                onOverlayUpdate?.(resizeOverlayId.current, { x: nx, y: ny, w: nw, h: nh });
            }
        };
        const handleUp = () => {
            isDraggingOverlay.current = false;
            dragOverlayId.current = null;
            isResizingOverlay.current = false;
            resizeOverlayId.current = null;
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
    }, [onOverlayUpdate]);

    // ── Escape to deselect all ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onOverlaySelect?.(null);
                actions.deselectAll();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onOverlaySelect, actions]);

    // ── Viewport transform sync (zoom + pan offset) ──
    // Fabric centers the artboard using viewportTransform[4/5] (panX/panY) and getZoom().
    // HTML overlays MUST use the same transform so video elements align with the artboard.
    const [zoom, setZoomDisplay] = useState(1);
    const [overlayTransform, setOverlayTransform] = useState('none');

    useEffect(() => {
        const syncViewport = () => {
            // Prefer engineRef.current.get_viewport_transform() — most reliable
            const engine = engineRef?.current as any;
            if (engine?.get_viewport_transform) {
                const vpt: number[] = engine.get_viewport_transform();
                const z = vpt[0] ?? 1;
                const tx = vpt[4] ?? 0;
                const ty = vpt[5] ?? 0;
                setZoomDisplay(z);
                setOverlayTransform(`matrix(${z},0,0,${z},${tx},${ty})`);
                return;
            }
            // Fallback: read from Fabric's upper-canvas DOM element
            const el = canvasRef.current;
            if (!el) return;
            const wrapper = el.parentElement;
            const upper = wrapper?.querySelector('.upper-canvas') as HTMLCanvasElement;
            const fc = (upper as any)?.__fabric;
            if (!fc) return;
            const vpt: number[] = fc.viewportTransform ?? [1, 0, 0, 1, 0, 0];
            const z = vpt[0] ?? 1;
            const tx = vpt[4] ?? 0;
            const ty = vpt[5] ?? 0;
            setZoomDisplay(z);
            setOverlayTransform(`matrix(${z},0,0,${z},${tx},${ty})`);
        };

        // Poll at 60fps for smooth zoom/pan sync
        const iv = setInterval(syncViewport, 16);
        syncViewport(); // immediate on mount
        return () => clearInterval(iv);
    }, [canvasRef, engineRef]);

    const totalCount = state.nodeCount + overlayElements.length;

    return (
        <div
            className="ed-canvas-area"
            onMouseDown={handleCanvasAreaMouseDown}
            style={{ position: 'relative', overflow: 'hidden', cursor: activeTool === 'hand' ? 'grab' : 'default' }}
        >
            {/* Loading / Error States */}
            {state.status === 'loading' && (
                <div style={overlayMessage}>
                    <div style={spinnerStyle} />
                    <span>Initializing Fabric.js Canvas...</span>
                </div>
            )}
            {state.status === 'error' && (
                <div style={overlayMessage}>
                    <span style={{ marginBottom: 12 }}>Canvas error: {state.errorMsg}</span>
                    {retryInit && (
                        <button
                            onClick={retryInit}
                            style={{
                                marginTop: 8,
                                padding: '8px 24px',
                                background: '#4a9eff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            ↻ Retry
                        </button>
                    )}
                </div>
            )}

            {/* Fabric canvas — fills entire workspace */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '100%', height: '100%',
                }}
            />

            {/* ── Overlay elements (HTML — image + video) ──
                 Text is Fabric-native. Images and videos from toolbar use overlay system.
                 IMPORTANT: We apply the same viewport transform as Fabric so
                 overlays align with the artboard regardless of zoom/pan. */}
            <div
                className="ed-overlay-layer"
                style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: width,
                    height: height,
                    pointerEvents: 'none',
                    overflow: 'visible',
                    transformOrigin: '0 0',
                    transform: overlayTransform,
                }}
            >
                {/* Image overlays */}
                {overlayElements.filter(el => el.type === 'image').map((el) => {
                    const isSelected = el.id === selectedOverlayId;
                    const isVisible = el.visible ?? true;
                    if (!isVisible) return null;

                    const isBeingDragged = isDraggingOverlay.current && dragOverlayId.current === el.id;
                    const isBeingResized = isResizingOverlay.current && resizeOverlayId.current === el.id;
                    const isInteracting = isBeingDragged || isBeingResized;
                    const animStyle = (animIsPlaying && !isInteracting) ? getAnimStyle(el.id) : {};

                    return (
                        <div
                            key={el.id}
                            onMouseDown={(e) => handleOverlayMouseDown(e, el)}
                            style={{
                                position: 'absolute',
                                left: el.x,
                                top: el.y,
                                width: el.w,
                                height: el.h,
                                opacity: el.opacity,
                                zIndex: el.zIndex + 10,
                                outline: isSelected ? '2px solid #4a9eff' : 'none',
                                cursor: el.locked ? 'not-allowed' : (activeTool === 'select' ? 'move' : 'default'),
                                pointerEvents: activeTool === 'select' ? 'auto' : 'none',
                                overflow: isSelected ? 'visible' : 'hidden',
                                borderRadius: 2,
                                ...animStyle,
                            }}
                        >
                            <img
                                src={el.src}
                                alt={el.name}
                                draggable={false}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: el.objectFit || 'cover',
                                    pointerEvents: 'none',
                                    display: 'block',
                                }}
                            />
                            {isSelected && !el.locked && <ResizeHandles el={el} onResizeStart={handleResizeMouseDown} />}
                        </div>
                    );
                })}

                {/* Video overlays */}
                {overlayElements.filter(el => el.type === 'video').map((el) => {
                    const isSelected = el.id === selectedOverlayId;
                    const isVisible = el.visible ?? true;
                    if (!isVisible) return null;

                    const isBeingDragged = isDraggingOverlay.current && dragOverlayId.current === el.id;
                    const isBeingResized = isResizingOverlay.current && resizeOverlayId.current === el.id;
                    const isInteracting = isBeingDragged || isBeingResized;
                    const animStyle = (animIsPlaying && !isInteracting) ? getAnimStyle(el.id) : {};

                    return (
                        <div
                            key={el.id}
                            onMouseDown={(e) => handleOverlayMouseDown(e, el)}
                            style={{
                                position: 'absolute',
                                left: el.x,
                                top: el.y,
                                width: el.w,
                                height: el.h,
                                opacity: el.opacity,
                                zIndex: el.zIndex + 10,
                                outline: isSelected ? '2px solid #4a9eff' : 'none',
                                cursor: el.locked ? 'not-allowed' : (activeTool === 'select' ? 'move' : 'default'),
                                pointerEvents: activeTool === 'select' ? 'auto' : 'none',
                                overflow: isSelected ? 'visible' : 'hidden',
                                borderRadius: 2,
                                background: '#000',
                                ...animStyle,
                            }}
                        >
                            <video
                                ref={(videoEl) => {
                                    if (videoEl) {
                                        videoRefsMap.current.set(el.id, videoEl);
                                        if (!animIsPlaying) {
                                            videoEl.pause();
                                            videoEl.currentTime = 0;
                                        }
                                    } else {
                                        videoRefsMap.current.delete(el.id);
                                    }
                                }}
                                src={el.videoSrc}
                                poster={el.posterSrc}
                                muted={el.muted ?? true}
                                playsInline
                                preload="metadata"
                                onLoadedData={(e) => {
                                    const vid = e.currentTarget;
                                    if (!useAnimPresetStore.getState().isPlaying) {
                                        vid.pause();
                                        vid.currentTime = 0;
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: el.objectFit || 'cover',
                                    pointerEvents: 'none',
                                    display: 'block',
                                }}
                            />
                            {isSelected && !el.locked && <ResizeHandles el={el} onResizeStart={handleResizeMouseDown} />}
                        </div>
                    );
                })}
            </div>

            {/* Status bar */}
            <div style={statusBarStyle}>
                <span>{totalCount} element{totalCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{width}×{height}</span>
                {state.selection.length > 0 && (
                    <>
                        <span>·</span>
                        <span style={{ color: '#4a9eff' }}>
                            {state.selection.length} selected
                        </span>
                    </>
                )}
                {selectedOverlayId && (
                    <>
                        <span>·</span>
                        <span style={{ color: '#34a853' }}>overlay selected</span>
                    </>
                )}
                {state.canUndo && <span style={{ color: '#8b949e' }}>Cmd+Z undo</span>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#8b949e', minWidth: 36, textAlign: 'center' }}>
                        {Math.round(zoom * 100)}%
                    </span>
                </span>
                <span style={{ color: '#484f58', fontSize: 10, marginLeft: 8 }}>
                    {activeTool.toUpperCase()}
                </span>
            </div>
        </div>
    );
}
