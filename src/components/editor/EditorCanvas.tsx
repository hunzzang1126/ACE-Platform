// ─────────────────────────────────────────────────
// EditorCanvas — Renders WASM WebGPU canvas + overlay elements
// Supports zoom/pan, text overlays, image overlays
// ─────────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import type { CanvasEngineState, CanvasEngineActions } from '@/hooks/useCanvasEngine';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';
import { useEditorStore } from '@/stores/editorStore';

interface Props {
    variant: BannerVariant;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    overlayRef: React.RefObject<HTMLCanvasElement | null>;
    state: CanvasEngineState;
    actions: CanvasEngineActions;
    retryInit?: () => void;
    // Overlay elements
    overlayElements?: OverlayElement[];
    selectedOverlayId?: string | null;
    onOverlaySelect?: (id: string | null) => void;
    onOverlayUpdate?: (id: string, updates: Partial<OverlayElement>) => void;
    onOverlayDelete?: (id: string) => void;
    onAddText?: (x: number, y: number) => void;
    onTriggerImageUpload?: (x: number, y: number) => void;
    onTriggerVideoUpload?: (x: number, y: number) => void;
}

// ── Resize handles for overlay elements ──
const HANDLE_SIZE = 8;
const HALF = HANDLE_SIZE / 2;

type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLE_POSITIONS: { dir: HandleDir; cursor: string; style: React.CSSProperties }[] = [
    { dir: 'nw', cursor: 'nw-resize', style: { top: -HALF, left: -HALF } },
    { dir: 'n', cursor: 'n-resize', style: { top: -HALF, left: `calc(50% - ${HALF}px)` } },
    { dir: 'ne', cursor: 'ne-resize', style: { top: -HALF, right: -HALF } },
    { dir: 'w', cursor: 'w-resize', style: { top: `calc(50% - ${HALF}px)`, left: -HALF } },
    { dir: 'e', cursor: 'e-resize', style: { top: `calc(50% - ${HALF}px)`, right: -HALF } },
    { dir: 'sw', cursor: 'sw-resize', style: { bottom: -HALF, left: -HALF } },
    { dir: 's', cursor: 's-resize', style: { bottom: -HALF, left: `calc(50% - ${HALF}px)` } },
    { dir: 'se', cursor: 'se-resize', style: { bottom: -HALF, right: -HALF } },
];

function ResizeHandles({ el, onResizeStart }: {
    el: OverlayElement;
    onResizeStart: (e: React.MouseEvent, el: OverlayElement, dir: string) => void;
}) {
    return (
        <>
            {HANDLE_POSITIONS.map(({ dir, cursor, style }) => (
                <div
                    key={dir}
                    onMouseDown={(e) => onResizeStart(e, el, dir)}
                    style={{
                        position: 'absolute',
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        background: '#fff',
                        border: '1px solid #4a9eff',
                        borderRadius: 2,
                        cursor,
                        zIndex: 9999,
                        ...style,
                    }}
                />
            ))}
        </>
    );
}

