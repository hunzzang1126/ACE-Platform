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
import { Section, ScrubField, PropField, OpacitySlider } from '@/components/panels/PropertyFields';
import { useSizingOverrideStore } from '@/stores/sizingOverrideStore';
import { useEditorStore } from '@/stores/editorStore';
import { useDesignStore } from '@/stores/designStore';
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

                    {/* Letter Spacing */}
                    <ScrubField
                        label="Letter Spacing"
                        value={selectedOverlay.letterSpacing ?? 0}
                        min={-5}
                        max={20}
                        step={0.5}
                        unit="px"
                        onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { letterSpacing: v })}
                    />

                    {/* Line Height */}
                    <ScrubField
                        label="Line Height"
                        value={selectedOverlay.lineHeight ?? 1.4}
                        min={0.5}
                        max={4}
                        step={0.1}
                        unit="x"
                        onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { lineHeight: v })}
                    />
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

    // ── Engine node selected (shape, text, image, path) ──
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

        const nodeTitle = selectedNode.name
            || (selectedNode.type === 'text' ? 'Text'
                : selectedNode.type === 'image' ? 'Image'
                    : selectedNode.type === 'path' ? 'Path'
                        : selectedNode.type === 'ellipse' ? 'Ellipse'
                            : selectedNode.type === 'rounded_rect' ? 'Rounded Rect'
                                : 'Rectangle');

        const isTextNode = selectedNode.type === 'text';

        return (
            <aside className="pp-root">
                <div className="pp-header">
                    <span className="pp-title">{nodeTitle}</span>
                    <span className="pp-subtitle">ID: {selectedNode.id}</span>
                </div>

                {/* Typography — text nodes only */}
                {isTextNode && (
                    <Section label="Typography">
                        <select
                            className="pp-select"
                            value={selectedNode.fontFamily || 'Inter, sans-serif'}
                            onChange={(e) => actions.updateText?.(selectedNode.id, { fontFamily: e.target.value })}
                        >
                            {FONT_FAMILIES.map((f) => (
                                <option key={f} value={f}>{f.split(',')[0]}</option>
                            ))}
                        </select>

                        <select
                            className="pp-select"
                            value={selectedNode.fontWeight || '400'}
                            onChange={(e) => actions.updateText?.(selectedNode.id, { fontWeight: e.target.value })}
                        >
                            {FONT_WEIGHTS.map((fw) => (
                                <option key={fw.value} value={fw.value}>{fw.label}</option>
                            ))}
                        </select>

                        <ScrubField
                            label="Font Size"
                            value={selectedNode.fontSize ?? 18}
                            min={1}
                            max={999}
                            unit="px"
                            onChange={(v) => actions.updateText?.(selectedNode.id, { fontSize: v })}
                        />

                        <ColorPicker
                            label="Text Color"
                            color={selectedNode.color || '#000000'}
                            onChange={(c) => actions.updateText?.(selectedNode.id, { color: c })}
                        />

                        <div className="pp-align-row">
                            {(['left', 'center', 'right'] as const).map((align) => (
                                <button
                                    key={align}
                                    className={`pp-align-btn ${(selectedNode.textAlign || 'left') === align ? 'active' : ''}`}
                                    onClick={() => actions.updateText?.(selectedNode.id, { textAlign: align })}
                                >
                                    {align === 'left' && <IcAlignLeft size={14} />}
                                    {align === 'center' && <IcAlignCenterH size={14} />}
                                    {align === 'right' && <IcAlignRight size={14} />}
                                </button>
                            ))}
                        </div>

                        {/* Letter Spacing */}
                        <ScrubField
                            label="Letter Spacing"
                            value={selectedNode.letterSpacing ?? 0}
                            min={-10}
                            max={40}
                            step={0.5}
                            unit="px"
                            onChange={(v) => actions.updateText?.(selectedNode.id, { letterSpacing: v })}
                        />

                        {/* Line Height */}
                        <ScrubField
                            label="Line Height"
                            value={selectedNode.lineHeight ?? 1.4}
                            min={0.5}
                            max={4}
                            step={0.05}
                            unit="×"
                            onChange={(v) => actions.updateText?.(selectedNode.id, { lineHeight: v })}
                        />
                    </Section>
                )}

                {/* Fill Color — shapes only */}
                {!isTextNode && selectedNode.type !== 'image' && (
                    <Section label="Fill">
                        <ColorPicker
                            label="Color"
                            color={currentFillHex}
                            onChange={handleColorChange}
                        />
                    </Section>
                )}

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

                {/* Smart Sizing — override controls */}
                <SmartSizingSection elementId={String(selectedNode.id)} />
            </aside>
        );
    }

    return null;
}

// ── Smart Sizing section — per-element override controls ──
function SmartSizingSection({ elementId }: { elementId: string }) {
    const activeVariant = useEditorStore(s => s.activeVariantId);
    const creativeSet = useDesignStore(s => s.creativeSet);
    const isMaster = creativeSet ? activeVariant === creativeSet.masterVariantId : false;
    const variantId = activeVariant ?? '';

    const hasOverride = useSizingOverrideStore(s => s.hasOverride(variantId, elementId));
    const isLocked = useSizingOverrideStore(s => s.isLocked(variantId, elementId));
    const lockElement = useSizingOverrideStore(s => s.lockElement);
    const unlockElement = useSizingOverrideStore(s => s.unlockElement);
    const resetToMaster = useSizingOverrideStore(s => s.resetToMaster);
    const overrideCount = useSizingOverrideStore(s => s.getOverrideCount(variantId));

    // Master has no override concept
    if (isMaster) {
        return (
            <Section label="Smart Sizing">
                <div style={{ fontSize: 11, color: '#8b949e', padding: '2px 0' }}>
                    This is the master variant. Edits here propagate to all sizes.
                </div>
                {overrideCount > 0 && (
                    <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 4 }}>
                        {overrideCount} element{overrideCount !== 1 ? 's' : ''} overridden in other variants
                    </div>
                )}
            </Section>
        );
    }

    return (
        <Section label="Smart Sizing">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Override badge */}
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: hasOverride ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.12)',
                    color: hasOverride ? '#fbbf24' : '#4ade80',
                    border: `1px solid ${hasOverride ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.2)'}`,
                }}>
                    {hasOverride ? 'OVERRIDDEN' : 'SYNCED'}
                </span>

                {/* Lock toggle */}
                <button
                    onClick={() => isLocked ? unlockElement(variantId, elementId) : lockElement(variantId, elementId)}
                    title={isLocked ? 'Unlock: Resume master sync' : 'Lock: Prevent master sync'}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: isLocked ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isLocked ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 4, padding: '2px 8px', color: isLocked ? '#f87171' : '#8b949e',
                        fontSize: 10, fontWeight: 500, cursor: 'pointer',
                    }}
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isLocked ? (
                            <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>
                        ) : (
                            <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 019.9-1" /></>
                        )}
                    </svg>
                    {isLocked ? 'Locked' : 'Unlocked'}
                </button>
            </div>

            {/* Reset to master */}
            {hasOverride && (
                <button
                    onClick={() => resetToMaster(variantId, elementId)}
                    style={{
                        marginTop: 6, width: '100%', padding: '4px 0',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 4, color: '#8b949e', fontSize: 10, cursor: 'pointer',
                    }}
                >
                    Reset to Master
                </button>
            )}
        </Section>
    );
}
