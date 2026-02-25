// ─────────────────────────────────────────────────
// useCanvasSync — Bridge between WASM Canvas Engine ↔ designStore
// Converts engine nodes + overlay elements → DesignElements on Save
// Restores saved elements → engine on Load
// ─────────────────────────────────────────────────

import { useCallback } from 'react';
import { useDesignStore } from '@/stores/designStore';
import type { DesignElement, ShapeElement, TextElement, ImageElement, VideoElement } from '@/schema/elements.types';
import type { ElementConstraints } from '@/schema/constraints.types';
import type { EngineNode } from './useCanvasEngine';
import type { OverlayElement } from './useOverlayElements';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

/**
 * Convert absolute position → constraint-based position.
 * Uses the canvas dimensions to calculate relative anchoring.
 */
function absoluteToConstraints(
    x: number, y: number, w: number, h: number,
    canvasW: number, canvasH: number,
): ElementConstraints {
    // Determine horizontal anchor based on position
    const centerX = x + w / 2;
    const relCenterX = centerX / canvasW;

    // Determine vertical anchor based on position
    const centerY = y + h / 2;
    const relCenterY = centerY / canvasH;

    // Check if element covers most of canvas → stretch
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
        // Center-aligned
        horizontal = {
            anchor: 'center',
            offset: Math.round(centerX - canvasW / 2),
        };
    } else if (relCenterX <= 0.35) {
        // Left-aligned
        horizontal = { anchor: 'left', offset: Math.round(x) };
    } else {
        // Right-aligned
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
        vertical = {
            anchor: 'center',
            offset: Math.round(centerY - canvasH / 2),
        };
    } else if (relCenterY <= 0.35) {
        vertical = { anchor: 'top', offset: Math.round(y) };
    } else {
        vertical = { anchor: 'bottom', offset: Math.round(canvasH - y - h) };
    }

    // Size constraint — use fixed for now, smart sizing will adjust
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
 * Reverse of absoluteToConstraints.
 */
function constraintsToAbsolute(
    constraints: ElementConstraints,
    canvasW: number,
    canvasH: number,
): { x: number; y: number; w: number; h: number } {
    // Resolve width
    let w: number;
    if (constraints.size.widthMode === 'relative') {
        w = canvasW * constraints.size.width;
    } else {
        w = constraints.size.width;
    }

    // Resolve height
    let h: number;
    if (constraints.size.heightMode === 'relative') {
        h = canvasH * constraints.size.height;
    } else {
        h = constraints.size.height;
    }

    // Resolve x
    let x: number;
    switch (constraints.horizontal.anchor) {
        case 'left':
            x = constraints.horizontal.offset ?? 0;
            break;
        case 'center':
            x = canvasW / 2 + (constraints.horizontal.offset ?? 0) - w / 2;
            break;
        case 'right':
            x = canvasW - w - (constraints.horizontal.offset ?? 0);
            break;
        case 'stretch':
            x = constraints.horizontal.marginLeft ?? 0;
            w = canvasW - (constraints.horizontal.marginLeft ?? 0) - (constraints.horizontal.marginRight ?? 0);
            break;
        default:
            x = 0;
    }

    // Resolve y
    let y: number;
    switch (constraints.vertical.anchor) {
        case 'top':
            y = constraints.vertical.offset ?? 0;
            break;
        case 'center':
            y = canvasH / 2 + (constraints.vertical.offset ?? 0) - h / 2;
            break;
        case 'bottom':
            y = canvasH - h - (constraints.vertical.offset ?? 0);
            break;
        case 'stretch':
            y = constraints.vertical.marginTop ?? 0;
            h = canvasH - (constraints.vertical.marginTop ?? 0) - (constraints.vertical.marginBottom ?? 0);
            break;
        default:
            y = 0;
    }

    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/**
 * Convert WASM EngineNode type → DesignElement shapeType
 */
function nodeTypeToShapeType(type: string): 'rectangle' | 'ellipse' {
    if (type === 'ellipse') return 'ellipse';
    return 'rectangle'; // rect, rounded_rect, gradient_rect → all rectangle
}

/**
 * Convert RGB float (0-1) → hex string
 */
function rgbFloatToHex(r: number, g: number, b: number): string {
    const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex string → RGB float (0-1)
 */
function hexToRgbFloat(hex: string): [number, number, number, number] {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return [r, g, b, 1.0];
}

/**
 * Convert an EngineNode → ShapeElement for designStore
 * Now reads color directly from the engine node (fill_r/g/b/a)
 */
function engineNodeToShapeElement(
    node: EngineNode,
    canvasW: number,
    canvasH: number,
): ShapeElement {
    const constraints = absoluteToConstraints(node.x, node.y, node.w, node.h, canvasW, canvasH);

    // Read color directly from engine node
    const fill = rgbFloatToHex(node.fill_r ?? 0.5, node.fill_g ?? 0.5, node.fill_b ?? 0.5);

    // Guess element name based on coverage
    const coverage = (node.w * node.h) / (canvasW * canvasH);
    let name = `Shape ${node.id}`;
    if (coverage > 0.7) name = 'Background';
    else if (node.w > node.h * 3) name = 'Banner Strip';
    else if (Math.abs(node.w - node.h) < 10) name = 'Square Shape';

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
    } as ShapeElement;
}

/**
 * Convert an OverlayElement → TextElement or ImageElement for designStore
 */
function overlayToDesignElement(
    oel: OverlayElement,
    canvasW: number,
    canvasH: number,
): DesignElement {
    const constraints = absoluteToConstraints(oel.x, oel.y, oel.w, oel.h, canvasW, canvasH);

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
        } as TextElement;
    }

    // Image
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
        locked: oel.locked ?? false,
        zIndex: oel.zIndex ?? 1,
    } as VideoElement;
}

