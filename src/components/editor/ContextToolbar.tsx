// ─────────────────────────────────────────────────
// ContextToolbar — Canva-style floating toolbar for selected elements
// ─────────────────────────────────────────────────
// Constants → contextToolbarConstants.ts
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';
import { IcAlignLeft, IcAlignCenterH, IcAlignRight, IcAlignTop, IcAlignCenterV, IcAlignBottom } from '@/components/ui/Icons';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useUIStore } from '@/stores/uiStore';
import type { EngineNode, CanvasEngineActions } from '@/hooks/canvasTypes';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { removeBackgroundFromUrl, blobToDataUrl } from '@/services/backgroundRemovalService';
import { FONT_FAMILIES } from './contextToolbarConstants';
import type { AlignDirection } from '@/engines/alignElements';
import { FontPicker } from './FontPicker';

// ── Inline AI Replace (compact prompt in toolbar) ──
function AiReplaceInline({ onReplace, w, h }: { onReplace: (url: string) => void; w: number; h: number }) {
    const [open, setOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGo = async () => {
        const trimmed = prompt.trim();
        if (!trimmed || loading) return;
        setLoading(true);
        try {
            const { generateBackgroundImage } = await import('@/services/imageGenClient');
            const result = await generateBackgroundImage(trimmed, Math.max(w, 256), Math.max(h, 256), [], new AbortController().signal);
            if (result.success && result.imageUrl) {
                onReplace(result.imageUrl);
                setPrompt(''); setOpen(false);
            }
        } catch (err) { console.error('[AiReplace]', err); }
        finally { setLoading(false); }
    };

    if (!open) return (
        <button className="ctx-btn ctx-label-btn" onClick={() => setOpen(true)} title="AI Replace Image" style={{ color: '#2dd4bf', fontWeight: 600 }}>AI Replace</button>
    );

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
                autoFocus type="text" value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleGo(); if (e.key === 'Escape') { setOpen(false); setPrompt(''); } e.stopPropagation(); }}
                placeholder="Describe..."
                disabled={loading}
                style={{
                    width: 140, padding: '3px 8px',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(45,212,191,0.4)',
                    borderRadius: 4, color: '#e2e8f0', fontSize: 11, outline: 'none', fontFamily: 'inherit',
                }}
            />
            <button className="ctx-btn" onClick={handleGo} disabled={loading || !prompt.trim()} style={{ color: '#2dd4bf', fontWeight: 600, fontSize: 11 }}>
                {loading ? '...' : 'Go'}
            </button>
            <button className="ctx-btn" onClick={() => { setOpen(false); setPrompt(''); }} style={{ fontSize: 11, color: '#71717a' }}>x</button>
        </div>
    );
}

// ── ScrubInput: icon + number input with drag-to-scrub ──
function ScrubInput({ icon, value, min, max, step = 1, title, onChange }: {
    icon: React.ReactNode; value: number; min: number; max: number;
    step?: number; title?: string; onChange: (v: number) => void;
}) {
    const isDecimal = step < 1;
    const fmt = (v: number) => isDecimal ? v.toFixed(1) : String(Math.round(v));
    const [localVal, setLocalVal] = useState(fmt(value));
    const [isFocused, setIsFocused] = useState(false);
    const scrubbing = useRef(false);
    const scrubStartX = useRef(0);
    const scrubStartVal = useRef(0);

    useEffect(() => { if (!isFocused && !scrubbing.current) setLocalVal(fmt(value)); }, [value, isFocused]);

    const commit = useCallback(() => {
        setIsFocused(false);
        const p = parseFloat(localVal);
        if (!isNaN(p) && p >= min && p <= max) onChange(p);
        else setLocalVal(fmt(value));
    }, [localVal, onChange, value, min, max]);

    const handleScrub = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        scrubbing.current = true;
        scrubStartX.current = e.clientX;
        scrubStartVal.current = value;
        const move = (ev: MouseEvent) => {
            if (!scrubbing.current) return;
            const dx = ev.clientX - scrubStartX.current;
            const raw = scrubStartVal.current + dx * step;
            const snapped = Math.round(raw / step) * step;
            const nv = Math.min(max, Math.max(min, snapped));
            setLocalVal(fmt(nv));
            onChange(nv);
        };
        const up = () => {
            scrubbing.current = false;
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    }, [value, min, max, step, onChange]);

    return (
        <div className="ctx-font-size" title={title}>
            <span onMouseDown={handleScrub} style={{ cursor: 'ew-resize', display: 'flex', alignItems: 'center' }}>{icon}</span>
            <input className="ctx-size-input" type="number" min={min} max={max} step={step}
                value={localVal} style={{ width: 36 }}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => { setLocalVal(e.target.value); const p = parseFloat(e.target.value); if (!isNaN(p) && p >= min && p <= max) onChange(p); }}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(); e.stopPropagation(); }}
            />
        </div>
    );
}

