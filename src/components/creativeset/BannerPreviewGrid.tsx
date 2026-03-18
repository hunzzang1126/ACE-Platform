// ─────────────────────────────────────────────────
// BannerPreviewGrid – Scaled banner preview cards
// with animated preview + auto-loop + right-click export
// ─────────────────────────────────────────────────
import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BannerVariant } from '@/schema/design.types';
import { constraintsToAbsolute } from '@/engine/elementConverters';
import { computeAnimStyle, type AnimPresetType } from '@/hooks/useAnimationPresets';
import { loadVideoBlob } from '@/stores/videoStorage';
import type { SmartCheckStatus } from '@/hooks/useSmartCheck';
import { PlugCanvas } from './PlugCanvas';
import { useDesignStore } from '@/stores/designStore';

interface ContextMenuState {
    x: number;
    y: number;
    variantId: string;
}

/**
 * Render a BannerVariant's elements directly to a Canvas (CORS-safe).
 * Avoids "tainted canvas" error by fetching images as blobs first.
 */
async function renderVariantToCanvas(variant: BannerVariant): Promise<string> {
    const { width: w, height: h } = variant.preset;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = variant.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Sort by zIndex
    const sorted = [...variant.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sorted) {
        const resolved = constraintsToAbsolute(el.constraints, w, h);
        const { x, y, w: ew, h: eh } = resolved;

        ctx.save();
        ctx.globalAlpha = el.opacity ?? 1;

        if (el.type === 'image' && el.src) {
            // ★ Fetch image as blob to avoid CORS tainting
            try {
                let imgSrc = el.src;
                // Resolve idb:// references
                if (imgSrc.startsWith('idb://')) {
                    const { resolveAsset } = await import('@/services/assetService');
                    imgSrc = await resolveAsset(imgSrc);
                }
                const img = await loadImageCORS(imgSrc);
                ctx.drawImage(img, x, y, ew, eh);
            } catch { /* skip failed images */ }
        } else if (el.type === 'shape') {
            const shapeEl = el as import('@/schema/elements.types').ShapeElement;

            // ── Determine fill style ──
            if (shapeEl.gradientStart && shapeEl.gradientEnd) {
                // ★ FIX: CSS gradient angle → Canvas2D math angle
                // CSS: 0°=bottom→top, 90°=left→right, 180°=top→bottom
                // Math: 0°=right, 90°=up
                // Conversion: mathAngle = (90 - cssAngle)
                const cssAngle = shapeEl.gradientAngle ?? 135;
                const mathAngle = (90 - cssAngle) * Math.PI / 180;
                const cx = x + ew / 2, cy = y + eh / 2;
                const len = Math.max(ew, eh);
                const grad = ctx.createLinearGradient(
                    cx - Math.cos(mathAngle) * len / 2, cy + Math.sin(mathAngle) * len / 2,
                    cx + Math.cos(mathAngle) * len / 2, cy - Math.sin(mathAngle) * len / 2,
                );
                grad.addColorStop(0, shapeEl.gradientStart);
                grad.addColorStop(1, shapeEl.gradientEnd);
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = shapeEl.fill || '#cccccc';
            }

            // ── Draw shape path ──
            const r = shapeEl.borderRadius ?? 0;
            const isEllipse = shapeEl.shapeType === 'ellipse'
                || r >= Math.min(ew, eh) / 2;  // borderRadius >= half of smaller dimension = circle/pill

            if (isEllipse) {
                // ★ FIX: Draw actual ellipse — was missing entirely
                ctx.beginPath();
                ctx.ellipse(x + ew / 2, y + eh / 2, ew / 2, eh / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (r > 0) {
                roundRect(ctx, x, y, ew, eh, r);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, ew, eh);
            }
        } else if (el.type === 'text' && el.content) {
            ctx.fillStyle = el.color || '#000000';
            const fontSize = el.fontSize ?? 16;
            const fontFamily = el.fontFamily || 'Inter, system-ui, sans-serif';
            const fontWeight = el.fontWeight || '400';
            ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
            ctx.textBaseline = 'top';
            const lineHeight = fontSize * (el.lineHeight ?? 1.2);
            // ★ Split by explicit \n first, then word-wrap each paragraph
            const paragraphs = el.content.split('\n');
            let lineY = y;
            for (const paragraph of paragraphs) {
                const words = paragraph.split(' ');
                let line = '';
                for (const word of words) {
                    const test = line + (line ? ' ' : '') + word;
                    if (ctx.measureText(test).width > ew && line) {
                        const drawX = el.textAlign === 'center' ? x + ew / 2 - ctx.measureText(line).width / 2
                            : el.textAlign === 'right' ? x + ew - ctx.measureText(line).width : x;
                        ctx.fillText(line, drawX, lineY);
                        line = word;
                        lineY += lineHeight;
                    } else {
                        line = test;
                    }
                }
                if (line) {
                    const drawX = el.textAlign === 'center' ? x + ew / 2 - ctx.measureText(line).width / 2
                        : el.textAlign === 'right' ? x + ew - ctx.measureText(line).width : x;
                    ctx.fillText(line, drawX, lineY);
                }
                lineY += lineHeight; // paragraph break
            }
        } else if (el.type === 'button') {
            // Button background
            ctx.fillStyle = el.backgroundColor || '#2563eb';
            const r = el.borderRadius ?? 6;
            if (r > 0) {
                roundRect(ctx, x, y, ew, eh, r);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, ew, eh);
            }
            // Button label
            if (el.label) {
                ctx.fillStyle = el.color || '#ffffff';
                const fontSize = el.fontSize ?? 14;
                ctx.font = `${el.fontWeight || '600'} ${fontSize}px ${el.fontFamily || 'Inter, system-ui, sans-serif'}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.label, x + ew / 2, y + eh / 2);
                ctx.textAlign = 'start'; // reset
            }
        }

        ctx.restore();
    }

    return canvas.toDataURL('image/png');
}

/** Load image with CORS-safe blob fetching */
async function loadImageCORS(src: string): Promise<HTMLImageElement> {
    // If it's already a blob/data URL, load directly
    if (src.startsWith('blob:') || src.startsWith('data:')) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    // Fetch as blob to bypass CORS tainting
    const resp = await fetch(src, { mode: 'cors' });
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
        img.src = url;
    });
}

/** Canvas rounded rectangle helper */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/** Download a data URL as a file */
function downloadDataURL(dataURL: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

interface Props {
    variants: BannerVariant[];
    visibleIds: Set<string>;
    masterVariantId: string;
    onRunSmartCheck?: () => void;
    smartCheckStatus?: SmartCheckStatus;
    smartCheckProgress?: string;
    externalPlaying?: boolean;
}

// Max preview card dimension in px
const MAX_PREVIEW_WIDTH = 280;
const MAX_PREVIEW_HEIGHT = 360;

// Default animation timeline duration (seconds)
const TIMELINE_DURATION = 5;

function getPreviewScale(w: number, h: number) {
    const scaleW = MAX_PREVIEW_WIDTH / w;
    const scaleH = MAX_PREVIEW_HEIGHT / h;
    return Math.min(scaleW, scaleH, 1);
}

export function BannerPreviewGrid({ variants, visibleIds, masterVariantId, onRunSmartCheck, smartCheckStatus, smartCheckProgress, externalPlaying }: Props) {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(0);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const plugConnections = useDesignStore(s => s.creativeSet?.plugConnections) ?? {};
    const masterLabel = useDesignStore(s => s.creativeSet?.masterLabel);

    // ── Free-form card positions (variant.id → {x, y}) — persisted in store ──
    const storedPositionsRaw = useDesignStore(s => s.creativeSet?.cardPositions);
    const [cardPositions, setCardPositions] = useState<Record<string, { x: number; y: number }>>(storedPositionsRaw ?? {});
    // Sync from store → local ONLY when store content actually changes
    const prevStoredRef = useRef(storedPositionsRaw);
    useEffect(() => {
        if (storedPositionsRaw !== prevStoredRef.current) {
            prevStoredRef.current = storedPositionsRaw;
            setCardPositions(storedPositionsRaw ?? {});
        }
    }, [storedPositionsRaw]);
    const draggingRef = useRef<{
        variantId: string;
        startMouse: { x: number; y: number };
        startPos: { x: number; y: number };
        hasMoved: boolean;
    } | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragCooldownRef = useRef(false);
    // ── Auto-layout helper: calculate grid position for card ──
    const GRID_GAP = 32;
    const GRID_COLS = 3;
    const autoGridPos = useCallback((idx: number, cardW: number): { x: number; y: number } => {
        const col = idx % GRID_COLS;
        const row = Math.floor(idx / GRID_COLS);
        const colWidth = MAX_PREVIEW_WIDTH + GRID_GAP + 40; // card padding + gap
        return { x: col * colWidth, y: row * (MAX_PREVIEW_HEIGHT + 100 + GRID_GAP) };
    }, []);



    // ── Drag handlers (ref-based for performance) ──
    const handleCardDragStart = useCallback((e: React.MouseEvent, variantId: string, currentPos: { x: number; y: number }) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        draggingRef.current = {
            variantId,
            startMouse: { x: e.clientX, y: e.clientY },
            startPos: currentPos,
            hasMoved: false,
        };
        setDraggingId(variantId);
    }, []);

    // Drag move/up at document level
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const drag = draggingRef.current;
            if (!drag) return;
            const dx = e.clientX - drag.startMouse.x;
            const dy = e.clientY - drag.startMouse.y;
            // 3px threshold to distinguish click from drag
            if (!drag.hasMoved && Math.abs(dx) + Math.abs(dy) < 3) return;
            drag.hasMoved = true;
            setCardPositions(prev => ({
                ...prev,
                [drag.variantId]: {
                    x: Math.max(0, drag.startPos.x + dx),
                    y: Math.max(0, drag.startPos.y + dy),
                },
            }));
        };
        const onUp = () => {
            const wasDrag = draggingRef.current?.hasMoved ?? false;
            draggingRef.current = null;
            setDraggingId(null);
            if (wasDrag) {
                // 300ms cooldown: suppress click/doubleclick after drag
                dragCooldownRef.current = true;
                setTimeout(() => { dragCooldownRef.current = false; }, 300);
                // ★ Persist card positions to store so they survive navigation
                setCardPositions(current => {
                    const store = useDesignStore.getState();
                    const activeId = store.activeCreativeSetId;
                    if (store.creativeSet && activeId) {
                        // ★ Must update BOTH creativeSet AND allCreativeSets to survive navigation
                        useDesignStore.setState(state => ({
                            ...state,
                            creativeSet: state.creativeSet ? { ...state.creativeSet, cardPositions: current } : state.creativeSet,
                            allCreativeSets: {
                                ...state.allCreativeSets,
                                [activeId]: state.allCreativeSets[activeId]
                                    ? { ...state.allCreativeSets[activeId], cardPositions: current }
                                    : state.allCreativeSets[activeId],
                            },
                        }));
                    }
                    return current;
                });
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    // ── Context menu state ──
    const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);

    // ── Multi-select state (Apple-style) ──
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const toggleSelection = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);
    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    // ── Video blob URL restoration map ──
    const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

    const visibleVariants = useMemo(
        () => variants.filter((v) => visibleIds.has(v.id)),
        [variants, visibleIds],
    );

    // Compute canvas min-height for free-form layout
    const canvasHeight = useMemo(() => {
        let maxY = 0;
        visibleVariants.forEach((v, idx) => {
            const pos = cardPositions[v.id] ?? autoGridPos(idx, 0);
            const h = Math.round(v.preset.height * getPreviewScale(v.preset.width, v.preset.height));
            maxY = Math.max(maxY, pos.y + h + 100);
        });
        return maxY;
    }, [visibleVariants, cardPositions, autoGridPos]);

    // ── Restore video blob URLs from IndexedDB ──
    useEffect(() => {
        const videoEls: { id: string }[] = [];
        for (const v of visibleVariants) {
            for (const el of v.elements) {
                if (el.type === 'video') videoEls.push({ id: el.id });
            }
        }
        if (videoEls.length === 0) return;
        let cancelled = false;
        for (const { id } of videoEls) {
            loadVideoBlob(id).then((url) => {
                if (cancelled || !url) return;
                setVideoUrls((prev) => ({ ...prev, [id]: url }));
            }).catch(() => {/* ok */ });
        }
        return () => { cancelled = true; };
    }, [visibleVariants]);

    // ── Resolve idb:// image URLs to blob URLs ──
    // ★ Images stored via assetService use idb://{hash} references which
    //   browsers CANNOT load directly. Resolve them to blob: URLs here.
    const [resolvedImageUrls, setResolvedImageUrls] = useState<Record<string, string>>({});
    useEffect(() => {
        let cancelled = false;
        const toResolve: { elId: string; src: string }[] = [];
        for (const v of visibleVariants) {
            for (const el of v.elements) {
                if (el.type === 'image' && el.src?.startsWith('idb://')) {
                    toResolve.push({ elId: el.id, src: el.src });
                }
            }
        }
        if (toResolve.length === 0) return;

        (async () => {
            const { resolveAsset } = await import('@/services/assetService');
            for (const { elId, src } of toResolve) {
                if (cancelled) break;
                try {
                    const blobUrl = await resolveAsset(src);
                    if (!cancelled && blobUrl !== src) {
                        setResolvedImageUrls(prev => ({ ...prev, [elId]: blobUrl }));
                    }
                } catch { /* skip */ }
            }
        })();

        return () => { cancelled = true; };
    }, [visibleVariants]);

    // Check if any element across all visible variants has an animation
    const hasAnyAnimation = useMemo(() => {
        return visibleVariants.some((v) =>
            v.elements.some((el) => el.animation && el.animation.preset !== 'none'),
        );
    }, [visibleVariants]);

    // ── Animation loop: runs when playing (external or auto) ──
    // Use external play control if provided, otherwise auto-detect
    const isPlaying = externalPlaying ?? hasAnyAnimation;

    useEffect(() => {
        if (!isPlaying) {
            if (!hasAnyAnimation) setCurrentTime(0);
            return;
        }
        startTimeRef.current = performance.now() / 1000;

        const frame = () => {
            const now = performance.now() / 1000;
            const elapsed = now - startTimeRef.current;
            setCurrentTime(elapsed % TIMELINE_DURATION);
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);

        return () => cancelAnimationFrame(rafRef.current);
    }, [isPlaying, hasAnyAnimation]);

    const handleDoubleClick = useCallback((variantId: string) => {
        navigate(`/editor/detail/${variantId}`);
    }, [navigate]);

    // ── Right-click context menu ──
    const handleContextMenu = useCallback((e: React.MouseEvent, variantId: string) => {
        e.preventDefault();
        e.stopPropagation();
        // Auto-add to selection if not already
        setSelectedIds(prev => {
            if (!prev.has(variantId)) { const next = new Set(prev); next.add(variantId); return next; }
            return prev;
        });
        setCtxMenu({ x: e.clientX, y: e.clientY, variantId });
    }, []);

    const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

    // Close context menu on any click
    useEffect(() => {
        if (!ctxMenu) return;
        const handler = () => setCtxMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [ctxMenu]);

    // ── Export single size as PNG ──
    const handleExportPNG = useCallback(async (variantId: string) => {
        setCtxMenu(null);
        const variant = variants.find((v) => v.id === variantId);
        if (!variant) return;
        try {
            const dataURL = await renderVariantToCanvas(variant);
            downloadDataURL(dataURL, `banner_${variant.preset.width}x${variant.preset.height}.png`);
        } catch {
            alert('Export failed. Try again.');
        }
    }, [variants]);

    // ── Export ALL sizes as PNGs ──
    const handleExportAll = useCallback(async () => {
        setCtxMenu(null);
        for (const variant of visibleVariants) {
            try {
                const dataURL = await renderVariantToCanvas(variant);
                downloadDataURL(dataURL, `banner_${variant.preset.width}x${variant.preset.height}.png`);
                await new Promise((r) => setTimeout(r, 300)); // stagger downloads
            } catch { /* skip */ }
        }
    }, [visibleVariants]);

    // ── Export selected sizes ──
    const handleExportSelected = useCallback(async () => {
        setCtxMenu(null);
        const toExport = variants.filter(v => selectedIds.has(v.id));
        for (const variant of toExport) {
            try {
                const dataURL = await renderVariantToCanvas(variant);
                downloadDataURL(dataURL, `banner_${variant.preset.width}x${variant.preset.height}.png`);
                await new Promise((r) => setTimeout(r, 300));
            } catch { /* skip */ }
        }
    }, [variants, selectedIds]);


    return (
        <div className="banner-grid-wrapper">
            {/* Toolbar */}
            <div className="banner-grid-toolbar">
                {isPlaying && (
                    <div className="banner-play-progress">
                        <div
                            className="banner-play-progress-bar"
                            style={{ width: `${(currentTime / TIMELINE_DURATION) * 100}%` }}
                        />
                    </div>
                )}
                {!hasAnyAnimation && (
                    <span className="banner-no-anim-hint">
                        Add animations in the editor to preview here
                    </span>
                )}
                {/* Smart Check Button */}
                {onRunSmartCheck && (
                    <button
                        className="banner-ai-qa-btn"
                        onClick={onRunSmartCheck}
                        disabled={smartCheckStatus === 'checking'}
                        title="AI Vision QA: analyze all variants for visual quality"
                    >
                        {smartCheckStatus === 'checking'
                            ? (smartCheckProgress || 'Checking...')
                            : smartCheckStatus === 'done'
                                ? 'Done: Smart Check'
                                : 'Smart Check'
                        }
                    </button>
                )}
            </div>

            <div
                className="banner-grid"
                ref={gridContainerRef}
                style={{
                    position: 'relative',
                    minHeight: Math.max(600, canvasHeight + 40),
                    overflow: 'visible',
                }}
            >
                <PlugCanvas
                    variants={visibleVariants}
                    cardRefs={cardRefs}
                    containerRef={gridContainerRef}
                />
                {visibleVariants.map((variant, idx) => {
                    const { width, height } = variant.preset;
                    const scale = getPreviewScale(width, height);
                    const previewW = Math.round(width * scale);
                    const previewH = Math.round(height * scale);
                    const zoom = Math.round(scale * 100);
                    const hasLabel = variant.id === masterLabel;

                    // ★ Auto-layout: calculate grid position if not yet positioned
                    const pos = cardPositions[variant.id] ?? autoGridPos(idx, previewW);

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
                            style={{
                                position: 'absolute',
                                left: pos.x,
                                top: pos.y,
                                outline: selectedIds.has(variant.id) ? '2px solid #4a9eff' : '2px solid transparent',
                                outlineOffset: -2,
                                transition: 'outline-color 0.15s ease, background 0.15s ease',
                                background: selectedIds.has(variant.id) ? 'rgba(74,158,255,0.06)' : undefined,
                            }}
                        >
                            <div
                                className="banner-card-header"
                                style={{ cursor: draggingId ? 'grabbing' : 'grab' }}
                            >
                                <span className="banner-card-dims">
                                    {width} x {height}
                                    {hasLabel && <span className="banner-card-origin">  MASTER</span>}
                                    {(variant.id in plugConnections) && <span className="banner-card-plugged">  PLUGGED</span>}
                                </span>
                                {selectedIds.has(variant.id) && (
                                    <span style={{
                                        width: 16, height: 16, borderRadius: '50%',
                                        background: '#4a9eff', display: 'inline-flex', alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    </span>
                                )}
                            </div>

                            {/* Scaled preview */}
                            <div
                                className="banner-card-preview"
                                style={{ width: previewW, height: previewH, overflow: 'hidden' }}
                            >
                                <div
                                    className="banner-card-canvas"
                                    style={{
                                        width,
                                        height,
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'top left',
                                        backgroundColor: (() => {
                                            // Smart background: find first full-canvas shape
                                            if (variant.backgroundColor && variant.backgroundColor !== '#FFFFFF') return variant.backgroundColor;
                                            const bgShape = variant.elements.find(
                                                (el) => el.type === 'shape'
                                                    && (el.constraints?.vertical?.offset ?? 0) === 0
                                                    && (el.constraints?.size?.height ?? 0) >= height * 0.8
                                            ) as import('@/schema/elements.types').ShapeElement | undefined;
                                            // Don't set backgroundColor when gradient exists — the shape element handles it
                                            if (bgShape?.gradientStart && bgShape?.gradientEnd) return 'transparent';
                                            return bgShape?.fill || variant.backgroundColor || '#FFFFFF';
                                        })(),
                                    }}
                                >
                                    {/* Render elements sorted by zIndex for correct layering */}
                                    {[...variant.elements]
                                        .sort((a, b) => a.zIndex - b.zIndex)
                                        .map((el) => {
                                            const resolved = constraintsToAbsolute(el.constraints, width, height);

                                            // Compute animation style if playing
                                            let animStyle: React.CSSProperties = {};
                                            if (isPlaying && el.animation && el.animation.preset !== 'none') {
                                                animStyle = computeAnimStyle(
                                                    el.animation.preset as AnimPresetType,
                                                    currentTime,
                                                    el.animation.duration,
                                                    el.animation.startTime,
                                                );
                                            }

                                            // ★ Shape background: support gradients (CSS linear-gradient)
                                            const shapeStyle: React.CSSProperties = el.type === 'shape' ? (() => {
                                                const s = el as import('@/schema/elements.types').ShapeElement;
                                                const base: React.CSSProperties = { borderRadius: s.borderRadius ?? 0 };
                                                if (s.gradientStart && s.gradientEnd) {
                                                    base.background = `linear-gradient(${s.gradientAngle ?? 135}deg, ${s.gradientStart}, ${s.gradientEnd})`;
                                                } else {
                                                    base.backgroundColor = s.fill || '#ccc';
                                                }
                                                return base;
                                            })() : {};

                                            return (
                                                <div
                                                    key={el.id}
                                                    className="banner-element"
                                                    style={{
                                                        position: 'absolute',
                                                        left: resolved.x,
                                                        top: resolved.y,
                                                        width: resolved.w,
                                                        height: resolved.h,
                                                        opacity: el.opacity,
                                                        zIndex: el.zIndex,
                                                        transition: isPlaying ? 'none' : undefined,
                                                        ...animStyle,
                                                        ...shapeStyle,
                                                        ...(el.type === 'text' ? { color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, fontStyle: el.fontStyle ?? 'normal', display: 'flex', alignItems: 'flex-start', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start', overflow: 'visible', whiteSpace: 'normal' as const, wordBreak: 'break-word' as const, lineHeight: el.lineHeight ?? 1.2, letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined, textAlign: el.textAlign as 'left' | 'center' | 'right' } : {}),
                                                        ...(el.type === 'button' ? { backgroundColor: el.backgroundColor, borderRadius: el.borderRadius ?? 0, color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}),
                                                        ...(el.type === 'image' ? { overflow: 'hidden' } : {}),
                                                        ...(el.type === 'video' ? { overflow: 'hidden' } : {}),
                                                    }}
                                                >
                                                    {el.type === 'text' && el.content}
                                                    {el.type === 'button' && el.label}
                                                    {el.type === 'image' && (() => {
                                                        // ★ Use resolved blob URL for idb:// images
                                                        const imgSrc = resolvedImageUrls[el.id] || (el.src?.startsWith('idb://') ? '' : el.src);
                                                        return imgSrc ? (
                                                            <img
                                                                src={imgSrc}
                                                                alt=""
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: el.fit || 'cover',
                                                                    display: 'block',
                                                                }}
                                                            />
                                                        ) : null;
                                                    })()}
                                                    {el.type === 'video' && (() => {
                                                        const videoSrc = videoUrls[el.id] || el.videoSrc || '';
                                                        return videoSrc ? (
                                                            <video
                                                                ref={(videoEl) => {
                                                                    if (!videoEl) return;
                                                                    const start = el.animation?.startTime ?? 0;
                                                                    const end = start + (el.animation?.duration ?? TIMELINE_DURATION);
                                                                    const localT = Math.max(0, currentTime - start);
                                                                    const inRange = currentTime >= start && currentTime <= end;
                                                                    try {
                                                                        if (isPlaying && inRange) {
                                                                            if (Math.abs(videoEl.currentTime - localT) > 0.3) videoEl.currentTime = localT;
                                                                            if (videoEl.paused) videoEl.play().catch(() => { });
                                                                        } else {
                                                                            if (!videoEl.paused) videoEl.pause();
                                                                            videoEl.currentTime = inRange ? localT : 0;
                                                                        }
                                                                    } catch { /* not ready */ }
                                                                }}
                                                                src={videoSrc}
                                                                poster={el.posterSrc || undefined}
                                                                muted
                                                                playsInline
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: el.fit || 'cover',
                                                                    display: 'block',
                                                                    pointerEvents: 'none',
                                                                }}
                                                            />
                                                        ) : el.posterSrc ? (
                                                            // Fallback: show poster thumbnail while video URL loads from IndexedDB
                                                            <img
                                                                src={el.posterSrc}
                                                                alt="video"
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: el.fit || 'cover',
                                                                    display: 'block',
                                                                }}
                                                            />
                                                        ) : null;
                                                    })()}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Play button overlay — appears on hover */}
                            {!isPlaying && (
                                <div className="banner-card-play-overlay">
                                    <div
                                        className="banner-card-play-btn"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDoubleClick(variant.id);
                                        }}
                                        title="Open in Editor"
                                    >
                                        ▶
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="banner-card-footer">
                                <span className="banner-card-count">{variant.elements.length} elements</span>
                                <span className="banner-card-zoom">{zoom}%</span>
                            </div>
                        </div>
                    );
                })}

                {visibleVariants.length === 0 && (
                    <div className="banner-grid-empty">
                        <p>No sizes visible. Toggle sizes on in the sidebar or add new sizes.</p>
                    </div>
                )}
            </div>

            {/* ── Floating selection action bar ── */}
            {selectedIds.size > 0 && (
                <div style={{
                    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                    background: '#1e2231', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12, padding: '8px 20px', display: 'flex', alignItems: 'center',
                    gap: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1000,
                    fontSize: 12, color: '#e6edf3', backdropFilter: 'blur(12px)',
                }}>
                    <span style={{ fontWeight: 600 }}>{selectedIds.size} selected</span>
                    <button onClick={handleExportSelected} style={{
                        background: 'linear-gradient(135deg, #4a9eff, #6c63ff)', border: 'none',
                        color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 11,
                        fontWeight: 600, cursor: 'pointer',
                    }}>Export Selected</button>
                    <button onClick={clearSelection} style={{
                        background: 'none', border: 'none', color: '#8b949e',
                        fontSize: 14, cursor: 'pointer', padding: '2px 6px',
                    }} title="Clear selection">x</button>
                </div>
            )}

            {/* ── Right-click context menu ── */}
            {ctxMenu && (
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
                        {/* Sub-panel */}
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
                                setCtxMenu(null);
                                const idsToExport = selectedIds.size > 0 ? Array.from(selectedIds) : [ctxMenu.variantId];
                                for (const vid of idsToExport) {
                                    const v = variants.find(v => v.id === vid);
                                    if (!v) continue;
                                    try {
                                        const dataURL = await renderVariantToCanvas(v);
                                        downloadDataURL(dataURL, `banner_${v.preset.width}x${v.preset.height}.png`);
                                        if (idsToExport.length > 1) await new Promise(r => setTimeout(r, 300));
                                    } catch { /* skip */ }
                                }
                            }}>
                                PNG (Static Image){selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}
                            </button>
                            <button className="banner-ctx-item" onClick={() => { setCtxMenu(null); alert('GIF export coming soon'); }}>
                                GIF (Animated)
                            </button>
                            <button className="banner-ctx-item" onClick={() => { setCtxMenu(null); alert('MP4 export coming soon'); }}>
                                MP4 (Video)
                            </button>
                            <button className="banner-ctx-item" onClick={() => { setCtxMenu(null); alert('JS bundle export coming soon'); }}>
                                JS (Interactive Bundle)
                            </button>
                        </div>
                    </div>

                    {/* Export Selected / All */}
                    {selectedIds.size > 1 && (
                        <>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
                            <button className="banner-ctx-item" onClick={handleExportSelected}>
                                Export Selected ({selectedIds.size}) as PNG
                            </button>
                        </>
                    )}
                    <button className="banner-ctx-item" onClick={handleExportAll}>
                        Export All Sizes as PNG
                    </button>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    <button className="banner-ctx-item" onClick={() => { setCtxMenu(null); handleDoubleClick(ctxMenu.variantId); }}>
                        Open in Editor
                    </button>

                    {/* Disconnect plug */}
                    {(ctxMenu.variantId in plugConnections) && (
                        <button
                            className="banner-ctx-item"
                            onClick={() => {
                                useDesignStore.getState().disconnectPlug(ctxMenu.variantId);
                                setCtxMenu(null);
                            }}
                        >
                            Disconnect Plug
                        </button>
                    )}

                    {/* Delete variant(s) — respects multi-selection */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    <button
                        className="banner-ctx-item banner-ctx-item--danger"
                        onClick={() => {
                            const idsToDelete = selectedIds.size > 0 ? Array.from(selectedIds) : [ctxMenu.variantId];
                            const count = idsToDelete.length;
                            const msg = count > 1
                                ? `Are you sure you want to permanently delete ${count} size variants? This cannot be undone.`
                                : 'Are you sure you want to permanently delete this size variant? This cannot be undone.';
                            const confirmed = window.confirm(msg);
                            if (confirmed) {
                                for (const vid of idsToDelete) {
                                    useDesignStore.getState().removeVariant(vid);
                                }
                                setSelectedIds(new Set());
                                setCtxMenu(null);
                            }
                        }}
                    >
                        Delete {selectedIds.size > 1 ? `${selectedIds.size} Sizes` : 'Size'}
                    </button>

                    {/* Label as Master (cosmetic) */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    {ctxMenu.variantId === masterLabel ? (
                        <button
                            className="banner-ctx-item"
                            onClick={() => {
                                useDesignStore.getState().clearMasterLabel();
                                setCtxMenu(null);
                            }}
                        >
                            Remove Master Label
                        </button>
                    ) : (
                        <button
                            className="banner-ctx-item"
                            onClick={() => {
                                useDesignStore.getState().setMasterLabel(ctxMenu.variantId);
                                setCtxMenu(null);
                            }}
                        >
                            Label as Master
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
