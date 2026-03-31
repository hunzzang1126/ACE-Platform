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

const MAX_PREVIEW_WIDTH = 280;
const MAX_PREVIEW_HEIGHT = 360;
const TIMELINE_DURATION = 5;
const GRID_GAP = 32;
const GRID_COLS = 3;

function getPreviewScale(w: number, h: number) {
    return Math.min(MAX_PREVIEW_WIDTH / w, MAX_PREVIEW_HEIGHT / h, 1);
}

export function BannerPreviewGrid({ variants, visibleIds, externalPlaying }: Props) {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(0);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const plugConnections = useDesignStore(s => s.creativeSet?.plugConnections) ?? {};

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

    const autoGridPos = useCallback((idx: number): { x: number; y: number } => {
        const col = idx % GRID_COLS;
        const row = Math.floor(idx / GRID_COLS);
        const colWidth = MAX_PREVIEW_WIDTH + GRID_GAP + 40;
        return { x: col * colWidth, y: row * (MAX_PREVIEW_HEIGHT + 100 + GRID_GAP) };
    }, []);

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

    const canvasHeight = useMemo(() => {
        let maxY = 0;
        visibleVariants.forEach((v, idx) => {
            const pos = cardPositions[v.id] ?? autoGridPos(idx);
            const h = Math.round(v.preset.height * getPreviewScale(v.preset.width, v.preset.height));
            maxY = Math.max(maxY, pos.y + h + 100);
        });
        return maxY;
    }, [visibleVariants, cardPositions, autoGridPos]);

    // Restore video blobs
    useEffect(() => {
        const videoEls: { id: string }[] = [];
        for (const v of visibleVariants) for (const el of v.elements) if (el.type === 'video') videoEls.push({ id: el.id });
        if (videoEls.length === 0) return;
        let cancelled = false;
        for (const { id } of videoEls) loadVideoBlob(id).then(url => { if (!cancelled && url) setVideoUrls(prev => ({ ...prev, [id]: url })); }).catch(() => {});
        return () => { cancelled = true; };
    }, [visibleVariants]);

    // Resolve idb:// image URLs
    useEffect(() => {
        let cancelled = false;
        const toResolve: { elId: string; src: string }[] = [];
        for (const v of visibleVariants) for (const el of v.elements) if (el.type === 'image' && el.src?.startsWith('idb://')) toResolve.push({ elId: el.id, src: el.src });
        if (toResolve.length === 0) return;
        (async () => {
            const { resolveAsset } = await import('@/services/assetService');
            for (const { elId, src } of toResolve) {
                if (cancelled) break;
                try { const blobUrl = await resolveAsset(src); if (!cancelled && blobUrl !== src) setResolvedImageUrls(prev => ({ ...prev, [elId]: blobUrl })); } catch { /* skip */ }
            }
        })();
        return () => { cancelled = true; };
    }, [visibleVariants]);

    // ── Animation loop ──
    const hasAnyAnimation = useMemo(() => visibleVariants.some(v => v.elements.some(el => el.animation && el.animation.preset !== 'none')), [visibleVariants]);
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
                {isPlaying && (<div className="banner-play-progress"><div className="banner-play-progress-bar" style={{ width: `${(currentTime / TIMELINE_DURATION) * 100}%` }} /></div>)}
                {!hasAnyAnimation && (<span className="banner-no-anim-hint">Add animations in the editor to preview here</span>)}
            </div>

            <div className="banner-grid" ref={gridContainerRef} style={{ position: 'relative', minHeight: Math.max(600, canvasHeight + 40), overflow: 'visible' }}>
                <PlugCanvas variants={visibleVariants} cardRefs={cardRefs} containerRef={gridContainerRef} />
                {visibleVariants.map((variant, idx) => {
                    const { width, height } = variant.preset;
                    const scale = getPreviewScale(width, height);
                    const previewW = Math.round(width * scale);
                    const previewH = Math.round(height * scale);
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
                                <span className="banner-card-dims">{width} x {height}{(variant.id in plugConnections) && <span className="banner-card-plugged">  PLUGGED</span>}</span>
                                {selectedIds.has(variant.id) && (
                                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#4a9eff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    </span>
                                )}
                            </div>

                            <div className="banner-card-preview" style={{ width: previewW, height: previewH, overflow: 'hidden' }}>
                                <CanvasPreviewImage
                                    variant={variant}
                                    resolvedImageUrls={resolvedImageUrls}
                                    videoUrls={videoUrls}
                                    scale={scale}
                                    currentTime={isPlaying ? currentTime : undefined}
                                />
                            </div>

                            {!isPlaying && (<div className="banner-card-play-overlay"><div className="banner-card-play-btn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDoubleClick(variant.id); }} title="Open in Editor">▶</div></div>)}
                            <div className="banner-card-footer"><span className="banner-card-count">{variant.elements.length} elements</span><span className="banner-card-zoom">{Math.round(scale * 100)}%</span></div>
                        </div>
                    );
                })}
                {visibleVariants.length === 0 && (<div className="banner-grid-empty"><p>No sizes visible. Toggle sizes on in the sidebar or add new sizes.</p></div>)}
            </div>

            {selectedIds.size > 0 && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e2231', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1000, fontSize: 12, color: '#e6edf3', backdropFilter: 'blur(12px)' }}>
                    <span style={{ fontWeight: 600 }}>{selectedIds.size} selected</span>
                    <button onClick={handleExportSelected} style={{ background: 'linear-gradient(135deg, #4a9eff, #6c63ff)', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Export Selected</button>
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
