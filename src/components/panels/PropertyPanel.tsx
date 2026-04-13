// ─────────────────────────────────────────────────
// PropertyPanel – Context-aware property inspector
// ─────────────────────────────────────────────────
// Sub-components → PropertyPanelSections.tsx
// ─────────────────────────────────────────────────

import { useCallback } from 'react';
import { IcAlignLeft, IcAlignCenterH, IcAlignRight, IcAlignTop, IcAlignCenterV, IcAlignBottom } from '@/components/ui/Icons';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { EffectsSection } from '@/components/panels/EffectsSection';
import { Section, ScrubField, PropField, OpacitySlider } from '@/components/panels/PropertyFields';
import type { EngineNode, CanvasEngineActions } from '@/hooks/useCanvasEngine';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { FONT_FAMILIES, FONT_WEIGHTS, RemoveBgButton, FillToPageButton, SmartSizingSection } from './PropertyPanelSections';
import { useAppI18n } from '@/i18n';

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
    const { t } = useAppI18n();

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

    if (!hasOverlay && !hasShape) {
        return (<div className="pp-empty"><p>{t('editor.selectElement')}</p></div>);
    }

    // ── Text overlay ──
    if (hasOverlay && selectedOverlay.type === 'text') {
        return (
            <aside className="pp-root">
                <div className="pp-header"><span className="pp-title">{t('editor.text')}</span></div>
                <Section label={t('editor.typography')}>
                    <select className="pp-select" value={selectedOverlay.fontFamily || 'Inter, sans-serif'} onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { fontFamily: e.target.value })}>
                        {FONT_FAMILIES.map((f) => (<option key={f} value={f}>{f.split(',')[0]}</option>))}
                    </select>
                    <select className="pp-select" value={selectedOverlay.fontWeight || '400'} onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { fontWeight: e.target.value })}>
                        {FONT_WEIGHTS.map((fw) => (<option key={fw.value} value={fw.value}>{fw.label}</option>))}
                    </select>
                    <ScrubField label={t('editor.fontSize')} value={selectedOverlay.fontSize ?? 16} min={1} max={999} unit="px" onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { fontSize: v })} />
                    <ColorPicker label={t('editor.color')} color={selectedOverlay.color || '#ffffff'} onChange={(c) => onOverlayUpdate?.(selectedOverlay.id, { color: c })} />
                    <div className="pp-align-row">
                        {(['left', 'center', 'right'] as const).map((align) => (
                            <button key={align} className={`pp-align-btn ${(selectedOverlay.textAlign || 'left') === align ? 'active' : ''}`} onClick={() => onOverlayUpdate?.(selectedOverlay.id, { textAlign: align })}>
                                {align === 'left' && <IcAlignLeft size={14} />}{align === 'center' && <IcAlignCenterH size={14} />}{align === 'right' && <IcAlignRight size={14} />}
                            </button>
                        ))}
                    </div>
                    <ScrubField label={t('editor.letterSpacing')} value={selectedOverlay.letterSpacing ?? 0} min={-5} max={20} step={0.5} unit="px" onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { letterSpacing: v })} />
                    <ScrubField label={t('editor.lineHeight')} value={selectedOverlay.lineHeight ?? 1.4} min={0.5} max={4} step={0.1} unit="x" onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { lineHeight: v })} />
                </Section>
                <AlignmentSection onAlign={alignOverlay} />
                <Section label={t('editor.opacity')}><OpacitySlider value={selectedOverlay.opacity} onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { opacity: v })} /></Section>
            </aside>
        );
    }

    // ── Image overlay ──
    if (hasOverlay && selectedOverlay.type === 'image') {
        return (
            <aside className="pp-root">
                <div className="pp-header"><span className="pp-title">{t('editor.image')}</span><span className="pp-subtitle">{selectedOverlay.fileName || t('editor.untitled')}</span></div>
                <Section label={t('editor.fitMode')}>
                    <select className="pp-select" value={selectedOverlay.objectFit || 'cover'} onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { objectFit: e.target.value as 'cover' | 'contain' | 'fill' })}>
                        <option value="cover">{t('editor.cover')}</option><option value="contain">{t('editor.contain')}</option><option value="fill">{t('editor.fillMode')}</option>
                    </select>
                </Section>
                <RemoveBgButton imageSrc={selectedOverlay.src} onResult={(dataUrl) => onOverlayUpdate?.(selectedOverlay.id, { src: dataUrl })} />
                <AlignmentSection onAlign={alignOverlay} />
                <Section label={t('editor.opacity')}><OpacitySlider value={selectedOverlay.opacity} onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { opacity: v })} /></Section>
            </aside>
        );
    }

    // ── Video overlay ──
    if (hasOverlay && selectedOverlay.type === 'video') {
        return (
            <aside className="pp-root">
                <div className="pp-header"><span className="pp-title">{t('editor.video')}</span><span className="pp-subtitle">{selectedOverlay.fileName || t('editor.untitled')}</span></div>
                <Section label={t('editor.fitMode')}>
                    <select className="pp-select" value={selectedOverlay.objectFit || 'cover'} onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { objectFit: e.target.value as 'cover' | 'contain' | 'fill' })}>
                        <option value="cover">{t('editor.cover')}</option><option value="contain">{t('editor.contain')}</option><option value="fill">{t('editor.fillMode')}</option>
                    </select>
                </Section>
                <Section label={t('editor.playback')}>
                    <div className="pp-row" style={{ gap: 8 }}>
                        <label className="pp-checkbox-label"><input type="checkbox" checked={selectedOverlay.muted ?? true} onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { muted: e.target.checked })} /> {t('editor.muted')}</label>
                        <label className="pp-checkbox-label"><input type="checkbox" checked={selectedOverlay.loop ?? true} onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { loop: e.target.checked })} /> {t('editor.loop')}</label>
                        <label className="pp-checkbox-label"><input type="checkbox" checked={selectedOverlay.autoplay ?? true} onChange={(e) => onOverlayUpdate?.(selectedOverlay.id, { autoplay: e.target.checked })} /> {t('editor.autoplay')}</label>
                    </div>
                </Section>
                <AlignmentSection onAlign={alignOverlay} />
                <Section label={t('editor.opacity')}><OpacitySlider value={selectedOverlay.opacity} onChange={(v) => onOverlayUpdate?.(selectedOverlay.id, { opacity: v })} /></Section>
            </aside>
        );
    }

    // ── Engine node (shape, text, image, path) ──
    if (hasShape && selectedNode && actions) {
        const fillR = selectedNode.fill_r ?? 0.5, fillG = selectedNode.fill_g ?? 0.5, fillB = selectedNode.fill_b ?? 0.5;
        const currentFillHex = `#${[fillR, fillG, fillB].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
        const handleColorChange = (hex: string) => { const r = parseInt(hex.slice(1, 3), 16) / 255; const g = parseInt(hex.slice(3, 5), 16) / 255; const b = parseInt(hex.slice(5, 7), 16) / 255; actions.setFillColor(selectedNode.id, r, g, b, 1.0); };
        const nodeTitle = selectedNode.name || (selectedNode.type === 'text' ? t('editor.text') : selectedNode.type === 'image' ? t('editor.image') : selectedNode.type === 'path' ? t('editor.path') : selectedNode.type === 'ellipse' ? t('editor.ellipse') : selectedNode.type === 'rounded_rect' ? t('editor.roundedRect') : t('editor.rectangle'));
        const isTextNode = selectedNode.type === 'text';

        return (
            <aside className="pp-root">
                <div className="pp-header"><span className="pp-title">{nodeTitle}</span><span className="pp-subtitle">ID: {selectedNode.id}</span></div>
                {isTextNode && (
                    <Section label={t('editor.typography')}>
                        <select className="pp-select" value={selectedNode.fontFamily || 'Inter, sans-serif'} onChange={(e) => actions.updateText?.(selectedNode.id, { fontFamily: e.target.value })}>{FONT_FAMILIES.map((f) => (<option key={f} value={f}>{f.split(',')[0]}</option>))}</select>
                        <select className="pp-select" value={selectedNode.fontWeight || '400'} onChange={(e) => actions.updateText?.(selectedNode.id, { fontWeight: e.target.value })}>{FONT_WEIGHTS.map((fw) => (<option key={fw.value} value={fw.value}>{fw.label}</option>))}</select>
                        <ScrubField label={t('editor.fontSize')} value={selectedNode.fontSize ?? 18} min={1} max={999} unit="px" onChange={(v) => actions.updateText?.(selectedNode.id, { fontSize: v })} />
                        <ColorPicker label={t('editor.textColor')} color={selectedNode.color || '#000000'} onChange={(c) => actions.updateText?.(selectedNode.id, { color: c })} />
                        <div className="pp-align-row">{(['left', 'center', 'right'] as const).map((align) => (<button key={align} className={`pp-align-btn ${(selectedNode.textAlign || 'left') === align ? 'active' : ''}`} onClick={() => actions.updateText?.(selectedNode.id, { textAlign: align })}>{align === 'left' && <IcAlignLeft size={14} />}{align === 'center' && <IcAlignCenterH size={14} />}{align === 'right' && <IcAlignRight size={14} />}</button>))}</div>
                        <ScrubField label={t('editor.letterSpacing')} value={selectedNode.letterSpacing ?? 0} min={-10} max={40} step={0.5} unit="px" onChange={(v) => actions.updateText?.(selectedNode.id, { letterSpacing: v })} />
                        <ScrubField label={t('editor.lineHeight')} value={selectedNode.lineHeight ?? 1.4} min={0.5} max={4} step={0.05} unit="×" onChange={(v) => actions.updateText?.(selectedNode.id, { lineHeight: v })} />
                    </Section>
                )}
                {!isTextNode && selectedNode.type !== 'image' && (<Section label={t('editor.fill')}><ColorPicker label={t('editor.color')} color={currentFillHex} onChange={handleColorChange} /></Section>)}
                {selectedNode.type === 'image' && (
                    <>
                        <FillToPageButton
                            nodeId={selectedNode.id}
                            nodeW={selectedNode.w}
                            nodeH={selectedNode.h}
                            naturalWidth={selectedNode.naturalWidth}
                            naturalHeight={selectedNode.naturalHeight}
                            canvasWidth={canvasWidth}
                            canvasHeight={canvasHeight}
                            onSetPosition={actions.setNodePosition}
                            onSetSize={actions.setNodeSize}
                        />
                        <RemoveBgButton imageSrc={(selectedNode as any).src || (selectedNode as any).image_url} onResult={(dataUrl) => { (actions as any).replaceImageSrc?.(selectedNode.id, dataUrl); }} />
                    </>
                )}
                <Section label={t('editor.alignToCanvas')}>
                    <div className="pp-align-row">
                        <button className="pp-align-btn" title="Left" onClick={() => actions.alignToCanvas(selectedNode.id, 'left')}><IcAlignLeft size={14} /></button>
                        <button className="pp-align-btn" title="Center H" onClick={() => actions.alignToCanvas(selectedNode.id, 'center-h')}><IcAlignCenterH size={14} /></button>
                        <button className="pp-align-btn" title="Right" onClick={() => actions.alignToCanvas(selectedNode.id, 'right')}><IcAlignRight size={14} /></button>
                        <button className="pp-align-btn" title="Top" onClick={() => actions.alignToCanvas(selectedNode.id, 'top')}><IcAlignTop size={14} /></button>
                        <button className="pp-align-btn" title="Center V" onClick={() => actions.alignToCanvas(selectedNode.id, 'center-v')}><IcAlignCenterV size={14} /></button>
                        <button className="pp-align-btn" title="Bottom" onClick={() => actions.alignToCanvas(selectedNode.id, 'bottom')}><IcAlignBottom size={14} /></button>
                    </div>
                </Section>
                <Section label={t('editor.transform')}>
                    <div className="pp-row">
                        <PropField label="X" value={selectedNode.x} onChange={(v) => actions.setNodePosition(selectedNode.id, v, selectedNode.y)} />
                        <PropField label="Y" value={selectedNode.y} onChange={(v) => actions.setNodePosition(selectedNode.id, selectedNode.x, v)} />
                    </div>
                    <div className="pp-row">
                        <PropField label="W" value={selectedNode.w} onChange={(v) => actions.setNodeSize(selectedNode.id, v, selectedNode.h)} />
                        <PropField label="H" value={selectedNode.h} onChange={(v) => actions.setNodeSize(selectedNode.id, selectedNode.w, v)} />
                    </div>
                </Section>
                <Section label={t('editor.opacity')}><OpacitySlider value={selectedNode.opacity} onChange={(v) => actions.setNodeOpacity(selectedNode.id, v)} /></Section>
                <EffectsSection nodeId={selectedNode.id} actions={actions} />
                <SmartSizingSection elementId={String(selectedNode.id)} />
            </aside>
        );
    }

    return null;
}

// ── Shared Canvas Alignment Section ──
function AlignmentSection({ onAlign }: { onAlign: (dir: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void }) {
    const { t } = useAppI18n();
    return (
        <Section label={t('editor.canvasAlignment')}>
            <div className="pp-align-row">
                <button className="pp-align-btn" title="Left" onClick={() => onAlign('left')}><IcAlignLeft size={14} /></button>
                <button className="pp-align-btn" title="Center H" onClick={() => onAlign('center-h')}><IcAlignCenterH size={14} /></button>
                <button className="pp-align-btn" title="Right" onClick={() => onAlign('right')}><IcAlignRight size={14} /></button>
                <button className="pp-align-btn" title="Top" onClick={() => onAlign('top')}><IcAlignTop size={14} /></button>
                <button className="pp-align-btn" title="Center V" onClick={() => onAlign('center-v')}><IcAlignCenterV size={14} /></button>
                <button className="pp-align-btn" title="Bottom" onClick={() => onAlign('bottom')}><IcAlignBottom size={14} /></button>
            </div>
        </Section>
    );
}
