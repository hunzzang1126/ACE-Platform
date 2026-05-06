// ─────────────────────────────────────────────────
// BannerPreviewGrid – Scaled banner preview cards
// with Fabric.js-rendered previews + auto-loop + right-click export
// ─────────────────────────────────────────────────
// ★ ALL rendering (preview + export) uses headless Fabric.js.
// Same engine as Canvas Editor = pixel-perfect consistency.
// ─────────────────────────────────────────────────
import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BannerVariant } from '@/schema/design.types';
import { loadVideoBlob } from '@/stores/videoStorage';
import type { SmartCheckStatus } from '@/hooks/useSmartCheck';
import { PlugCanvas } from './PlugCanvas';
import { useDesignStore } from '@/stores/designStore';
import { downloadDataURL } from './previewRenderer';
import { renderVariantWithFabric } from './fabricHeadlessRenderer';
import { PreviewContextMenu } from './PreviewContextMenu';
import { CanvasPreviewImage } from './CanvasPreviewImage';
import { LinkedBadge } from './LinkedBadge';
import { useAppI18n } from '@/i18n';

interface ContextMenuState { x: number; y: number; variantId: string; }

interface Props {
    variants: BannerVariant[];
    visibleIds: Set<string>;
    masterVariantId?: string;
    onRunSmartCheck?: () => void;
    smartCheckStatus?: SmartCheckStatus;
    smartCheckProgress?: string;
    externalPlaying?: boolean;
}

const BASE_AREA = 70000; // reference visual area (px²) at zoom=1
const TIMELINE_DURATION = 5;
const GRID_GAP = 32;
const CARD_CHROME_H = 60; // header (~32) + footer (~28)
const ZOOM_KEY = 'ace-size-dash-zoom';
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_DEFAULT = 1.0;

/** Area-proportional sizing — wider canvases appear wider, taller appear taller */
function getCardDisplaySize(w: number, h: number, zoom: number): { dw: number; dh: number; scale: number } {
    const refArea = BASE_AREA * zoom * zoom;
    const aspect = w / h;
    const dh = Math.round(Math.sqrt(refArea / aspect));
    const dw = Math.round(dh * aspect);
    return { dw, dh, scale: dw / w };
}

