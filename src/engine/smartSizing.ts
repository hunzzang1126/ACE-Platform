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
        const role = detectElementRole(el, originW, originH);

        if (role === 'background') {
            let bgW = targetW, bgH = targetH, bgX = 0, bgY = 0;
            if (el.type === 'image' && abs.w > 0 && abs.h > 0) {
                const imgAspect = abs.w / abs.h;
                const canvasAspect = targetW / targetH;
                if (imgAspect > canvasAspect) { bgH = targetH; bgW = Math.round(targetH * imgAspect); bgX = -Math.round((bgW - targetW) / 2); }
                else { bgW = targetW; bgH = Math.round(targetW / imgAspect); bgY = -Math.round((bgH - targetH) / 2); }
            }
            result.push({
                ...JSON.parse(JSON.stringify(el)),
                constraints: { horizontal: { anchor: 'left' as const, offset: bgX }, vertical: { anchor: 'top' as const, offset: bgY }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: bgW, height: bgH }, rotation: el.constraints.rotation },
            } as DesignElement);
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
        const x = c.horizontal.offset, y = c.vertical.offset, curW = c.size.width, curH = c.size.height;
        if (x + curW > targetW) c.horizontal = { anchor: 'left' as const, offset: Math.max(MARGIN, targetW - curW - MARGIN) };
        if (x < 0) c.horizontal = { anchor: 'left' as const, offset: MARGIN };
        if (y + curH > targetH) c.vertical = { anchor: 'top' as const, offset: Math.max(MARGIN, targetH - curH - MARGIN) };
        if (y < 0) c.vertical = { anchor: 'top' as const, offset: MARGIN };
    }
    return elements;
}

// ── Edge Pin sizing — left gap fixed, inter-element distance preserved ──

function edgePinSizeElements(
    originElements: DesignElement[], originW: number, originH: number,
    targetW: number, targetH: number,
): DesignElement[] {
    const uniformScale = Math.min(targetW / originW, targetH / originH);
    const result: DesignElement[] = [];
    const contentItems: Array<{ el: DesignElement; x: number; y: number; w: number; h: number }> = [];

    // Collect original left gap from non-background elements
    const nonBgElements = originElements.filter(el => detectElementRole(el, originW, originH) !== 'background');
    const originalLeftGap = nonBgElements.length > 0
        ? Math.min(...nonBgElements.map(el => constraintsToAbsolute(el.constraints, originW, originH).x))
        : 0;

    for (const el of originElements) {
        const abs = constraintsToAbsolute(el.constraints, originW, originH);
        const role = detectElementRole(el, originW, originH);

        // Background: cover fill (same as uniform mode)
        if (role === 'background') {
            let bgW = targetW, bgH = targetH, bgX = 0, bgY = 0;
            if (el.type === 'image' && abs.w > 0 && abs.h > 0) {
                const imgAspect = abs.w / abs.h;
                const canvasAspect = targetW / targetH;
                if (imgAspect > canvasAspect) { bgH = targetH; bgW = Math.round(targetH * imgAspect); bgX = -Math.round((bgW - targetW) / 2); }
                else { bgW = targetW; bgH = Math.round(targetW / imgAspect); bgY = -Math.round((bgH - targetH) / 2); }
            }
            result.push({
                ...JSON.parse(JSON.stringify(el)),
                constraints: { horizontal: { anchor: 'left' as const, offset: bgX }, vertical: { anchor: 'top' as const, offset: bgY }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: bgW, height: bgH }, rotation: el.constraints.rotation },
            } as DesignElement);
            continue;
        }

        // Content: uniformScale for position + size (preserves inter-element distances)
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

        contentItems.push({ el: scaled, x: newX, y: newY, w: newW, h: newH });
    }

    // Pin content group to original left gap
    if (contentItems.length > 0) {
        const scaledLeftEdge = Math.min(...contentItems.map(c => c.x));
        const shiftX = originalLeftGap - scaledLeftEdge;

        // Vertical: center the content group in target canvas
        const minY = Math.min(...contentItems.map(c => c.y));
        const maxY = Math.max(...contentItems.map(c => c.y + c.h));
        const groupH = maxY - minY;
        const shiftY = Math.round((targetH - groupH) / 2) - minY;

        for (const { el } of contentItems) {
            el.constraints.horizontal = { anchor: 'left' as const, offset: el.constraints.horizontal.offset + shiftX };
            el.constraints.vertical = { anchor: 'top' as const, offset: el.constraints.vertical.offset + shiftY };
            result.push(el);
        }
    }

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
