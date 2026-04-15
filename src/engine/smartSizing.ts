// ─────────────────────────────────────────────────
// Smart Sizing Engine — Template-Proven Adaptive Layout
// ─────────────────────────────────────────────────
// Types, zones, role detection → smartSizingTypes.ts
// Modes: 'uniform' (center-aligned) | 'edge-pin' (left-gap fixed)
// ─────────────────────────────────────────────────

import type { DesignElement } from '@/schema/elements.types';
import type { ElementConstraints } from '@/schema/constraints.types';
import type { SizingMode } from '@/schema/design.types';
import { constraintsToAbsolute } from './elementConverters';
import type { LayoutRole } from '@/schema/layoutRoles';
import { computeSmartConstraints, getSmartFontSize } from './smartLayout';
import { detectElementRole } from './smartSizingTypes';
import type { ElementRole } from './smartSizingTypes';

// Re-export everything from types module for backward compatibility
export * from './smartSizingTypes';

// ── Role bridge: ElementRole → LayoutRole ──

const ELEMENT_TO_LAYOUT_ROLE: Record<ElementRole, LayoutRole> = {
    background: 'background', headline: 'headline', subtext: 'subline',
    cta: 'cta', logo: 'logo', image: 'hero', decoration: 'accent',
};

function toLayoutRole(elementRole: ElementRole, el: DesignElement): LayoutRole {
    if (el.role) return el.role;
    return ELEMENT_TO_LAYOUT_ROLE[elementRole] ?? 'accent';
}

// ── Constants ──

const MIN_FONT = 8;
const MIN_CTA_HEIGHT = 44;

// ── Role-aware helpers (extracted to smartSizingHelpers.ts) ──
// Re-export for backward compat
export { getEffectiveRole, buildCoverFill, buildLogoPinned } from './smartSizingHelpers';
import { getEffectiveRole, buildCoverFill, buildLogoPinned } from './smartSizingHelpers';

// ── Smart Sizing v8: Polotno-style uniform scale ──

export function smartSizeElements(
    originElements: DesignElement[], originW: number, originH: number,
    targetW: number, targetH: number,
    mode: SizingMode = 'uniform',
): DesignElement[] {
    if (originW === targetW && originH === targetH) return JSON.parse(JSON.stringify(originElements));
    if (mode === 'edge-pin') return edgePinSizeElements(originElements, originW, originH, targetW, targetH);

    const scaleX = targetW / originW;
    const scaleY = targetH / originH;
    const uniformScale = Math.min(scaleX, scaleY);

    const result: DesignElement[] = [];
    const contentElements: Array<{ el: DesignElement; x: number; y: number; w: number; h: number }> = [];

    for (const el of originElements) {
        const abs = constraintsToAbsolute(el.constraints, originW, originH);
        // ★ Use persisted role first (Vision AI tagged), fallback to heuristic
        const role = getEffectiveRole(el, originW, originH);

        if (role === 'background') {
            result.push(buildCoverFill(el, abs, targetW, targetH));
            continue;
        }

        // ★ Logo: fixed size, corner-pinned (aspect ratio preserved)
        if (role === 'logo' && abs.w > 0 && abs.h > 0) {
            result.push(buildLogoPinned(el, abs, originW, originH, targetW, targetH, uniformScale));
            continue;
        }

        const newX = Math.round(abs.x * uniformScale);
        const newY = Math.round(abs.y * uniformScale);
        const newW = Math.max(4, Math.round(abs.w * uniformScale));
        const newH = Math.max(4, Math.round(abs.h * uniformScale));

        const fontPatch: Record<string, unknown> = {};
        if ((el.type === 'text' || el.type === 'button') && (el as any).fontSize) {
            fontPatch.fontSize = Math.max(MIN_FONT, Math.round((el as any).fontSize * uniformScale));
        }
        if ((el as any).borderRadius) fontPatch.borderRadius = Math.round((el as any).borderRadius * uniformScale);

        const scaled = {
            ...JSON.parse(JSON.stringify(el)),
            constraints: { horizontal: { anchor: 'left' as const, offset: newX }, vertical: { anchor: 'top' as const, offset: newY }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: newW, height: newH }, rotation: el.constraints.rotation },
            ...fontPatch,
        } as DesignElement;

        contentElements.push({ el: scaled, x: newX, y: newY, w: newW, h: newH });
        result.push(scaled);
    }

    // Center content group
    if (contentElements.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const { x, y, w, h } of contentElements) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h); }
        const offsetX = Math.round((targetW - (maxX - minX)) / 2 - minX);
        const offsetY = Math.round((targetH - (maxY - minY)) / 2 - minY);
        if (offsetX !== 0 || offsetY !== 0) {
            for (const { el } of contentElements) {
                el.constraints.horizontal = { anchor: 'left' as const, offset: el.constraints.horizontal.offset + offsetX };
                el.constraints.vertical = { anchor: 'top' as const, offset: el.constraints.vertical.offset + offsetY };
            }
        }

        // ★ ROLE-AWARE image positioning (no more blanket centering)
        // Only center images that are explicitly role=hero AND were originally centered.
        // Other images (product shots, decorative) maintain their relative position.
        for (const { el } of contentElements) {
            if (el.type === 'image' && el.role === 'hero') {
                const imgW = el.constraints.size.width;
                el.constraints.horizontal = { anchor: 'left' as const, offset: Math.round((targetW - imgW) / 2) };
            }
        }
    }

    return postStretchTextFit(result, targetW, targetH);
}

