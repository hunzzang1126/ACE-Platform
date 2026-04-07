// ─────────────────────────────────────────────────
// Element Converters — Engine/overlay ↔ designStore
// ─────────────────────────────────────────────────
// Constraint utils, color, fonts → constraintUtils.ts
// ─────────────────────────────────────────────────

import type { DesignElement, ShapeElement, TextElement, ImageElement, VideoElement, GroupElement } from '@/schema/elements.types';
import type { EngineNode } from '@/hooks/useCanvasEngine';
import type { OverlayElement } from '@/hooks/useOverlayElements';

// Re-export all utilities for backward compatibility
export {
    cacheGradientData, clearGradientCache, getGradientCache,
    absoluteToConstraints, constraintsToAbsolute,
    rgbFloatToHex, hexToRgbFloat, resolveFontWeight,
    nodeTypeToShapeType, getAnimationForElement,
} from './constraintUtils';

import {
    absoluteToConstraints, rgbFloatToHex, resolveFontWeight,
    nodeTypeToShapeType, getAnimationForElement, getGradientCache,
} from './constraintUtils';

// ── Engine Node → Shape Element ──

export function engineNodeToShapeElement(node: EngineNode, canvasW: number, canvasH: number): ShapeElement {
    const constraints = absoluteToConstraints(node.x, node.y, node.w, node.h, canvasW, canvasH, node.angle ?? 0);
    const fill = rgbFloatToHex(node.fill_r ?? 0.5, node.fill_g ?? 0.5, node.fill_b ?? 0.5);
    const coverage = (node.w * node.h) / (canvasW * canvasH);
    let name = node.name || `Shape ${node.id}`;
    if (!node.name) { if (coverage > 0.7) name = 'Background'; else if (node.w > node.h * 3) name = 'Banner Strip'; else if (Math.abs(node.w - node.h) < 10) name = 'Square Shape'; }
    const animation = getAnimationForElement(`engine-${node.id}`);
    const gStart = node.gradient_start || getGradientCache(name)?.startHex || getGradientCache(`engine-${node.id}`)?.startHex;
    const gEnd = node.gradient_end || getGradientCache(name)?.endHex || getGradientCache(`engine-${node.id}`)?.endHex;
    const gAngle = node.gradient_angle ?? getGradientCache(name)?.angle ?? getGradientCache(`engine-${node.id}`)?.angle;
    const shadow = node.shadow_color ? { offsetX: node.shadow_offsetX ?? 0, offsetY: node.shadow_offsetY ?? 0, blur: node.shadow_blur ?? 0, color: node.shadow_color } : undefined;
    return { id: `engine-${node.id}`, name, type: 'shape', shapeType: nodeTypeToShapeType(node.type), constraints, fill, gradientStart: gStart, gradientEnd: gEnd, gradientAngle: gAngle, opacity: node.opacity ?? 1, visible: node.visible !== false, locked: node.locked ?? false, zIndex: node.z_index ?? 0, borderRadius: node.border_radius ?? 0, shadow, animation } as ShapeElement;
}

// ── Engine Node → Text Element ──

export function engineNodeToTextElement(node: EngineNode, canvasW: number, canvasH: number): TextElement {
    const constraints = absoluteToConstraints(node.x, node.y, node.w, node.h, canvasW, canvasH, node.angle ?? 0);
    const animation = getAnimationForElement(`engine-${node.id}`);
    const shadow = node.shadow_color ? { offsetX: node.shadow_offsetX ?? 0, offsetY: node.shadow_offsetY ?? 0, blur: node.shadow_blur ?? 0, color: node.shadow_color } : undefined;
    const textEffect = (node.textEffect_type && node.textEffect_type !== 'none') ? { type: node.textEffect_type, intensity: node.textEffect_intensity ?? 50, color: node.textEffect_color ?? '#ffffff' } : undefined;
    return { id: `engine-${node.id}`, name: node.name || `Text ${node.id}`, type: 'text', constraints, content: node.content ?? '', fontFamily: node.fontFamily ?? 'Inter', fontSize: node.fontSize ?? 16, fontWeight: resolveFontWeight(node.fontWeight), fontStyle: (node.fontStyle as 'normal' | 'italic') ?? 'normal', color: node.color ?? '#000000', textAlign: node.textAlign ?? 'left', lineHeight: node.lineHeight ?? 1.4, letterSpacing: node.letterSpacing ?? 0, autoShrink: true, opacity: node.opacity ?? 1, visible: node.visible !== false, locked: node.locked ?? false, zIndex: node.z_index ?? 1, shadow, textEffect, animation } as TextElement;
}

