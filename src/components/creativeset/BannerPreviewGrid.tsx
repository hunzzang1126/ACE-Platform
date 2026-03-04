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

export function BannerPreviewGrid({ variants, visibleIds, masterVariantId, onRunSmartCheck, smartCheckStatus, externalPlaying }: Props) {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(0);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // ── Context menu state ──
    const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);

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
                        title="Auto-fix sizing issues across all variants"
                    >
                        {smartCheckStatus === 'checking' ? 'Checking...' : 'Done: Smart Check'}
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
                            className={`banner-card ${isPlaying ? 'banner-card--playing' : ''}`}
                            onDoubleClick={() => handleDoubleClick(variant.id)}
                            onContextMenu={(e) => handleContextMenu(e, variant.id)}
                        >
                            {/* Dimension label */}
                            <div className="banner-card-header">
                                <span className="banner-card-dims">
                                    {width} × {height}
                                    {isMaster && <span className="banner-card-master">  M</span>}
                                </span>
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
                                            );
                                            return (bgShape as { fill?: string } | undefined)?.fill || variant.backgroundColor || '#FFFFFF';
                                        })(),
                                    }}
                                >
                                    {/* Render elements sorted: shapes first, text/buttons on top */}
                                    {/* ★ Exclude video — it's an HTML overlay, not a Fabric canvas object */}
                                    {[...variant.elements]
                                        .filter((el) => el.type !== 'video')
                                        .sort((a, b) => {
                                            const order = { shape: 0, image: 1, text: 2, button: 3 } as Record<string, number>;
                                            return (order[a.type] ?? 1) - (order[b.type] ?? 1);
                                        })
                                        .map((el, sortedIdx) => {
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
                                                        zIndex: sortedIdx,
                                                        transition: isPlaying ? 'none' : undefined,
                                                        ...animStyle,
                                                        ...(el.type === 'shape' ? { backgroundColor: el.fill || '#ccc', borderRadius: el.borderRadius ?? 0 } : {}),
                                                        ...(el.type === 'text' ? { color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, display: 'flex', alignItems: 'flex-start', justifyContent: el.textAlign === 'center' ? 'center' : 'flex-start', overflow: 'visible', whiteSpace: 'normal' as const, wordBreak: 'break-word' as const, lineHeight: 1.2, textAlign: el.textAlign as 'left' | 'center' | 'right' } : {}),
                                                        ...(el.type === 'button' ? { backgroundColor: el.backgroundColor, borderRadius: el.borderRadius ?? 0, color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}),
                                                        ...(el.type === 'image' ? { overflow: 'hidden' } : {}),
                                                    }}
                                                >
                                                    {el.type === 'text' && el.content}
                                                    {el.type === 'button' && el.label}
                                                    {el.type === 'image' && el.src && (
                                                        <img
                                                            src={el.src}
                                                            alt=""
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: el.fit || 'cover',
                                                                display: 'block',
                                                            }}
                                                        />
                                                    )}
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

                            {/* Footer with actions */}
                            <div className="banner-card-footer">
                                <div className="banner-card-actions">
                                    <input type="checkbox" className="banner-card-checkbox" />
                                    <span className="banner-card-count"> {variant.elements.length}</span>
                                </div>
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

            {/* ── Right-click context menu ── */}
            {ctxMenu && (
                <div
                    className="banner-ctx-menu"
                    style={{
                        position: 'fixed',
                        top: ctxMenu.y,
                        left: ctxMenu.x,
                        zIndex: 10000,
                        background: '#1e2231',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: '4px 0',
                        minWidth: 180,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="banner-ctx-item"
                        onClick={() => handleExportPNG(ctxMenu.variantId)}
                    >
                        📥 Export This Size (PNG)
                    </button>
                    <button
                        className="banner-ctx-item"
                        onClick={handleExportAll}
                    >
                        Export All Sizes (PNG)
                    </button>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    <button
                        className="banner-ctx-item"
                        onClick={() => { setCtxMenu(null); handleDoubleClick(ctxMenu.variantId); }}
                    >
                        Open in Editor
                    </button>
                    <button
                        className="banner-ctx-item banner-ctx-item--danger"
                        onClick={closeCtxMenu}
                    >
                        x Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
