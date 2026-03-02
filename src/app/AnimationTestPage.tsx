// ─────────────────────────────────────────────────
// Animation Test Page — Keyframe animation demo
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadAceEngine } from '../engine/loader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

export default function AnimationTestPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine>(null);
    const rafRef = useRef<number>(0);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-webgpu'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(3);
    const [speed, setSpeed] = useState(1.0);
    const [activeEasing, setActiveEasing] = useState('ease_in_out');

    const WIDTH = 700;
    const HEIGHT = 420;

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

                // Dark background
                engine.add_gradient_rect(0, 0, WIDTH, HEIGHT, 0.06, 0.07, 0.12, 1.0, 0.10, 0.06, 0.18, 1.0, 135.0);

                // Animated shapes
                const ball = engine.add_ellipse(80, 200, 30, 30, 0.33, 0.85, 1.0, 0.95);
                const box1 = engine.add_rounded_rect(300, 160, 80, 80, 0.94, 0.36, 0.60, 0.9, 12.0);
                const box2 = engine.add_rect(520, 300, 60, 60, 0.16, 0.82, 0.63, 0.85);
                const fade = engine.add_rounded_rect(80, 50, 540, 40, 1.0, 0.85, 0.0, 0.9, 8.0);

                setupAnimations(engine, ball, box1, box2, fade, activeEasing);
                setDuration(engine.anim_duration());
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Set up animation keyframes ──────────────────
    const setupAnimations = (engine: Engine, ball: number, box1: number, box2: number, fade: number, easing: string) => {
        // Ball: slide right and bounce
        engine.add_keyframe(ball, 'x', 0.0, 80.0, easing);
        engine.add_keyframe(ball, 'x', 1.5, 580.0, easing);
        engine.add_keyframe(ball, 'x', 3.0, 80.0, easing);
        engine.add_keyframe(ball, 'y', 0.0, 200.0, easing);
        engine.add_keyframe(ball, 'y', 0.75, 320.0, easing);
        engine.add_keyframe(ball, 'y', 1.5, 200.0, easing);
        engine.add_keyframe(ball, 'y', 2.25, 320.0, easing);
        engine.add_keyframe(ball, 'y', 3.0, 200.0, easing);

        // Box1: rotate and scale
        engine.add_keyframe(box1, 'rotation', 0.0, 0.0, easing);
        engine.add_keyframe(box1, 'rotation', 3.0, 6.283, easing);
        engine.add_keyframe(box1, 'width', 0.0, 80.0, easing);
        engine.add_keyframe(box1, 'width', 1.5, 120.0, easing);
        engine.add_keyframe(box1, 'width', 3.0, 80.0, easing);
        engine.add_keyframe(box1, 'height', 0.0, 80.0, easing);
        engine.add_keyframe(box1, 'height', 1.5, 120.0, easing);
        engine.add_keyframe(box1, 'height', 3.0, 80.0, easing);

        // Box2: fade + move up
        engine.add_keyframe(box2, 'y', 0.0, 300.0, easing);
        engine.add_keyframe(box2, 'y', 1.5, 100.0, easing);
        engine.add_keyframe(box2, 'y', 3.0, 300.0, easing);
        engine.add_keyframe(box2, 'opacity', 0.0, 0.2, easing);
        engine.add_keyframe(box2, 'opacity', 1.5, 1.0, easing);
        engine.add_keyframe(box2, 'opacity', 3.0, 0.2, easing);

        // Fade bar: width pulse
        engine.add_keyframe(fade, 'width', 0.0, 540.0, easing);
        engine.add_keyframe(fade, 'width', 1.5, 200.0, easing);
        engine.add_keyframe(fade, 'width', 3.0, 540.0, easing);

        engine.set_looping(true);
    };

    // ── Render Loop ──────────────────────────────────
    useEffect(() => {
        if (status !== 'ready') return;
        const engine = engineRef.current;
        if (!engine) return;

        const frame = (timestamp: number) => {
            try {
                engine.render_frame_at(timestamp);
                setProgress(engine.anim_progress());
                setCurrentTime(engine.anim_time());
                setPlaying(engine.anim_playing());
            } catch { /* ignore */ }
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
    }, [status]);

    // ── Controls ─────────────────────────────────────
    const handleToggle = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.anim_toggle();
        setPlaying(engine.anim_playing());
    }, []);

    const handleStop = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.anim_stop();
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
    }, []);

    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const engine = engineRef.current;
        if (!engine) return;
        const t = parseFloat(e.target.value) * engine.anim_duration();
        engine.anim_seek(t);
        setProgress(engine.anim_progress());
        setCurrentTime(engine.anim_time());
    }, []);

    const handleSpeedChange = useCallback((newSpeed: number) => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.anim_set_speed(newSpeed);
        setSpeed(newSpeed);
    }, []);

    // ── Render ───────────────────────────────────────
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '100vh',
            background: '#0d1117', fontFamily: 'Inter, system-ui, sans-serif', color: '#e6edf3',
        }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, letterSpacing: -0.5 }}>
                ACE Engine — Animation
            </h1>

            {/* Transport Controls */}
            <div style={{
                display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12,
                background: 'rgba(255,255,255,0.04)', padding: '8px 16px',
                borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <ControlBtn onClick={handleToggle} label={playing ? 'Stop' : '▶'} accent />
                <ControlBtn onClick={handleStop} label="Stop" />
                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

                {/* Scrubber */}
                <input
                    type="range" min={0} max={1} step={0.001}
                    value={progress}
                    onChange={handleSeek}
                    style={{ width: 200, accentColor: '#4a9eff', cursor: 'pointer' }}
                />

                {/* Time display */}
                <span style={{
                    fontSize: 12, color: '#8b949e', fontFamily: 'monospace',
                    minWidth: 80, textAlign: 'center',
                }}>
                    {currentTime.toFixed(2)}s / {duration.toFixed(1)}s
                </span>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

                {/* Speed control */}
                {[0.25, 0.5, 1, 2].map(s => (
                    <ControlBtn
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        label={`${s}×`}
                        active={speed === s}
                    />
                ))}
            </div>

            {/* Easing label */}
            <div style={{
                display: 'flex', gap: 6, marginBottom: 12,
            }}>
                {['linear', 'ease', 'ease_in', 'ease_out', 'ease_in_out', 'bounce', 'spring'].map(e => (
                    <span key={e} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 4,
                        background: activeEasing === e ? 'rgba(74,158,255,0.2)' : 'rgba(255,255,255,0.04)',
                        color: activeEasing === e ? '#4a9eff' : '#6e7681',
                        border: `1px solid ${activeEasing === e ? 'rgba(74,158,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        fontFamily: 'monospace',
                    }}>
                        {e}
                    </span>
                ))}
            </div>

            {/* Canvas */}
            <div style={{
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                overflow: 'hidden', background: '#16191f',
            }}>
                {status === 'no-webgpu' ? (
                    <div style={fallbackBox}>Error: WebGPU not available – Chrome 113+</div>
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
                            }}>
                                Loading ACE Engine...
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div style={{
                width: WIDTH, height: 3, background: 'rgba(255,255,255,0.06)',
                borderRadius: 2, overflow: 'hidden', marginTop: 4,
            }}>
                <div style={{
                    width: `${progress * 100}%`, height: '100%',
                    background: 'linear-gradient(90deg, #4a9eff, #a855f7)',
                    transition: playing ? 'none' : 'width 0.1s',
                }} />
            </div>

            <div style={{ fontSize: 12, color: '#8b949e', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
                <div>4 animated elements · Keyframes with cubic bezier easing · {playing ? 'Playing' : 'Stop Paused'}</div>
                <div style={{ opacity: 0.5 }}>Keyframe animation + Bezier easing — all computed in Rust/WASM</div>
            </div>
        </div>
    );
}

function ControlBtn({ onClick, label, accent, active }: {
    onClick: () => void; label: string; accent?: boolean; active?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                background: accent ? 'rgba(74,158,255,0.15)' : active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${accent ? 'rgba(74,158,255,0.3)' : active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6, padding: '4px 10px',
                color: accent ? '#4a9eff' : active ? '#e6edf3' : '#8b949e',
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                transition: 'all 0.15s', minWidth: 32,
            }}
        >
            {label}
        </button>
    );
}

const fallbackBox: React.CSSProperties = {
    width: 700, height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#8b949e', fontSize: 14,
};