// ── Hook ────────────────────────────────────────

export function useCanvasSync(
    variantId: string | undefined,
    canvasW: number,
    canvasH: number,
) {
    const replaceVariantElements = useDesignStore((s) => s.replaceVariantElements);
    const creativeSet = useDesignStore((s) => s.creativeSet);

    /**
     * Save current canvas state → designStore
     */
    const saveToStore = useCallback((
        engineRef: React.RefObject<Engine | null>,
        overlayElements: OverlayElement[],
    ): { success: boolean; message: string } => {
        if (!variantId || !creativeSet) {
            return { success: false, message: 'No variant or creative set active.' };
        }

        const engine = engineRef.current;
        const elements: DesignElement[] = [];

        // 1. Convert engine nodes → ShapeElements (now with real colors)
        if (engine) {
            try {
                const raw = engine.get_all_nodes();
                const nodes: EngineNode[] = JSON.parse(raw);
                for (const node of nodes) {
                    elements.push(engineNodeToShapeElement(node, canvasW, canvasH));
                }
            } catch (err) {
                console.warn('[useCanvasSync] Failed to read engine nodes:', err);
            }
        }

        // 2. Convert overlay elements → Text/ImageElements
        for (const oel of overlayElements) {
            if (oel.visible === false) continue;
            elements.push(overlayToDesignElement(oel, canvasW, canvasH));
        }

        // 3. Sort by zIndex
        elements.sort((a, b) => a.zIndex - b.zIndex);

        // 4. Write to store (triggers smart sizing propagation if master)
        replaceVariantElements(variantId, elements);

        const isMaster = creativeSet.masterVariantId === variantId;
        const msg = isMaster
            ? `Saved ${elements.length} elements to master. Propagated to ${creativeSet.variants.length - 1} sizes.`
            : `Saved ${elements.length} elements to variant.`;

        console.log(`[useCanvasSync] ${msg}`);
        return { success: true, message: msg };
    }, [variantId, canvasW, canvasH, creativeSet, replaceVariantElements]);

    /**
     * Save from pre-cached node data (for unmount when engine may already be freed).
     * Takes EngineNode[] directly instead of reading from the live engine.
     */
    const saveFromCachedNodes = useCallback((
        cachedNodes: EngineNode[],
        overlayElements: OverlayElement[],
    ): { success: boolean; message: string } => {
        if (!variantId || !creativeSet) {
            return { success: false, message: 'No variant or creative set active.' };
        }

        const elements: DesignElement[] = [];

        // 1. Convert cached engine nodes → ShapeElements
        for (const node of cachedNodes) {
            elements.push(engineNodeToShapeElement(node, canvasW, canvasH));
        }

        // 2. Convert overlay elements → Text/ImageElements
        for (const oel of overlayElements) {
            if (oel.visible === false) continue;
            elements.push(overlayToDesignElement(oel, canvasW, canvasH));
        }

        // 3. Sort by zIndex
        elements.sort((a, b) => a.zIndex - b.zIndex);

        // 4. Write to store
        replaceVariantElements(variantId, elements);

        const isMaster = creativeSet.masterVariantId === variantId;
        const msg = isMaster
            ? `Saved ${elements.length} elements (from cache). Propagated to ${creativeSet.variants.length - 1} sizes.`
            : `Saved ${elements.length} elements (from cache) to variant.`;

        console.log(`[useCanvasSync] ${msg}`);
        return { success: true, message: msg };
    }, [variantId, canvasW, canvasH, creativeSet, replaceVariantElements]);

    /**
     * Restore saved elements from designStore → engine + overlay
     * Returns overlay elements (text/image) that should be added to the overlay system
     */
    const restoreFromStore = useCallback((
        engine: Engine,
    ): { restoredShapes: number; overlayElements: OverlayElement[] } => {
        if (!variantId || !creativeSet) {
            return { restoredShapes: 0, overlayElements: [] };
        }

        const variant = creativeSet.variants.find((v) => v.id === variantId);
        if (!variant || !variant.elements || variant.elements.length === 0) {
            console.log('[useCanvasSync] No saved elements to restore');
            return { restoredShapes: 0, overlayElements: [] };
        }

        console.log(`[useCanvasSync] Restoring ${variant.elements.length} elements from store...`);

        let restoredShapes = 0;
        const overlayElements: OverlayElement[] = [];

        for (const el of variant.elements) {
            if (el.type === 'shape') {
                const shape = el as ShapeElement;
                const { x, y, w, h } = constraintsToAbsolute(shape.constraints, canvasW, canvasH);
                const [r, g, b, a] = hexToRgbFloat(shape.fill || '#808080');

                let nodeId: number;
                if (shape.shapeType === 'ellipse') {
                    // Engine expects cx, cy, rx, ry for ellipses
                    nodeId = engine.add_ellipse(x + w / 2, y + h / 2, w / 2, h / 2, r, g, b, a);
                } else if (shape.borderRadius && shape.borderRadius > 0) {
                    nodeId = engine.add_rounded_rect(x, y, w, h, r, g, b, a, shape.borderRadius);
                } else {
                    nodeId = engine.add_rect(x, y, w, h, r, g, b, a);
                }

                if (shape.opacity !== undefined && shape.opacity !== 1) {
                    try { engine.set_opacity(nodeId, shape.opacity); } catch { /* ok */ }
                }

                restoredShapes++;
                console.log(`[useCanvasSync] Restored shape: ${shape.name} (id=${nodeId}) at ${x},${y} ${w}x${h} color=${shape.fill}`);

            } else if (el.type === 'text') {
                const text = el as TextElement;
                const { x, y, w, h } = constraintsToAbsolute(text.constraints, canvasW, canvasH);
                overlayElements.push({
                    id: text.id,
                    type: 'text',
                    x, y, w, h,
                    name: text.name,
                    content: text.content || '',
                    fontFamily: text.fontFamily || 'Inter',
                    fontSize: text.fontSize || 16,
                    fontWeight: String(text.fontWeight || 400),
                    color: text.color || '#000000',
                    textAlign: text.textAlign || 'left',
                    lineHeight: text.lineHeight,
                    letterSpacing: text.letterSpacing,
                    opacity: text.opacity ?? 1,
                    visible: text.visible !== false,
                    locked: text.locked ?? false,
                    zIndex: text.zIndex ?? 1,
                });

            } else if (el.type === 'image') {
                const img = el as ImageElement;
                const { x, y, w, h } = constraintsToAbsolute(img.constraints, canvasW, canvasH);
                overlayElements.push({
                    id: img.id,
                    type: 'image',
                    x, y, w, h,
                    name: img.name,
                    src: img.src || '',
                    objectFit: (img.fit === 'cover' || img.fit === 'contain' || img.fit === 'fill') ? img.fit : 'cover',
                    opacity: img.opacity ?? 1,
                    visible: img.visible !== false,
                    locked: img.locked ?? false,
                    zIndex: img.zIndex ?? 1,
                });

            } else if (el.type === 'video') {
                const vid = el as VideoElement;
                const { x, y, w, h } = constraintsToAbsolute(vid.constraints, canvasW, canvasH);
                overlayElements.push({
                    id: vid.id,
                    type: 'video',
                    x, y, w, h,
                    name: vid.name,
                    videoSrc: vid.videoSrc || '',
                    posterSrc: vid.posterSrc,
                    fileName: vid.fileName,
                    objectFit: (vid.fit === 'cover' || vid.fit === 'contain' || vid.fit === 'fill') ? vid.fit : 'cover',
                    muted: vid.muted ?? true,
                    loop: vid.loop ?? true,
                    autoplay: vid.autoplay ?? true,
                    opacity: vid.opacity ?? 1,
                    visible: vid.visible !== false,
                    locked: vid.locked ?? false,
                    zIndex: vid.zIndex ?? 1,
                });
            }
        }

        console.log(`[useCanvasSync] Restored ${restoredShapes} shapes, ${overlayElements.length} overlays`);
        return { restoredShapes, overlayElements };
    }, [variantId, canvasW, canvasH, creativeSet]);

    return { saveToStore, saveFromCachedNodes, restoreFromStore };
}
