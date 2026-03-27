// ─────────────────────────────────────────────────
// useCanvasEngine — Reusable hook for WASM WebGPU canvas
// ─────────────────────────────────────────────────
// Actions → canvasEngineActions.ts
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadAceEngine } from '@/engine/loader';
import { useEditorStore } from '@/stores/editorStore';
import { useCanvasKeyboard } from './useCanvasKeyboard';
import { useCanvasEngineActions } from './canvasEngineActions';

// Re-export all types for backward compatibility
export type { Engine, SelectionBounds, EngineNode, CanvasEngineState, CanvasEngineActions, UseCanvasEngineResult } from './canvasTypes';
import type { Engine, SelectionBounds, EngineNode, UseCanvasEngineResult } from './canvasTypes';

export function useCanvasEngine(width: number, height: number, addDemoShapes = false): UseCanvasEngineResult {
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

    const syncState = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        try {
            setSelection(JSON.parse(engine.get_selection()));
            setCanUndo(engine.can_undo());
            setCanRedo(engine.can_redo());
            setNodeCount(engine.node_count());
            try { setNodes(JSON.parse(engine.get_all_nodes()) as EngineNode[]); } catch { /* ok */ }
        } catch { /* ok */ }
    }, []);

    // Extract all action callbacks
    const actions = useCanvasEngineActions(engineRef, width, height, nodes, selection, syncState);

    // ── Draw selection overlay ──
    const drawOverlay = useCallback(() => {
        const engine = engineRef.current;
        const overlay = overlayRef.current;
        if (!engine || !overlay) return;
        const ctx = overlay.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        try {
            const boundsJson = engine.selection_bounds();
            if (boundsJson !== 'null') {
                const bounds: SelectionBounds = JSON.parse(boundsJson);
                ctx.strokeStyle = '#4a9eff'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
                ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
                const handles: [number, number][] = JSON.parse(engine.selection_handles());
                for (const [hx, hy] of handles) {
                    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#4a9eff'; ctx.lineWidth = 1.5;
                    ctx.fillRect(hx - 4, hy - 4, 8, 8); ctx.strokeRect(hx - 4, hy - 4, 8, 8);
                }
            }
            const rbJson = engine.rubber_band_rect();
            if (rbJson !== 'null') {
                const rb: SelectionBounds = JSON.parse(rbJson);
                ctx.strokeStyle = '#4a9eff'; ctx.fillStyle = 'rgba(74, 158, 255, 0.1)';
                ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
                ctx.strokeRect(rb.x, rb.y, rb.w, rb.h); ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
            }
        } catch { /* ignore */ }
    }, [width, height]);

    // ── Retry trigger ──
    const [initAttempt, setInitAttempt] = useState(0);

    // ── Init Engine ──
    useEffect(() => {
        let cancelled = false;
        const attemptTimeouts: ReturnType<typeof setTimeout>[] = [];
        const MAX_RETRIES = 3, BASE_DELAY_MS = 800;

        const tryInit = async (attempt: number): Promise<void> => {
            if (cancelled) return;
            const label = `[Glid] Init attempt ${attempt + 1}/${MAX_RETRIES}`;
            if (attempt > 0) { setStatus('loading'); setErrorMsg(''); }
            if (!navigator.gpu) { setStatus('no-webgpu'); return; }
            const canvas = canvasRef.current;
            if (!canvas) {
                if (attempt < MAX_RETRIES - 1) { const d = BASE_DELAY_MS * Math.pow(2, attempt); attemptTimeouts.push(setTimeout(() => { if (!cancelled) tryInit(attempt + 1); }, d)); return; }
                setErrorMsg('Canvas element not available.'); setStatus('error'); return;
            }

            let timedOut = false;
            const timeoutId = setTimeout(() => {
                timedOut = true;
                if (!cancelled) {
                    if (attempt < MAX_RETRIES - 1) { const d = BASE_DELAY_MS * Math.pow(2, attempt); attemptTimeouts.push(setTimeout(() => { if (!cancelled) tryInit(attempt + 1); }, d)); }
                    else { setErrorMsg('WebGPU initialization timed out.'); setStatus('error'); }
                }
            }, 8_000);
            attemptTimeouts.push(timeoutId);

            try {
                const mod = await loadAceEngine();
                if (cancelled || timedOut) return;
                const engine = await new mod.WasmEngine(canvas);
                if (cancelled || timedOut) { try { engine.free(); } catch { /* */ } return; }
                clearTimeout(timeoutId);
                engineRef.current = engine;
                if (addDemoShapes) {
                    engine.add_gradient_rect(20, 20, 600, 360, 0.12, 0.14, 0.22, 1.0, 0.20, 0.10, 0.30, 1.0, 135.0);
                    engine.add_rect(80, 60, 120, 80, 0.33, 0.55, 1.0, 0.9);
                    engine.add_rounded_rect(240, 60, 140, 80, 0.16, 0.82, 0.63, 0.9, 16.0);
                    engine.add_ellipse(470, 100, 60, 50, 0.94, 0.36, 0.60, 0.9);
                }
                setNodeCount(engine.node_count()); setStatus('ready');
            } catch (err) {
                clearTimeout(timeoutId);
                if (cancelled || timedOut) return;
                if (attempt < MAX_RETRIES - 1) { const d = BASE_DELAY_MS * Math.pow(2, attempt); attemptTimeouts.push(setTimeout(() => { if (!cancelled) tryInit(attempt + 1); }, d)); }
                else { setErrorMsg(String(err)); setStatus('error'); }
            }
        };
        tryInit(0);
        return () => { cancelled = true; attemptTimeouts.forEach(clearTimeout); cancelAnimationFrame(rafRef.current); if (engineRef.current) { try { engineRef.current.free(); } catch { /* */ } engineRef.current = null; } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addDemoShapes, initAttempt]);

    // ── Render Loop ──
    useEffect(() => {
        if (status !== 'ready') return;
        const engine = engineRef.current; if (!engine) return;
        const frame = (ts: number) => { try { engine.render_frame_at(ts); drawOverlay(); } catch { /* */ } rafRef.current = requestAnimationFrame(frame); };
        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
    }, [status, drawOverlay]);

    // ── Mouse ──
    const getCanvasPos = useCallback((e: React.MouseEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }, []);
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const engine = engineRef.current; if (!engine) return;
        const { x, y } = getCanvasPos(e);
        if (activeTool === 'shape') { actions.addRect(x - 60, y - 40); setTool('select'); return; }
        const hit = JSON.parse(engine.hit_test(x, y));
        if (hit.type === 'handle') { engine.start_resize(hit.id, hit.handle, x, y); isDragging.current = true; }
        else if (hit.type === 'node') { if (e.shiftKey) engine.toggle_select(hit.id); else engine.select(hit.id); engine.start_move(x, y); isDragging.current = true; }
        else engine.deselect_all();
        syncState();
    }, [getCanvasPos, syncState, activeTool, setTool, actions]);
    const onMouseMove = useCallback((e: React.MouseEvent) => { if (!isDragging.current) return; const engine = engineRef.current; if (!engine) return; const { x, y } = getCanvasPos(e); engine.update_drag(x, y); }, [getCanvasPos]);
    const onMouseUp = useCallback(() => { if (!isDragging.current) return; isDragging.current = false; const engine = engineRef.current; if (!engine) return; engine.end_drag(); syncState(); }, [syncState]);

    // ── Keyboard ──
    useCanvasKeyboard({ engineRef, syncState, setTool, addRect: actions.addRect, addEllipse: actions.addEllipse, duplicateSelected: actions.duplicateSelected, groupSelected: actions.groupSelected, ungroupSelected: actions.ungroupSelected });

    const retryInit = useCallback(() => { if (engineRef.current) { try { engineRef.current.free(); } catch { /* */ } engineRef.current = null; } setStatus('loading'); setErrorMsg(''); setInitAttempt(n => n + 1); }, []);

    return {
        canvasRef, overlayRef, engineRef,
        state: { status, errorMsg, selection, canUndo, canRedo, nodeCount, nodes },
        actions: { ...actions, onMouseDown, onMouseMove, onMouseUp, canvasWidth: width, canvasHeight: height },
        syncState, retryInit,
    };
}
