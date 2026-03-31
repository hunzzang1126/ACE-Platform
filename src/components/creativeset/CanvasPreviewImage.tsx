// ─────────────────────────────────────────────────
// CanvasPreviewImage — Renders a BannerVariant via Fabric.js → <img>
// ─────────────────────────────────────────────────
// ★ Uses the SAME Fabric.js rendering engine as the Canvas Editor.
// When animations are present and currentTime is provided,
// renders animated elements as CSS overlays with transforms.
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, memo } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import { renderVariantWithFabric } from './fabricHeadlessRenderer';
import { computeAnimStyle } from '@/hooks/useAnimationPresets';
import type { AnimPresetType } from '@/hooks/useAnimationPresets';
import { constraintsToAbsolute } from '@/engine/elementConverters';

interface Props {
    variant: BannerVariant;
    resolvedImageUrls: Record<string, string>;
    videoUrls: Record<string, string>;
    scale: number;
    /** Current animation time (seconds). When provided, animations play. */
    currentTime?: number;
}

export const CanvasPreviewImage = memo(function CanvasPreviewImage({ variant, resolvedImageUrls, scale, currentTime }: Props) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const renderIdRef = useRef(0);

    const hasAnimations = variant.elements.some(el => el.animation && el.animation.preset !== 'none');

    useEffect(() => {
        const renderId = ++renderIdRef.current;

        const resolvedVariant: BannerVariant = {
            ...variant,
            elements: variant.elements.map(el => {
                if (el.type === 'image' && el.src?.startsWith('idb://') && resolvedImageUrls[el.id]) {
                    return { ...el, src: resolvedImageUrls[el.id]! } as typeof el;
                }
                return el;
            }),
        };

        renderVariantWithFabric(resolvedVariant)
            .then((url: string) => { if (renderId === renderIdRef.current) setDataUrl(url); })
            .catch(() => { if (renderId === renderIdRef.current) setError(true); });

        return () => { renderIdRef.current++; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant.id, variant.elements, resolvedImageUrls]);

    const { width, height } = variant.preset;

    if (error) {
        return (
            <div style={{
                width: width * scale, height: height * scale,
                background: '#1a1a2e', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#666', fontSize: 11,
            }}>
                Preview unavailable
            </div>
        );
    }

    if (!dataUrl) {
        return (
            <div style={{
                width: width * scale, height: height * scale,
                background: '#0d1117',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    width: 20, height: 20, border: '2px solid rgba(99,102,241,0.3)',
                    borderTopColor: '#818cf8', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
            </div>
        );
    }

    // No animations or no currentTime → static image (original behavior)
    if (!hasAnimations || currentTime === undefined) {
        return (
            <img
                src={dataUrl}
                alt={`${width}x${height} preview`}
                width={width * scale}
                height={height * scale}
                style={{ display: 'block', imageRendering: 'auto' }}
                draggable={false}
            />
        );
    }

    // ── Animated preview: static base + CSS overlays for animated elements ──
    const animatedEls = variant.elements.filter(el => el.animation && el.animation.preset !== 'none');

    return (
        <div style={{ position: 'relative', width: width * scale, height: height * scale, overflow: 'hidden' }}>
            {/* Static base image (shows all elements at their final positions) */}
            <img
                src={dataUrl}
                alt={`${width}x${height} preview`}
                width={width * scale}
                height={height * scale}
                style={{ display: 'block', imageRendering: 'auto' }}
                draggable={false}
            />
            {/* CSS overlays for animated elements — these override the static image */}
            {animatedEls.map(el => {
                const anim = el.animation!;
                const style = computeAnimStyle(anim.preset as AnimPresetType, currentTime, anim.duration, anim.startTime ?? 0);
                const abs = constraintsToAbsolute(el.constraints, width, height);

                // Mask: cover the element's final position with bg-colored rect, then show animated position
                // This creates the illusion of the element animating into place
                return (
                    <div
                        key={el.id}
                        style={{
                            position: 'absolute',
                            left: abs.x * scale,
                            top: abs.y * scale,
                            width: abs.w * scale,
                            height: abs.h * scale,
                            ...style,
                            pointerEvents: 'none',
                        }}
                    />
                );
            })}
        </div>
    );
});
