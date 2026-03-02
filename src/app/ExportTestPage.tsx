// ─────────────────────────────────────────────────
// Export Test Page — MP4 video + Lottie JSON export
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadAceEngine } from '../engine/loader';
import { exportToMp4, downloadBlob, ExportProgress } from '../engine/videoExporter';
import { exportToLottie, downloadLottie } from '../engine/lottieExporter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface ShapeInfo {
    id: number;
    type: 'rect' | 'ellipse';
    label: string;
    x: number; y: number; w: number; h: number;
    color: [number, number, number, number];
    radius?: number;
}

export default function ExportTestPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine>(null);
    const rafRef = useRef<number>(0);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-webgpu'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
    const shapesRef = useRef<ShapeInfo[]>([]);

    const WIDTH = 640;
    const HEIGHT = 400;
    const DURATION = 3;
    const FPS = 30;

    // ── Init ─────────────────────────────────────────
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
                engine.add_gradient_rect(0, 0, WIDTH, HEIGHT, 0.05, 0.06, 0.10, 1.0, 0.10, 0.05, 0.15, 1.0, 135.0);

                const shapes: ShapeInfo[] = [];

                // Animated shapes
                const ball = engine.add_ellipse(60, 180, 40, 40, 0.33, 0.85, 1.0, 0.95);
                shapes.push({ id: ball, type: 'ellipse', label: 'Cyan Ball', x: 60, y: 180, w: 40, h: 40, color: [0.33, 0.85, 1.0, 0.95] });

                const box1 = engine.add_rounded_rect(280, 150, 80, 80, 0.94, 0.36, 0.60, 0.9, 12.0);
                shapes.push({ id: box1, type: 'rect', label: 'Pink Box', x: 280, y: 150, w: 80, h: 80, color: [0.94, 0.36, 0.60, 0.9], radius: 12 });

                const box2 = engine.add_rect(500, 280, 60, 60, 0.16, 0.82, 0.63, 0.85);
                shapes.push({ id: box2, type: 'rect', label: 'Green Box', x: 500, y: 280, w: 60, h: 60, color: [0.16, 0.82, 0.63, 0.85] });

                const bar = engine.add_rounded_rect(60, 40, 520, 30, 1.0, 0.85, 0.0, 0.85, 6.0);
                shapes.push({ id: bar, type: 'rect', label: 'Gold Bar', x: 60, y: 40, w: 520, h: 30, color: [1.0, 0.85, 0.0, 0.85], radius: 6 });

                shapesRef.current = shapes;

                // Ball: bounce across
                engine.add_keyframe(ball, 'x', 0.0, 60.0, 'ease_in_out');
                engine.add_keyframe(ball, 'x', 1.5, 540.0, 'ease_in_out');
                engine.add_keyframe(ball, 'x', 3.0, 60.0, 'ease_in_out');
                engine.add_keyframe(ball, 'y', 0.0, 180.0, 'bounce');
                engine.add_keyframe(ball, 'y', 0.75, 300.0, 'bounce');
                engine.add_keyframe(ball, 'y', 1.5, 180.0, 'bounce');
                engine.add_keyframe(ball, 'y', 2.25, 300.0, 'bounce');
                engine.add_keyframe(ball, 'y', 3.0, 180.0, 'bounce');

                // Box1: rotate
                engine.add_keyframe(box1, 'rotation', 0.0, 0.0, 'ease_in_out');
                engine.add_keyframe(box1, 'rotation', 3.0, 6.283, 'ease_in_out');

                // Box2: fade + move
                engine.add_keyframe(box2, 'y', 0.0, 280.0, 'ease_in_out');
                engine.add_keyframe(box2, 'y', 1.5, 100.0, 'ease_in_out');
                engine.add_keyframe(box2, 'y', 3.0, 280.0, 'ease_in_out');
                engine.add_keyframe(box2, 'opacity', 0.0, 0.2, 'ease_in_out');
                engine.add_keyframe(box2, 'opacity', 1.5, 1.0, 'ease_in_out');
                engine.add_keyframe(box2, 'opacity', 3.0, 0.2, 'ease_in_out');

                // Bar: width pulse
                engine.add_keyframe(bar, 'width', 0.0, 520.0, 'ease_in_out');
                engine.add_keyframe(bar, 'width', 1.5, 200.0, 'ease_in_out');
                engine.add_keyframe(bar, 'width', 3.0, 520.0, 'ease_in_out');

                engine.set_looping(true);
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
        const frame = (ts: number) => {
            const engine = engineRef.current;
            if (!engine) return;
            try {
                engine.render_frame_at(ts);
                setProgress(engine.anim_progress());
                setCurrentTime(engine.anim_time());
                setPlaying(engine.anim_playing());
            } catch { /* */ }
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
    }, [status]);

    // ── Export handlers ──────────────────────────────
    const handleExportMp4 = useCallback(async () => {
        const engine = engineRef.current;
        const canvas = canvasRef.current;
        if (!engine || !canvas || exporting) return;

        setExporting(true);
        engine.anim_pause();

        try {
            const buffer = await exportToMp4(engine, canvas, DURATION, {
                width: WIDTH,
                height: HEIGHT,
                fps: FPS,
            }, (p) => setExportProgress(p));

            downloadBlob(buffer, `ace-export-${Date.now()}.mp4`);
        } catch (err) {
            console.error('Export failed:', err);
            setExportProgress({
                phase: 'error', currentFrame: 0, totalFrames: 0,
                percent: 0, error: String(err),
            });
        } finally {
            setExporting(false);
            // Reset timeline
            engine.anim_seek(0);
        }
    }, [exporting]);

    const handleExportLottie = useCallback(() => {
        const shapes = shapesRef.current;
        if (shapes.length === 0) return;

        // Build keyframe data from the shapes we set up
        // We reconstruct keyframes from what we programmed above
        const keyframes: Array<{ nodeId: number; property: string; time: number; value: number; easing: string }> = [];

        const s0 = shapes[0], s1 = shapes[1], s2 = shapes[2], s3 = shapes[3];
        if (s0 && s1 && s2 && s3) {
            keyframes.push(
                // Ball
                { nodeId: s0.id, property: 'x', time: 0.0, value: 60, easing: 'ease_in_out' },
                { nodeId: s0.id, property: 'x', time: 1.5, value: 540, easing: 'ease_in_out' },
                { nodeId: s0.id, property: 'x', time: 3.0, value: 60, easing: 'ease_in_out' },
                { nodeId: s0.id, property: 'y', time: 0.0, value: 180, easing: 'bounce' },
                { nodeId: s0.id, property: 'y', time: 0.75, value: 300, easing: 'bounce' },
                { nodeId: s0.id, property: 'y', time: 1.5, value: 180, easing: 'bounce' },
                { nodeId: s0.id, property: 'y', time: 2.25, value: 300, easing: 'bounce' },
                { nodeId: s0.id, property: 'y', time: 3.0, value: 180, easing: 'bounce' },
                // Box1 rotation
                { nodeId: s1.id, property: 'rotation', time: 0.0, value: 0, easing: 'ease_in_out' },
                { nodeId: s1.id, property: 'rotation', time: 3.0, value: 6.283, easing: 'ease_in_out' },
                // Box2 fade + move
                { nodeId: s2.id, property: 'y', time: 0.0, value: 280, easing: 'ease_in_out' },
                { nodeId: s2.id, property: 'y', time: 1.5, value: 100, easing: 'ease_in_out' },
                { nodeId: s2.id, property: 'y', time: 3.0, value: 280, easing: 'ease_in_out' },
                { nodeId: s2.id, property: 'opacity', time: 0.0, value: 0.2, easing: 'ease_in_out' },
                { nodeId: s2.id, property: 'opacity', time: 1.5, value: 1.0, easing: 'ease_in_out' },
                { nodeId: s2.id, property: 'opacity', time: 3.0, value: 0.2, easing: 'ease_in_out' },
                // Bar width
                { nodeId: s3.id, property: 'width', time: 0.0, value: 520, easing: 'ease_in_out' },
                { nodeId: s3.id, property: 'width', time: 1.5, value: 200, easing: 'ease_in_out' },
                { nodeId: s3.id, property: 'width', time: 3.0, value: 520, easing: 'ease_in_out' },
            );
        }

        const lottieShapes = shapes.map(s => ({
            nodeId: s.id,
            type: s.type,
            x: s.x, y: s.y,
            width: s.w, height: s.h,
            color: s.color,
            borderRadius: s.radius,
            opacity: s.color[3],
        }));

        const lottie = exportToLottie(lottieShapes, keyframes, DURATION, {
            width: WIDTH, height: HEIGHT, fps: FPS, name: 'ACE Animation',
        });

        downloadLottie(lottie, `ace-animation-${Date.now()}.json`);
    }, []);

    const handleToggle = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.anim_toggle();
    }, []);

    // ── Render ───────────────────────────────────────
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '100vh',
            background: '#0d1117', fontFamily: 'Inter, system-ui, sans-serif', color: '#e6edf3',
        }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, letterSpacing: -0.5 }}>
                ACE Engine — Video & Export
            </h1>

            {/* Canvas */}
            <div style={{
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                overflow: 'hidden', background: '#16191f', marginBottom: 12,
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

            {/* Progress bar */}
            <div style={{ width: WIDTH, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{
                    width: `${progress * 100}%`, height: '100%',
                    background: 'linear-gradient(90deg, #4a9eff, #a855f7)',
                    transition: playing ? 'none' : 'width 0.1s',
                }} />
            </div>

            {/* Controls */}
            <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: 'rgba(255,255,255,0.04)', padding: '8px 16px',
                borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 12,
            }}>
                <Btn onClick={handleToggle} label={playing ? 'Stop' : '▶'} accent />

                <span style={{ fontSize: 12, color: '#8b949e', fontFamily: 'monospace', minWidth: 80, textAlign: 'center' }}>
                    {currentTime.toFixed(2)}s / {DURATION}s
                </span>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

                {/* Export buttons */}
                <Btn
                    onClick={handleExportMp4}
                    label={exporting ? 'Encoding...' : 'Export MP4'}
                    accent
                    disabled={exporting || status !== 'ready'}
                />
                <Btn
                    onClick={handleExportLottie}
                    label="📄 Export Lottie"
                    disabled={status !== 'ready'}
                />
            </div>

            {/* Export progress */}
            {exportProgress && (
                <div style={{
                    width: WIDTH,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8, padding: '10px 16px', marginBottom: 12,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: exportProgress.phase === 'error' ? '#f85149' : '#8b949e' }}>
                            {exportProgress.phase === 'encoding' && `Encoding frame ${exportProgress.currentFrame}/${exportProgress.totalFrames}`}
                            {exportProgress.phase === 'muxing' && 'Muxing MP4...'}
                            {exportProgress.phase === 'done' && '[OK] Export complete — file downloaded!'}
                            {exportProgress.phase === 'error' && `[Error] ${exportProgress.error}`}
                        </span>
                        <span style={{ color: '#8b949e', fontFamily: 'monospace' }}>
                            {exportProgress.percent.toFixed(0)}%
                        </span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                            width: `${exportProgress.percent}%`, height: '100%',
                            background: exportProgress.phase === 'error'
                                ? '#f85149'
                                : exportProgress.phase === 'done'
                                    ? '#3fb950'
                                    : 'linear-gradient(90deg, #4a9eff, #a855f7)',
                            transition: 'width 0.15s',
                        }} />
                    </div>
                </div>
            )}

            <div style={{ fontSize: 12, color: '#8b949e', textAlign: 'center', lineHeight: 1.6 }}>
                <div>MP4 (H.264 via WebCodecs) · Lottie JSON (Bodymovin) — frame-accurate export</div>
                <div style={{ opacity: 0.5 }}>4 animated shapes · {FPS}fps · {DURATION}s duration</div>
            </div>
        </div>
    );
}

function Btn({ onClick, label, accent, disabled }: {
    onClick: () => void; label: string; accent?: boolean; disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                background: accent ? 'rgba(74,158,255,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${accent ? 'rgba(74,158,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6, padding: '6px 14px',
                color: disabled ? '#484f58' : accent ? '#4a9eff' : '#8b949e',
                cursor: disabled ? 'default' : 'pointer', fontSize: 13, fontFamily: 'inherit',
                transition: 'all 0.15s', opacity: disabled ? 0.6 : 1,
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