// ── Post-processing: text shrink-to-fit + canvas clamp ──

function postStretchTextFit(elements: DesignElement[], targetW: number, targetH: number): DesignElement[] {
    const MARGIN = 4;
    for (const el of elements) {
        const isText = el.type === 'text' || el.type === 'button';
        const textEl = el as any;
        const c = el.constraints;
        if (isText && textEl.fontSize) {
            const lineH = textEl.lineHeight || 1.2;
            if (textEl.fontSize * lineH > c.size.height && c.size.height > 0) {
                textEl.fontSize = Math.max(MIN_FONT, Math.floor(c.size.height / lineH));
            }
        }
        // ★ Skip clamping for elements intentionally larger than canvas (cover fill)
        const overflowsCanvas = c.size.width > targetW || c.size.height > targetH;
        if (overflowsCanvas) continue;

        const x = c.horizontal.offset, y = c.vertical.offset, curW = c.size.width, curH = c.size.height;
        if (x + curW > targetW) c.horizontal = { anchor: 'left' as const, offset: Math.max(MARGIN, targetW - curW - MARGIN) };
        if (x < 0) c.horizontal = { anchor: 'left' as const, offset: MARGIN };
        if (y + curH > targetH) c.vertical = { anchor: 'top' as const, offset: Math.max(MARGIN, targetH - curH - MARGIN) };
        if (y < 0) c.vertical = { anchor: 'top' as const, offset: MARGIN };
    }
    return elements;
}

// ── Edge Pin sizing v2 — adaptive scale with padding ratio preservation ──

