// ─────────────────────────────────────────────────
// ProjectThumbnail — Mini CSS preview of creative set contents
// ─────────────────────────────────────────────────
// Uses screenshotUrl (pixel-perfect) when available,
// falls back to constraint-based CSS preview.
// ─────────────────────────────────────────────────

import { useMemo } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { constraintsToAbsolute } from '@/engine/elementConverters';
import type { DesignElement, ShapeElement } from '@/schema/elements.types';

interface ProjectThumbnailProps {
    setId: string;
    width?: number;
    height?: number;
}

interface MiniElement {
    x: number; y: number; w: number; h: number;
    background: string; borderRadius?: number; isText?: boolean;
    opacity?: number;
}

export function ProjectThumbnail({ setId, width = 200, height = 120 }: ProjectThumbnailProps) {
    const data = useMemo(() => {
        const cs = useDesignStore.getState().allCreativeSets[setId];
        if (!cs) return null;

        const master = cs.variants.find(v => v.id === cs.masterVariantId) ?? cs.variants[0];
        if (!master) return null;

        const bgColor = master.backgroundColor || '#1a1a2e';

        // ★ If screenshotUrl exists, use it (pixel-perfect fidelity)
        if (master.screenshotUrl) {
            return { screenshot: master.screenshotUrl, bgColor, elements: null };
        }

        if (!master.elements?.length) return { screenshot: null, bgColor, elements: null };

        // ★ FIX: Use preset.width/height, NOT master.width/height (doesn't exist on SizeVariant)
        const cw = master.preset.width;
        const ch = master.preset.height;
        const scaleX = width / cw;
        const scaleY = height / ch;

        // ★ SINGLE RESOLVER: Use constraintsToAbsolute() per rendering pipeline sync rule
        const miniElements: MiniElement[] = master.elements
            .filter((el: DesignElement) => el.visible !== false)
            .sort((a: DesignElement, b: DesignElement) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
            .slice(0, 12)
            .map((el: DesignElement): MiniElement => {
                const abs = constraintsToAbsolute(el.constraints, cw, ch);

                // ★ FIX: Extract correct color based on element type
                let background = '#a0a0a0';
                if (el.type === 'shape') {
                    const shape = el as ShapeElement;
                    if (shape.gradientStart && shape.gradientEnd) {
                        background = `linear-gradient(${shape.gradientAngle ?? 135}deg, ${shape.gradientStart}, ${shape.gradientEnd})`;
                    } else if (shape.fill) {
                        background = shape.fill;
                    }
                } else if (el.type === 'button' && 'backgroundColor' in el) {
                    background = (el as any).backgroundColor || '#6366F1';
                } else if (el.type === 'text' && 'color' in el) {
                    background = (el as any).color || '#ffffff';
                }

                return {
                    x: Math.max(0, abs.x * scaleX),
                    y: Math.max(0, abs.y * scaleY),
                    w: Math.max(2, Math.min(abs.w * scaleX, width)),
                    h: Math.max(1, Math.min(abs.h * scaleY, height)),
                    background,
                    borderRadius: el.type === 'shape' ? Math.round(((el as ShapeElement).borderRadius ?? 0) * Math.min(scaleX, scaleY)) : 0,
                    isText: el.type === 'text',
                    opacity: el.opacity,
                };
            });

        return { screenshot: null, bgColor, elements: miniElements };
    }, [setId, width, height]);

    // Fallback: no data at all
    if (!data) {
        return (
            <div style={{
                width, height, borderRadius: 6,
                background: 'linear-gradient(145deg, rgba(99,102,241,0.06), rgba(45,212,191,0.04))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" opacity={0.4}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
            </div>
        );
    }

    // ★ Best case: screenshot preview (pixel-perfect)
    if (data.screenshot) {
        return (
            <div style={{
                width, height, borderRadius: 6, overflow: 'hidden',
                background: data.bgColor,
            }}>
                <img
                    src={data.screenshot}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                />
            </div>
        );
    }

    // No elements
    if (!data.elements?.length) {
        return (
            <div style={{
                width, height, borderRadius: 6, overflow: 'hidden',
                background: data.bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" opacity={0.3}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
            </div>
        );
    }

    // CSS-based preview (constraint-computed)
    return (
        <div style={{
            width, height, borderRadius: 6, overflow: 'hidden',
            position: 'relative', background: data.bgColor,
        }}>
            {data.elements.map((el, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: el.x, top: el.y,
                    width: el.w, height: el.h,
                    background: el.isText ? 'transparent' : el.background,
                    borderRadius: el.borderRadius,
                    opacity: el.opacity ?? 1,
                    ...(el.isText ? {
                        borderBottom: `2px solid ${el.background}`,
                        opacity: 0.8,
                    } : {}),
                }} />
            ))}
        </div>
    );
}
