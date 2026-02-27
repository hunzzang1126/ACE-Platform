// ─────────────────────────────────────────────────
// BannerPreviewGrid – Scaled banner preview cards
// with animated preview + Play All (BannerFlow-like)
// ─────────────────────────────────────────────────
import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BannerVariant } from '@/schema/design.types';
import { resolveConstraints } from '@/schema/constraints.types';
import { computeAnimStyle, type AnimPresetType } from '@/hooks/useAnimationPresets';
import type { QAStatus } from '@/hooks/useVisionQA';

interface Props {
    variants: BannerVariant[];
    visibleIds: Set<string>;
    masterVariantId: string;
    onRunAIQA?: () => void;
    qaStatus?: QAStatus;
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

export function BannerPreviewGrid({ variants, visibleIds, masterVariantId, onRunAIQA, qaStatus }: Props) {
    const navigate = useNavigate();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const visibleVariants = useMemo(
        () => variants.filter((v) => visibleIds.has(v.id)),
        [variants, visibleIds],
    );

    // ── Play All animation loop ──
    useEffect(() => {
        if (!isPlaying) return;
        startTimeRef.current = performance.now() / 1000;

        const frame = () => {
            const now = performance.now() / 1000;
            const elapsed = now - startTimeRef.current;
            // Seamless infinite loop — modulo wraps around without any reset
            setCurrentTime(elapsed % TIMELINE_DURATION);
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);

        return () => cancelAnimationFrame(rafRef.current);
    }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePlayAll = useCallback(() => {
        if (isPlaying) {
            setIsPlaying(false);
            setCurrentTime(0);
        } else {
            setCurrentTime(0);
            setIsPlaying(true);
        }
    }, [isPlaying]);

    const handleDoubleClick = useCallback((variantId: string) => {
        navigate(`/editor/detail/${variantId}`);
    }, [navigate]);

    // Check if any element across all visible variants has an animation
    const hasAnyAnimation = useMemo(() => {
        return visibleVariants.some((v) =>
            v.elements.some((el) => el.animation && el.animation.preset !== 'none'),
        );
    }, [visibleVariants]);

    return (
        <div className="banner-grid-wrapper">
            {/* Play All controls */}
            <div className="banner-grid-toolbar">
                <button
                    className={`banner-play-all-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={handlePlayAll}
                    title={isPlaying ? 'Stop all previews' : 'Play all previews simultaneously'}
                >
                    {isPlaying ? '■ Stop' : '▶ Play All'}
                </button>
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
                {/* AI QA Button */}
                {onRunAIQA && (
                    <button
                        className="banner-ai-qa-btn"
                        onClick={onRunAIQA}
                        disabled={qaStatus === 'capturing' || qaStatus === 'analyzing'}
                        title="Run AI Vision QA on all sizes"
                    >
                        🤖 AI QA
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
                            className={`banner-card ${isPlaying ? 'banner-card--playing' : ''}`}
                            onDoubleClick={() => handleDoubleClick(variant.id)}
                        >
                            {/* Dimension label */}
                            <div className="banner-card-header">
                                <span className="banner-card-dims">
                                    {width} × {height}
                                    {isMaster && <span className="banner-card-master"> ✓</span>}
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
                                        backgroundColor: variant.backgroundColor || '#FFFFFF',
                                    }}
                                >
                                    {/* Render elements as colored divs */}
                                    {variant.elements.map((el) => {
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
                                                    zIndex: el.zIndex,
                                                    transition: isPlaying ? 'none' : undefined,
                                                    ...animStyle,
                                                    ...(el.type === 'shape' ? { backgroundColor: el.fill || '#ccc', borderRadius: el.borderRadius ?? 0 } : {}),
                                                    ...(el.type === 'text' ? { color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, display: 'flex', alignItems: 'center', justifyContent: el.textAlign === 'center' ? 'center' : 'flex-start', overflow: 'visible', whiteSpace: 'nowrap' as const, lineHeight: 1.1 } : {}),
                                                    ...(el.type === 'button' ? { backgroundColor: el.backgroundColor, borderRadius: el.borderRadius ?? 0, color: el.color, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}),
                                                    ...(el.type === 'image' ? { backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' } : {}),
                                                }}
                                            >
                                                {el.type === 'text' && el.content}
                                                {el.type === 'button' && el.label}
                                                {el.type === 'image' && '🖼'}
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
                                    <span className="banner-card-count">🎨 {variant.elements.length}</span>
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
        </div>
    );
}
