// ─────────────────────────────────────────────────
// Engine Test Page — Interactive WebGPU Canvas
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadAceEngine } from '../engine/loader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface SelectionBounds { x: number; y: number; w: number; h: number }

export default function EngineTestPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-webgpu'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [selection, setSelection] = useState<number[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [nodeCount, setNodeCount] = useState(0);
    const isDragging = useRef(false);
    const rafRef = useRef<number>(0);

    const WIDTH = 640;
    const HEIGHT = 400;

    // ── Init Engine ──────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!navigator.gpu) { setStatus('no-webgpu'); return; }
            const canvas = canvasRef.current;
            if (!canvas) return;

            try {
                const mod = await loadAceEngine();
                if (cancelled) return;
                const engine = await new mod.WasmEngine(canvas);
                engineRef.current = engine;

                // Add demo shapes
                engine.add_gradient_rect(20, 20, 600, 360, 0.12, 0.14, 0.22, 1.0, 0.20, 0.10, 0.30, 1.0, 135.0);
                engine.add_rect(80, 60, 120, 80, 0.33, 0.55, 1.0, 0.9);
                engine.add_rounded_rect(240, 60, 140, 80, 0.16, 0.82, 0.63, 0.9, 16.0);
                engine.add_ellipse(470, 100, 60, 50, 0.94, 0.36, 0.60, 0.9);
                engine.add_gradient_rect(80, 200, 180, 60, 1.0, 0.45, 0.0, 1.0, 1.0, 0.85, 0.0, 1.0, 0.0);
                engine.add_rounded_rect(320, 200, 160, 120, 0.80, 0.30, 0.90, 0.8, 20.0);
                engine.add_rect(400, 280, 100, 60, 0.20, 0.85, 0.55, 0.85);

                setNodeCount(engine.node_count());
                setStatus('ready');
            } catch (err) {
                if (!cancelled) {
                    console.error('Engine init error:', err);
                    setErrorMsg(String(err));
                    setStatus('error');
                }
            }
        })();

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafRef.current);
            if (engineRef.current) { engineRef.current.free(); engineRef.current = null; }
        };
    }, []);

    // ── Render Loop ──────────────────────────────────
    useEffect(() => {
        if (status !== 'ready') return;
        const engine = engineRef.current;
        if (!engine) return;

        const frame = () => {
            try {
                engine.render_frame();
                drawOverlay();
            } catch { /* ignore */ }
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    // ── Draw Selection Overlay ───────────────────────
    const drawOverlay = useCallback(() => {
        const engine = engineRef.current;
        const overlay = overlayRef.current;
        if (!engine || !overlay) return;

        const ctx = overlay.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Selection bounding box
        const boundsJson = engine.selection_bounds();
        if (boundsJson !== 'null') {
            const bounds: SelectionBounds = JSON.parse(boundsJson);
            ctx.strokeStyle = '#4a9eff';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);
            ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

            // Draw handles
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

        // Rubber band
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
    }, []);

    // ── Mouse event helpers ──────────────────────────
    const getCanvasPos = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const syncState = () => {
        const engine = engineRef.current;
        if (!engine) return;
        setSelection(JSON.parse(engine.get_selection()));
        setCanUndo(engine.can_undo());
        setCanRedo(engine.can_redo());
        setNodeCount(engine.node_count());
    };

    // ── Mouse Handlers ──────────────────────────────
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const engine = engineRef.current;
        if (!engine) return;
        const { x, y } = getCanvasPos(e);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const engine = engineRef.current;
        if (!engine) return;
        const { x, y } = getCanvasPos(e);
        engine.update_drag(x, y);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onMouseUp = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        const engine = engineRef.current;
        if (!engine) return;
        engine.end_drag();
        syncState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Keyboard handlers (undo, redo, delete) ──────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const engine = engineRef.current;
            if (!engine) return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                engine.undo();
                syncState();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                engine.redo();
                syncState();
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                engine.delete_selected();
                syncState();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Render ───────────────────────────────────────
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '100vh',
            background: '#0d1117', fontFamily: 'Inter, system-ui, sans-serif', color: '#e6edf3',
        }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, letterSpacing: -0.5 }}>
                ACE Engine — Interactive Canvas
            </h1>

            {/* Toolbar */}
            <div style={{
                display: 'flex', gap: 8, marginBottom: 12,
                background: 'rgba(255,255,255,0.04)', padding: '6px 12px',
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <ToolbarBtn onClick={() => { engineRef.current?.undo(); syncState(); }} disabled={!canUndo} label="⟲ Undo" />
                <ToolbarBtn onClick={() => { engineRef.current?.redo(); syncState(); }} disabled={!canRedo} label="⟳ Redo" />
                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                <ToolbarBtn onClick={() => { engineRef.current?.delete_selected(); syncState(); }} disabled={selection.length === 0} label=" Delete" />
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: '#8b949e', alignSelf: 'center' }}>
                    {nodeCount} nodes · {selection.length} selected
                </span>
            </div>

            {/* Canvas */}
            <div style={{
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                overflow: 'hidden', background: '#16191f', position: 'relative',
                cursor: isDragging.current ? 'grabbing' : 'default',
            }}>
                {status === 'no-webgpu' ? (
                    <div style={fallbackBox}>[!] WebGPU not available – Chrome 113+</div>
                ) : status === 'error' ? (
                    <div style={fallbackBox}>[Warning] {errorMsg}</div>
                ) : (
                    <div style={{ position: 'relative', width: WIDTH, height: HEIGHT }}>
                        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}
                            style={{ width: WIDTH, height: HEIGHT, display: 'block' }} />
                        {/* Overlay canvas for selection UI */}
                        <canvas ref={overlayRef} width={WIDTH} height={HEIGHT}
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={onMouseUp}
                            onMouseLeave={onMouseUp}
                            style={{
                                position: 'absolute', top: 0, left: 0,
                                width: WIDTH, height: HEIGHT,
                                cursor: selection.length > 0 ? 'move' : 'default',
                            }} />
                        {status === 'loading' && (
                            <div style={{
                                position: 'absolute', inset: 0, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(22,25,31,0.9)', color: '#adb5bd', fontSize: 14,
                            }}>
                                Loading ACE Engine...
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ fontSize: 12, color: '#8b949e', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
                <div>Click to select · Drag to move · Handles to resize · Cmd+Z Undo · Cmd+Shift+Z Redo · Del Delete</div>
                <div style={{ opacity: 0.5 }}>Hit Testing + Selection + Undo/Redo — all in Rust/WASM</div>
            </div>
        </div>
    );
}

function ToolbarBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                background: disabled ? 'transparent' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, padding: '4px 10px',
                color: disabled ? '#484f58' : '#e6edf3',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 12, fontFamily: 'inherit',
                transition: 'all 0.15s',
            }}
        >
            {label}
        </button>
    );
}

const fallbackBox: React.CSSProperties = {
    width: 640, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#8b949e', fontSize: 14,
};
