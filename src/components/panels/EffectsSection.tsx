// ─────────────────────────────────────────────────
// EffectsSection — Drop shadow, blend mode, filters
// Wires to existing WASM engine APIs
// ─────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import type { CanvasEngineActions } from '@/hooks/useCanvasEngine';

interface Props {
    nodeId: number;
    actions: CanvasEngineActions;
}

const BLEND_MODES = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color_dodge', 'color_burn', 'hard_light', 'soft_light', 'difference', 'exclusion',
];

export function EffectsSection({ nodeId, actions }: Props) {
    // Shadow state
    const [shadowEnabled, setShadowEnabled] = useState(false);
    const [shadowX, setShadowX] = useState(4);
    const [shadowY, setShadowY] = useState(4);
    const [shadowBlur, setShadowBlur] = useState(8);

    // Blend mode
    const [blendMode, setBlendMode] = useState('normal');

    // Filters
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [hueRotate, setHueRotate] = useState(0);

    // Apply shadow
    const handleShadowToggle = useCallback((enabled: boolean) => {
        setShadowEnabled(enabled);
        if (enabled) {
            actions.setShadow(nodeId, shadowX, shadowY, shadowBlur, 0, 0, 0, 0.4);
        } else {
            actions.removeShadow(nodeId);
        }
    }, [nodeId, actions, shadowX, shadowY, shadowBlur]);

    const updateShadow = useCallback((x: number, y: number, blur: number) => {
        setShadowX(x);
        setShadowY(y);
        setShadowBlur(blur);
        if (shadowEnabled) {
            actions.setShadow(nodeId, x, y, blur, 0, 0, 0, 0.4);
        }
    }, [nodeId, actions, shadowEnabled]);

    // Apply blend mode
    useEffect(() => {
        actions.setBlendMode(nodeId, blendMode);
    }, [nodeId, blendMode, actions]);

    return (
        <>
            {/* Blend Mode */}
            <div className="ed-props-section">
                <div className="ed-props-section-label">Blend Mode</div>
                <select
                    className="ed-props-select"
                    value={blendMode}
                    onChange={(e) => setBlendMode(e.target.value)}
                >
                    {BLEND_MODES.map((m) => (
                        <option key={m} value={m}>
                            {m.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                    ))}
                </select>
            </div>

            {/* Drop Shadow */}
            <div className="ed-props-section">
                <div className="ed-props-section-header-row">
                    <span className="ed-props-section-label">Drop Shadow</span>
                    <label className="ed-props-toggle">
                        <input
                            type="checkbox"
                            checked={shadowEnabled}
                            onChange={(e) => handleShadowToggle(e.target.checked)}
                        />
                        <span className="ed-props-toggle-slider" />
                    </label>
                </div>
                {shadowEnabled && (
                    <div className="ed-props-effects-grid">
                        <EffectSlider label="X" value={shadowX} min={-50} max={50} onChange={(v) => updateShadow(v, shadowY, shadowBlur)} />
                        <EffectSlider label="Y" value={shadowY} min={-50} max={50} onChange={(v) => updateShadow(shadowX, v, shadowBlur)} />
                        <EffectSlider label="Blur" value={shadowBlur} min={0} max={50} onChange={(v) => updateShadow(shadowX, shadowY, v)} />
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="ed-props-section">
                <div className="ed-props-section-label">Adjustments</div>
                <div className="ed-props-effects-grid">
                    <EffectSlider label="Brightness" value={brightness} min={0} max={200} suffix="%" onChange={(v) => { setBrightness(v); actions.setBrightness(nodeId, v / 100); }} />
                    <EffectSlider label="Contrast" value={contrast} min={0} max={200} suffix="%" onChange={(v) => { setContrast(v); actions.setContrast(nodeId, v / 100); }} />
                    <EffectSlider label="Saturation" value={saturation} min={0} max={200} suffix="%" onChange={(v) => { setSaturation(v); actions.setSaturation(nodeId, v / 100); }} />
                    <EffectSlider label="Hue" value={hueRotate} min={0} max={360} suffix="°" onChange={(v) => { setHueRotate(v); actions.setHueRotate(nodeId, v); }} />
                </div>
            </div>
        </>
    );
}

// ── Internal slider component ──

function EffectSlider({ label, value, min, max, suffix, onChange }: {
    label: string;
    value: number;
    min: number;
    max: number;
    suffix?: string;
    onChange: (v: number) => void;
}) {
    return (
        <div className="ed-effect-slider-row">
            <span className="ed-effect-slider-label">{label}</span>
            <input
                type="range"
                className="ed-props-slider"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
            />
            <span className="ed-effect-slider-value">{value}{suffix || ''}</span>
        </div>
    );
}
