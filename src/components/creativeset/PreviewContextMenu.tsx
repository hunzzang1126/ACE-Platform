// ─────────────────────────────────────────────────
// PreviewContextMenu — Right-click context menu for preview cards
// ─────────────────────────────────────────────────

import { useCallback, useEffect } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import { useDesignStore } from '@/stores/designStore';
import { downloadDataURL } from './previewRenderer';
import { renderVariantWithFabric } from './fabricHeadlessRenderer';
import { exportVariantToMp4, downloadBlob } from '@/engine/fabricVideoExporter';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';

interface ContextMenuState {
    x: number;
    y: number;
    variantId: string;
}

interface Props {
    ctxMenu: ContextMenuState | null;
    onClose: () => void;
    variants: BannerVariant[];
    visibleVariants: BannerVariant[];
    selectedIds: Set<string>;
    plugConnections: Record<string, any>;
    onDoubleClick: (id: string) => void;
    onClearSelection: () => void;
    onExportAll: () => void;
    onExportSelected: () => void;
}

export function PreviewContextMenu({
    ctxMenu, onClose, variants, selectedIds,
    plugConnections, onDoubleClick, onClearSelection,
}: Props) {
    // Close on any click
    useEffect(() => {
        if (!ctxMenu) return;
        const handler = () => onClose();
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [ctxMenu, onClose]);

    if (!ctxMenu) return null;

    return (
        <div
            className="banner-ctx-menu"
            style={{
                position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 10000,
                background: '#1e2231', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '4px 0', minWidth: 220,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Export — cascading submenu */}
            <div
                style={{ position: 'relative' }}
                onMouseEnter={(e) => {
                    const sub = (e.currentTarget as HTMLElement).querySelector('.banner-ctx-sub') as HTMLElement;
                    if (sub) sub.style.display = 'block';
                }}
                onMouseLeave={(e) => {
                    const sub = (e.currentTarget as HTMLElement).querySelector('.banner-ctx-sub') as HTMLElement;
                    if (sub) sub.style.display = 'none';
                }}
            >
                <button className="banner-ctx-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Export</span>
                    <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 12 }}>&#9654;</span>
                </button>
                <div
                    className="banner-ctx-sub"
                    style={{
                        display: 'none',
                        position: 'absolute', left: '100%', top: -4,
                        background: '#1e2231', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '4px 0', minWidth: 180,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                >
                    <button className="banner-ctx-item" onClick={async () => {
                        onClose();
                        const idsToExport = selectedIds.size > 0 ? Array.from(selectedIds) : [ctxMenu.variantId];
                        for (const vid of idsToExport) {
                            const v = variants.find(v => v.id === vid);
                            if (!v) continue;
                            try {
                                const dataURL = await renderVariantWithFabric(v);
                                downloadDataURL(dataURL, `banner_${v.preset.width}x${v.preset.height}.png`);
                                if (idsToExport.length > 1) await new Promise(r => setTimeout(r, 300));
                            } catch { /* skip */ }
                        }
                    }}>
                        PNG (Static Image){selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}
                    </button>
                    <button className="banner-ctx-item" onClick={() => { onClose(); alert('GIF export coming soon'); }}>
                        GIF (Animated)
                    </button>
                    <button className="banner-ctx-item" onClick={async () => {
                        onClose();
                        const idsToExport = selectedIds.size > 0 ? Array.from(selectedIds) : [ctxMenu.variantId];
                        // Calculate duration from the max endTime across all element presets
                        const presets = useAnimPresetStore.getState().presets;
                        let maxEnd = 5;
                        for (const [, cfg] of Object.entries(presets)) {
                            const et = cfg.endTime < 0 ? 5 : cfg.endTime;
                            if (et > maxEnd) maxEnd = et;
                        }
                        const duration = Math.ceil(maxEnd);
                        for (const vid of idsToExport) {
                            const v = variants.find(v => v.id === vid);
                            if (!v) continue;
                            const hasAnim = v.elements.some(el => el.animation && el.animation.preset !== 'none');
                            if (!hasAnim) { alert('No animations on this size. Add animations in the editor first.'); continue; }
                            try {
                                const buffer = await exportVariantToMp4(v, duration, { fps: 30 }, (p) => {
                                    if (p.phase === 'error') { alert('MP4 export failed: ' + p.error); }
                                });
                                downloadBlob(buffer, `banner_${v.preset.width}x${v.preset.height}.mp4`);
                            } catch (err) { alert('MP4 export failed: ' + String(err)); }
                        }
                    }}>
                        MP4 (Video){selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}
                    </button>
                    <button className="banner-ctx-item" onClick={() => { onClose(); alert('JS bundle export coming soon'); }}>
                        JS (Interactive Bundle)
                    </button>
                </div>
            </div>

            {/* Export Selected */}
            {selectedIds.size > 1 && (
                <>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    <button className="banner-ctx-item" onClick={async () => {
                        onClose();
                        const toExport = variants.filter(v => selectedIds.has(v.id));
                        for (const variant of toExport) {
                            try {
                                const dataURL = await renderVariantWithFabric(variant);
                                downloadDataURL(dataURL, `banner_${variant.preset.width}x${variant.preset.height}.png`);
                                await new Promise(r => setTimeout(r, 300));
                            } catch { /* skip */ }
                        }
                    }}>
                        Export Selected ({selectedIds.size}) as PNG
                    </button>
                </>
            )}
            <button className="banner-ctx-item" onClick={async () => {
                onClose();
                for (const variant of variants) {
                    try {
                        const dataURL = await renderVariantWithFabric(variant);
                        downloadDataURL(dataURL, `banner_${variant.preset.width}x${variant.preset.height}.png`);
                        await new Promise(r => setTimeout(r, 300));
                    } catch { /* skip */ }
                }
            }}>
                Export All Sizes as PNG
            </button>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <button className="banner-ctx-item" onClick={() => { onClose(); onDoubleClick(ctxMenu.variantId); }}>
                Open in Editor
            </button>

            {(ctxMenu.variantId in plugConnections) && (
                <button
                    className="banner-ctx-item"
                    onClick={() => {
                        useDesignStore.getState().disconnectPlug(ctxMenu.variantId);
                        onClose();
                    }}
                >
                    Disconnect Plug
                </button>
            )}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <button
                className="banner-ctx-item banner-ctx-item--danger"
                onClick={() => {
                    const idsToDelete = selectedIds.size > 0 ? Array.from(selectedIds) : [ctxMenu.variantId];
                    const count = idsToDelete.length;
                    const msg = count > 1
                        ? `Are you sure you want to permanently delete ${count} size variants? This cannot be undone.`
                        : 'Are you sure you want to permanently delete this size variant? This cannot be undone.';
                    if (window.confirm(msg)) {
                        for (const vid of idsToDelete) {
                            useDesignStore.getState().removeVariant(vid);
                        }
                        onClearSelection();
                        onClose();
                    }
                }}
            >
                Delete {selectedIds.size > 1 ? `${selectedIds.size} Sizes` : 'Size'}
            </button>
        </div>
    );
}
