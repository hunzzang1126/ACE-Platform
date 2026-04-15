// ─────────────────────────────────────────────────
// smartSizingHelpers — Role-aware element builders
// ─────────────────────────────────────────────────
// Extracted from smartSizing.ts for file size compliance.
// ─────────────────────────────────────────────────

import type { DesignElement } from '@/schema/elements.types';
import { detectElementRole } from './smartSizingTypes';
import type { ElementRole } from './smartSizingTypes';

/**
 * ★ Get the effective role for an element.
 * Priority: persisted el.role (Vision AI) → heuristic detectElementRole.
 */
export function getEffectiveRole(el: DesignElement, canvasW: number, canvasH: number): ElementRole {
    if (el.role) {
        const LAYOUT_TO_ELEMENT: Record<string, ElementRole> = {
            background: 'background', hero: 'image', logo: 'logo',
            headline: 'headline', subline: 'subtext', cta: 'cta',
            tnc: 'subtext', accent: 'decoration', detail: 'subtext', badge: 'decoration',
        };
        return LAYOUT_TO_ELEMENT[el.role] ?? detectElementRole(el, canvasW, canvasH);
    }
    return detectElementRole(el, canvasW, canvasH);
}

/**
 * Build a cover-fill element (background images/shapes → fill entire canvas).
 */
export function buildCoverFill(
    el: DesignElement,
    abs: { x: number; y: number; w: number; h: number },
    targetW: number, targetH: number,
): DesignElement {
    let bgW = targetW, bgH = targetH, bgX = 0, bgY = 0;
    if (el.type === 'image' && abs.w > 0 && abs.h > 0) {
        const imgAspect = abs.w / abs.h;
        const canvasAspect = targetW / targetH;
        if (imgAspect > canvasAspect) {
            bgH = targetH; bgW = Math.round(targetH * imgAspect);
            bgX = -Math.round((bgW - targetW) / 2);
        } else {
            bgW = targetW; bgH = Math.round(targetW / imgAspect);
            bgY = -Math.round((bgH - targetH) / 2);
        }
    }
    return {
        ...JSON.parse(JSON.stringify(el)),
        constraints: {
            horizontal: { anchor: 'left' as const, offset: bgX },
            vertical: { anchor: 'top' as const, offset: bgY },
            size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: bgW, height: bgH },
            rotation: el.constraints.rotation,
        },
    } as DesignElement;
}

/**
 * Build a fixed-size, corner-pinned logo element.
 * Preserves aspect ratio, scales proportionally, maintains relative corner position.
 */
export function buildLogoPinned(
    el: DesignElement,
    abs: { x: number; y: number; w: number; h: number },
    originW: number, originH: number,
    targetW: number, targetH: number,
    uniformScale: number,
): DesignElement {
    const aspect = abs.w / abs.h;
    const newH = Math.max(16, Math.round(abs.h * uniformScale));
    const newW = Math.round(newH * aspect);

    // Preserve relative position (e.g. bottom-right corner stays bottom-right)
    const relX = abs.x / originW;
    const relY = abs.y / originH;
    const newX = Math.round(relX * targetW);
    const newY = Math.round(relY * targetH);

    // Clamp to canvas bounds
    const clampedX = Math.min(newX, targetW - newW - 4);
    const clampedY = Math.min(newY, targetH - newH - 4);

    return {
        ...JSON.parse(JSON.stringify(el)),
        constraints: {
            horizontal: { anchor: 'left' as const, offset: Math.max(4, clampedX) },
            vertical: { anchor: 'top' as const, offset: Math.max(4, clampedY) },
            size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: newW, height: newH },
            rotation: el.constraints.rotation,
        },
    } as DesignElement;
}