function edgePinSizeElements(
    originElements: DesignElement[], originW: number, originH: number,
    targetW: number, targetH: number,
): DesignElement[] {
    const result: DesignElement[] = [];
    const nonBgElements: DesignElement[] = [];

    // ── 0. Process backgrounds first (cover fill) ──
    for (const el of originElements) {
        const role = getEffectiveRole(el, originW, originH);
        if (role === 'background') {
            const abs = constraintsToAbsolute(el.constraints, originW, originH);
            result.push(buildCoverFill(el, abs, targetW, targetH));
        } else {
            nonBgElements.push(el);
        }
    }
    if (nonBgElements.length === 0) return result;

    // ── 1. Compute original content group bounding box ──
    const absList = nonBgElements.map(el => ({
        el, abs: constraintsToAbsolute(el.constraints, originW, originH),
    }));
    const groupLeft = Math.min(...absList.map(a => a.abs.x));
    const groupTop = Math.min(...absList.map(a => a.abs.y));
    const groupRight = Math.max(...absList.map(a => a.abs.x + a.abs.w));
    const groupBottom = Math.max(...absList.map(a => a.abs.y + a.abs.h));
    const groupW = groupRight - groupLeft;
    const groupH = groupBottom - groupTop;

    // ── 2. Compute padding RATIOS from original canvas ──
    const leftRatio = groupLeft / originW;     // e.g. 20/300 = 6.7%
    const topRatio = groupTop / originH;       // e.g. 30/250 = 12%

    // ── 3. Compute adaptive scale ──
    // baseScale: guaranteed no-overflow scale
    const baseScale = Math.min(targetW / originW, targetH / originH);

    // Available space in target after applying padding ratios
    const availableW = targetW * (1 - leftRatio * 2); // symmetric padding approximation
    const availableH = targetH * (1 - topRatio * 2);

    // How much can we boost beyond baseScale while staying within available space?
    const boostW = groupW > 0 ? availableW / (groupW * baseScale) : 1;
    const boostH = groupH > 0 ? availableH / (groupH * baseScale) : 1;
    const boost = Math.min(boostW, boostH, 2.0); // cap at 2x to prevent absurd scaling

    const finalScale = baseScale * Math.max(1, boost); // never scale DOWN below baseScale

    // ── 4. Apply target padding from ratios ──
    const targetLeftGap = Math.round(targetW * leftRatio);
    const targetTopGap = Math.round(targetH * topRatio);

    // ── 5. Scale and position each element ──
    const contentItems: Array<{ el: DesignElement; x: number; y: number; w: number; h: number }> = [];

    for (const { el, abs } of absList) {
        // Scale relative to group origin (preserves inter-element distances)
        const relX = abs.x - groupLeft;
        const relY = abs.y - groupTop;
        const newX = Math.round(targetLeftGap + relX * finalScale);
        const newY = Math.round(targetTopGap + relY * finalScale);
        const newW = Math.max(4, Math.round(abs.w * finalScale));
        const newH = Math.max(4, Math.round(abs.h * finalScale));

        const fontPatch: Record<string, unknown> = {};
        if ((el.type === 'text' || el.type === 'button') && (el as any).fontSize) {
            fontPatch.fontSize = Math.max(MIN_FONT, Math.round((el as any).fontSize * finalScale));
        }
        if ((el as any).borderRadius) fontPatch.borderRadius = Math.round((el as any).borderRadius * finalScale);

        const scaled = {
            ...JSON.parse(JSON.stringify(el)),
            constraints: { horizontal: { anchor: 'left' as const, offset: newX }, vertical: { anchor: 'top' as const, offset: newY }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: newW, height: newH }, rotation: el.constraints.rotation },
            ...fontPatch,
        } as DesignElement;

        contentItems.push({ el: scaled, x: newX, y: newY, w: newW, h: newH });
    }

    // ── 6. Vertical centering if content doesn't fill height well ──
    if (contentItems.length > 0) {
        const minY = Math.min(...contentItems.map(c => c.y));
        const maxY = Math.max(...contentItems.map(c => c.y + c.h));
        const scaledGroupH = maxY - minY;
        const idealTopGap = targetTopGap;
        const idealBottomGap = targetH - idealTopGap - scaledGroupH;

        // If bottom gap is negative (overflow), shift up; otherwise center vertically
        if (idealBottomGap < 0) {
            // Overflow: center the group
            const shiftY = Math.round((targetH - scaledGroupH) / 2) - minY;
            for (const { el } of contentItems) {
                el.constraints.vertical = { anchor: 'top' as const, offset: el.constraints.vertical.offset + shiftY };
            }
        }
        // else: padding ratio already applied, no shift needed
    }

    // ★ ROLE-AWARE image positioning (no more blanket centering)
    for (const { el } of contentItems) {
        if (el.type === 'image' && el.role === 'hero') {
            const imgW = el.constraints.size.width;
            el.constraints.horizontal = { anchor: 'left' as const, offset: Math.round((targetW - imgW) / 2) };
        }
    }

    for (const { el } of contentItems) result.push(el);
    return postStretchTextFit(result, targetW, targetH);
}

// ── Cross-category layout (kept for future use) ──

