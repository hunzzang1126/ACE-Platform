// ─────────────────────────────────────────────────
// InlineEffectsPanel — Shadow presets (Canva-style)
// ─────────────────────────────────────────────────
// Opens as left-panel overlay when Effects button clicked in context toolbar.
// ★ Reads current shadow from selected node to determine active preset.
// ★ Supports color customization for all presets.
// ★ Enhanced neon: multi-layer glow for neon-sign look.
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { CanvasEngineActions, EngineNode } from '@/hooks/canvasTypes';

interface Props {
    selectedNode: EngineNode | null;
    actions: CanvasEngineActions | null;
    onClose: () => void;
}

interface ShadowPreset {
    label: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    color: [number, number, number, number];
    /** Extra layers for multi-glow effects (neon) */
    extraLayers?: Array<{ blur: number; color: [number, number, number, number] }>;
}

const SHADOW_PRESETS: ShadowPreset[] = [
    { label: 'None', offsetX: 0, offsetY: 0, blur: 0, color: [0, 0, 0, 0] },
    { label: 'Drop', offsetX: 4, offsetY: 4, blur: 8, color: [0, 0, 0, 0.3] },
    { label: 'Glow', offsetX: 0, offsetY: 0, blur: 16, color: [0.5, 0.3, 1, 0.5] },
    { label: 'Echo', offsetX: 6, offsetY: 6, blur: 0, color: [0, 0, 0, 0.15] },
    { label: 'Soft', offsetX: 0, offsetY: 2, blur: 12, color: [0, 0, 0, 0.2] },
    { label: 'Hard', offsetX: 3, offsetY: 3, blur: 0, color: [0, 0, 0, 0.4] },
    { label: 'Lift', offsetX: 0, offsetY: 8, blur: 24, color: [0, 0, 0, 0.15] },
    {
        label: 'Neon', offsetX: 0, offsetY: 0, blur: 8, color: [0, 1, 0.8, 0.9],
        // ★ Multi-layer neon: tight inner + wide outer glow for neon-sign effect
        extraLayers: [
            { blur: 20, color: [0, 1, 0.8, 0.5] },
            { blur: 40, color: [0, 1, 0.8, 0.25] },
        ],
    },
];

/**
 * Detect which preset best matches the node's current shadow.
 * Returns the preset label, or 'None' if no shadow.
 */
function detectPreset(node: EngineNode | null): string {
    if (!node) return 'None';
    const sc = node.shadow_color;
    if (!sc || sc === 'transparent' || sc === 'rgba(0,0,0,0)') return 'None';

    // Parse shadow color to RGBA floats
    const blur = node.shadow_blur ?? 0;
    const offX = node.shadow_offsetX ?? 0;
    const offY = node.shadow_offsetY ?? 0;

    // Match by structure: offset+blur pattern (color may differ due to customization)
    for (const p of SHADOW_PRESETS) {
        if (p.label === 'None') continue;
        // Check offset/blur signature (within tolerance)
        const matchOff = Math.abs(offX - p.offsetX) < 3 && Math.abs(offY - p.offsetY) < 3;
        const matchBlur = Math.abs(blur - p.blur) < 6;
        if (matchOff && matchBlur) return p.label;
    }

    // Fallback: if shadow exists but no preset matches, show as custom/Glow
    return 'Glow';
}

/** Convert RGBA float [0-1] to hex */
function rgbaToHex(r: number, g: number, b: number): string {
    const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}

/** Parse hex to RGBA float */
function hexToRgba(hex: string): [number, number, number] {
    const c = hex.replace('#', '');
    return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255];
}