export function EditorCanvas({
    variant, canvasRef, overlayRef, state, actions, retryInit,
    overlayElements = [], selectedOverlayId, onOverlaySelect,
    onOverlayUpdate, onOverlayDelete, onAddText, onTriggerImageUpload, onTriggerVideoUpload,
}: Props) {
    const { width, height } = variant.preset;
    const activeTool = useEditorStore((s) => s.activeTool);
    const setTool = useEditorStore((s) => s.setTool);

    // Subscribe to animation store for CSS-based animation on overlays
    // Reading currentTime triggers re-render on each animation tick
    const animCurrentTime = useAnimPresetStore((s) => s.currentTime);
    const animIsPlaying = useAnimPresetStore((s) => s.isPlaying);
    const getAnimStyle = useAnimPresetStore((s) => s.getAnimStyle);

    // ── Zoom & Pan state ──
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });

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

    // Cursor based on active tool
    const cursorMap: Record<string, string> = {
        select: 'default',
        shape: 'crosshair',
        text: 'text',
        image: 'copy',
        hand: isPanning.current ? 'grabbing' : 'grab',
        zoom: 'zoom-in',
    };

    // ── Wheel handler (zoom) ──
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom((prev) => Math.max(0.1, Math.min(5, prev + delta)));
        }
    }, []);

    // ── Mouse down on artboard ──
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Hand tool → start panning
        if (activeTool === 'hand') {
            isPanning.current = true;
            panStart.current = { x: e.clientX - panX, y: e.clientY - panY };
            return;
        }

        // Zoom tool → zoom on click
        if (activeTool === 'zoom') {
            if (e.shiftKey) {
                setZoom((prev) => Math.max(0.1, prev - 0.25));
            } else {
                setZoom((prev) => Math.min(5, prev + 0.25));
            }
            return;
        }

        // Text tool → add text at click position
        if (activeTool === 'text') {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            onAddText?.(x, y);
            setTool('select');
            return;
        }

        // Image tool → trigger file upload
        if (activeTool === 'image') {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            onTriggerImageUpload?.(x, y);
            setTool('select');
            return;
        }

        // Video tool → trigger file upload
        if (activeTool === 'video') {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            onTriggerVideoUpload?.(x, y);
            setTool('select');
            return;
        }

        // Deselect overlay if clicking artboard with select tool
        if (activeTool === 'select') {
            onOverlaySelect?.(null);
        }

        // Pass to engine (shape tool & select tool)
        actions.onMouseDown(e);
    }, [activeTool, panX, panY, zoom, actions, onAddText, onTriggerImageUpload, onTriggerVideoUpload, onOverlaySelect, setTool]);

    // ── Mouse move (pan + engine drag + overlay resize) ──
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning.current) {
            setPanX(e.clientX - panStart.current.x);
            setPanY(e.clientY - panStart.current.y);
            return;
        }

        // Overlay resizing
        if (isResizingOverlay.current && resizeOverlayId.current) {
            const dx = (e.clientX - resizeStart.current.mx) / zoom;
            const dy = (e.clientY - resizeStart.current.my) / zoom;
            const dir = resizeDir.current;
            let { x, y, w, h } = resizeStart.current;

            if (dir.includes('e')) { w = Math.max(20, resizeStart.current.w + dx); }
            if (dir.includes('w')) {
                const newW = Math.max(20, resizeStart.current.w - dx);
                x = resizeStart.current.x + resizeStart.current.w - newW;
                w = newW;
            }
            if (dir.includes('s')) { h = Math.max(20, resizeStart.current.h + dy); }
            if (dir.includes('n')) {
                const newH = Math.max(20, resizeStart.current.h - dy);
                y = resizeStart.current.y + resizeStart.current.h - newH;
                h = newH;
            }

            onOverlayUpdate?.(resizeOverlayId.current, { x, y, w, h });
            return;
        }

        // Overlay dragging
        if (isDraggingOverlay.current && dragOverlayId.current) {
            const dx = (e.clientX - dragStart.current.x) / zoom;
            const dy = (e.clientY - dragStart.current.y) / zoom;
            onOverlayUpdate?.(dragOverlayId.current, {
                x: dragStart.current.elX + dx,
                y: dragStart.current.elY + dy,
            });
            return;
        }

        actions.onMouseMove(e);
    }, [zoom, actions, onOverlayUpdate]);

    // ── Mouse up ──
    const handleMouseUp = useCallback(() => {
        isPanning.current = false;
        isDraggingOverlay.current = false;
        dragOverlayId.current = null;
        isResizingOverlay.current = false;
        resizeOverlayId.current = null;
        actions.onMouseUp();
    }, [actions]);

    // ── Overlay element mousedown (drag) ──
    const handleOverlayMouseDown = useCallback((e: React.MouseEvent, el: OverlayElement) => {
        e.stopPropagation();
        if (el.locked) return; // Don't drag locked elements
        onOverlaySelect?.(el.id);
        // Start dragging
        isDraggingOverlay.current = true;
        dragOverlayId.current = el.id;
        dragStart.current = { x: e.clientX, y: e.clientY, elX: el.x, elY: el.y };
    }, [onOverlaySelect]);

    // ── Overlay resize handle mousedown ──
    const handleResizeMouseDown = useCallback((e: React.MouseEvent, el: OverlayElement, dir: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (el.locked) return;
        isResizingOverlay.current = true;
        resizeDir.current = dir as ResizeDir;
        resizeOverlayId.current = el.id;
        resizeStart.current = { mx: e.clientX, my: e.clientY, x: el.x, y: el.y, w: el.w, h: el.h };
    }, []);

    // ── Text double-click edit ──
    const handleTextDoubleClick = useCallback((e: React.MouseEvent, el: OverlayElement) => {
        e.stopPropagation();
        if (el.type === 'text') {
            onOverlayUpdate?.(el.id, { editing: true });
        }
    }, [onOverlayUpdate]);

    // ── Text blur (stop editing) ──
    const handleTextBlur = useCallback((el: OverlayElement, newContent: string) => {
        onOverlayUpdate?.(el.id, {
            editing: false,
            content: newContent || 'Text',
        });
    }, [onOverlayUpdate]);

    // ── Zoom controls ──
    const zoomIn = useCallback(() => setZoom((z) => Math.min(5, z + 0.25)), []);
    const zoomOut = useCallback(() => setZoom((z) => Math.max(0.1, z - 0.25)), []);
    const zoomReset = useCallback(() => { setZoom(1); setPanX(0); setPanY(0); }, []);

    // Count total elements (engine + overlay)
    const totalCount = state.nodeCount + overlayElements.length;

    return (
        <div className="ed-canvas-area" onWheel={handleWheel}>
            {/* Loading / Error States */}
            {state.status === 'loading' && (
                <div style={overlayMessage}>
                    <div style={spinnerStyle} />
                    <span>Initializing WebGPU Engine...</span>
                </div>
            )}
            {state.status === 'no-webgpu' && (
                <div style={overlayMessage}>
                    <span>WebGPU is not available in this browser.</span>
                </div>
            )}
            {state.status === 'error' && (
                <div style={overlayMessage}>
                    <span style={{ marginBottom: 12 }}>Engine error: {state.errorMsg}</span>
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
                                letterSpacing: 0.3,
                                transition: 'background 0.15s',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#3b8de6')}
                            onMouseOut={(e) => (e.currentTarget.style.background = '#4a9eff')}
                        >
                            ↻ Retry Engine Init
                        </button>
                    )}
                </div>
            )}

            {/* Canvas container — zoom/pan transform */}
            <div
                className="ed-canvas-transform"
                style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                }}
            >
                <div
                    className="ed-artboard"
                    style={{
                        width,
                        height,
                        position: 'relative',
                        backgroundColor: variant.backgroundColor || '#1a1f2e',
                        cursor: cursorMap[activeTool] || 'default',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* WebGPU canvas */}
                    <canvas
                        ref={canvasRef}
                        width={width}
                        height={height}
                        style={{
                            position: 'absolute',
                            top: 0, left: 0,
                            width: '100%', height: '100%',
                        }}
                    />

                    {/* ── Overlay elements (text + images) ── */}
                    {overlayElements.map((el) => {
                        const isSelected = el.id === selectedOverlayId;
                        const isVisible = el.visible ?? true;
                        if (!isVisible) return null; // Hidden layers

                        // Animation styles during playback:
                        // - Apply animation CSS only while playing, so elements
                        //   stay at their design positions for editing when stopped
                        // - Suppress animation for the element being actively dragged/resized
                        //   so it moves freely in all directions
                        const isBeingDragged = isDraggingOverlay.current && dragOverlayId.current === el.id;
                        const isBeingResized = isResizingOverlay.current && resizeOverlayId.current === el.id;
                        const isInteracting = isBeingDragged || isBeingResized;
                        const animStyle = (animIsPlaying && !isInteracting) ? getAnimStyle(el.id) : {};

                        if (el.type === 'text') {
                            return (
                                <div
                                    key={el.id}
                                    onMouseDown={(e) => handleOverlayMouseDown(e, el)}
                                    onDoubleClick={(e) => handleTextDoubleClick(e, el)}
                                    style={{
                                        position: 'absolute',
                                        left: el.x,
                                        top: el.y,
                                        width: el.w,
                                        minHeight: el.h,
                                        fontSize: el.fontSize,
                                        fontFamily: el.fontFamily,
                                        fontWeight: el.fontWeight,
                                        color: el.color,
                                        textAlign: el.textAlign,
                                        lineHeight: el.lineHeight ?? 1.4,
                                        letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                                        opacity: el.opacity,
                                        zIndex: el.zIndex + 10,
                                        outline: isSelected ? '2px solid #4a9eff' : 'none',
                                        padding: '4px 6px',
                                        cursor: el.locked ? 'not-allowed' : (activeTool === 'select' ? 'move' : 'default'),
                                        userSelect: el.editing ? 'text' : 'none',
                                        pointerEvents: (activeTool === 'select' || el.editing) ? 'auto' : 'none',
                                        boxSizing: 'border-box',
                                        ...animStyle,
                                    }}
                                >
                                    {el.editing ? (
                                        <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            style={{
                                                outline: 'none',
                                                minHeight: '1em',
                                                background: 'rgba(0,0,0,0.3)',
                                                borderRadius: 2,
                                                padding: 2,
                                            }}
                                            onBlur={(e) => handleTextBlur(el, e.currentTarget.textContent || '')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                                                    e.preventDefault();
                                                    (e.target as HTMLElement).blur();
                                                }
                                                e.stopPropagation();
                                            }}
                                            autoFocus
                                        >
                                            {el.content}
                                        </div>
                                    ) : (
                                        <span>{el.content}</span>
                                    )}
                                    {/* Resize handles */}
                                    {isSelected && !el.editing && !el.locked && <ResizeHandles el={el} onResizeStart={handleResizeMouseDown} />}
                                </div>
                            );
                        }
                        if (el.type === 'image') {
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
                                        alt={el.fileName || 'image'}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: el.objectFit || 'cover',
                                            pointerEvents: 'none',
                                            display: 'block',
                                        }}
                                        draggable={false}
                                    />
                                    {/* Resize handles */}
                                    {isSelected && !el.locked && <ResizeHandles el={el} onResizeStart={handleResizeMouseDown} />}
                                </div>
                            );
                        }
                        if (el.type === 'video') {
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
                                    }}
                                >
                                    <video
                                        src={el.videoSrc}
                                        poster={el.posterSrc}
                                        muted={el.muted ?? true}
                                        loop={el.loop ?? true}
                                        autoPlay={el.autoplay ?? true}
                                        playsInline
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: el.objectFit || 'cover',
                                            pointerEvents: 'none',
                                            display: 'block',
                                        }}
                                    />
                                    {/* Resize handles */}
                                    {isSelected && !el.locked && <ResizeHandles el={el} onResizeStart={handleResizeMouseDown} />}
                                </div>
                            );
                        }
                        return null;
                    })}

                    {/* Selection overlay (Canvas 2D) */}
                    <canvas
                        ref={overlayRef}
                        width={width}
                        height={height}
                        style={{
                            position: 'absolute',
                            top: 0, left: 0,
                            width: '100%', height: '100%',
                            pointerEvents: 'none',
                        }}
                    />
                </div>
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
                {state.canUndo && <span style={{ color: '#8b949e' }}>⌘Z undo</span>}

                {/* Zoom controls in status bar */}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={zoomOut} style={zoomBtnStyle}>−</button>
                    <span style={{ fontSize: 10, color: '#8b949e', minWidth: 36, textAlign: 'center' }}>
                        {Math.round(zoom * 100)}%
                    </span>
                    <button onClick={zoomIn} style={zoomBtnStyle}>+</button>
                    <button onClick={zoomReset} style={{ ...zoomBtnStyle, fontSize: 9, width: 'auto', padding: '0 4px' }}>FIT</button>
                </span>
                <span style={{ color: '#484f58', fontSize: 10, marginLeft: 8 }}>
                    {activeTool.toUpperCase()}
                </span>
            </div>
        </div>
    );
}

// ── Styles ──────────────────────────────────────────

const overlayMessage: React.CSSProperties = {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', gap: 12,
    alignItems: 'center', justifyContent: 'center',
    color: '#8b949e', fontSize: 14, zIndex: 10,
};

const spinnerStyle: React.CSSProperties = {
    width: 24, height: 24,
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: '#4a9eff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
};

const statusBarStyle: React.CSSProperties = {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    display: 'flex', gap: 8, alignItems: 'center',
    padding: '6px 12px',
    fontSize: 11, color: '#6e7681',
    background: 'rgba(13, 17, 23, 0.8)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
};

const zoomBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 3,
    color: '#9aa0a6',
    cursor: 'pointer',
    width: 20, height: 18,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
};
