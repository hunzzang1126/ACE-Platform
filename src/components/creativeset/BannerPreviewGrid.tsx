// ─────────────────────────────────────────────────
// BannerPreviewGrid – Scaled banner preview cards
// ─────────────────────────────────────────────────
import { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BannerVariant } from '@/schema/design.types';
import { resolveConstraints } from '@/schema/constraints.types';

interface Props {
    variants: BannerVariant[];
    visibleIds: Set<string>;
    masterVariantId: string;
}

// Max preview card dimension in px
const MAX_PREVIEW_WIDTH = 280;
const MAX_PREVIEW_HEIGHT = 360;

function getPreviewScale(w: number, h: number) {
    const scaleW = MAX_PREVIEW_WIDTH / w;
    const scaleH = MAX_PREVIEW_HEIGHT / h;
    return Math.min(scaleW, scaleH, 1);
}

export function BannerPreviewGrid({ variants, visibleIds, masterVariantId }: Props) {
    const navigate = useNavigate();

    const visibleVariants = useMemo(
        () => variants.filter((v) => visibleIds.has(v.id)),
        [variants, visibleIds],
    );

    const handleDoubleClick = useCallback((variantId: string) => {
        navigate(`/editor/detail/${variantId}`);
    }, [navigate]);

    return (
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
                        className="banner-card"
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
                            style={{ width: previewW, height: previewH }}
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
    );
}