export function InlineEffectsPanel({ selectedNode, actions, onClose }: Props) {
    // ★ FIX: Detect active preset from node's current shadow on mount/selection change
    const detectedPreset = useMemo(() => detectPreset(selectedNode), [selectedNode]);
    const [activePreset, setActivePreset] = useState<string>(detectedPreset);
    const [intensity, setIntensity] = useState(50);

    // ★ Color customization state
    const currentPresetDef = SHADOW_PRESETS.find(p => p.label === activePreset);
    const defaultColor = currentPresetDef ? rgbaToHex(currentPresetDef.color[0], currentPresetDef.color[1], currentPresetDef.color[2]) : '#000000';
    const [customColor, setCustomColor] = useState(defaultColor);

    // Sync active preset when selection changes
    useEffect(() => {
        setActivePreset(detectedPreset);
    }, [detectedPreset]);

    // Sync color when preset changes
    useEffect(() => {
        if (currentPresetDef) {
            setCustomColor(rgbaToHex(currentPresetDef.color[0], currentPresetDef.color[1], currentPresetDef.color[2]));
        }
    }, [activePreset]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyShadow = useCallback((preset: ShadowPreset, colorHex: string, intensityVal: number) => {
        if (!selectedNode || !actions) return;

        if (preset.label === 'None') {
            actions.removeShadow(selectedNode.id);
            return;
        }

        const scale = intensityVal / 50;
        const [r, g, b] = hexToRgba(colorHex);
        const alpha = preset.color[3];

        // Apply primary shadow
        actions.setShadow(
            selectedNode.id,
            preset.offsetX * scale,
            preset.offsetY * scale,
            preset.blur * scale,
            r, g, b, alpha,
        );

        // ★ For neon: apply additional textShadow via custom styles for multi-layer effect
        if (preset.extraLayers && preset.extraLayers.length > 0) {
            const layers = [
                `0 0 ${Math.round(preset.blur * scale)}px rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${alpha})`,
                ...preset.extraLayers.map(l => {
                    const a = l.color[3];
                    return `0 0 ${Math.round(l.blur * scale)}px rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`;
                }),
            ];
            // Apply multi-layer neon via custom style (CSS textShadow supports multiple layers)
            if (typeof actions.setCustomStyle === 'function') {
                actions.setCustomStyle(selectedNode.id, { textShadow: layers.join(', ') });
            }
        } else {
            // Clear any previous neon custom style
            if (typeof actions.setCustomStyle === 'function') {
                actions.setCustomStyle(selectedNode.id, { textShadow: '' });
            }
        }
    }, [selectedNode, actions]);

    const handlePreset = useCallback((preset: ShadowPreset) => {
        setActivePreset(preset.label);
        const newColor = rgbaToHex(preset.color[0], preset.color[1], preset.color[2]);
        setCustomColor(newColor);
        applyShadow(preset, newColor, intensity);
    }, [applyShadow, intensity]);

    const handleIntensity = useCallback((val: number) => {
        setIntensity(val);
        const preset = SHADOW_PRESETS.find(p => p.label === activePreset);
        if (preset && preset.label !== 'None') {
            applyShadow(preset, customColor, val);
        }
    }, [activePreset, customColor, applyShadow]);

    const handleColorChange = useCallback((hex: string) => {
        setCustomColor(hex);
        const preset = SHADOW_PRESETS.find(p => p.label === activePreset);
        if (preset && preset.label !== 'None') {
            applyShadow(preset, hex, intensity);
        }
    }, [activePreset, intensity, applyShadow]);

    return (
        <div className="inline-panel">
            <div className="inline-panel-header">
                <h3>Effects</h3>
                <button className="inline-panel-close" onClick={onClose}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="inline-panel-body">
                <p className="sidebar-section-label">Shadow</p>
                <div className="inline-preset-grid">
                    {SHADOW_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            className={`inline-preset-btn ${activePreset === preset.label ? 'active' : ''}`}
                            onClick={() => handlePreset(preset)}
                        >
                            <div className="inline-preset-preview" style={{
                                boxShadow: preset.label === 'None' ? 'none' :
                                    preset.extraLayers
                                        ? [
                                            `0 0 ${preset.blur}px rgba(${Math.round(preset.color[0]*255)},${Math.round(preset.color[1]*255)},${Math.round(preset.color[2]*255)},${preset.color[3]})`,
                                            ...preset.extraLayers.map(l =>
                                                `0 0 ${l.blur}px rgba(${Math.round(l.color[0]*255)},${Math.round(l.color[1]*255)},${Math.round(l.color[2]*255)},${l.color[3]})`
                                            ),
                                        ].join(', ')
                                        : `${preset.offsetX}px ${preset.offsetY}px ${preset.blur}px rgba(${Math.round(preset.color[0]*255)},${Math.round(preset.color[1]*255)},${Math.round(preset.color[2]*255)},${preset.color[3]})`,
                            }}>
                                Ag
                            </div>
                            <span className="inline-preset-label">{preset.label}</span>
                        </button>
                    ))}
                </div>

                {activePreset !== 'None' && (
                    <>
                        <div className="inline-divider" />
                        <p className="sidebar-section-label">Color</p>
                        <div className="inline-slider-row" style={{ gap: 8 }}>
                            <input
                                type="color"
                                value={customColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                style={{
                                    width: 32, height: 32, padding: 0, border: 'none',
                                    borderRadius: 6, cursor: 'pointer', background: 'transparent',
                                }}
                            />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                {customColor.toUpperCase()}
                            </span>
                        </div>

                        <div className="inline-divider" />
                        <p className="sidebar-section-label">Intensity</p>
                        <div className="inline-slider-row">
                            <input
                                type="range"
                                className="inline-slider"
                                min={0}
                                max={100}
                                value={intensity}
                                onChange={(e) => handleIntensity(Number(e.target.value))}
                            />
                            <span className="inline-slider-value">{intensity}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
