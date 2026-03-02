// ─────────────────────────────────────────────────
// Element Converters — Convert between engine/overlay ↔ designStore formats
// ─────────────────────────────────────────────────
// Pure functions: no React hooks, no side effects

import type { DesignElement, ShapeElement, TextElement, ImageElement, VideoElement, ElementAnimation } from '@/schema/elements.types';
import type { ElementConstraints } from '@/schema/constraints.types';
import type { EngineNode } from '@/hooks/useCanvasEngine';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';

// ── Constraint converters ──

/**
 * Convert absolute position → constraint-based position.
 * Uses the canvas dimensions to calculate relative anchoring.
 */
export function absoluteToConstraints(
    x: number, y: number, w: number, h: number,
    canvasW: number, canvasH: number,
): ElementConstraints {
    const centerX = x + w / 2;
    const relCenterX = centerX / canvasW;
    const centerY = y + h / 2;
    const relCenterY = centerY / canvasH;

    const coversWidth = w >= canvasW * 0.9;
    const coversHeight = h >= canvasH * 0.9;

    let horizontal: ElementConstraints['horizontal'];
    let vertical: ElementConstraints['vertical'];
    let size: ElementConstraints['size'];

    // Horizontal constraint
    if (coversWidth) {
        horizontal = {
            anchor: 'stretch',
            offset: 0,
            marginLeft: Math.round(x),
            marginRight: Math.round(canvasW - x - w),
        };
    } else if (relCenterX > 0.35 && relCenterX < 0.65) {
        horizontal = { anchor: 'center', offset: Math.round(centerX - canvasW / 2) };
    } else if (relCenterX <= 0.35) {
        horizontal = { anchor: 'left', offset: Math.round(x) };
    } else {
        horizontal = { anchor: 'right', offset: Math.round(canvasW - x - w) };
    }

    // Vertical constraint
    if (coversHeight) {
        vertical = {
            anchor: 'stretch',
            offset: 0,
            marginTop: Math.round(y),
            marginBottom: Math.round(canvasH - y - h),
        };
    } else if (relCenterY > 0.35 && relCenterY < 0.65) {
        vertical = { anchor: 'center', offset: Math.round(centerY - canvasH / 2) };
    } else if (relCenterY <= 0.35) {
        vertical = { anchor: 'top', offset: Math.round(y) };
    } else {
        vertical = { anchor: 'bottom', offset: Math.round(canvasH - y - h) };
    }

    // Size constraint
    if (coversWidth && coversHeight) {
        size = { widthMode: 'relative', heightMode: 'relative', width: 1, height: 1 };
    } else if (coversWidth) {
        size = { widthMode: 'relative', heightMode: 'fixed', width: 1, height: Math.round(h) };
    } else if (coversHeight) {
        size = { widthMode: 'fixed', heightMode: 'relative', width: Math.round(w), height: 1 };
    } else {
        size = { widthMode: 'fixed', heightMode: 'fixed', width: Math.round(w), height: Math.round(h) };
    }

    return { horizontal, vertical, size, rotation: 0 };
}

/**
 * Convert constraint-based position → absolute position.
 */
