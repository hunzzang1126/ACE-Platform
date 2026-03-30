// ─────────────────────────────────────────────────
// CanvasPreviewImage — Renders a BannerVariant via Fabric.js → <img>
// ─────────────────────────────────────────────────
// ★ Uses the SAME Fabric.js rendering engine as the Canvas Editor.
// This guarantees: Canvas Editor == Size Dashboard preview == Export.
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, memo } from 'react';
import type { BannerVariant } from '@/schema/design.types';
import { renderVariantWithFabric } from './fabricHeadlessRenderer';

interface Props {
    variant: BannerVariant;
    /** Resolved blob URLs for idb:// image references */
    resolvedImageUrls: Record<string, string>;
    /** Resolved blob URLs for video elements */
    videoUrls: Record<string, string>;
    /** CSS scale to fit preview container */
    scale: number;
}

/**
 * Renders a BannerVariant using Canvas2D and displays as an <img>.
 * This ensures Size Dashboard preview matches PNG export exactly,
 * since both use renderVariantWithFabric().
 */
export const CanvasPreviewImage = memo(function CanvasPreviewImage({ variant, resolvedImageUrls, scale }: Props) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const renderIdRef = useRef(0);

    useEffect(() => {
        const renderId = ++renderIdRef.current;

        // Build a variant with resolved image URLs for rendering
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
        // Re-render when elements change
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
