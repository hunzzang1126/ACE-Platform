// ─────────────────────────────────────────────────
// useCanvasEngine — Reusable hook for WASM WebGPU canvas
// Tool-aware: supports shape/text creation on click
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadAceEngine } from '@/engine/loader';
import { useEditorStore, type EditorTool } from '@/stores/editorStore';
import { useCanvasKeyboard } from './useCanvasKeyboard';

// Re-export all types for backward compatibility
export type { Engine, SelectionBounds, EngineNode, CanvasEngineState, CanvasEngineActions, UseCanvasEngineResult } from './canvasTypes';
import type { Engine, SelectionBounds, EngineNode, CanvasEngineState, UseCanvasEngineResult } from './canvasTypes';

// Random pastel colors for new shapes
const SHAPE_COLORS: [number, number, number][] = [
    [0.33, 0.55, 1.0],   // Blue
    [0.16, 0.82, 0.63],  // Green
    [0.94, 0.36, 0.60],  // Pink
    [1.0, 0.65, 0.0],    // Orange
    [0.60, 0.40, 0.90],  // Purple
    [0.20, 0.75, 0.85],  // Cyan
    [0.95, 0.85, 0.20],  // Yellow
];
let colorIdx = 0;
function nextColor(): [number, number, number] {
    const c = SHAPE_COLORS[colorIdx % SHAPE_COLORS.length]!;
    colorIdx++;
    return c;
}

/**
 * useCanvasEngine — initializes the WASM WebGPU engine,
 * sets up render loop, selection overlay, mouse interaction,
 * keyboard shortcuts, and tool-aware element creation.
 */
