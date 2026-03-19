// ─────────────────────────────────────────────────
// InlineEffectsPanel — Canva-style text effects panel
// ─────────────────────────────────────────────────
// Full effects library with 14 presets: Drop, Glow, Echo, Outline,
// Background, Splice, Hollow, Neon, Glitch, Curve, Neon Lights,
// TV Static, 70s.
// ★ SYNC ARCHITECTURE: All state written via actions.setTextEffect()
// → stored as __glid* on Fabric object → persisted through save/load.
// Zero local-only state for effect type.
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { CanvasEngineActions, EngineNode } from '@/hooks/canvasTypes';
import type { TextEffectType } from '@/schema/elements.types';

interface Props {
    selectedNode: EngineNode | null;
    actions: CanvasEngineActions | null;
    onClose: () => void;
}

interface EffectPreset {
    type: TextEffectType;
    label: string;
    section: 'shadow' | 'style' | 'shape' | 'advanced';
    defaultColor: string;
    /** CSS preview style for the "Ag" preview card */
    previewCSS: React.CSSProperties;
}

const EFFECT_PRESETS: EffectPreset[] = [
    // ── Shadow section ──
    {
        type: 'drop', label: 'Drop', section: 'shadow',
        defaultColor: '#000000',
        previewCSS: { textShadow: '4px 4px 8px rgba(0,0,0,0.5)' },
    },
    {
        type: 'glow', label: 'Glow', section: 'shadow',
        defaultColor: '#7c3aed',
        previewCSS: { textShadow: '0 0 16px rgba(124,58,237,0.7)' },
    },
    {
        type: 'echo', label: 'Echo', section: 'shadow',
        defaultColor: '#6b7280',
        previewCSS: { textShadow: '6px 6px 0 rgba(107,114,128,0.3)' },
    },
    // ── Style section ──
    {
        type: 'outline', label: 'Outline', section: 'style',
        defaultColor: '#3b82f6',
        previewCSS: { WebkitTextStroke: '2px #3b82f6' },
    },
    {
        type: 'background', label: 'Background', section: 'style',
        defaultColor: '#a78bfa',
        previewCSS: { backgroundColor: 'rgba(167,139,250,0.3)', padding: '2px 6px', borderRadius: 4 },
    },
    {
        type: 'splice', label: 'Splice', section: 'style',
        defaultColor: '#ec4899',
        previewCSS: { WebkitTextStroke: '2px #ec4899', color: 'transparent', fontWeight: 700 },
    },
    {
        type: 'hollow', label: 'Hollow', section: 'style',
        defaultColor: '#6366f1',
        previewCSS: { WebkitTextStroke: '1.5px currentColor', color: 'transparent' },
    },
    {
        type: 'neon', label: 'Neon', section: 'style',
        defaultColor: '#00ff88',
        previewCSS: {
            color: '#00ff88',
            textShadow: '0 0 8px #00ff88, 0 0 20px rgba(0,255,136,0.5), 0 0 40px rgba(0,255,136,0.25)',
        },
    },
    {
        type: 'glitch', label: 'Glitch', section: 'style',
        defaultColor: '#ff0055',
        previewCSS: { textShadow: '-3px 0 #00ffff, 3px 0 #ff0000', color: '#ff0055' },
    },
    // ── Shape section ──
    {
        type: 'curve', label: 'Curve', section: 'shape',
        defaultColor: '#f59e0b',
        previewCSS: { textShadow: '0 2px 4px rgba(245,158,11,0.3)', fontStyle: 'italic' },
    },
    // ── Advanced section ──
    {
        type: 'neon-lights', label: 'Neon Lights', section: 'advanced',
        defaultColor: '#22c55e',
        previewCSS: {
            color: '#22c55e',
            textShadow: '0 0 16px #22c55e, 0 0 32px rgba(34,197,94,0.4)',
            WebkitTextStroke: '0.5px rgba(34,197,94,0.6)',
        },
    },
    {
        type: 'tv-static', label: 'TV Static', section: 'advanced',
        defaultColor: '#94a3b8',
        previewCSS: { textShadow: '1px -1px 2px rgba(255,255,255,0.4)', letterSpacing: '2px' },
    },
    {
        type: '70s', label: '70s', section: 'advanced',
        defaultColor: '#f97316',
        previewCSS: {
            WebkitTextStroke: '3px #f97316',
            textShadow: '4px 4px 0 rgba(255,140,0,0.4)',
        },
    },
];

