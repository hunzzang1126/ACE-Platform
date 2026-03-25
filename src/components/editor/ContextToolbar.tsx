// ─────────────────────────────────────────────────
// ContextToolbar — Canva-style floating toolbar for selected elements
// ─────────────────────────────────────────────────
// Appears above the selected element. Shows context-aware controls:
//   - Text: Font family, font size, B/I/U/S, color, alignment, effects
//   - Shape: Fill color, border radius, opacity, effects
//   - Image: Fit mode, opacity
//   - Common: Position, Effects, Animate
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { IcAlignLeft, IcAlignCenterH, IcAlignRight } from '@/components/ui/Icons';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useUIStore } from '@/stores/uiStore';
import type { EngineNode, CanvasEngineActions } from '@/hooks/canvasTypes';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { removeBackgroundFromUrl, blobToDataUrl } from '@/services/backgroundRemovalService';

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

interface Props {
    // Engine node selection
    nodes?: EngineNode[];
    selection?: number[];
    actions?: CanvasEngineActions | null;
    // Overlay selection
    selectedOverlay?: OverlayElement | null;
    onOverlayUpdate?: (id: string, updates: Partial<OverlayElement>) => void;
    // Canvas dimensions for alignment
    canvasWidth?: number;
    canvasHeight?: number;
    // Position relative to canvas
    canvasRect?: DOMRect | null;
}

