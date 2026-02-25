// ─────────────────────────────────────────────────
// PropertyPanel – Context-aware property inspector
// Shows different sections based on what's selected:
//   - Engine shapes: position, size, opacity, z-index, effects
//   - Text overlays: font, size, weight, color, alignment
//   - Image overlays: opacity, object-fit
//   - Nothing selected: empty state
// ─────────────────────────────────────────────────
import { useState, useCallback, useEffect, useRef } from 'react';
import { IcAlignLeft, IcAlignCenterH, IcAlignRight, IcAlignTop, IcAlignCenterV, IcAlignBottom } from '@/components/ui/Icons';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { EffectsSection } from '@/components/panels/EffectsSection';
import type { EngineNode, CanvasEngineActions } from '@/hooks/useCanvasEngine';
import type { OverlayElement } from '@/hooks/useOverlayElements';

// ── Font options ──
const FONT_FAMILIES = [
    'Inter, sans-serif',
    'Roboto, sans-serif',
    'Outfit, sans-serif',
    'Poppins, sans-serif',
    'Montserrat, sans-serif',
    'Arial, sans-serif',
    'Georgia, serif',
    'Times New Roman, serif',
    'Courier New, monospace',
];

const FONT_WEIGHTS = [
    { label: 'Light', value: '300' },
    { label: 'Regular', value: '400' },
    { label: 'Medium', value: '500' },
    { label: 'Semi Bold', value: '600' },
    { label: 'Bold', value: '700' },
    { label: 'Black', value: '900' },
];

interface Props {
    nodes?: EngineNode[];
    selection?: number[];
    actions?: CanvasEngineActions | null;
    selectedOverlay?: OverlayElement | null;
    onOverlayUpdate?: (id: string, updates: Partial<OverlayElement>) => void;
    canvasWidth?: number;
    canvasHeight?: number;
}

