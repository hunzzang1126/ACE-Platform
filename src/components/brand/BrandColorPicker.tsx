// ─────────────────────────────────────────────────
// BrandColorPicker — Brand color → auto palette UI
// ─────────────────────────────────────────────────
// UI component for picking brand colors and previewing the
// auto-generated OKLCH palette. Renders at creative set creation/edit.

import React, { useState, useCallback, useMemo } from 'react';
import { generateBrandPalette, type BrandPalette, type HarmonyMode } from '@/engine/brandPalette';

interface BrandColorPickerProps {
    initialColor?: string;
    onPaletteChange: (palette: BrandPalette) => void;
}

const HARMONY_MODES: { value: HarmonyMode; label: string }[] = [
    { value: 'complementary', label: 'Complementary' },
    { value: 'split-complementary', label: 'Split Comp.' },
    { value: 'analogous', label: 'Analogous' },
    { value: 'triadic', label: 'Triadic' },
];

export const BrandColorPicker: React.FC<BrandColorPickerProps> = ({
    initialColor = '#3B82F6',
    onPaletteChange,
}) => {
    const [brandColor, setBrandColor] = useState(initialColor);
    const [harmonyMode, setHarmonyMode] = useState<HarmonyMode | undefined>();

    const palette = useMemo(
        () => generateBrandPalette(brandColor, harmonyMode),
        [brandColor, harmonyMode],
    );

    const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        setBrandColor(hex);
        const newPalette = generateBrandPalette(hex, harmonyMode);
        onPaletteChange(newPalette);
    }, [harmonyMode, onPaletteChange]);

    const handleHexInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[a-fA-F0-9]{6}$/.test(val)) {
            setBrandColor(val);
            const newPalette = generateBrandPalette(val, harmonyMode);
            onPaletteChange(newPalette);
        }
    }, [harmonyMode, onPaletteChange]);

    const handleModeChange = useCallback((mode: HarmonyMode) => {
        setHarmonyMode(mode);
        const newPalette = generateBrandPalette(brandColor, mode);
        onPaletteChange(newPalette);
    }, [brandColor, onPaletteChange]);

    const swatches: { label: string; color: string; key: keyof BrandPalette }[] = [
        { label: 'Primary', color: palette.primary, key: 'primary' },
        { label: 'Secondary', color: palette.secondary, key: 'secondary' },
        { label: 'Accent', color: palette.accent, key: 'accent' },
        { label: 'Background', color: palette.background, key: 'background' },
        { label: 'Text', color: palette.text, key: 'text' },
        { label: 'Surface', color: palette.surface, key: 'surface' },
    ];

    return (
        <div className="brand-color-picker">
            {/* Color Input */}
            <div className="brand-color-picker__input-row">
                <label className="brand-color-picker__label">Brand Color</label>
                <div className="brand-color-picker__controls">
                    <input
                        type="color"
                        value={brandColor}
                        onChange={handleColorChange}
                        className="brand-color-picker__native"
                        id="brand-color-input"
                    />
                    <input
                        type="text"
                        value={brandColor}
                        onChange={handleHexInput}
                        className="brand-color-picker__hex"
                        placeholder="#3B82F6"
                        maxLength={7}
                        id="brand-hex-input"
                    />
                </div>
            </div>

            {/* Harmony Mode Selector */}
            <div className="brand-color-picker__harmony">
                <label className="brand-color-picker__label">Harmony</label>
                <div className="brand-color-picker__mode-buttons">
                    <button
                        className={`brand-color-picker__mode-btn ${!harmonyMode ? 'active' : ''}`}
                        onClick={() => { setHarmonyMode(undefined); onPaletteChange(generateBrandPalette(brandColor)); }}
                        id="harmony-auto-btn"
                    >
                        Auto
                    </button>
                    {HARMONY_MODES.map(m => (
                        <button
                            key={m.value}
                            className={`brand-color-picker__mode-btn ${harmonyMode === m.value ? 'active' : ''}`}
                            onClick={() => handleModeChange(m.value)}
                            id={`harmony-${m.value}-btn`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Palette Preview */}
            <div className="brand-color-picker__swatches">
                {swatches.map(s => (
                    <div key={s.key} className="brand-color-picker__swatch">
                        <div
                            className="brand-color-picker__swatch-color"
                            style={{ backgroundColor: s.color }}
                        />
                        <span className="brand-color-picker__swatch-label">{s.label}</span>
                        <span className="brand-color-picker__swatch-hex">{s.color}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