// ── Engine Node → Image Element ──

export function engineNodeToImageElement(node: EngineNode, canvasW: number, canvasH: number): ImageElement {
    const constraints = absoluteToConstraints(node.x, node.y, node.w, node.h, canvasW, canvasH, node.angle ?? 0);
    const animation = getAnimationForElement(`engine-${node.id}`);
    const shadow = node.shadow_color ? { offsetX: node.shadow_offsetX ?? 0, offsetY: node.shadow_offsetY ?? 0, blur: node.shadow_blur ?? 0, color: node.shadow_color } : undefined;
    return { id: `engine-${node.id}`, name: node.name || `Image ${node.id}`, type: 'image', constraints, src: node.src ?? '', fit: node.objectFit ?? 'cover', naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight, opacity: node.opacity ?? 1, visible: node.visible !== false, locked: node.locked ?? false, zIndex: node.z_index ?? 1, shadow, animation } as ImageElement;
}
// ── Engine Node → Group Element ──

export function engineNodeToGroupElement(node: EngineNode, canvasW: number, canvasH: number): GroupElement {
    const constraints = absoluteToConstraints(node.x, node.y, node.w, node.h, canvasW, canvasH, node.angle ?? 0);
    const children: DesignElement[] = (node.children ?? []).map(child => {
        if (child.type === 'text') return engineNodeToTextElement(child, canvasW, canvasH);
        if (child.type === 'image') return engineNodeToImageElement(child, canvasW, canvasH);
        if (child.type === 'group') return engineNodeToGroupElement(child, canvasW, canvasH);
        return engineNodeToShapeElement(child, canvasW, canvasH);
    });
    return { id: `engine-${node.id}`, name: node.name || `Group ${node.id}`, type: 'group', constraints, children, opacity: node.opacity ?? 1, visible: node.visible !== false, locked: node.locked ?? false, zIndex: node.z_index ?? 1 } as GroupElement;
}

// ── Overlay → Design Element ──

export function overlayToDesignElement(oel: OverlayElement, canvasW: number, canvasH: number): DesignElement {
    const clampedX = Math.max(0, Math.min(oel.x, canvasW - 1));
    const clampedY = Math.max(0, Math.min(oel.y, canvasH - 1));
    const clampedW = Math.max(1, Math.min(oel.w, canvasW - clampedX));
    const clampedH = Math.max(1, Math.min(oel.h, canvasH - clampedY));
    const constraints = absoluteToConstraints(clampedX, clampedY, clampedW, clampedH, canvasW, canvasH);
    const animation = getAnimationForElement(oel.id);

    if (oel.type === 'text') {
        return { id: oel.id, name: oel.name || 'Text', type: 'text', constraints, content: oel.content || '', fontFamily: oel.fontFamily || 'Inter', fontSize: oel.fontSize || 16, fontWeight: resolveFontWeight((oel as any).fontWeight), fontStyle: ((oel as any).fontStyle as 'normal' | 'italic') ?? 'normal', color: oel.color ?? '#000000', textAlign: oel.textAlign || 'left', lineHeight: oel.lineHeight ?? 1.4, letterSpacing: oel.letterSpacing ?? 0, autoShrink: true, opacity: oel.opacity ?? 1, visible: oel.visible !== false, locked: oel.locked ?? false, zIndex: oel.zIndex ?? 1, animation } as TextElement;
    }
    if (oel.type === 'image') {
        return { id: oel.id, name: oel.name || 'Image', type: 'image', constraints, src: oel.src || '', fit: (oel.objectFit as 'cover' | 'contain' | 'fill') || 'cover', naturalWidth: oel.naturalWidth, naturalHeight: oel.naturalHeight, opacity: oel.opacity ?? 1, visible: oel.visible !== false, locked: oel.locked ?? false, zIndex: oel.zIndex ?? 1, animation } as ImageElement;
    }
    return { id: oel.id, name: oel.name || 'Video', type: 'video', constraints, videoSrc: '', posterSrc: oel.posterSrc, fileName: oel.fileName, fit: (oel.objectFit as 'cover' | 'contain' | 'fill') || 'cover', muted: oel.muted ?? true, loop: oel.loop ?? true, autoplay: oel.autoplay ?? true, opacity: oel.opacity ?? 1, visible: oel.visible !== false, animation, locked: oel.locked ?? false, zIndex: oel.zIndex ?? 1 } as VideoElement;
}