interface Props {
    nodes?: EngineNode[];
    selection?: number[];
    actions?: CanvasEngineActions | null;
    selectedOverlay?: OverlayElement | null;
    onOverlayUpdate?: (id: string, updates: Partial<OverlayElement>) => void;
    canvasWidth?: number;
    canvasHeight?: number;
    canvasRect?: DOMRect | null;
}

// ── Shared text toolbar section ──
function TextControls({ fontFamily, fontSize, color, fontWeight, textAlign, lineHeight, letterSpacing, onUpdate }: {
    fontFamily: string; fontSize: number; color: string; fontWeight?: string; textAlign?: string; lineHeight: number; letterSpacing: number;
    onUpdate: (updates: Record<string, unknown>) => void;
}) {
    const isBold = fontWeight === '700' || fontWeight === 'bold';
    return (
        <>
            <FontPicker value={fontFamily} onChange={v => onUpdate({ fontFamily: v })} />
            <div className="ctx-divider" />
            <div className="ctx-font-size">
                <button className="ctx-btn" onClick={() => onUpdate({ fontSize: Math.max(1, fontSize - 1) })}>-</button>
                <input className="ctx-size-input" type="number" value={Math.round(fontSize)} onChange={e => onUpdate({ fontSize: Number(e.target.value) })} min={1} max={999} />
                <button className="ctx-btn" onClick={() => onUpdate({ fontSize: Math.min(999, fontSize + 1) })}>+</button>
            </div>
            <div className="ctx-divider" />
            <ColorPicker label="" color={color} onChange={c => onUpdate({ color: c })} />
            <button className={`ctx-btn ${isBold ? 'active' : ''}`} onClick={() => onUpdate({ fontWeight: isBold ? '400' : '700' })} title="Bold"><strong>B</strong></button>
            <div className="ctx-divider" />
            {(['left', 'center', 'right'] as const).map(align => (
                <button key={align} className={`ctx-btn ${(textAlign || 'left') === align ? 'active' : ''}`} onClick={() => onUpdate({ textAlign: align })} title={`Align ${align}`}>
                    {align === 'left' && <IcAlignLeft size={14} />}
                    {align === 'center' && <IcAlignCenterH size={14} />}
                    {align === 'right' && <IcAlignRight size={14} />}
                </button>
            ))}
            <div className="ctx-divider" />
            <ScrubInput icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5, flexShrink: 0 }}><path d="M21 10H3M21 14H3M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" /></svg>} value={lineHeight} min={0.5} max={4} step={0.1} title="Line Height — drag icon to adjust" onChange={v => onUpdate({ lineHeight: v })} />
            <ScrubInput icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5, flexShrink: 0 }}><path d="M7 8h10M5 12H1M23 12h-4M7 16h10M11 4l-4 16M17 4l-4 16" /></svg>} value={letterSpacing} min={-10} max={40} step={0.5} title="Letter Spacing — drag icon to adjust" onChange={v => onUpdate({ letterSpacing: v })} />
        </>
    );
}

