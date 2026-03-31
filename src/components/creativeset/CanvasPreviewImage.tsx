// ─────────────────────────────────────────────────
// CanvasPreviewImage — Renders a BannerVariant via Fabric.js → <img>
// ─────────────────────────────────────────────────
// ★ Uses the SAME Fabric.js rendering engine as the Canvas Editor.
// When animations are playing, re-renders at ~10fps with animation
// offsets applied to produce a live animated preview.
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, memo } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import { renderVariantWithFabric } from './fabricHeadlessRenderer';
import { renderVariantAtTime } from '@/engine/fabricVideoExporter';

interface Props {
    variant: BannerVariant;
    resolvedImageUrls: Record<string, string>;
    videoUrls: Record<string, string>;
    scale: number;
    /** Current animation time (seconds). When provided, animations play. */
    currentTime?: number;
}

/** Throttle interval for animated preview (ms). ~10fps is smooth enough. */
const ANIM_RENDER_INTERVAL = 100;

export const CanvasPreviewImage = memo(function CanvasPreviewImage({ variant, resolvedImageUrls, scale, currentTime }: Props) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const renderIdRef = useRef(0);
    const lastAnimRenderRef = useRef(0);
    const animRenderingRef = useRef(false);

    const hasAnimations = variant.elements.some(el => el.animation && el.animation.preset !== 'none');
    const isAnimating = hasAnimations && currentTime !== undefined;

    // ── Static render (no animation or resting state) ──
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

    // ── Animated render: throttled re-render at ~10fps ──
    useEffect(() => {
        if (!isAnimating || currentTime === undefined) return;

        const now = performance.now();
        if (now - lastAnimRenderRef.current < ANIM_RENDER_INTERVAL) return;
        if (animRenderingRef.current) return; // skip if previous render still in progress

        lastAnimRenderRef.current = now;
        animRenderingRef.current = true;

        const resolvedVariant: BannerVariant = {
            ...variant,
            elements: variant.elements.map(el => {
                if (el.type === 'image' && el.src?.startsWith('idb://') && resolvedImageUrls[el.id]) {
                    return { ...el, src: resolvedImageUrls[el.id]! } as typeof el;
                }
                return el;
            }),
        };

        renderVariantAtTime(resolvedVariant, currentTime)
            .then(url => { setDataUrl(url); })
            .catch(() => { /* keep last frame */ })
            .finally(() => { animRenderingRef.current = false; });
    }, [isAnimating, currentTime, variant, resolvedImageUrls]);

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
});
