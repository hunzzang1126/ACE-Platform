// ─────────────────────────────────────────────────
// InlineEffectsPanel — Shadow presets (Canva-style)
// ─────────────────────────────────────────────────
// Opens as left-panel overlay when Effects button clicked in context toolbar.
// Provides shadow/glow presets and intensity slider.
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import type { CanvasEngineActions, EngineNode } from '@/hooks/canvasTypes';

interface Props {
    selectedNode: EngineNode | null;
    actions: CanvasEngineActions | null;
    onClose: () => void;
}

const SHADOW_PRESETS = [
    { label: 'None', offsetX: 0, offsetY: 0, blur: 0, color: [0, 0, 0, 0] as [number, number, number, number] },
    { label: 'Drop', offsetX: 4, offsetY: 4, blur: 8, color: [0, 0, 0, 0.3] as [number, number, number, number] },
    { label: 'Glow', offsetX: 0, offsetY: 0, blur: 16, color: [0.5, 0.3, 1, 0.5] as [number, number, number, number] },
    { label: 'Echo', offsetX: 6, offsetY: 6, blur: 0, color: [0, 0, 0, 0.15] as [number, number, number, number] },
    { label: 'Soft', offsetX: 0, offsetY: 2, blur: 12, color: [0, 0, 0, 0.2] as [number, number, number, number] },
    { label: 'Hard', offsetX: 3, offsetY: 3, blur: 0, color: [0, 0, 0, 0.4] as [number, number, number, number] },
    { label: 'Lift', offsetX: 0, offsetY: 8, blur: 24, color: [0, 0, 0, 0.15] as [number, number, number, number] },
    { label: 'Neon', offsetX: 0, offsetY: 0, blur: 20, color: [0, 1, 0.8, 0.6] as [number, number, number, number] },
];

export function InlineEffectsPanel({ selectedNode, actions, onClose }: Props) {
    const [activePreset, setActivePreset] = useState<string>('None');
    const [intensity, setIntensity] = useState(50);

    const handlePreset = useCallback((preset: typeof SHADOW_PRESETS[number]) => {
        if (!selectedNode || !actions) return;
        setActivePreset(preset.label);

        if (preset.label === 'None') {
            actions.removeShadow(selectedNode.id);
            return;
        }

        const scale = intensity / 50; // 0-2x multiplier
        actions.setShadow(
            selectedNode.id,
            preset.offsetX * scale,
            preset.offsetY * scale,
            preset.blur * scale,
            preset.color[0],
            preset.color[1],
            preset.color[2],
            preset.color[3],
        );
    }, [selectedNode, actions, intensity]);

    const handleIntensity = useCallback((val: number) => {
        setIntensity(val);
        // Re-apply current preset with new intensity
        const preset = SHADOW_PRESETS.find(p => p.label === activePreset);
        if (preset && preset.label !== 'None' && selectedNode && actions) {
            const scale = val / 50;
            actions.setShadow(
                selectedNode.id,
                preset.offsetX * scale,
                preset.offsetY * scale,
                preset.blur * scale,
                preset.color[0],
                preset.color[1],
                preset.color[2],
                preset.color[3],
            );
        }
    }, [activePreset, selectedNode, actions]);

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
                                    `${preset.offsetX}px ${preset.offsetY}px ${preset.blur}px rgba(${Math.round(preset.color[0]*255)},${Math.round(preset.color[1]*255)},${Math.round(preset.color[2]*255)},${preset.color[3]})`,
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