export function ContextToolbar({
    nodes = [],
    selection = [],
    actions,
    selectedOverlay,
    onOverlayUpdate,
}: Props) {
    const setInlinePanel = useUIStore((s) => s.setInlinePanel);
    const activeInlinePanel = useUIStore((s) => s.activeInlinePanel);

    const selectedNode = nodes.find((n) => selection.includes(n.id));
    const hasOverlay = !!selectedOverlay;
    const hasShape = !!selectedNode;
    const multiSelected = selection.length >= 2;

    const openEffects = useCallback(() => setInlinePanel('effects'), [setInlinePanel]);
    const openAnimate = useCallback(() => setInlinePanel('animate'), [setInlinePanel]);
    const openPosition = useCallback(() => setInlinePanel('position'), [setInlinePanel]);

    // Nothing selected — don't render
    if (!hasOverlay && !hasShape) return null;

    // ── Multi-selection: show Group button ──
    if (multiSelected && actions) {
        return (
            <div className="ctx-toolbar" role="toolbar">
                <button
                    className="ctx-btn ctx-label-btn"
                    onClick={() => actions.groupSelected?.()}
                    title="Group selected elements (Cmd+G)"
                    style={{ fontWeight: 600 }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                        <path d="M10 10h4v4h-4z" strokeDasharray="2 1" />
                    </svg>
                    Make a Group
                </button>
                <div className="ctx-divider" />
                <span style={{ fontSize: 11, color: 'var(--text-muted, #71717a)', padding: '0 4px' }}>
                    {selection.length} selected
                </span>
            </div>
        );
    }

    // ── Shared inline panel buttons ──
    const InlineButtons = () => (
        <>
            <div className="ctx-divider" />
            <button
                className={`ctx-btn ctx-label-btn ${activeInlinePanel === 'effects' ? 'active' : ''}`}
                onClick={openEffects}
                title="Effects"
            >Effects</button>
            <button
                className={`ctx-btn ctx-label-btn ${activeInlinePanel === 'animate' ? 'active' : ''}`}
                onClick={openAnimate}
                title="Animate"
            >Animate</button>
            <button
                className={`ctx-btn ctx-label-btn ${activeInlinePanel === 'position' ? 'active' : ''}`}
                onClick={openPosition}
                title="Position"
            >Position</button>
        </>
    );

    // ── Text overlay selected ──
    if (hasOverlay && selectedOverlay.type === 'text') {
        return (
            <div className="ctx-toolbar" role="toolbar">
                {/* Font Family */}
                <select
                    className="ctx-select ctx-font-select"
                    value={selectedOverlay.fontFamily || 'Inter, sans-serif'}
                    onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { fontFamily: e.target.value })}
                >
                    {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>{f.split(',')[0]}</option>
                    ))}
                </select>

                <div className="ctx-divider" />

                {/* Font Size */}
                <div className="ctx-font-size">
                    <button className="ctx-btn" onClick={() => {
                        const s = (selectedOverlay.fontSize ?? 16) - 1;
                        onOverlayUpdate?.(selectedOverlay.id, { fontSize: Math.max(1, s) });
                    }}>-</button>
                    <input
                        className="ctx-size-input"
                        type="number"
                        value={Math.round(selectedOverlay.fontSize ?? 16)}
                        onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { fontSize: Number(e.target.value) })}
                        min={1}
                        max={999}
                    />
                    <button className="ctx-btn" onClick={() => {
                        const s = (selectedOverlay.fontSize ?? 16) + 1;
                        onOverlayUpdate?.(selectedOverlay.id, { fontSize: Math.min(999, s) });
                    }}>+</button>
                </div>

                <div className="ctx-divider" />

                {/* Text Color */}
                <ColorPicker
                    label=""
                    color={selectedOverlay.color || '#000000'}
                    onChange={(c) => onOverlayUpdate?.(selectedOverlay.id, { color: c })}
                />

                {/* Bold */}
                <button
                    className={`ctx-btn ${(selectedOverlay.fontWeight === '700' || selectedOverlay.fontWeight === 'bold') ? 'active' : ''}`}
                    onClick={() => {
                        const isBold = selectedOverlay.fontWeight === '700' || selectedOverlay.fontWeight === 'bold';
                        onOverlayUpdate?.(selectedOverlay.id, { fontWeight: isBold ? '400' : '700' });
                    }}
                    title="Bold"
                >
                    <strong>B</strong>
                </button>

                <div className="ctx-divider" />

                {/* Alignment */}
                {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                        key={align}
                        className={`ctx-btn ${(selectedOverlay.textAlign || 'left') === align ? 'active' : ''}`}
                        onClick={() => onOverlayUpdate?.(selectedOverlay.id, { textAlign: align })}
                        title={`Align ${align}`}
                    >
                        {align === 'left' && <IcAlignLeft size={14} />}
                        {align === 'center' && <IcAlignCenterH size={14} />}
                        {align === 'right' && <IcAlignRight size={14} />}
                    </button>
                ))}

                <InlineButtons />
            </div>
        );
    }

    // ── Image overlay selected ──
    if (hasOverlay && (selectedOverlay.type === 'image' || selectedOverlay.type === 'video')) {
        return (
            <div className="ctx-toolbar" role="toolbar">
                <select
                    className="ctx-select"
                    value={selectedOverlay.objectFit || 'cover'}
                    onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { objectFit: e.target.value as 'cover' | 'contain' | 'fill' })}
                >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                </select>
                <InlineButtons />
            </div>
        );
    }

    // ── Engine node selected (shape / text / image / path) ──
    if (hasShape && selectedNode && actions) {
        const isTextNode = selectedNode.type === 'text';

        // Fill color for shapes
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

        if (isTextNode) {
            return (
                <div className="ctx-toolbar" role="toolbar">
                    {/* Font Family */}
                    <select
                        className="ctx-select ctx-font-select"
                        value={selectedNode.fontFamily || 'Inter, sans-serif'}
                        onChange={(e) => actions.updateText?.(selectedNode.id, { fontFamily: e.target.value })}
                    >
                        {FONT_FAMILIES.map((f) => (
                            <option key={f} value={f}>{f.split(',')[0]}</option>
                        ))}
                    </select>

                    <div className="ctx-divider" />

                    {/* Font Size */}
                    <div className="ctx-font-size">
                        <button className="ctx-btn" onClick={() => {
                            const s = (selectedNode.fontSize ?? 18) - 1;
                            actions.updateText?.(selectedNode.id, { fontSize: Math.max(1, s) });
                        }}>-</button>
                        <input
                            className="ctx-size-input"
                            type="number"
                            value={Math.round(selectedNode.fontSize ?? 18)}
                            onChange={(e) => actions.updateText?.(selectedNode.id, { fontSize: Number(e.target.value) })}
                            min={1}
                            max={999}
                        />
                        <button className="ctx-btn" onClick={() => {
                            const s = (selectedNode.fontSize ?? 18) + 1;
                            actions.updateText?.(selectedNode.id, { fontSize: Math.min(999, s) });
                        }}>+</button>
                    </div>

                    <div className="ctx-divider" />

                    {/* Text Color */}
                    <ColorPicker
                        label=""
                        color={selectedNode.color || '#000000'}
                        onChange={(c) => actions.updateText?.(selectedNode.id, { color: c })}
                    />

                    {/* Bold */}
                    <button
                        className={`ctx-btn ${(selectedNode.fontWeight === '700' || selectedNode.fontWeight === 'bold') ? 'active' : ''}`}
                        onClick={() => {
                            const isBold = selectedNode.fontWeight === '700' || selectedNode.fontWeight === 'bold';
                            actions.updateText?.(selectedNode.id, { fontWeight: isBold ? '400' : '700' });
                        }}
                        title="Bold"
                    >
                        <strong>B</strong>
                    </button>

                    <div className="ctx-divider" />

                    {/* Alignment */}
                    {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                            key={align}
                            className={`ctx-btn ${(selectedNode.textAlign || 'left') === align ? 'active' : ''}`}
                            onClick={() => actions.updateText?.(selectedNode.id, { textAlign: align })}
                            title={`Align ${align}`}
                        >
                            {align === 'left' && <IcAlignLeft size={14} />}
                            {align === 'center' && <IcAlignCenterH size={14} />}
                            {align === 'right' && <IcAlignRight size={14} />}
                        </button>
                    ))}

                    <InlineButtons />
                </div>
            );
        }

        // Non-text shape node
        return (
            <div className="ctx-toolbar" role="toolbar">
                {selectedNode.type !== 'image' && (
                    <ColorPicker
                        label=""
                        color={currentFillHex}
                        onChange={handleColorChange}
                    />
                )}
                {selectedNode.type === 'image' && selectedNode.src && (
                    <RemoveBgToolbarBtn
                        nodeId={selectedNode.id}
                        imageSrc={selectedNode.src}
                        actions={actions}
                    />
                )}
                <InlineButtons />
            </div>
        );
    }

    return null;
}

// ── Remove Background button for toolbar ──
function RemoveBgToolbarBtn({ nodeId, imageSrc, actions }: { nodeId: number; imageSrc: string; actions: CanvasEngineActions }) {
    const [loading, setLoading] = useState(false);

    const handleRemoveBg = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const resultBlob = await removeBackgroundFromUrl(imageSrc);
            const dataUrl = await blobToDataUrl(resultBlob);
            await actions.replaceImageSrc(nodeId, dataUrl);
        } catch (err) {
            console.error('[RemoveBG] Failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            className="ctx-btn ctx-label-btn"
            onClick={handleRemoveBg}
            disabled={loading}
            title="Remove image background (AI)"
            style={{
                color: loading ? '#a5b4fc' : '#818cf8',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
            }}
        >
            {loading ? (
                <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', marginRight: 4 }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Removing...
                </>
            ) : (
                'Remove BG'
            )}
        </button>
    );
}