function applyCrossCategoryLayout(
    el: DesignElement, abs: { x: number; y: number; w: number; h: number },
    role: ElementRole, layoutRole: LayoutRole,
    targetW: number, targetH: number, scaleFontRadius: number,
): DesignElement {
    const baseFontSize = (el as { fontSize?: number }).fontSize;
    const smartConstraints = computeSmartConstraints({ role: layoutRole, canvasW: targetW, canvasH: targetH, elWidth: abs.w, elHeight: abs.h, fontSize: baseFontSize });
    const fontPatch: Record<string, unknown> = {};
    if ((el.type === 'text' || el.type === 'button') && baseFontSize) {
        fontPatch.fontSize = Math.max(MIN_FONT, Math.round(Math.max(getSmartFontSize(layoutRole, targetW, targetH), baseFontSize * scaleFontRadius)));
    }
    if ((el as any).borderRadius) fontPatch.borderRadius = Math.round((el as any).borderRadius * scaleFontRadius);
    if (role === 'cta') {
        const resolvedH = smartConstraints.size.heightMode === 'relative' ? targetH * smartConstraints.size.height : smartConstraints.size.height;
        if (resolvedH < MIN_CTA_HEIGHT) smartConstraints.size = { ...smartConstraints.size, heightMode: 'fixed' as const, height: MIN_CTA_HEIGHT };
    }
    if (role === 'logo' && abs.w > 0 && abs.h > 0) {
        const targetLogoW = smartConstraints.size.widthMode === 'relative' ? targetW * smartConstraints.size.width : smartConstraints.size.width;
        smartConstraints.size = { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: Math.round(targetLogoW), height: Math.max(24, Math.round(targetLogoW / (abs.w / abs.h))) };
    }
    if (role === 'image' && abs.w > 0 && abs.h > 0) {
        const imgAspect = abs.w / abs.h;
        const zoneW = smartConstraints.size.widthMode === 'relative' ? targetW * smartConstraints.size.width : smartConstraints.size.width;
        const zoneH = smartConstraints.size.heightMode === 'relative' ? targetH * smartConstraints.size.height : smartConstraints.size.height;
        const fitW = Math.min(zoneW, zoneH * imgAspect);
        smartConstraints.size = { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: Math.round(fitW), height: Math.round(fitW / imgAspect) };
    }
    return { ...JSON.parse(JSON.stringify(el)), constraints: smartConstraints, ...fontPatch } as DesignElement;
}

// ── Same-category stretch (kept for future use) ──

function applySameCategoryStretch(
    el: DesignElement, abs: { x: number; y: number; w: number; h: number },
    scaleX: number, scaleY: number, scaleFontRadius: number,
    targetW: number, targetH: number,
): DesignElement {
    const isText = el.type === 'text' || el.type === 'button';
    const isMedia = el.type === 'image' || el.type === 'video';
    let newX: number, newY: number, newW: number, newH: number;
    const MARGIN = 4;

    if (isText) {
        const us = Math.min(scaleX, scaleY);
        newX = Math.round(abs.x * scaleX); newY = Math.round(abs.y * scaleY);
        newH = Math.max(4, Math.round(abs.h * us));
        newW = Math.max(Math.round(abs.w * us), targetW - newX - MARGIN);
    } else if (isMedia) {
        const us = Math.min(scaleX, scaleY);
        newW = Math.max(4, Math.round(abs.w * us)); newH = Math.max(4, Math.round(abs.h * us));
        const originW = targetW / scaleX, originH = targetH / scaleY;
        newX = Math.round(((abs.x + abs.w / 2) / originW) * targetW - newW / 2);
        newY = Math.round(((abs.y + abs.h / 2) / originH) * targetH - newH / 2);
    } else {
        newX = Math.round(abs.x * scaleX); newY = Math.round(abs.y * scaleY);
        newW = Math.max(4, Math.round(abs.w * scaleX)); newH = Math.max(4, Math.round(abs.h * scaleY));
    }

    const newConstraints: ElementConstraints = { horizontal: { anchor: 'left' as const, offset: newX }, vertical: { anchor: 'top' as const, offset: newY }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: newW, height: newH }, rotation: el.constraints.rotation };
    const fontPatch: Record<string, unknown> = {};
    if ((el.type === 'text' || el.type === 'button') && (el as any).fontSize) fontPatch.fontSize = Math.max(MIN_FONT, Math.round((el as any).fontSize * scaleFontRadius));
    if ((el as any).borderRadius) fontPatch.borderRadius = Math.round((el as any).borderRadius * scaleFontRadius);
    return { ...JSON.parse(JSON.stringify(el)), constraints: newConstraints, ...fontPatch } as DesignElement;
}
