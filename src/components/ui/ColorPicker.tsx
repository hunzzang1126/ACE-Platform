// ─────────────────────────────────────────────────
// ColorPicker — Compact color picker with hex input + presets
// ─────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';

interface Props {
    color: string;          // Hex string like '#ff0000'
    onChange: (hex: string) => void;
    label?: string;
}

// Brand-quality presets
const PRESETS = [
    '#ffffff', '#000000', '#1a1a2e', '#16213e', '#0f3460',
    '#e94560', '#ff6b6b', '#ffa502', '#ffd93d', '#6bff6b',
    '#1dd1a1', '#54a0ff', '#5f27cd', '#a29bfe', '#fd79a8',
    '#00cec9', '#fab1a0', '#fdcb6e', '#e17055', '#636e72',
];

export function ColorPicker({ color, onChange, label }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [hexInput, setHexInput] = useState(color);
    const panelRef = useRef<HTMLDivElement>(null);

    // Sync input when prop changes
    useEffect(() => { setHexInput(color); }, [color]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const handleHexSubmit = useCallback(() => {
        let hex = hexInput.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
            onChange(hex);
        } else {
            setHexInput(color);
        }
    }, [hexInput, color, onChange]);

    return (
        <div className="cp-root" ref={panelRef}>
            {label && <span className="cp-label">{label}</span>}
            <button
                className="cp-swatch"
                style={{ backgroundColor: color }}
                onClick={() => setIsOpen(!isOpen)}
                title={color}
            />
            {isOpen && (
                <div className="cp-dropdown">
                    {/* Native color input for full picker */}
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => onChange(e.target.value)}
                        className="cp-native"
                    />
                    {/* Hex input */}
                    <div className="cp-hex-row">
                        <span className="cp-hex-label">HEX</span>
                        <input
                            className="cp-hex-input"
                            value={hexInput}
                            onChange={(e) => setHexInput(e.target.value)}
                            onBlur={handleHexSubmit}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleHexSubmit(); e.stopPropagation(); }}
                        />
                    </div>
                    {/* Presets */}
                    <div className="cp-presets">
                        {PRESETS.map((c) => (
                            <button
                                key={c}
                                className={`cp-preset ${c === color ? 'active' : ''}`}
                                style={{ backgroundColor: c }}
                                onClick={() => { onChange(c); setHexInput(c); }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
