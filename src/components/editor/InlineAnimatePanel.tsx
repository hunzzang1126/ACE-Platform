// ─────────────────────────────────────────────────
// InlineAnimatePanel — Animation presets (Canva-style)
// ─────────────────────────────────────────────────
// Opens as left-panel overlay when Animate button clicked.
// Grid of animation presets + duration slider.
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import { ANIM_PRESETS, useAnimPresetStore, type AnimPresetType } from '@/hooks/useAnimationPresets';
import type { EngineNode } from '@/hooks/canvasTypes';

interface Props {
    selectedNode: EngineNode | null;
    onClose: () => void;
}

export function InlineAnimatePanel({ selectedNode, onClose }: Props) {
    const setPreset = useAnimPresetStore((s) => s.setPreset);
    const [activeTab, setActiveTab] = useState<'in' | 'out'>('in');

    const nodeId = selectedNode?.id ? String(selectedNode.id) : '';
    // ★ Subscribe to actual preset data for real-time sync
    const current = useAnimPresetStore((s) =>
        nodeId ? (s.presets[nodeId] ?? null) : null
    );

    // Derive current values based on active tab
    const currentPreset = activeTab === 'in'
        ? (current?.anim ?? 'none')
        : (current?.animOut ?? 'none');
    const currentDuration = activeTab === 'in'
        ? (current?.animDuration ?? 0.3)
        : (current?.animOutDuration ?? 0.3);

    const [duration, setDuration] = useState(currentDuration);

    // Re-sync duration when switching elements, tab, or preset changes
    useEffect(() => {
        setDuration(currentDuration);
    }, [nodeId, activeTab, currentDuration]);

    const handleSelect = useCallback((preset: AnimPresetType) => {
        if (!nodeId) return;
        if (activeTab === 'in') {
            setPreset(nodeId, { anim: preset, animDuration: duration });
        } else {
            setPreset(nodeId, { animOut: preset, animOutDuration: duration });
        }
    }, [nodeId, setPreset, duration, activeTab]);

    const handleDuration = useCallback((val: number) => {
        setDuration(val);
        if (!nodeId) return;
        if (activeTab === 'in') {
            setPreset(nodeId, { animDuration: val });
        } else {
            setPreset(nodeId, { animOutDuration: val });
        }
    }, [nodeId, setPreset, activeTab]);

    const showDurationSlider = currentPreset !== 'none';

    return (
        <div className="inline-panel">
            <div className="inline-panel-header">
                <h3>Animate</h3>
                <button className="inline-panel-close" onClick={onClose}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="inline-panel-body">
                {/* ── In/Out Tab Toggle ── */}
                <div className="anim-tab-row">
                    <button
                        className={`anim-tab-btn ${activeTab === 'in' ? 'active' : ''}`}
                        onClick={() => setActiveTab('in')}
                    >In</button>
                    <button
                        className={`anim-tab-btn ${activeTab === 'out' ? 'active' : ''}`}
                        onClick={() => setActiveTab('out')}
                    >Out</button>
                </div>

                <p className="sidebar-section-label">Presets</p>
                <div className="inline-preset-grid anim-grid">
                    {ANIM_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            className={`inline-preset-btn ${currentPreset === preset.value ? 'active' : ''}`}
                            onClick={() => handleSelect(preset.value)}
                        >
                            <div className="inline-anim-icon">
                                {getAnimIcon(preset.value)}
                            </div>
                            <span className="inline-preset-label">{preset.label}</span>
                        </button>
                    ))}
                </div>

                <div className="inline-divider" />
                <p className="sidebar-section-label">Duration</p>
                <div className="inline-slider-row">
                    <input
                        type="range"
                        className="inline-slider"
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        value={duration}
                        onChange={(e) => handleDuration(Number(e.target.value))}
                        style={showDurationSlider ? {} : { opacity: 0.4 }}
                    />
                    <span className="inline-slider-value" style={showDurationSlider ? {} : { opacity: 0.4 }}>
                        {duration.toFixed(1)}s
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Simple SVG icons for each preset ──
function getAnimIcon(preset: AnimPresetType): React.ReactNode {
    const style: React.CSSProperties = { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--accent)' };

    switch (preset) {
        case 'none':
            return <div style={style}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
            </div>;
        case 'fade':
            return <div style={{ ...style, opacity: 0.5 }}>A</div>;
        case 'slide-left':
            return <div style={style}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
            </div>;
        case 'slide-right':
            return <div style={style}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M19 12l-7-7M19 12l-7 7"/></svg>
            </div>;
        case 'slide-up':
            return <div style={style}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M12 5l-7 7M12 5l7 7"/></svg>
            </div>;
        case 'slide-down':
            return <div style={style}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M12 19l-7-7M12 19l7-7"/></svg>
            </div>;
        case 'scale':
            return <div style={style}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </div>;
        case 'ascend':
            return <div style={style}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M12 5l-5 5M12 5l5 5"/><circle cx="12" cy="19" r="2" fill="currentColor" opacity="0.3"/></svg>
            </div>;
        case 'descend':
            return <div style={style}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M12 19l-5-5M12 19l5-5"/><circle cx="12" cy="5" r="2" fill="currentColor" opacity="0.3"/></svg>
            </div>;
        default:
            return <div style={style}>?</div>;
    }
}