export function constraintsToAbsolute(
    constraints: ElementConstraints,
    canvasW: number,
    canvasH: number,
): { x: number; y: number; w: number; h: number } {
    let w = constraints.size.widthMode === 'relative' ? canvasW * constraints.size.width : constraints.size.width;
    let h = constraints.size.heightMode === 'relative' ? canvasH * constraints.size.height : constraints.size.height;

    let x: number;
    switch (constraints.horizontal.anchor) {
        case 'left': x = constraints.horizontal.offset ?? 0; break;
        case 'center': x = canvasW / 2 + (constraints.horizontal.offset ?? 0) - w / 2; break;
        case 'right': x = canvasW - w - (constraints.horizontal.offset ?? 0); break;
        case 'stretch':
            x = constraints.horizontal.marginLeft ?? 0;
            w = canvasW - (constraints.horizontal.marginLeft ?? 0) - (constraints.horizontal.marginRight ?? 0);
            break;
        default: x = 0;
    }

    let y: number;
    switch (constraints.vertical.anchor) {
        case 'top': y = constraints.vertical.offset ?? 0; break;
        case 'center': y = canvasH / 2 + (constraints.vertical.offset ?? 0) - h / 2; break;
        case 'bottom': y = canvasH - h - (constraints.vertical.offset ?? 0); break;
        case 'stretch':
            y = constraints.vertical.marginTop ?? 0;
            h = canvasH - (constraints.vertical.marginTop ?? 0) - (constraints.vertical.marginBottom ?? 0);
            break;
        default: y = 0;
    }

    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

// ── Color converters ──

export function rgbFloatToHex(r: number, g: number, b: number): string {
    const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgbFloat(hex: string): [number, number, number, number] {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return [r, g, b, 1.0];
}

// ── Type converters ──

export function nodeTypeToShapeType(type: string): 'rectangle' | 'ellipse' {
    if (type === 'ellipse') return 'ellipse';
    return 'rectangle';
}

export function getAnimationForElement(elementId: string): ElementAnimation | undefined {
    const config = useAnimPresetStore.getState().presets[elementId];
    if (!config || config.anim === 'none') return undefined;
    return { preset: config.anim, duration: config.animDuration, startTime: config.startTime };
}

// ── Element converters ──

export function engineNodeToShapeElement(
    node: EngineNode,
    canvasW: number,
    canvasH: number,
): ShapeElement {
    const constraints = absoluteToConstraints(node.x, node.y, node.w, node.h, canvasW, canvasH);
    const fill = rgbFloatToHex(node.fill_r ?? 0.5, node.fill_g ?? 0.5, node.fill_b ?? 0.5);

    const coverage = (node.w * node.h) / (canvasW * canvasH);
    let name = `Shape ${node.id}`;
    if (coverage > 0.7) name = 'Background';
    else if (node.w > node.h * 3) name = 'Banner Strip';
    else if (Math.abs(node.w - node.h) < 10) name = 'Square Shape';

    const animation = getAnimationForElement(`engine-${node.id}`);

    return {
        id: `engine-${node.id}`,
        name,
        type: 'shape',
        shapeType: nodeTypeToShapeType(node.type),
        constraints,
        fill,
        opacity: node.opacity ?? 1,
        visible: true,
        locked: false,
        zIndex: node.z_index ?? 0,
        borderRadius: node.border_radius ?? 0,
        animation,
    } as ShapeElement;
}

export function overlayToDesignElement(
    oel: OverlayElement,
    canvasW: number,
    canvasH: number,
): DesignElement {
    const constraints = absoluteToConstraints(oel.x, oel.y, oel.w, oel.h, canvasW, canvasH);
    const animation = getAnimationForElement(oel.id);

    if (oel.type === 'text') {
        return {
            id: oel.id,
            name: oel.name || 'Text',
            type: 'text',
            constraints,
            content: oel.content || '',
            fontFamily: oel.fontFamily || 'Inter',
            fontSize: oel.fontSize || 16,
            fontWeight: parseInt(oel.fontWeight || '400', 10) || 400,
            fontStyle: 'normal',
            color: oel.color || '#000000',
            textAlign: oel.textAlign || 'left',
            lineHeight: oel.lineHeight ?? 1.4,
            letterSpacing: oel.letterSpacing ?? 0,
            autoShrink: true,
            opacity: oel.opacity ?? 1,
            visible: oel.visible !== false,
            locked: oel.locked ?? false,
            zIndex: oel.zIndex ?? 1,
            animation,
        } as TextElement;
    }

    if (oel.type === 'image') {
        return {
            id: oel.id,
            name: oel.name || 'Image',
            type: 'image',
            constraints,
            src: oel.src || '',
            fit: (oel.objectFit as 'cover' | 'contain' | 'fill') || 'cover',
            opacity: oel.opacity ?? 1,
            visible: oel.visible !== false,
            locked: oel.locked ?? false,
            zIndex: oel.zIndex ?? 1,
            animation,
        } as ImageElement;
    }

    // Video
    return {
        id: oel.id,
        name: oel.name || 'Video',
        type: 'video',
        constraints,
        videoSrc: oel.videoSrc || '',
        posterSrc: oel.posterSrc,
        fileName: oel.fileName,
        fit: (oel.objectFit as 'cover' | 'contain' | 'fill') || 'cover',
        muted: oel.muted ?? true,
        loop: oel.loop ?? true,
        autoplay: oel.autoplay ?? true,
        opacity: oel.opacity ?? 1,
        visible: oel.visible !== false,
        animation,
        locked: oel.locked ?? false,
        zIndex: oel.zIndex ?? 1,
    } as VideoElement;
}
