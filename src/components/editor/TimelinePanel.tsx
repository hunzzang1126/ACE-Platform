// ─────────────────────────────────────────────────
// TimelinePanel – Animation timeline wired to WASM engine
// ─────────────────────────────────────────────────
import { useState, useCallback, useEffect, useRef } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import { useEditorStore } from '@/stores/editorStore';
import { IcStop, IcPlay, IcPause, IcLoop } from '@/components/ui/Icons';
import { elementTypeIcon } from '@/components/ui/Icons';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface Props {
    variant: BannerVariant;
    engine?: Engine;
}

// Color palette for timeline bars
const BAR_COLORS = ['#34a853', '#4285f4', '#f9a825', '#ea4335', '#ab47bc', '#00acc1', '#ff7043'];

export function TimelinePanel({ variant, engine }: Props) {
    const [collapsed, setCollapsed] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(5.0);
    const [looping, setLooping] = useState(false);
    const [speed, setSpeed] = useState(1.0);
    const rafRef = useRef<number>(0);
    const selectedIds = useEditorStore((s) => s.selectedElementIds);
    const selectElements = useEditorStore((s) => s.selectElements);

    const elements = [...variant.elements].sort((a, b) => b.zIndex - a.zIndex);

    // Sync state from engine
    const syncTime = useCallback(() => {
        if (!engine) return;
        try {
            setCurrentTime(engine.anim_time?.() ?? 0);
            setPlaying(engine.anim_playing?.() ?? false);
            setDuration(engine.anim_duration?.() ?? 5.0);
            setLooping(engine.anim_looping?.() ?? false);
        } catch { /* engine not ready */ }
    }, [engine]);

    // Tick for time display
    useEffect(() => {
        if (!playing || !engine) return;
        const tick = () => {
            try { setCurrentTime(engine.anim_time?.() ?? 0); } catch { /* ignore */ }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [playing, engine]);

    // Initial sync
    useEffect(() => { syncTime(); }, [syncTime]);

    // ── Controls ──────────────────────────────────
    const handlePlay = useCallback(() => {
        if (!engine) return;
        try { engine.anim_play(); setPlaying(true); } catch { /* ignore */ }
    }, [engine]);

    const handlePause = useCallback(() => {
        if (!engine) return;
        try { engine.anim_pause(); setPlaying(false); } catch { /* ignore */ }
    }, [engine]);

    const handleStop = useCallback(() => {
        if (!engine) return;
        try { engine.anim_stop(); setPlaying(false); setCurrentTime(0); } catch { /* ignore */ }
    }, [engine]);

    const handleSeek = useCallback((time: number) => {
        if (!engine) return;
        try { engine.anim_seek(time); setCurrentTime(time); } catch { /* ignore */ }
    }, [engine]);

    const handleDurationChange = useCallback((d: number) => {
        if (!engine) return;
        try { engine.set_duration(d); setDuration(d); } catch { /* ignore */ }
    }, [engine]);

    const handleToggleLoop = useCallback(() => {
        if (!engine) return;
        const next = !looping;
        try { engine.set_looping(next); setLooping(next); } catch { /* ignore */ }
    }, [engine, looping]);

    const handleSpeedChange = useCallback((s: number) => {
        if (!engine) return;
        try { engine.anim_set_speed(s); setSpeed(s); } catch { /* ignore */ }
    }, [engine]);

    if (collapsed) {
        return (
            <div className="ed-timeline collapsed">
                <button className="ed-timeline-toggle" onClick={() => setCollapsed(false)}>
                    ▲ Timeline
                </button>
            </div>
        );
    }

    return (
        <div className="ed-timeline">
            {/* Playback Controls */}
            <div className="ed-timeline-controls">
                <div className="ed-timeline-playback">
                    <button className="ed-timeline-play-btn" title="Stop" onClick={handleStop}><IcStop size={12} /></button>
                    <button className="ed-timeline-play-btn" title={playing ? 'Pause' : 'Play'} onClick={playing ? handlePause : handlePlay}>
                        {playing ? <IcPause size={12} /> : <IcPlay size={12} />}
                    </button>
                    <button className="ed-timeline-play-btn" title="Loop" onClick={handleToggleLoop}
                        style={looping ? { color: '#4a9eff' } : {}}>
                        <IcLoop size={12} color={looping ? '#4a9eff' : undefined} />
                    </button>
                </div>

                <span className="ed-timeline-time">{currentTime.toFixed(2)} / {duration.toFixed(2)}s</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8b949e' }}>
                    <span>Speed:</span>
                    {[0.5, 1, 2].map(s => (
                        <button
                            key={s}
                            className="ed-timeline-play-btn"
                            style={{ fontSize: 10, padding: '1px 4px', ...(speed === s ? { color: '#4a9eff' } : {}) }}
                            onClick={() => handleSpeedChange(s)}
                        >
                            {s}x
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8b949e' }}>
                    <span>Dur:</span>
                    <input
                        type="number"
                        min="0.1" max="30" step="0.5"
                        value={duration}
                        onChange={e => handleDurationChange(parseFloat(e.target.value) || 5)}
                        style={{ width: 50, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e6edf3', fontSize: 11, padding: '2px 4px' }}
                    />
                </div>

                {/* Time ruler with scrubber */}
                <div
                    className="ed-timeline-ruler"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const frac = (e.clientX - rect.left) / rect.width;
                        handleSeek(frac * duration);
                    }}
                    style={{ cursor: 'pointer' }}
                >
                    {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
                        <span key={i} className="ed-timeline-tick">{i}.0</span>
                    ))}
                    {/* Scrubber line */}
                    <div style={{
                        position: 'absolute', left: `${(currentTime / duration) * 100}%`, top: 0, bottom: 0,
                        width: 1, background: '#ea4335', pointerEvents: 'none',
                    }} />
                </div>

                <button className="ed-timeline-toggle" onClick={() => setCollapsed(true)} title="Collapse">
                    ▼
                </button>
            </div>

            {/* Layer rows */}
            <div className="ed-timeline-layers">
                {elements.map((el, idx) => {
                    const isSelected = selectedIds.includes(el.id);
                    const barColor = BAR_COLORS[idx % BAR_COLORS.length];
                    const typeIcon = elementTypeIcon(el.type, 12);

                    return (
                        <div
                            key={el.id}
                            className={`ed-timeline-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => selectElements([el.id])}
                        >
                            <div className="ed-timeline-label">
                                <input type="checkbox" className="ed-timeline-checkbox" checked={el.visible} readOnly />
                                <span className="ed-timeline-type-icon">{typeIcon}</span>
                                <span className="ed-timeline-name">{el.name}</span>
                            </div>

                            <div className="ed-timeline-bars">
                                <div
                                    className="ed-timeline-bar"
                                    style={{
                                        left: '4%',
                                        width: '40%',
                                        backgroundColor: barColor,
                                    }}
                                >
                                    <span className="ed-bar-label">Fade in</span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {elements.length === 0 && (
                    <div className="ed-timeline-empty">No layers</div>
                )}
            </div>
        </div>
    );
}