export function ContextToolbar({ nodes = [], selection = [], actions, selectedOverlay, onOverlayUpdate }: Props) {
    const setInlinePanel = useUIStore(s => s.setInlinePanel);
    const activeInlinePanel = useUIStore(s => s.activeInlinePanel);
    const selectedNode = nodes.find(n => selection.includes(n.id));
    const hasOverlay = !!selectedOverlay;
    const hasShape = !!selectedNode;
    const multiSelected = selection.length >= 2;

    const InlineButtons = () => (
        <>
            <div className="ctx-divider" />
            <button className={`ctx-btn ctx-label-btn ${activeInlinePanel === 'effects' ? 'active' : ''}`} onClick={() => setInlinePanel('effects')} title="Effects">Effects</button>
            <button className={`ctx-btn ctx-label-btn ${activeInlinePanel === 'animate' ? 'active' : ''}`} onClick={() => setInlinePanel('animate')} title="Animate">Animate</button>
            <button className={`ctx-btn ctx-label-btn ${activeInlinePanel === 'position' ? 'active' : ''}`} onClick={() => setInlinePanel('position')} title="Position">Position</button>
            <div className="ctx-divider" />
            <button className="ctx-btn ctx-delete-btn" onClick={() => actions?.deleteSelected()} title="Delete element">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
            </button>
        </>
    );

    if (!hasOverlay && !hasShape) return null;

    if (multiSelected && actions) return (
        <div className="ctx-toolbar" role="toolbar">
            <span style={{ fontSize: 11, color: 'var(--text-muted, #71717a)', padding: '0 4px' }}>{selection.length} selected</span>
            <div className="ctx-divider" />
            {/* Align to each other */}
            {(['left', 'center-h', 'right', 'top', 'center-v', 'bottom'] as AlignDirection[]).map(dir => (
                <button key={dir} className="ctx-btn" onClick={() => actions.alignElements(selection, dir)} title={`Align ${dir}`}>
                    {dir === 'left' && <IcAlignLeft size={13} />}
                    {dir === 'center-h' && <IcAlignCenterH size={13} />}
                    {dir === 'right' && <IcAlignRight size={13} />}
                    {dir === 'top' && <IcAlignTop size={13} />}
                    {dir === 'center-v' && <IcAlignCenterV size={13} />}
                    {dir === 'bottom' && <IcAlignBottom size={13} />}
                </button>
            ))}
            <div className="ctx-divider" />
            {/* Distribute */}
            <button className="ctx-btn" onClick={() => actions.alignElements(selection, 'distribute-h')} title="Distribute horizontally">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="4" y2="20" /><line x1="20" y1="4" x2="20" y2="20" /><rect x="9" y="7" width="6" height="10" rx="1" /></svg>
            </button>
            <button className="ctx-btn" onClick={() => actions.alignElements(selection, 'distribute-v')} title="Distribute vertically">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="20" y2="4" /><line x1="4" y1="20" x2="20" y2="20" /><rect x="7" y="9" width="10" height="6" rx="1" /></svg>
            </button>
            <div className="ctx-divider" />
            <button className="ctx-btn ctx-delete-btn" onClick={() => actions.deleteSelected()} title="Delete selected">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
            </button>
        </div>
    );

    // ── Overlay text ──
    if (hasOverlay && selectedOverlay.type === 'text') return (
        <div className="ctx-toolbar" role="toolbar">
            <TextControls fontFamily={selectedOverlay.fontFamily || 'Inter, sans-serif'} fontSize={selectedOverlay.fontSize ?? 16} color={selectedOverlay.color || '#000000'} fontWeight={selectedOverlay.fontWeight} textAlign={selectedOverlay.textAlign} lineHeight={selectedOverlay.lineHeight ?? 1.4} letterSpacing={selectedOverlay.letterSpacing ?? 0} onUpdate={u => onOverlayUpdate?.(selectedOverlay.id, u as Partial<OverlayElement>)} />
            <InlineButtons />
        </div>
    );

    // ── Overlay image/video ──
    if (hasOverlay && (selectedOverlay.type === 'image' || selectedOverlay.type === 'video')) return (
        <div className="ctx-toolbar" role="toolbar">
            <select className="ctx-select" value={selectedOverlay.objectFit || 'cover'} onChange={e => onOverlayUpdate?.(selectedOverlay.id, { objectFit: e.target.value as 'cover' | 'contain' | 'fill' })}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select>
            {selectedOverlay.type === 'image' && (
                <AiReplaceInline w={selectedOverlay.w} h={selectedOverlay.h} onReplace={(url) => onOverlayUpdate?.(selectedOverlay.id, { src: url })} />
            )}
            <InlineButtons />
        </div>
    );

    // ── Engine node ──
    if (hasShape && selectedNode && actions) {
        const fillHex = `#${[selectedNode.fill_r ?? 0.5, selectedNode.fill_g ?? 0.5, selectedNode.fill_b ?? 0.5].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
        const handleColorChange = (hex: string) => { const r = parseInt(hex.slice(1, 3), 16) / 255; const g = parseInt(hex.slice(3, 5), 16) / 255; const b = parseInt(hex.slice(5, 7), 16) / 255; actions.setFillColor(selectedNode.id, r, g, b, 1.0); };

        if (selectedNode.type === 'text') return (
            <div className="ctx-toolbar" role="toolbar">
                <TextControls fontFamily={selectedNode.fontFamily || 'Inter, sans-serif'} fontSize={selectedNode.fontSize ?? 18} color={selectedNode.color || '#000000'} fontWeight={selectedNode.fontWeight} textAlign={selectedNode.textAlign} lineHeight={selectedNode.lineHeight ?? 1.4} letterSpacing={selectedNode.letterSpacing ?? 0} onUpdate={u => actions.updateText?.(selectedNode.id, u)} />
                <InlineButtons />
            </div>
        );

        return (
            <div className="ctx-toolbar" role="toolbar">
                {selectedNode.type !== 'image' && <ColorPicker label="" color={fillHex} onChange={handleColorChange} />}
                {selectedNode.type === 'image' && selectedNode.src && <RemoveBgToolbarBtn nodeId={selectedNode.id} imageSrc={selectedNode.src} actions={actions} />}
                {selectedNode.type === 'image' && <FillToPageToolbarBtn nodeId={selectedNode.id} actions={actions} />}
                {selectedNode.type === 'image' && (
                    <AiReplaceInline w={selectedNode.w} h={selectedNode.h} onReplace={async (url) => {
                        actions.deleteNode(selectedNode.id);
                        await actions.addImage(selectedNode.x, selectedNode.y, url, selectedNode.w, selectedNode.h);
                    }} />
                )}
                <InlineButtons />
            </div>
        );
    }

    return null;
}

function RemoveBgToolbarBtn({ nodeId, imageSrc, actions }: { nodeId: number; imageSrc: string; actions: CanvasEngineActions }) {
    const [loading, setLoading] = useState(false);
    const handleRemoveBg = async () => {
        if (loading) return;
        setLoading(true);
        try { const blob = await removeBackgroundFromUrl(imageSrc); await actions.replaceImageSrc(nodeId, await blobToDataUrl(blob)); }
        catch (err) { console.error('[RemoveBG] Failed:', err); }
        finally { setLoading(false); }
    };
    return (
        <button className="ctx-btn ctx-label-btn" onClick={handleRemoveBg} disabled={loading} title="Remove image background (AI)" style={{ color: loading ? '#a5b4fc' : '#818cf8', fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? (<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', marginRight: 4 }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Removing...</>) : 'Remove BG'}
        </button>
    );
}

function FillToPageToolbarBtn({ nodeId, actions }: { nodeId: number; actions: CanvasEngineActions }) {
    return (
        <button
            className="ctx-btn ctx-label-btn"
            onClick={() => actions.fillToPage(nodeId)}
            title="Scale image to fill the entire canvas"
            style={{ color: '#22c55e', fontWeight: 600, cursor: 'pointer' }}
        >
            Fill to Page
        </button>
    );
}
