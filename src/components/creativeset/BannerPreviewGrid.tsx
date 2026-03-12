// ─────────────────────────────────────────────────
// BannerPreviewGrid – Scaled banner preview cards
// with animated preview + auto-loop + right-click export
// ─────────────────────────────────────────────────
import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BannerVariant } from '@/schema/design.types';
import { resolveConstraints } from '@/schema/constraints.types';
import { computeAnimStyle, type AnimPresetType } from '@/hooks/useAnimationPresets';
import { loadVideoBlob } from '@/stores/videoStorage';
import type { SmartCheckStatus } from '@/hooks/useSmartCheck';

interface ContextMenuState {
    x: number;
    y: number;
    variantId: string;
}

/** Capture a banner card DOM element to a PNG data URL */
async function captureBannerCard(cardEl: HTMLElement, w: number, h: number): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Use html serialization + foreignObject as fallback
    const data = new XMLSerializer().serializeToString(cardEl);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${data}</div></foreignObject></svg>`;
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve) => {
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            // Fallback: draw background + simple rendering
            ctx.fillStyle = '#1a1f2e';
            ctx.fillRect(0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = url;
    });
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
        const cardEl = cardRefs.current[variantId]?.querySelector('.banner-card-canvas') as HTMLElement;
        if (!cardEl) return;
        try {
            const dataURL = await captureBannerCard(cardEl, variant.preset.width, variant.preset.height);
            downloadDataURL(dataURL, `banner_${variant.preset.width}x${variant.preset.height}.png`);
        } catch {
            alert('Export failed. Try again.');
        }
    }, [variants]);

    // ── Export ALL sizes as PNGs ──
    const handleExportAll = useCallback(async () => {
        setCtxMenu(null);
        for (const variant of visibleVariants) {
            const cardEl = cardRefs.current[variant.id]?.querySelector('.banner-card-canvas') as HTMLElement;
            if (!cardEl) continue;
            try {
                const dataURL = await captureBannerCard(cardEl, variant.preset.width, variant.preset.height);
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
            const cardEl = cardRefs.current[variant.id]?.querySelector('.banner-card-canvas') as HTMLElement;
            if (!cardEl) continue;
            try {
                const dataURL = await captureBannerCard(cardEl, variant.preset.width, variant.preset.height);
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

            <div className="banner-grid">
                {visibleVariants.map((variant) => {
                    const { width, height } = variant.preset;
                    const scale = getPreviewScale(width, height);
                    const previewW = Math.round(width * scale);
                    const previewH = Math.round(height * scale);
                    const zoom = Math.round(scale * 100);
                    const isMaster = variant.id === masterVariantId;

                    return (
                        <div
                            key={variant.id}
                            ref={(el) => { cardRefs.current[variant.id] = el; }}
                            className={`banner-card ${isPlaying ? 'banner-card--playing' : ''} ${selectedIds.has(variant.id) ? 'banner-card--selected' : ''}`}
                            onClick={(e) => toggleSelection(variant.id, e)}
                            onDoubleClick={() => handleDoubleClick(variant.id)}
                            onContextMenu={(e) => handleContextMenu(e, variant.id)}
                            style={{
                                outline: selectedIds.has(variant.id) ? '2px solid #4a9eff' : '2px solid transparent',
                                outlineOffset: -2,
                                transition: 'outline-color 0.15s ease, background 0.15s ease',
                                background: selectedIds.has(variant.id) ? 'rgba(74,158,255,0.06)' : undefined,
                            }}
                        >
                            <div className="banner-card-header">
                                <span className="banner-card-dims">
                                    {width} x {height}
                                    {isMaster && <span className="banner-card-master">  M</span>}
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
                                            const resolved = resolveConstraints(el.constraints, width, height);

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
                                                        width: resolved.width,
                                                        height: resolved.height,
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
                                <div
                                    className="banner-card-play-overlay"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDoubleClick(variant.id);
                                    }}
                                    title="Open editor to preview animation"
                                >
                                    <div className="banner-card-play-btn">▶</div>
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
                            <span style={{ color: '#484f58', fontSize: 11, marginLeft: 12 }}>&#9654;</span>
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
                            <button className="banner-ctx-item" onClick={() => handleExportPNG(ctxMenu.variantId)}>
                                PNG (Static Image)
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
                </div>
            )}
        </div>
    );
}