export function BannerPreviewGrid({ variants, visibleIds, externalPlaying }: Props) {
    const navigate = useNavigate();
    const { t } = useAppI18n();
    const [currentTime, setCurrentTime] = useState(0);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const plugConnections = useDesignStore(s => s.creativeSet?.plugConnections) ?? {};

    // ── Zoom ──
    const [zoom, setZoom] = useState(() => {
        const stored = localStorage.getItem(ZOOM_KEY);
        return stored ? Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(stored))) : ZOOM_DEFAULT;
    });
    const handleZoomChange = useCallback((val: number) => {
        const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, val));
        setZoom(clamped);
        localStorage.setItem(ZOOM_KEY, String(clamped));
    }, []);

    // ── Card positions (free-form layout) ──
    const storedPositionsRaw = useDesignStore(s => s.creativeSet?.cardPositions);
    const [cardPositions, setCardPositions] = useState<Record<string, { x: number; y: number }>>(storedPositionsRaw ?? {});
    const prevStoredRef = useRef(storedPositionsRaw);
    useEffect(() => {
        if (storedPositionsRaw !== prevStoredRef.current) {
            prevStoredRef.current = storedPositionsRaw;
            setCardPositions(storedPositionsRaw ?? {});
        }
    }, [storedPositionsRaw]);

    const draggingRef = useRef<{ variantId: string; startMouse: { x: number; y: number }; startPos: { x: number; y: number }; hasMoved: boolean; } | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragCooldownRef = useRef(false);

    // ★ v726: Flow layout — positions based on ACTUAL card dimensions.
    // Cards flow left→right, wrap to next row. No overlap at any zoom.
    const flowPositions = useMemo(() => {
        const positions: Record<string, { x: number; y: number }> = {};
        const maxRowW = typeof window !== 'undefined' ? Math.max(window.innerWidth - 360, 600) : 1200;
        let x = 0, y = 0, rowH = 0;
        for (const v of visibleVariants) {
            const { dw, dh } = getCardDisplaySize(v.preset.width, v.preset.height, zoom);
            const totalH = dh + CARD_CHROME_H;
            if (x > 0 && x + dw > maxRowW) {
                x = 0; y += rowH + GRID_GAP; rowH = 0;
            }
            positions[v.id] = { x, y };
            rowH = Math.max(rowH, totalH);
            x += dw + GRID_GAP;
        }
        return positions;
    }, [visibleVariants, zoom]);
    const autoGridPos = useCallback((idx: number): { x: number; y: number } => {
        const v = visibleVariants[idx];
        return (v && flowPositions[v.id]) ?? { x: 0, y: 0 };
    }, [visibleVariants, flowPositions]);

    // ── Drag handlers ──
    const handleCardDragStart = useCallback((e: React.MouseEvent, variantId: string, currentPos: { x: number; y: number }) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        draggingRef.current = { variantId, startMouse: { x: e.clientX, y: e.clientY }, startPos: currentPos, hasMoved: false };
        setDraggingId(variantId);
    }, []);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const drag = draggingRef.current;
            if (!drag) return;
            const dx = e.clientX - drag.startMouse.x;
            const dy = e.clientY - drag.startMouse.y;
            if (!drag.hasMoved && Math.abs(dx) + Math.abs(dy) < 3) return;
            drag.hasMoved = true;
            setCardPositions(prev => ({ ...prev, [drag.variantId]: { x: Math.max(0, drag.startPos.x + dx), y: Math.max(0, drag.startPos.y + dy) } }));
        };
        const onUp = () => {
            const wasDrag = draggingRef.current?.hasMoved ?? false;
            draggingRef.current = null;
            setDraggingId(null);
            if (wasDrag) {
                dragCooldownRef.current = true;
                setTimeout(() => { dragCooldownRef.current = false; }, 300);
                setCardPositions(current => {
                    const store = useDesignStore.getState();
                    const activeId = store.activeCreativeSetId;
                    if (store.creativeSet && activeId) {
                        useDesignStore.setState(state => ({
                            ...state,
                            creativeSet: state.creativeSet ? { ...state.creativeSet, cardPositions: current } : state.creativeSet,
                            allCreativeSets: { ...state.allCreativeSets, [activeId]: state.allCreativeSets[activeId] ? { ...state.allCreativeSets[activeId], cardPositions: current } : state.allCreativeSets[activeId] },
                        }));
                    }
                    return current;
                });
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, []);

    // ── Selection + context menu ──
    const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const toggleSelection = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    }, []);
    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    // ── Video + image URL resolution ──
    const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
    const [resolvedImageUrls, setResolvedImageUrls] = useState<Record<string, string>>({});
    const visibleVariants = useMemo(() => variants.filter(v => visibleIds.has(v.id)), [variants, visibleIds]);

    const { canvasHeight, canvasWidth } = useMemo(() => {
        let maxY = 0, maxX = 0;
        visibleVariants.forEach((v, idx) => {
            const pos = cardPositions[v.id] ?? autoGridPos(idx);
            const { dw, dh } = getCardDisplaySize(v.preset.width, v.preset.height, zoom);
            maxX = Math.max(maxX, pos.x + dw + GRID_GAP);
            maxY = Math.max(maxY, pos.y + dh + CARD_CHROME_H + GRID_GAP);
        });
        return { canvasHeight: maxY, canvasWidth: maxX };
    }, [visibleVariants, cardPositions, autoGridPos, zoom]);

    // Restore video blobs
    useEffect(() => {
        const videoEls: { id: string }[] = [];
        for (const v of visibleVariants) for (const el of v.elements) if (el.type === 'video') videoEls.push({ id: el.id });
        if (videoEls.length === 0) return;
        let cancelled = false;
        for (const { id } of videoEls) loadVideoBlob(id).then(url => { if (!cancelled && url) setVideoUrls(prev => ({ ...prev, [id]: url })); }).catch(() => {});
        return () => { cancelled = true; };
    }, [visibleVariants]);

    // Resolve idb:// and storage:// image URLs — ★ PARALLEL for speed
    useEffect(() => {
        let cancelled = false;
        const toResolve: { elId: string; src: string }[] = [];
        for (const v of visibleVariants) for (const el of v.elements) if (el.type === 'image' && el.src && (el.src.startsWith('idb://') || el.src.startsWith('storage://'))) toResolve.push({ elId: el.id, src: el.src });
        if (toResolve.length === 0) return;
        (async () => {
            const { resolveAsset } = await import('@/services/assetService');
            const results = await Promise.all(
                toResolve.map(async ({ elId, src }) => {
                    try { return { elId, blobUrl: await resolveAsset(src) }; }
                    catch { return { elId, blobUrl: src }; }
                })
            );
            if (!cancelled) {
                const resolved: Record<string, string> = {};
                for (const { elId, blobUrl } of results) {
                    const orig = toResolve.find(r => r.elId === elId);
                    if (blobUrl !== orig?.src) resolved[elId] = blobUrl;
                }
                if (Object.keys(resolved).length > 0) setResolvedImageUrls(prev => ({ ...prev, ...resolved }));
            }
        })();
        return () => { cancelled = true; };
    }, [visibleVariants]);

    // ── Animation loop ──
    const hasAnyAnimation = useMemo(() => visibleVariants.some(v => v.elements.some(el => (el.animation && el.animation.preset !== 'none') || (el.animation && (el.animation.startTime ?? 0) > 0))), [visibleVariants]);
    const isPlaying = externalPlaying ?? hasAnyAnimation;

    useEffect(() => {
        if (!isPlaying) { if (!hasAnyAnimation) setCurrentTime(0); return; }
        startTimeRef.current = performance.now() / 1000;
        const frame = () => {
            const now = performance.now() / 1000;
            setCurrentTime((now - startTimeRef.current) % TIMELINE_DURATION);
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
    }, [isPlaying, hasAnyAnimation]);

    const handleDoubleClick = useCallback((variantId: string) => navigate(`/editor/detail/${variantId}`), [navigate]);
    const handleContextMenu = useCallback((e: React.MouseEvent, variantId: string) => {
        e.preventDefault(); e.stopPropagation();
        setSelectedIds(prev => { if (!prev.has(variantId)) { const next = new Set(prev); next.add(variantId); return next; } return prev; });
        setCtxMenu({ x: e.clientX, y: e.clientY, variantId });
    }, []);

    const handleExportPNG = useCallback(async (variantId: string) => {
        setCtxMenu(null);
        const variant = variants.find(v => v.id === variantId);
        if (!variant) return;
        try { downloadDataURL(await renderVariantWithFabric(variant), `banner_${variant.preset.width}x${variant.preset.height}.png`); }
        catch { alert('Export failed. Try again.'); }
    }, [variants]);

    const handleExportAll = useCallback(async () => {
        setCtxMenu(null);
        for (const variant of visibleVariants) {
            try { downloadDataURL(await renderVariantWithFabric(variant), `banner_${variant.preset.width}x${variant.preset.height}.png`); await new Promise(r => setTimeout(r, 300)); } catch { /* skip */ }
        }
    }, [visibleVariants]);

    const handleExportSelected = useCallback(async () => {
        setCtxMenu(null);
        for (const variant of variants.filter(v => selectedIds.has(v.id))) {
            try { downloadDataURL(await renderVariantWithFabric(variant), `banner_${variant.preset.width}x${variant.preset.height}.png`); await new Promise(r => setTimeout(r, 300)); } catch { /* skip */ }
        }
    }, [variants, selectedIds]);

    return (
        <div className="banner-grid-wrapper">
            <div className="banner-grid-toolbar">
                <div className="banner-zoom-control">
                    <button
                        className="banner-zoom-btn"
                        onClick={() => handleZoomChange(zoom - 0.1)}
                        disabled={zoom <= ZOOM_MIN}
                        title="Zoom out"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <input
                        type="range"
                        className="banner-zoom-slider"
                        min={ZOOM_MIN}
                        max={ZOOM_MAX}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => handleZoomChange(Number(e.target.value))}
                        title={`${Math.round(zoom * 100)}%`}
                    />
                    <button
                        className="banner-zoom-btn"
                        onClick={() => handleZoomChange(zoom + 0.1)}
                        disabled={zoom >= ZOOM_MAX}
                        title="Zoom in"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <span className="banner-zoom-label">{Math.round(zoom * 100)}%</span>
                </div>
                {isPlaying && (<div className="banner-play-progress"><div className="banner-play-progress-bar" style={{ width: `${(currentTime / TIMELINE_DURATION) * 100}%` }} /></div>)}
                {!hasAnyAnimation && (<span className="banner-no-anim-hint">{t('size.addAnimNote')}</span>)}
            </div>

            <div className="banner-grid" ref={gridContainerRef} style={{ position: 'relative', minHeight: Math.max(600, canvasHeight + 40), minWidth: canvasWidth }}>
                <PlugCanvas variants={visibleVariants} cardRefs={cardRefs} containerRef={gridContainerRef} />
                {visibleVariants.map((variant, idx) => {
                    const { width, height } = variant.preset;
                    const { dw: previewW, dh: previewH, scale } = getCardDisplaySize(width, height, zoom);
                    const pos = cardPositions[variant.id] ?? autoGridPos(idx);

                    return (
                        <div
                            key={variant.id}
                            ref={(el) => { cardRefs.current[variant.id] = el; }}
                            data-variant-id={variant.id}
                            className={`banner-card ${isPlaying ? 'banner-card--playing' : ''} ${selectedIds.has(variant.id) ? 'banner-card--selected' : ''} ${draggingId === variant.id ? 'banner-card--dragging' : ''}`}
                            onMouseDown={(e) => handleCardDragStart(e, variant.id, pos)}
                            onClick={(e) => { if (!dragCooldownRef.current) toggleSelection(variant.id, e); }}
                            onDoubleClick={() => { if (!dragCooldownRef.current) handleDoubleClick(variant.id); }}
                            onContextMenu={(e) => handleContextMenu(e, variant.id)}
                            style={{ position: 'absolute', left: pos.x, top: pos.y, outline: selectedIds.has(variant.id) ? '2px solid #4a9eff' : '2px solid transparent', outlineOffset: -2, transition: 'outline-color 0.15s ease, background 0.15s ease', background: selectedIds.has(variant.id) ? 'rgba(74,158,255,0.06)' : undefined }}
                        >
                            <div className="banner-card-header" style={{ cursor: draggingId ? 'grabbing' : 'grab' }}>
                                <span className="banner-card-dims">{width} x {height}{(variant.id in plugConnections) && <LinkedBadge variantId={variant.id} />}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {selectedIds.has(variant.id) && (
                                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#4a9eff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        </span>
                                    )}
                                    <button
                                        className="banner-card-kebab"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleContextMenu(e, variant.id); }}
                                        title="Options"
                                        style={{
                                            background: 'none', border: 'none', color: 'var(--text-muted)',
                                            cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
                                            fontSize: 14, lineHeight: 1, opacity: 0.5,
                                            transition: 'opacity 0.15s, color 0.15s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="banner-card-preview" style={{ width: previewW, height: previewH, overflow: 'hidden' }}>
                                <CanvasPreviewImage
                                    variant={variant}
                                    resolvedImageUrls={resolvedImageUrls}
                                    videoUrls={videoUrls}
                                    scale={scale}
                                    currentTime={isPlaying ? currentTime : undefined}
                                    timelineDuration={TIMELINE_DURATION}
                                />
                            </div>

                            {!isPlaying && (<div className="banner-card-play-overlay"><div className="banner-card-play-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDoubleClick(variant.id); }} title="Open in Editor">{hasAnyAnimation ? '\u25b6' : '\u270e'}</div></div>)}
                            <div className="banner-card-footer"><span className="banner-card-count">{variant.elements.length} {t('activity.elements')}</span><span className="banner-card-zoom">{Math.round(scale * 100)}%</span></div>
                        </div>
                    );
                })}
                {visibleVariants.length === 0 && (<div className="banner-grid-empty"><p>{t('activity.noSizesVisible')}</p></div>)}
            </div>

            {selectedIds.size > 0 && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e2231', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1000, fontSize: 12, color: '#e6edf3', backdropFilter: 'blur(12px)' }}>
                    <span style={{ fontWeight: 600 }}>{selectedIds.size} {t('activity.selected')}</span>
                    <button onClick={handleExportSelected} style={{ background: 'linear-gradient(135deg, #4a9eff, #6c63ff)', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{t('activity.exportSelected')}</button>
                    <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: 14, cursor: 'pointer', padding: '2px 6px' }} title="Clear selection">x</button>
                </div>
            )}

            <PreviewContextMenu
                ctxMenu={ctxMenu}
                onClose={() => setCtxMenu(null)}
                variants={variants}
                visibleVariants={visibleVariants}
                selectedIds={selectedIds}
                plugConnections={plugConnections}
                onDoubleClick={handleDoubleClick}
                onClearSelection={clearSelection}
                onExportAll={handleExportAll}
                onExportSelected={handleExportSelected}
            />
        </div>
    );
}
