// ─────────────────────────────────────────────────
// CanvasPreviewImage — Renders a BannerVariant via Fabric.js → <img>
// ─────────────────────────────────────────────────
// ★ Uses SAME Fabric.js engine as Canvas Editor for static renders.
// Animated preview uses CSS transforms for 60fps:
//   1. Render base scene (non-animated elements) — once
//   2. Render each animated element as a sprite — once
//   3. Apply computeAnimStyle() CSS transforms per frame — GPU-accelerated
// ─────────────────────────────────────────────────

import React, { useEffect, useRef, useState, memo } from 'react';
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
    currentTime?: number;
}

interface SpriteData {
    elId: string;
    dataUrl: string;
    x: number; y: number; w: number; h: number;
    preset: string;
    duration: number;
    startTime: number;
}

/** Scale CSS transform pixel values for preview size */
function scaleAnimStyle(style: React.CSSProperties, s: number): React.CSSProperties {
    const result = { ...style };
    if (result.transform && typeof result.transform === 'string') {
        result.transform = result.transform
            .replace(/translateX\(([^)]+)px\)/g, (_, v) => `translateX(${parseFloat(v) * s}px)`)
            .replace(/translateY\(([^)]+)px\)/g, (_, v) => `translateY(${parseFloat(v) * s}px)`);
    }
    return result;
}

export const CanvasPreviewImage = memo(function CanvasPreviewImage({ variant, resolvedImageUrls, scale, currentTime }: Props) {
    const [staticUrl, setStaticUrl] = useState<string | null>(null);
    const [baseUrl, setBaseUrl] = useState<string | null>(null);
    const [sprites, setSprites] = useState<SpriteData[]>([]);
    const [error, setError] = useState(false);
    const renderIdRef = useRef(0);

    const animEls = variant.elements.filter(el => el.animation && el.animation.preset !== 'none');
    const hasAnimations = animEls.length > 0;
    const isAnimating = hasAnimations && currentTime !== undefined;

    // Resolve idb:// URLs in elements
    const resolvedVariant: BannerVariant = {
        ...variant,
        elements: variant.elements.map(el => {
            if (el.type === 'image' && el.src?.startsWith('idb://') && resolvedImageUrls[el.id]) {
                return { ...el, src: resolvedImageUrls[el.id]! } as typeof el;
            }
            return el;
        }),
    };

    // ── Render static scene (all elements, used when not animating) ──
    useEffect(() => {
        const renderId = ++renderIdRef.current;
        renderVariantWithFabric(resolvedVariant)
            .then(url => { if (renderId === renderIdRef.current) setStaticUrl(url); })
            .catch(() => { if (renderId === renderIdRef.current) setError(true); });
        return () => { renderIdRef.current++; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant.id, variant.elements, resolvedImageUrls]);

    // ── Render base (non-animated) + sprites (animated elements individually) ──
    useEffect(() => {
        if (!hasAnimations) return;
        let cancelled = false;

        (async () => {
            const { width: w, height: h } = variant.preset;
            const animIds = new Set(animEls.map(el => el.id));

            // Base: variant without animated elements
            const baseVariant: BannerVariant = {
                ...resolvedVariant,
                elements: resolvedVariant.elements.filter(el => !animIds.has(el.id)),
            };
            try {
                const bUrl = await renderVariantWithFabric(baseVariant);
                if (!cancelled) setBaseUrl(bUrl);
            } catch { /* keep null */ }

            // Sprites: each animated element alone on transparent bg
            const newSprites: SpriteData[] = [];
            for (const el of animEls) {
                if (cancelled) break;
                const resolvedEl = resolvedVariant.elements.find(e => e.id === el.id) ?? el;
                const spriteVariant: BannerVariant = {
                    ...resolvedVariant,
                    backgroundColor: 'rgba(0,0,0,0)',
                    elements: [resolvedEl],
                };
                try {
                    const sUrl = await renderVariantWithFabric(spriteVariant);
                    const abs = constraintsToAbsolute(el.constraints, w, h);
                    newSprites.push({
                        elId: el.id, dataUrl: sUrl,
                        x: abs.x, y: abs.y, w: abs.w, h: abs.h,
                        preset: el.animation!.preset,
                        duration: el.animation!.duration ?? 0.6,
                        startTime: el.animation!.startTime ?? 0,
                    });
                } catch { /* skip */ }
            }
            if (!cancelled) setSprites(newSprites);
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant.id, variant.elements, resolvedImageUrls, hasAnimations]);

    const { width, height } = variant.preset;

    if (error) {
        return (
            <div style={{ width: width * scale, height: height * scale, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 11 }}>
                Preview unavailable
            </div>
        );
    }

    if (!staticUrl) {
        return (
            <div style={{ width: width * scale, height: height * scale, background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 20, height: 20, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
        );
    }

    // ── Not animating: show full static image ──
    if (!isAnimating || !baseUrl) {
        return <img src={staticUrl} alt={`${width}x${height}`} width={width * scale} height={height * scale} style={{ display: 'block' }} draggable={false} />;
    }

    // ── Animating: base image + animated sprite overlays with CSS transforms ──
    return (
        <div style={{ position: 'relative', width: width * scale, height: height * scale, overflow: 'hidden' }}>
            <img src={baseUrl} alt="base" width={width * scale} height={height * scale} style={{ display: 'block' }} draggable={false} />
            {sprites.map(sprite => {
                const animStyle = computeAnimStyle(sprite.preset as AnimPresetType, currentTime, sprite.duration, sprite.startTime);
                // Scale transform pixel values to match preview size
                const scaledStyle = scaleAnimStyle(animStyle, scale);
                return (
                    <img
                        key={sprite.elId}
                        src={sprite.dataUrl}
                        alt=""
                        width={width * scale}
                        height={height * scale}
                        style={{
                            position: 'absolute', left: 0, top: 0,
                            width: width * scale, height: height * scale,
                            ...scaledStyle,
                            pointerEvents: 'none',
                            willChange: 'transform, opacity',
                        }}
                        draggable={false}
                    />
                );
            })}
        </div>
    );
});