export function PropertyPanel({ nodes = [], selection = [], actions, selectedOverlay, onOverlayUpdate, canvasWidth = 300, canvasHeight = 250 }: Props) {
    const selectedNode = nodes.find((n) => selection.includes(n.id));
    const hasOverlay = !!selectedOverlay;
    const hasShape = !!selectedNode;

    // Canvas alignment for overlay elements  
    const alignOverlay = useCallback((dir: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
        if (!selectedOverlay || !onOverlayUpdate) return;
        const { id, w, h } = selectedOverlay;
        const updates: Partial<OverlayElement> = {};
        switch (dir) {
            case 'left': updates.x = 0; break;
            case 'center-h': updates.x = (canvasWidth - w) / 2; break;
            case 'right': updates.x = canvasWidth - w; break;
            case 'top': updates.y = 0; break;
            case 'center-v': updates.y = (canvasHeight - h) / 2; break;
            case 'bottom': updates.y = canvasHeight - h; break;
        }
        onOverlayUpdate(id, updates);
    }, [selectedOverlay, onOverlayUpdate, canvasWidth, canvasHeight]);

    // Nothing selected
    if (!hasOverlay && !hasShape) {
        return (
            <div className="pp-empty">
                <p>Select an element to edit</p>
            </div>
        );
    }

    // ── Text overlay selected ──
    if (hasOverlay && selectedOverlay.type === 'text') {
        return (
            <aside className="pp-root">
                <div className="pp-header">
                    <span className="pp-title">Text</span>
                </div>

                {/* Typography */}
                <Section label="Typography">
                    {/* Font Family */}
                    <select
                        className="pp-select"
                        value={selectedOverlay.fontFamily || 'Inter, sans-serif'}
                        onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { fontFamily: e.target.value })}
                    >
                        {FONT_FAMILIES.map((f) => (
                            <option key={f} value={f}>{f.split(',')[0]}</option>
                        ))}
                    </select>

                    {/* Font Weight */}
                    <select
                        className="pp-select"
                        value={selectedOverlay.fontWeight || '400'}
                        onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { fontWeight: e.target.value })}
                    >
                        {FONT_WEIGHTS.map((fw) => (
                            <option key={fw.value} value={fw.value}>{fw.label}</option>
                        ))}
                    </select>

                    {/* Font Size – scrub by dragging label, or type directly */}
                    <ScrubField
                        label="Font Size"
                        value={selectedOverlay.fontSize ?? 16}
                        min={1}
                        max={999}
                        unit="px"
                        onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { fontSize: v })}
                    />

                    {/* Text Color */}
                    <ColorPicker
                        label="Color"
                        color={selectedOverlay.color || '#ffffff'}
                        onChange={(c) => onOverlayUpdate?.(selectedOverlay.id, { color: c })}
                    />

                    {/* Text Alignment */}
                    <div className="pp-align-row">
                        {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                                key={align}
                                className={`pp-align-btn ${(selectedOverlay.textAlign || 'left') === align ? 'active' : ''}`}
                                onClick={() => onOverlayUpdate?.(selectedOverlay.id, { textAlign: align })}
                            >
                                {align === 'left' && <IcAlignLeft size={14} />}
                                {align === 'center' && <IcAlignCenterH size={14} />}
                                {align === 'right' && <IcAlignRight size={14} />}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Canvas Alignment */}
                <Section label="Canvas Alignment">
                    <div className="pp-align-row">
                        <button className="pp-align-btn" title="Left" onClick={() => alignOverlay('left')}><IcAlignLeft size={14} /></button>
                        <button className="pp-align-btn" title="Center H" onClick={() => alignOverlay('center-h')}><IcAlignCenterH size={14} /></button>
                        <button className="pp-align-btn" title="Right" onClick={() => alignOverlay('right')}><IcAlignRight size={14} /></button>
                        <button className="pp-align-btn" title="Top" onClick={() => alignOverlay('top')}><IcAlignTop size={14} /></button>
                        <button className="pp-align-btn" title="Center V" onClick={() => alignOverlay('center-v')}><IcAlignCenterV size={14} /></button>
                        <button className="pp-align-btn" title="Bottom" onClick={() => alignOverlay('bottom')}><IcAlignBottom size={14} /></button>
                    </div>
                </Section>

                {/* Opacity */}
                <Section label="Opacity">
                    <OpacitySlider value={selectedOverlay.opacity} onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { opacity: v })} />
                </Section>
            </aside>
        );
    }

    // ── Image overlay selected ──
    if (hasOverlay && selectedOverlay.type === 'image') {
        return (
            <aside className="pp-root">
                <div className="pp-header">
                    <span className="pp-title">Image</span>
                    <span className="pp-subtitle">{selectedOverlay.fileName || 'Untitled'}</span>
                </div>

                <Section label="Fit Mode">
                    <select
                        className="pp-select"
                        value={selectedOverlay.objectFit || 'cover'}
                        onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { objectFit: e.target.value as 'cover' | 'contain' | 'fill' })}
                    >
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                        <option value="fill">Fill</option>
                    </select>
                </Section>

                {/* Canvas Alignment */}
                <Section label="Canvas Alignment">
                    <div className="pp-align-row">
                        <button className="pp-align-btn" title="Left" onClick={() => alignOverlay('left')}><IcAlignLeft size={14} /></button>
                        <button className="pp-align-btn" title="Center H" onClick={() => alignOverlay('center-h')}><IcAlignCenterH size={14} /></button>
                        <button className="pp-align-btn" title="Right" onClick={() => alignOverlay('right')}><IcAlignRight size={14} /></button>
                        <button className="pp-align-btn" title="Top" onClick={() => alignOverlay('top')}><IcAlignTop size={14} /></button>
                        <button className="pp-align-btn" title="Center V" onClick={() => alignOverlay('center-v')}><IcAlignCenterV size={14} /></button>
                        <button className="pp-align-btn" title="Bottom" onClick={() => alignOverlay('bottom')}><IcAlignBottom size={14} /></button>
                    </div>
                </Section>

                <Section label="Opacity">
                    <OpacitySlider value={selectedOverlay.opacity} onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { opacity: v })} />
                </Section>
            </aside>
        );
    }

    // ── Video overlay selected ──
    if (hasOverlay && selectedOverlay.type === 'video') {
        return (
            <aside className="pp-root">
                <div className="pp-header">
                    <span className="pp-title">Video</span>
                    <span className="pp-subtitle">{selectedOverlay.fileName || 'Untitled'}</span>
                </div>

                <Section label="Fit Mode">
                    <select
                        className="pp-select"
                        value={selectedOverlay.objectFit || 'cover'}
                        onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { objectFit: e.target.value as 'cover' | 'contain' | 'fill' })}
                    >
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                        <option value="fill">Fill</option>
                    </select>
                </Section>

                <Section label="Playback">
                    <div className="pp-row" style={{ gap: 8 }}>
                        <label className="pp-checkbox-label">
                            <input
                                type="checkbox"
                                checked={selectedOverlay.muted ?? true}
                                onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { muted: e.target.checked })}
                            />
                            Muted
                        </label>
                        <label className="pp-checkbox-label">
                            <input
                                type="checkbox"
                                checked={selectedOverlay.loop ?? true}
                                onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { loop: e.target.checked })}
                            />
                            Loop
                        </label>
                        <label className="pp-checkbox-label">
                            <input
                                type="checkbox"
                                checked={selectedOverlay.autoplay ?? true}
                                onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { autoplay: e.target.checked })}
                            />
                            Autoplay
                        </label>
                    </div>
                </Section>

                {/* Canvas Alignment */}
                <Section label="Canvas Alignment">
                    <div className="pp-align-row">
                        <button className="pp-align-btn" title="Left" onClick={() => alignOverlay('left')}><IcAlignLeft size={14} /></button>
                        <button className="pp-align-btn" title="Center H" onClick={() => alignOverlay('center-h')}><IcAlignCenterH size={14} /></button>
                        <button className="pp-align-btn" title="Right" onClick={() => alignOverlay('right')}><IcAlignRight size={14} /></button>
                        <button className="pp-align-btn" title="Top" onClick={() => alignOverlay('top')}><IcAlignTop size={14} /></button>
                        <button className="pp-align-btn" title="Center V" onClick={() => alignOverlay('center-v')}><IcAlignCenterV size={14} /></button>
                        <button className="pp-align-btn" title="Bottom" onClick={() => alignOverlay('bottom')}><IcAlignBottom size={14} /></button>
                    </div>
                </Section>

                <Section label="Opacity">
                    <OpacitySlider value={selectedOverlay.opacity} onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { opacity: v })} />
                </Section>
            </aside>
        );
    }

    // ── Engine shape selected ──
    if (hasShape && selectedNode && actions) {
        // Convert engine node fill (0..1 floats) to hex for the color picker
        const fillR = selectedNode.fill_r ?? 0.5;
        const fillG = selectedNode.fill_g ?? 0.5;
        const fillB = selectedNode.fill_b ?? 0.5;
        const currentFillHex = `#${[fillR, fillG, fillB].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;

        const handleColorChange = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            actions.setFillColor(selectedNode.id, r, g, b, 1.0);
        };

        return (
            <aside className="pp-root">
                <div className="pp-header">
                    <span className="pp-title">
                        {selectedNode.type === 'ellipse' ? 'Ellipse' :
                            selectedNode.type === 'rounded_rect' ? 'Rounded Rect' : 'Rectangle'}
                    </span>
                    <span className="pp-subtitle">ID: {selectedNode.id}</span>
                </div>

                {/* Fill Color */}
                <Section label="Fill">
                    <ColorPicker
                        label="Color"
                        color={currentFillHex}
                        onChange={handleColorChange}
                    />
                </Section>

                {/* Alignment */}
                <Section label="Align to Canvas">
                    <div className="pp-align-row">
                        <button className="pp-align-btn" title="Left" onClick={() => actions.alignToCanvas(selectedNode.id, 'left')}><IcAlignLeft size={14} /></button>
                        <button className="pp-align-btn" title="Center H" onClick={() => actions.alignToCanvas(selectedNode.id, 'center-h')}><IcAlignCenterH size={14} /></button>
                        <button className="pp-align-btn" title="Right" onClick={() => actions.alignToCanvas(selectedNode.id, 'right')}><IcAlignRight size={14} /></button>
                        <button className="pp-align-btn" title="Top" onClick={() => actions.alignToCanvas(selectedNode.id, 'top')}><IcAlignTop size={14} /></button>
                        <button className="pp-align-btn" title="Center V" onClick={() => actions.alignToCanvas(selectedNode.id, 'center-v')}><IcAlignCenterV size={14} /></button>
                        <button className="pp-align-btn" title="Bottom" onClick={() => actions.alignToCanvas(selectedNode.id, 'bottom')}><IcAlignBottom size={14} /></button>
                    </div>
                </Section>

                {/* Transform */}
                <Section label="Transform">
                    <div className="pp-row">
                        <PropField label="X" value={selectedNode.x} onChange={(v) => actions.setNodePosition(selectedNode.id, v, selectedNode.y)} />
                        <PropField label="Y" value={selectedNode.y} onChange={(v) => actions.setNodePosition(selectedNode.id, selectedNode.x, v)} />
                    </div>
                    <div className="pp-row">
                        <PropField label="W" value={selectedNode.w} onChange={(v) => actions.setNodeSize(selectedNode.id, v, selectedNode.h)} />
                        <PropField label="H" value={selectedNode.h} onChange={(v) => actions.setNodeSize(selectedNode.id, selectedNode.w, v)} />
                    </div>
                </Section>

                {/* Opacity */}
                <Section label="Opacity">
                    <OpacitySlider value={selectedNode.opacity} onChange={(v) => actions.setNodeOpacity(selectedNode.id, v)} />
                </Section>

                {/* Effects */}
                <EffectsSection nodeId={selectedNode.id} actions={actions} />
            </aside>
        );
    }

    return null;
}

// ── Section wrapper ──
function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="pp-section">
            <div className="pp-section-label">{label}</div>
            {children}
        </div>
    );
}

// ── Scrub Field: drag the label horizontally to adjust value ──
function ScrubField({ label, value, min, max, unit, onChange }: {
    label: string;
    value: number;
    min: number;
    max: number;
    unit?: string;
    onChange: (v: number) => void;
}) {
    const [localVal, setLocalVal] = useState(String(value));
    const [isFocused, setIsFocused] = useState(false);
    const scrubbing = useRef(false);
    const scrubStartX = useRef(0);
    const scrubStartVal = useRef(0);

    // Sync external value when not editing
    useEffect(() => {
        if (!isFocused && !scrubbing.current) setLocalVal(String(value));
    }, [value, isFocused]);

    // Commit typed value
    const handleCommit = useCallback(() => {
        setIsFocused(false);
        const parsed = parseInt(localVal);
        if (!isNaN(parsed) && parsed >= min && parsed <= max) onChange(parsed);
        else setLocalVal(String(value));
    }, [localVal, onChange, value, min, max]);

    // ── Scrub handlers ──
    const handleScrubStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        scrubbing.current = true;
        scrubStartX.current = e.clientX;
        scrubStartVal.current = value;

        const handleMove = (ev: MouseEvent) => {
            if (!scrubbing.current) return;
            const dx = ev.clientX - scrubStartX.current;
            // 1px of mouse movement = 1 unit of font size
            const newVal = Math.min(max, Math.max(min, Math.round(scrubStartVal.current + dx)));
            setLocalVal(String(newVal));
            onChange(newVal);
        };

        const handleUp = () => {
            scrubbing.current = false;
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    }, [value, min, max, onChange]);

    return (
        <div className="pp-scrub-row">
            <label
                className="pp-scrub-label"
                onMouseDown={handleScrubStart}
                title="Drag left/right to adjust"
            >
                {label}
            </label>
            <input
                className="pp-input pp-font-size-input"
                type="number"
                min={min}
                max={max}
                value={localVal}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    const parsed = parseInt(e.target.value);
                    if (!isNaN(parsed) && parsed >= min && parsed <= max) onChange(parsed);
                }}
                onBlur={handleCommit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommit();
                    e.stopPropagation();
                }}
            />
            {unit && <span className="pp-unit">{unit}</span>}
        </div>
    );
}

// ── Integer Property Field (for engine shapes) ──
function PropField({ label, value, onChange }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
}) {
    const [localVal, setLocalVal] = useState(String(Math.round(value)));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) setLocalVal(String(Math.round(value)));
    }, [value, isFocused]);

    const handleCommit = useCallback(() => {
        setIsFocused(false);
        const parsed = parseInt(localVal);
        if (!isNaN(parsed)) onChange(parsed);
        else setLocalVal(String(Math.round(value)));
    }, [localVal, onChange, value]);

    return (
        <div className="pp-field">
            <label className="pp-label">{label}</label>
            <input
                className="pp-input"
                type="number"
                value={localVal}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    const parsed = parseInt(e.target.value);
                    if (!isNaN(parsed)) onChange(parsed);
                }}
                onBlur={handleCommit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommit();
                    e.stopPropagation();
                }}
            />
        </div>
    );
}

// ── Opacity Slider ──
function OpacitySlider({ value, onChange }: {
    value: number;
    onChange: (v: number) => void;
}) {
    const pct = Math.round(value * 100);
    return (
        <div className="pp-slider-row">
            <input
                className="pp-slider"
                type="range"
                min={0} max={100}
                value={pct}
                onChange={(e) => onChange(parseInt(e.target.value) / 100)}
            />
            <span className="pp-slider-value">{pct} %</span>
        </div>
    );
}
