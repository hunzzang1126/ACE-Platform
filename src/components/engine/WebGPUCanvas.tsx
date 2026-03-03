// ─────────────────────────────────────────────────
// WebGPUCanvas — Renders ace-engine via WASM + WebGPU
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { loadAceEngine } from '../../engine/loader';

interface Props {
    width: number;
    height: number;
    /** Demo rectangles to draw. Each: [x, y, w, h, r, g, b, a] */
    rects?: [number, number, number, number, number, number, number, number][];
}

/**
 * Loads the WASM engine and renders to an HTML canvas via WebGPU.
 * Falls back gracefully when WebGPU is not available.
 */
export function WebGPUCanvas({ width, height, rects }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engineRef = useRef<any>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-webgpu'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const rafRef = useRef<number>(0);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!navigator.gpu) {
                setStatus('no-webgpu');
                return;
            }

            const canvas = canvasRef.current;
            if (!canvas) return;

            try {
                setStatus('loading');
                const mod = await loadAceEngine();
                if (cancelled) return;

                const engine = await new mod.WasmEngine(canvas);
                engineRef.current = engine;
                setStatus('ready');
            } catch (err) {
                if (!cancelled) {
                    console.error('WebGPU init failed:', err);
                    setErrorMsg(String(err));
                    setStatus('error');
                }
            }
        })();

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafRef.current);
            if (engineRef.current) {
                engineRef.current.free();
                engineRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (engineRef.current && status === 'ready') {
            engineRef.current.resize(width, height);
        }
    }, [width, height, status]);

    useEffect(() => {
        if (status !== 'ready' || !engineRef.current) return;
        const engine = engineRef.current;

        const frame = () => {
            try {
                engine.clear();
                if (rects) {
                    for (const [x, y, w, h, r, g, b, a] of rects) {
                        engine.add_rect(x, y, w, h, r, g, b, a);
                    }
                }
                engine.render_frame();
            } catch (err) {
                console.error('Render error:', err);
            }
            rafRef.current = requestAnimationFrame(frame);
        };

        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
    }, [status, rects]);

    if (status === 'no-webgpu') {
        return (
            <div style={fallbackStyle}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>[!]</div>
                <strong>WebGPU not available</strong>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>Chrome 113+ or Edge 113+</div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div style={fallbackStyle}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>!</div>
                <strong>Engine Error</strong>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6, maxWidth: 300, textAlign: 'center' }}>
                    {errorMsg}
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width, height }}>
            <canvas ref={canvasRef} width={width} height={height}
                style={{ width, height, display: 'block', borderRadius: 4 }} />
            {status === 'loading' && (
                <div style={{
                    ...fallbackStyle,
                    position: 'absolute', inset: 0,
                    background: 'rgba(22,25,31,0.9)',
                }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>Loading...</div>
                    <strong>Loading ACE Engine...</strong>
                </div>
            )}
        </div>
    );
}

const fallbackStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#16191f', color: '#adb5bd',
    borderRadius: 4, fontSize: 13,
    fontFamily: 'Inter, system-ui, sans-serif',
    width: '100%', height: '100%',
};