/**
 * Detect current effect from node's persisted __glid* properties.
 */
function detectCurrentEffect(node: EngineNode | null): {
    type: TextEffectType;
    intensity: number;
    color: string;
} {
    if (!node) return { type: 'none', intensity: 50, color: '#000000' };
    const t = node.textEffect_type ?? 'none';
    return {
        type: t,
        intensity: node.textEffect_intensity ?? 50,
        color: node.textEffect_color ?? '#000000',
    };
}

export function InlineEffectsPanel({ selectedNode, actions, onClose }: Props) {
    const detected = useMemo(() => detectCurrentEffect(selectedNode), [selectedNode]);
    const [activeType, setActiveType] = useState<TextEffectType>(detected.type);
    const [intensity, setIntensity] = useState(detected.intensity);
    const [customColor, setCustomColor] = useState(detected.color);

    // ★ SYNC: Re-sync when selection changes
    useEffect(() => {
        setActiveType(detected.type);
        setIntensity(detected.intensity);
        setCustomColor(detected.color);
    }, [detected.type, detected.intensity, detected.color]);

    const applyEffect = useCallback((type: TextEffectType, color: string, intensityVal: number) => {
        if (!selectedNode || !actions) return;
        if (type === 'none') {
            actions.removeTextEffect(selectedNode.id);
        } else {
            actions.setTextEffect(selectedNode.id, type, intensityVal, color);
        }
    }, [selectedNode, actions]);

    const handlePresetClick = useCallback((preset: EffectPreset) => {
        setActiveType(preset.type);
        setCustomColor(preset.defaultColor);
        setIntensity(50);
        applyEffect(preset.type, preset.defaultColor, 50);
    }, [applyEffect]);

    const handleIntensity = useCallback((val: number) => {
        setIntensity(val);
        if (activeType !== 'none') {
            applyEffect(activeType, customColor, val);
        }
    }, [activeType, customColor, applyEffect]);

    const handleColorChange = useCallback((hex: string) => {
        setCustomColor(hex);
        if (activeType !== 'none') {
            applyEffect(activeType, hex, intensity);
        }
    }, [activeType, intensity, applyEffect]);

    const handleRemoveEffect = useCallback(() => {
        setActiveType('none');
        if (selectedNode && actions) {
            actions.removeTextEffect(selectedNode.id);
        }
    }, [selectedNode, actions]);

    const renderSection = (sectionKey: string, label: string, presets: EffectPreset[]) => (
        <div key={sectionKey}>
            <p style={S.sectionLabel}>{label}</p>
            <div style={S.grid}>
                {presets.map((preset) => (
                    <button
                        key={preset.type}
                        style={{
                            ...S.presetBtn,
                            ...(activeType === preset.type ? S.presetBtnActive : {}),
                        }}
                        onClick={() => handlePresetClick(preset)}
                    >
                        <div style={{ ...S.presetPreview, ...preset.previewCSS }}>
                            Ag
                        </div>
                        <span style={S.presetLabel}>{preset.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const shadowPresets = EFFECT_PRESETS.filter(p => p.section === 'shadow');
    const stylePresets = EFFECT_PRESETS.filter(p => p.section === 'style');
    const shapePresets = EFFECT_PRESETS.filter(p => p.section === 'shape');
    const advancedPresets = EFFECT_PRESETS.filter(p => p.section === 'advanced');

    return (
        <div style={S.root}>
            <div style={S.header}>
                <h3 style={S.title}>Effects</h3>
                <button style={S.closeBtn} onClick={onClose}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div style={S.body}>
                {renderSection('shadow', 'Shadow', shadowPresets)}
                <div style={S.divider} />
                {renderSection('style', 'Style', stylePresets)}
                <div style={S.divider} />
                {renderSection('shape', 'Shape', shapePresets)}
                <div style={S.divider} />
                {renderSection('advanced', 'Advanced', advancedPresets)}

                {/* Controls: shown when an effect is active */}
                {activeType !== 'none' && (
                    <>
                        <div style={S.divider} />
                        <p style={S.sectionLabel}>Intensity</p>
                        <div style={S.sliderRow}>
                            <button style={S.stepBtn} onClick={() => handleIntensity(Math.max(0, intensity - 5))}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14" />
                                </svg>
                            </button>
                            <input
                                type="range"
                                style={S.slider}
                                min={0}
                                max={100}
                                value={intensity}
                                onChange={(e) => handleIntensity(Number(e.target.value))}
                            />
                            <button style={S.stepBtn} onClick={() => handleIntensity(Math.min(100, intensity + 5))}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                            </button>
                            <span style={S.sliderVal}>{intensity}</span>
                        </div>

                        <div style={S.divider} />
                        <p style={S.sectionLabel}>Color</p>
                        <div style={S.colorRow}>
                            <input
                                type="color"
                                value={customColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                style={S.colorInput}
                            />
                            <span style={S.colorHex}>{customColor.toUpperCase()}</span>
                        </div>
                    </>
                )}

                {/* Remove Effect */}
                <div style={S.divider} />
                <button
                    style={{
                        ...S.removeBtn,
                        ...(activeType === 'none' ? { opacity: 0.4, cursor: 'default' } : {}),
                    }}
                    onClick={handleRemoveEffect}
                    disabled={activeType === 'none'}
                >
                    Remove Effect
                </button>
            </div>
        </div>
    );
}

// ── Inline Styles ──
const S: Record<string, React.CSSProperties> = {
    root: { display: 'flex', flexDirection: 'column', height: '100%' },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    title: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #e4e4e7)', margin: 0 },
    closeBtn: {
        background: 'none', border: 'none', color: 'var(--text-muted, #71717a)',
        cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex',
    },
    body: {
        padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12,
        overflowY: 'auto', flex: 1,
    },
    sectionLabel: {
        fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #a1a1aa)',
        textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 6px 0',
    },
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
    },
    presetBtn: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: 6, background: 'rgba(255,255,255,0.03)', border: '1.5px solid transparent',
        borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
    },
    presetBtnActive: {
        borderColor: 'var(--accent, #818cf8)', background: 'rgba(129,140,248,0.08)',
    },
    presetPreview: {
        width: '100%', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 700, color: '#e4e4e7', borderRadius: 6,
        background: 'rgba(255,255,255,0.04)', fontFamily: 'Inter, system-ui, sans-serif',
    },
    presetLabel: {
        fontSize: 10, color: 'var(--text-muted, #71717a)', whiteSpace: 'nowrap' as const,
    },
    divider: {
        height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0',
    },
    sliderRow: {
        display: 'flex', alignItems: 'center', gap: 8,
    },
    slider: {
        flex: 1, height: 4, appearance: 'none' as const,
        background: 'rgba(255,255,255,0.12)', borderRadius: 2, outline: 'none',
        WebkitAppearance: 'none' as const, cursor: 'pointer',
    },
    sliderVal: {
        fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', fontFamily: 'monospace',
        width: 28, textAlign: 'right' as const,
    },
    stepBtn: {
        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 4, color: 'var(--text-secondary, #a1a1aa)', cursor: 'pointer',
    },
    colorRow: {
        display: 'flex', alignItems: 'center', gap: 8,
    },
    colorInput: {
        width: 32, height: 32, padding: 0, border: 'none', borderRadius: 6,
        cursor: 'pointer', background: 'transparent',
    },
    colorHex: {
        fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', fontFamily: 'monospace',
    },
    removeBtn: {
        width: '100%', padding: '8px 0', background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
        color: '#ef4444', fontSize: 12, fontWeight: 500, cursor: 'pointer',
        transition: 'background 0.15s',
    },
};
