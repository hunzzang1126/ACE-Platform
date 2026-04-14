// ─────────────────────────────────────────────────
// ProjectThumbnail — Mini CSS preview of creative set contents
// ─────────────────────────────────────────────────
// Reads element data from designStore to render a simplified
// preview of the master variant using actual colors and positions.
// Falls back to generic rectangle grid when no data is available.
// ─────────────────────────────────────────────────

import { useMemo } from 'react';
import { useDesignStore } from '@/stores/designStore';

interface ProjectThumbnailProps {
    setId: string;
    width?: number;
    height?: number;
}

interface MiniElement {
    x: number; y: number; w: number; h: number;
    color: string; borderRadius?: number; isText?: boolean;
}

export function ProjectThumbnail({ setId, width = 160, height = 100 }: ProjectThumbnailProps) {
    const elements = useMemo(() => {
        const cs = useDesignStore.getState().allCreativeSets[setId];
        if (!cs) return null;

        const master = cs.variants.find(v => v.id === cs.masterVariantId) ?? cs.variants[0];
        if (!master?.elements?.length) return null;

        const cw = master.width || 300;
        const ch = master.height || 250;
        const scaleX = width / cw;
        const scaleY = height / ch;

        const miniElements: MiniElement[] = master.elements.slice(0, 8).map(el => {
            const constraints = el.constraints;
            // Use constraint data for position — simplified absolute fallback
            const x = (constraints?.x?.value ?? 0) * scaleX;
            const y = (constraints?.y?.value ?? 0) * scaleY;
            const w = (constraints?.width?.value ?? 50) * scaleX;
            const h = (constraints?.height?.value ?? 30) * scaleY;

            let color = '#a0a0a0';
            if (el.fill) color = el.fill;
            else if (el.backgroundColor) color = el.backgroundColor;

            return {
                x: Math.max(0, x),
                y: Math.max(0, y),
                w: Math.max(4, Math.min(w, width)),
                h: Math.max(2, Math.min(h, height)),
                color,
                borderRadius: el.type === 'rounded_rect' || el.type === 'ellipse' ? 2 : 0,
                isText: el.type === 'text',
            };
        });

        return { elements: miniElements, bgColor: master.backgroundColor || '#1a1a2e' };
    }, [setId, width, height]);

    // Fallback: generic placeholder
    if (!elements) {
        return (
            <div style={{
                width, height, borderRadius: 4,
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

    return (
        <div style={{
            width, height, borderRadius: 4, overflow: 'hidden',
            position: 'relative', background: elements.bgColor,
        }}>
            {elements.elements.map((el, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: el.x, top: el.y,
                    width: el.w, height: el.h,
                    background: el.isText ? 'transparent' : el.color,
                    borderRadius: el.borderRadius,
                    ...(el.isText ? {
                        borderBottom: `2px solid ${el.color}`,
                        opacity: 0.7,
                    } : {}),
                }} />
            ))}
        </div>
    );
}
