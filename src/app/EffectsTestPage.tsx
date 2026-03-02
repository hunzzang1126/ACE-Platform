// ─────────────────────────────────────────────────
// Effects Test Page — Drop shadow, color filters, blend modes
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadAceEngine } from '../engine/loader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface NodeInfo {
    id: number;
    label: string;
}

export default function EffectsTestPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine>(null);
    const rafRef = useRef<number>(0);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-webgpu'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [nodes, setNodes] = useState<NodeInfo[]>([]);
    const [selectedNode, setSelectedNode] = useState<number>(0);

    // Effect states
    const [shadowEnabled, setShadowEnabled] = useState(false);
    const [shadowBlur, setShadowBlur] = useState(8);
    const [shadowOffX, setShadowOffX] = useState(4);
    const [shadowOffY, setShadowOffY] = useState(4);
    const [brightness, setBrightness] = useState(1.0);
    const [contrast, setContrast] = useState(1.0);
    const [saturation, setSaturation] = useState(1.0);
    const [hueRotate, setHueRotate] = useState(0);

    const WIDTH = 700;
    const HEIGHT = 420;

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

                // Background
                engine.add_gradient_rect(0, 0, WIDTH, HEIGHT, 0.06, 0.07, 0.10, 1.0, 0.12, 0.08, 0.16, 1.0, 135.0);

                const nodeList: NodeInfo[] = [];

                // Blue card with shadow
                const card = engine.add_rounded_rect(60, 80, 180, 120, 0.16, 0.49, 0.95, 0.95, 14.0);
                engine.set_shadow(card, 4, 6, 10, 0, 0, 0, 0.5);
                nodeList.push({ id: card, label: '🔵 Blue Card' });

                // Green circle
                const circle = engine.add_ellipse(320, 100, 90, 90, 0.16, 0.82, 0.53, 0.9);
                engine.set_shadow(circle, 3, 5, 8, 0, 0, 0, 0.4);
                nodeList.push({ id: circle, label: '🟢 Green Circle' });

                // Pink gradient rect
                const pink = engine.add_rounded_rect(480, 70, 160, 140, 0.94, 0.36, 0.60, 0.9, 10.0);
                engine.set_shadow(pink, 5, 5, 12, 0.2, 0, 0.1, 0.4);
                nodeList.push({ id: pink, label: '🩷 Pink Rect' });

                // Gold bar at the bottom
                const gold = engine.add_rounded_rect(60, 280, 580, 60, 1.0, 0.85, 0.0, 0.85, 8.0);
                engine.set_shadow(gold, 0, 3, 6, 0, 0, 0, 0.3);
                nodeList.push({ id: gold, label: '🟡 Gold Bar' });

                // Purple small square
                const purple = engine.add_rect(300, 260, 80, 80, 0.55, 0.27, 0.92, 0.9);
                engine.set_shadow(purple, 4, 4, 10, 0.1, 0.0, 0.3, 0.5);
                nodeList.push({ id: purple, label: '🟣 Purple Square' });

                setNodes(nodeList);
                setShadowEnabled(true);
                setStatus('ready');
            } catch (err) {
                if (!cancelled) { setErrorMsg(String(err)); setStatus('error'); }
            }
        })();
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafRef.current);
            if (engineRef.current) { engineRef.current.free(); engineRef.current = null; }
        };
    }, []);

    // Render loop
    useEffect(() => {
        if (status !== 'ready') return;
        const frame = () => {
            try { engineRef.current?.render_frame(); } catch { /* */ }
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
    }, [status]);

    // Apply effects when sliders change
    const applyEffects = useCallback(() => {
        const engine = engineRef.current;
        if (!engine || nodes.length === 0) return;
        const nodeId = nodes[selectedNode]?.id;
        if (nodeId === undefined) return;

        if (shadowEnabled) {
            engine.set_shadow(nodeId, shadowOffX, shadowOffY, shadowBlur, 0, 0, 0, 0.5);
        } else {
            engine.remove_shadow(nodeId);
        }
        engine.set_brightness(nodeId, brightness);
        engine.set_contrast(nodeId, contrast);
        engine.set_saturation(nodeId, saturation);
        engine.set_hue_rotate(nodeId, hueRotate);
    }, [selectedNode, shadowEnabled, shadowBlur, shadowOffX, shadowOffY, brightness, contrast, saturation, hueRotate, nodes]);

    useEffect(() => { applyEffects(); }, [applyEffects]);

    // ── Render ───────────────────────────────────────
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '100vh',
            background: '#0d1117', fontFamily: 'Inter, system-ui, sans-serif', color: '#e6edf3',
        }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, letterSpacing: -0.5 }}>
                 ACE Engine — Pro Effects
            </h1>

            <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                {/* Canvas */}
                <div>
                    <div style={{
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                        overflow: 'hidden', background: '#16191f',
                    }}>
                        {status === 'no-webgpu' ? (
                            <div style={fallbackBox}>🚫 WebGPU not available</div>
                        ) : status === 'error' ? (
                            <div style={fallbackBox}>[Warning] {errorMsg}</div>
                        ) : (
                            <div style={{ position: 'relative', width: WIDTH, height: HEIGHT }}>
                                <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}
                                    style={{ width: WIDTH, height: HEIGHT, display: 'block' }} />
                                {status === 'loading' && (
                                    <div style={{
                                        position: 'absolute', inset: 0, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        background: 'rgba(22,25,31,0.9)', color: '#adb5bd', fontSize: 14,
                                    }}>Loading...</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Panel */}
                <div style={{
                    width: 260, background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, padding: 16, fontSize: 12,
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Effects Panel</div>

                    {/* Node selector */}
                    <label style={labelStyle}>Target Element</label>
                    <select
                        value={selectedNode}
                        onChange={e => setSelectedNode(Number(e.target.value))}
                        style={selectStyle}
                    >
                        {nodes.map((n, i) => (
                            <option key={n.id} value={i}>{n.label}</option>
                        ))}
                    </select>

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />

                    {/* Shadow */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <input type="checkbox" checked={shadowEnabled}
                            onChange={e => setShadowEnabled(e.target.checked)} />
                        <span style={{ fontWeight: 500 }}>Drop Shadow</span>
                    </div>
                    {shadowEnabled && (
                        <>
                            <Slider label="Blur" value={shadowBlur} min={0} max={30} step={1} onChange={setShadowBlur} />
                            <Slider label="Offset X" value={shadowOffX} min={-20} max={20} step={1} onChange={setShadowOffX} />
                            <Slider label="Offset Y" value={shadowOffY} min={-20} max={20} step={1} onChange={setShadowOffY} />
                        </>
                    )}

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />

                    {/* Color Filters */}
                    <div style={{ fontWeight: 500, marginBottom: 8 }}>Color Filters</div>
                    <Slider label="Brightness" value={brightness} min={0} max={3} step={0.05} onChange={setBrightness} />
                    <Slider label="Contrast" value={contrast} min={0} max={3} step={0.05} onChange={setContrast} />
                    <Slider label="Saturation" value={saturation} min={0} max={3} step={0.05} onChange={setSaturation} />
                    <Slider label="Hue Rotate" value={hueRotate} min={0} max={360} step={5} onChange={setHueRotate} unit="°" />

                    <button
                        onClick={() => { setBrightness(1); setContrast(1); setSaturation(1); setHueRotate(0); }}
                        style={resetBtnStyle}
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            <div style={{ fontSize: 12, color: '#8b949e', textAlign: 'center', lineHeight: 1.6 }}>
                <div>5 elements · Drop shadows · Color filters — all computed in Rust/WASM</div>
                <div style={{ opacity: 0.5 }}>Brightness · Contrast · Saturation · Hue Rotate · Drop Shadow with blur</div>
            </div>
        </div>
    );
}

function Slider({ label, value, min, max, step, onChange, unit = '' }: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; unit?: string;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 70, color: '#8b949e', fontSize: 11 }}>{label}</span>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#7c3aed', height: 4, cursor: 'pointer' }}
            />
            <span style={{ width: 40, textAlign: 'right', fontSize: 11, fontFamily: 'monospace', color: '#adb5bd' }}>
                {typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(2)) : value}{unit}
            </span>
        </div>
    );
}

const fallbackBox: React.CSSProperties = {
    width: 700, height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#8b949e', fontSize: 14,
};

const labelStyle: React.CSSProperties = {
    display: 'block', color: '#8b949e', marginBottom: 4, fontSize: 11,
};

const selectStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e6edf3', fontSize: 12, outline: 'none', cursor: 'pointer',
};

const resetBtnStyle: React.CSSProperties = {
    width: '100%', marginTop: 8, padding: '6px 0', borderRadius: 6,
    background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
    color: '#a855f7', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
};
