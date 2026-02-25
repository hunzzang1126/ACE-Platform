// ─────────────────────────────────────────────────
// AI Test Page — Canvas + AI Chat Panel Demo
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { loadAceEngine } from '../engine/loader';
import { AiService } from '../ai/aiService';
import type { SceneNodeInfo } from '../ai/agentContext';
import AiChatPanel from '../components/ai/AiChatPanel';

export default function AiTestPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engineRef = useRef<any>(null);
    const rafRef = useRef<number>(0);
    const trackedNodesRef = useRef<SceneNodeInfo[]>([]);
    const [aiService] = useState(() => new AiService(trackedNodesRef.current));
    const [isReady, setIsReady] = useState(false);
    const [nodeCount, setNodeCount] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // ── Initialize Engine ────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function init() {
            const canvas = canvasRef.current;
            if (!canvas) return;

            try {
                const mod = await loadAceEngine();
                const eng = await new mod.WasmEngine(canvas);
                if (cancelled) return;

                engineRef.current = eng;
                eng.resize(canvas.width, canvas.height);
                setIsReady(true);

                // Render loop
                const loop = (ts: number) => {
                    if (cancelled) return;
                    try {
                        eng.render_frame_at(ts);
                        setNodeCount(eng.node_count?.() ?? 0);
                        setIsPlaying(eng.anim_playing?.() ?? false);
                    } catch { /* */ }
                    rafRef.current = requestAnimationFrame(loop);
                };
                rafRef.current = requestAnimationFrame(loop);
            } catch (err) {
                console.error('Engine init failed:', err);
            }
        }

        init();
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // ── Toolbar Actions ──────────────────────────────
    const handleClear = useCallback(() => {
        engineRef.current?.clear();
        trackedNodesRef.current.length = 0;
        setNodeCount(0);
    }, []);

    const handleUndo = useCallback(() => { engineRef.current?.undo(); }, []);
    const handleRedo = useCallback(() => { engineRef.current?.redo(); }, []);

    const handlePlayPause = useCallback(() => {
        if (engineRef.current?.anim_playing?.()) {
            engineRef.current?.anim_pause();
        } else {
            engineRef.current?.anim_play();
        }
    }, []);

    // ── Render ───────────────────────────────────────
    return (
        <div style={pageStyle}>
            {/* Left: Canvas Area */}
            <div style={canvasAreaStyle}>
                {/* Toolbar */}
                <div style={toolbarStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>🎨</span>
                        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.5 }}>ACE AI Agent</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <ToolBtn label="⏮" onClick={handleUndo} title="Undo (⌘Z)" />
                        <ToolBtn label="⏭" onClick={handleRedo} title="Redo (⌘⇧Z)" />
                        <ToolBtn label={isPlaying ? '⏸' : '▶️'} onClick={handlePlayPause} title="Play/Pause" />
                        <ToolBtn label="🗑" onClick={handleClear} title="Clear" />
                        <span style={{ fontSize: 11, color: '#8b949e', marginLeft: 8 }}>
                            {nodeCount} elements | {isReady ? '✅ Engine Ready' : '⏳ Loading...'}
                        </span>
                    </div>
                </div>

                {/* Canvas */}
                <div style={canvasContainerStyle}>
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={600}
                        style={canvasStyle}
                    />
                    {!isReady && (
                        <div style={overlayStyle}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                            <div>Initializing WebGPU Engine...</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: AI Chat Panel */}
            <div style={chatAreaStyle}>
                {isReady && engineRef.current ? (
                    <AiChatPanel
                        aiService={aiService}
                        engine={engineRef.current}
                        trackedNodes={trackedNodesRef.current}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e', fontSize: 13 }}>
                        Waiting for engine...
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Sub Components ───────────────────────────────

function ToolBtn({ label, onClick, title }: { label: string; onClick: () => void; title: string }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: 32, height: 32, borderRadius: 6,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#e6edf3', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
            {label}
        </button>
    );
}

// ── Styles ───────────────────────────────────────

const pageStyle: CSSProperties = {
    display: 'flex', width: '100vw', height: '100vh',
    background: '#010409', color: '#e6edf3',
    fontFamily: 'Inter, system-ui, sans-serif',
};

const canvasAreaStyle: CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column',
    minWidth: 0,
};

const toolbarStyle: CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
};

const canvasContainerStyle: CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    background: 'radial-gradient(ellipse at center, #0d1117 0%, #010409 100%)',
};

const canvasStyle: CSSProperties = {
    borderRadius: 12,
    boxShadow: '0 0 60px rgba(130,80,223,0.08), 0 0 120px rgba(74,158,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
};

const overlayStyle: CSSProperties = {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(1,4,9,0.9)', color: '#8b949e', fontSize: 14,
    borderRadius: 12,
};

const chatAreaStyle: CSSProperties = {
    width: 380, flexShrink: 0,
    borderLeft: '1px solid rgba(255,255,255,0.06)',
};