export function useCanvasEngine(
    width: number,
    height: number,
    addDemoShapes = false,
): UseCanvasEngineResult {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine>(null);
    const isDragging = useRef(false);
    const rafRef = useRef<number>(0);

    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-webgpu'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [selection, setSelection] = useState<number[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [nodeCount, setNodeCount] = useState(0);
    const [nodes, setNodes] = useState<EngineNode[]>([]);

    const activeTool = useEditorStore((s) => s.activeTool);
    const setTool = useEditorStore((s) => s.setTool);

    // ── Sync state from engine ──────────────────────
    const syncState = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        try {
            setSelection(JSON.parse(engine.get_selection()));
            setCanUndo(engine.can_undo());
            setCanRedo(engine.can_redo());
            setNodeCount(engine.node_count());
            // Sync node list for layer panel
            try {
                const raw = engine.get_all_nodes();
                const allNodes = JSON.parse(raw) as EngineNode[];
                setNodes(allNodes);
            } catch (err) {
                console.warn('[syncState] get_all_nodes error:', err);
            }
        } catch (err) {
            console.warn('[syncState] outer error:', err);
        }
    }, []);

    // ── Draw selection overlay ──────────────────────
    const drawOverlay = useCallback(() => {
        const engine = engineRef.current;
        const overlay = overlayRef.current;
        if (!engine || !overlay) return;

        const ctx = overlay.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        // Selection bounding box
        try {
            const boundsJson = engine.selection_bounds();
            if (boundsJson !== 'null') {
                const bounds: SelectionBounds = JSON.parse(boundsJson);
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([]);
                ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

                // Resize handles
                const handlesJson = engine.selection_handles();
                const handles: [number, number][] = JSON.parse(handlesJson);
                for (const [hx, hy] of handles) {
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#4a9eff';
                    ctx.lineWidth = 1.5;
                    ctx.fillRect(hx - 4, hy - 4, 8, 8);
                    ctx.strokeRect(hx - 4, hy - 4, 8, 8);
                }
            }

            // Rubber band selection
            const rbJson = engine.rubber_band_rect();
            if (rbJson !== 'null') {
                const rb: SelectionBounds = JSON.parse(rbJson);
                ctx.strokeStyle = '#4a9eff';
                ctx.fillStyle = 'rgba(74, 158, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(rb.x, rb.y, rb.w, rb.h);
                ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
            }
        } catch { /* ignore */ }
    }, [width, height]);

    // ── Retry trigger — bump to force re-init ────────
    const [initAttempt, setInitAttempt] = useState(0);

    // ── Init Engine (with auto-retry) ───────────────
    useEffect(() => {
        let cancelled = false;
        let attemptTimeouts: ReturnType<typeof setTimeout>[] = [];

        const MAX_RETRIES = 3;
        const BASE_DELAY_MS = 800; // exponential backoff: 800, 1600, 3200

        const tryInit = async (attempt: number): Promise<void> => {
            if (cancelled) return;

            const attemptLabel = `[ACE] Init attempt ${attempt + 1}/${MAX_RETRIES}`;
            console.log(`${attemptLabel}: starting...`);

            if (attempt > 0) {
                setStatus('loading');
                setErrorMsg('');
            }

            // ── Guard: WebGPU support ──
            if (!navigator.gpu) {
                console.warn(`${attemptLabel}: navigator.gpu not available`);
                setStatus('no-webgpu');
                return;
            }

            // ── Guard: Canvas ref ──
            const canvas = canvasRef.current;
            if (!canvas) {
                console.warn(`${attemptLabel}: canvasRef is null`);
                if (attempt < MAX_RETRIES - 1) {
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                    console.log(`${attemptLabel}: canvas not ready, retrying in ${delay}ms...`);
                    const tid = setTimeout(() => {
                        if (!cancelled) tryInit(attempt + 1);
                    }, delay);
                    attemptTimeouts.push(tid);
                    return;
                }
                setErrorMsg('Canvas element not available.');
                setStatus('error');
                return;
            }

            // ── Per-attempt timeout (8 seconds) ──
            let timedOut = false;
            const timeoutId = setTimeout(() => {
                timedOut = true;
                if (!cancelled) {
                    console.warn(`${attemptLabel}: timed out after 8s`);
                    if (attempt < MAX_RETRIES - 1) {
                        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                        console.log(`${attemptLabel}: retrying in ${delay}ms...`);
                        const tid = setTimeout(() => {
                            if (!cancelled) tryInit(attempt + 1);
                        }, delay);
                        attemptTimeouts.push(tid);
                    } else {
                        setErrorMsg('WebGPU initialization timed out after multiple attempts.');
                        setStatus('error');
                    }
                }
            }, 8_000);
            attemptTimeouts.push(timeoutId);

            try {
                // Step 1: Load WASM module (cached after first success)
                console.log(`${attemptLabel}: loading WASM module...`);
                const mod = await loadAceEngine();
                if (cancelled || timedOut) return;

                // Step 2: Create WebGPU engine on canvas
                console.log(`${attemptLabel}: creating WasmEngine (${canvas.width}×${canvas.height})...`);
                const engine = await new mod.WasmEngine(canvas);
                if (cancelled || timedOut) {
                    try { engine.free(); } catch { /* ignore */ }
                    return;
                }

                // ── Success! ──
                clearTimeout(timeoutId);
                engineRef.current = engine;
                console.log(`${attemptLabel}: [OK] Engine ready! node_count=${engine.node_count()}`);

                if (addDemoShapes) {
                    engine.add_gradient_rect(20, 20, 600, 360, 0.12, 0.14, 0.22, 1.0, 0.20, 0.10, 0.30, 1.0, 135.0);
                    engine.add_rect(80, 60, 120, 80, 0.33, 0.55, 1.0, 0.9);
                    engine.add_rounded_rect(240, 60, 140, 80, 0.16, 0.82, 0.63, 0.9, 16.0);
                    engine.add_ellipse(470, 100, 60, 50, 0.94, 0.36, 0.60, 0.9);
                }

                setNodeCount(engine.node_count());
                setStatus('ready');

            } catch (err) {
                clearTimeout(timeoutId);
                if (cancelled || timedOut) return;

                console.error(`${attemptLabel}: error:`, err);

                if (attempt < MAX_RETRIES - 1) {
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                    console.log(`${attemptLabel}: retrying in ${delay}ms...`);
                    const tid = setTimeout(() => {
                        if (!cancelled) tryInit(attempt + 1);
                    }, delay);
                    attemptTimeouts.push(tid);
                } else {
                    setErrorMsg(String(err));
                    setStatus('error');
                }
            }
        };

        tryInit(0);

        return () => {
            cancelled = true;
            attemptTimeouts.forEach(clearTimeout);
            cancelAnimationFrame(rafRef.current);
            if (engineRef.current) {
                console.log('[ACE] Cleanup: freeing engine');
                try { engineRef.current.free(); } catch { /* ignore */ }
                engineRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addDemoShapes, initAttempt]);

    // ── Render Loop ─────────────────────────────────
    useEffect(() => {
        if (status !== 'ready') return;
        const engine = engineRef.current;
        if (!engine) return;

        const frame = (timestamp: number) => {
            try {
                // render_frame_at advances animation time when playing
                engine.render_frame_at(timestamp);
                drawOverlay();
            } catch { /* ignore */ }
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
    }, [status, drawOverlay]);

    // ── Element creation actions ─────────────────────
    const addRect = useCallback((x?: number, y?: number): number | null => {
        const engine = engineRef.current;
        if (!engine) return null;
        const [r, g, b] = nextColor();
        const px = x ?? width / 2 - 60;
        const py = y ?? height / 2 - 40;
        const id = engine.add_rect(px, py, 120, 80, r, g, b, 0.9);
        engine.select(id);
        syncState();
        return id;
    }, [width, height, syncState]);

    const addRoundedRect = useCallback((x?: number, y?: number): number | null => {
        const engine = engineRef.current;
        if (!engine) return null;
        const [r, g, b] = nextColor();
        const px = x ?? width / 2 - 60;
        const py = y ?? height / 2 - 40;
        const id = engine.add_rounded_rect(px, py, 120, 80, r, g, b, 0.9, 12.0);
        engine.select(id);
        syncState();
        return id;
    }, [width, height, syncState]);

    const addEllipse = useCallback((x?: number, y?: number): number | null => {
        const engine = engineRef.current;
        if (!engine) return null;
        const [r, g, b] = nextColor();
        const cx = x ?? width / 2;
        const cy = y ?? height / 2;
        const id = engine.add_ellipse(cx, cy, 60, 50, r, g, b, 0.9);
        engine.select(id);
        syncState();
        return id;
    }, [width, height, syncState]);

    const deleteSelected = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.delete_selected();
        syncState();
    }, [syncState]);

    const selectNode = useCallback((id: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.select(id);
        syncState();
    }, [syncState]);

    const deselectAll = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.deselect_all();
        syncState();
    }, [syncState]);

    const setNodePosition = useCallback((id: number, x: number, y: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_position(id, x, y); } catch { /* may not exist */ }
    }, []);

    const setNodeSize = useCallback((id: number, w: number, h: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_size(id, w, h); } catch { /* may not exist */ }
    }, []);

    const setNodeOpacity = useCallback((id: number, opacity: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_opacity(id, opacity); } catch { /* may not exist */ }
    }, []);

    const setFillColor = useCallback((id: number, r: number, g: number, b: number, a: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_fill_color(id, r, g, b, a); } catch { /* may not exist */ }
        syncState();  // Refresh node cache so auto-save captures the new color
    }, [syncState]);

    // ── Z-index / layer order ─────────────────────
    const bringToFront = useCallback((id: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        const maxZ = nodes.reduce((m, n) => Math.max(m, n.z_index), 0);
        try { engine.set_z_index(id, maxZ + 1); } catch { /* fallback */ }
        syncState();
    }, [nodes, syncState]);

    const sendToBack = useCallback((id: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        const minZ = nodes.reduce((m, n) => Math.min(m, n.z_index), 0);
        try { engine.set_z_index(id, minZ - 1); } catch { /* fallback */ }
        syncState();
    }, [nodes, syncState]);

    const bringForward = useCallback((id: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        const node = nodes.find(n => n.id === id);
        if (!node) return;
        try { engine.set_z_index(id, node.z_index + 1); } catch { /* fallback */ }
        syncState();
    }, [nodes, syncState]);

    const sendBackward = useCallback((id: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        const node = nodes.find(n => n.id === id);
        if (!node) return;
        try { engine.set_z_index(id, node.z_index - 1); } catch { /* fallback */ }
        syncState();
    }, [nodes, syncState]);

    // ── Effects ───────────────────────────────────
    const setShadow = useCallback((id: number, ox: number, oy: number, blur: number, r: number, g: number, b: number, a: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_shadow(id, ox, oy, blur, r, g, b, a); } catch { /* */ }
    }, []);

    const removeShadow = useCallback((id: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.remove_shadow(id); } catch { /* */ }
    }, []);

    const setBlendMode = useCallback((id: number, mode: string) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_blend_mode(id, mode); } catch { /* */ }
    }, []);

    const setBrightness = useCallback((id: number, v: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_brightness(id, v); } catch { /* */ }
    }, []);

    const setContrast = useCallback((id: number, v: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_contrast(id, v); } catch { /* */ }
    }, []);

    const setSaturation = useCallback((id: number, v: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_saturation(id, v); } catch { /* */ }
    }, []);

    const setHueRotate = useCallback((id: number, deg: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.set_hue_rotate(id, deg); } catch { /* */ }
    }, []);

    // ── Keyframe ──────────────────────────────────
    const addKeyframe = useCallback((nodeId: number, property: string, time: number, value: number, easing: string) => {
        const engine = engineRef.current;
        if (!engine) return;
        try { engine.add_keyframe(nodeId, property, time, value, easing); } catch { /* */ }
    }, []);

    // ── Duplicate ─────────────────────────────────
    const duplicateSelected = useCallback((): number | null => {
        const engine = engineRef.current;
        if (!engine || selection.length === 0) return null;
        const sel = selection[0];
        const node = nodes.find(n => n.id === sel);
        if (!node) return null;
        const [r, g, b] = nextColor();
        let newId: number | null = null;
        try {
            if (node.type === 'ellipse') {
                newId = engine.add_ellipse(node.x + 20, node.y + 20, node.w / 2, node.h / 2, r, g, b, node.opacity);
            } else if (node.type === 'rounded_rect') {
                newId = engine.add_rounded_rect(node.x + 20, node.y + 20, node.w, node.h, r, g, b, node.opacity, 12.0);
            } else {
                newId = engine.add_rect(node.x + 20, node.y + 20, node.w, node.h, r, g, b, node.opacity);
            }
            if (newId != null) engine.select(newId);
        } catch { /* */ }
        syncState();
        return newId;
    }, [selection, nodes, syncState]);

    // ── Alignment to canvas ──────────────────────
    const alignToCanvas = useCallback((id: number, alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
        const engine = engineRef.current;
        if (!engine) return;
        const node = nodes.find(n => n.id === id);
        if (!node) return;
        let x = node.x, y = node.y;
        switch (alignment) {
            case 'left': x = 0; break;
            case 'center-h': x = (width - node.w) / 2; break;
            case 'right': x = width - node.w; break;
            case 'top': y = 0; break;
            case 'center-v': y = (height - node.h) / 2; break;
            case 'bottom': y = height - node.h; break;
        }
        try { engine.set_position(id, x, y); } catch { /* */ }
        syncState();
    }, [nodes, width, height, syncState]);

    // ── Mouse helpers ───────────────────────────────
    const getCanvasPos = useCallback((e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }, []);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const engine = engineRef.current;
        if (!engine) return;
        const { x, y } = getCanvasPos(e);

        // ── Tool-aware creation ──────────────────────
        if (activeTool === 'shape') {
            addRect(x - 60, y - 40);
            setTool('select');
            return;
        }

        // ── Default: select tool behavior ────────────
        const hitJson = engine.hit_test(x, y);
        const hit = JSON.parse(hitJson);

        if (hit.type === 'handle') {
            engine.start_resize(hit.id, hit.handle, x, y);
            isDragging.current = true;
        } else if (hit.type === 'node') {
            if (e.shiftKey) {
                engine.toggle_select(hit.id);
            } else {
                engine.select(hit.id);
            }
            engine.start_move(x, y);
            isDragging.current = true;
        } else {
            engine.deselect_all();
        }
        syncState();
    }, [getCanvasPos, syncState, activeTool, setTool, addRect, addRoundedRect, addEllipse]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const engine = engineRef.current;
        if (!engine) return;
        const { x, y } = getCanvasPos(e);
        engine.update_drag(x, y);
    }, [getCanvasPos]);

    const onMouseUp = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        const engine = engineRef.current;
        if (!engine) return;
        engine.end_drag();
        syncState();
    }, [syncState]);

    // ── Keyboard shortcuts (extracted to separate hook) ──
    useCanvasKeyboard({ engineRef, syncState, setTool, addRect, addEllipse, duplicateSelected });

    // ── Manual retry function ──
    const retryInit = useCallback(() => {
        console.log('[ACE] Manual retry triggered');
        // Clear any existing engine
        if (engineRef.current) {
            try { engineRef.current.free(); } catch { /* ignore */ }
            engineRef.current = null;
        }
        setStatus('loading');
        setErrorMsg('');
        setInitAttempt((n) => n + 1);
    }, []);

    return {
        canvasRef,
        overlayRef,
        engineRef,
        state: { status, errorMsg, selection, canUndo, canRedo, nodeCount, nodes },
        actions: {
            onMouseDown, onMouseMove, onMouseUp,
            addRect, addEllipse, addRoundedRect,
            deleteSelected, selectNode, deselectAll,
            setNodePosition, setNodeSize, setNodeOpacity, setFillColor,
            bringToFront, sendToBack, bringForward, sendBackward,
            setShadow, removeShadow, setBlendMode,
            setBrightness, setContrast, setSaturation, setHueRotate,
            addKeyframe, duplicateSelected,
            alignToCanvas,
            canvasWidth: width, canvasHeight: height,
        },
        syncState,
        retryInit,
    };
}
