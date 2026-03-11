// ─────────────────────────────────────────────────
// useCanvasSync — Bridge between WASM Canvas Engine ↔ designStore
// Converts engine nodes + overlay elements → DesignElements on Save
// Restores saved elements → engine on Load
// ─────────────────────────────────────────────────

import { useCallback } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { loadVideoBlob } from '@/stores/videoStorage';
import type { DesignElement, ShapeElement, TextElement, ImageElement, VideoElement, ElementAnimation } from '@/schema/elements.types';
import type { ElementConstraints } from '@/schema/constraints.types';
import type { EngineNode } from './useCanvasEngine';
import type { OverlayElement } from './useOverlayElements';
import { useAnimPresetStore } from './useAnimationPresets';
import {
    absoluteToConstraints,
    constraintsToAbsolute,
    rgbFloatToHex,
    hexToRgbFloat,
    engineNodeToShapeElement,
    engineNodeToTextElement,
    engineNodeToImageElement,
    overlayToDesignElement,
    getAnimationForElement,
} from '@/engine/elementConverters';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;


// ── Hook ────────────────────────────────────────

export function useCanvasSync(
    variantId: string | undefined,
    canvasW: number,
    canvasH: number,
) {
    const replaceVariantElements = useDesignStore((s) => s.replaceVariantElements);
    // ★ REGRESSION GUARD: Do NOT capture creativeSet in a closure for save functions.
    // Always use useDesignStore.getState().creativeSet for real-time reads.
    // Capturing via useDesignStore((s) => s.creativeSet) creates a stale reference
    // that causes the size dashboard to show pre-edit state after saving.
    const creativeSetForRestore = useDesignStore((s) => s.creativeSet);

    /**
     * Save current canvas state → designStore
     */
    const saveToStore = useCallback((
        engineRef: React.RefObject<Engine | null>,
        overlayElements: OverlayElement[],
    ): { success: boolean; message: string } => {
        // ★ REGRESSION GUARD: Read fresh state, never stale closure
        const cs = useDesignStore.getState().creativeSet;
        if (!variantId || !cs) {
            return { success: false, message: 'No variant or creative set active.' };
        }

        const engine = engineRef.current;
        const elements: DesignElement[] = [];

        // 1. Convert engine nodes → DesignElements based on type
        if (engine) {
            try {
                const raw = engine.get_all_nodes();
                const nodes: EngineNode[] = JSON.parse(raw);
                console.log('[useCanvasSync] RAW engine nodes:', nodes.map(n => ({
                    id: n.id, type: n.type, name: n.name,
                    x: Math.round(n.x), y: Math.round(n.y),
                    w: Math.round(n.w), h: Math.round(n.h),
                    z_index: n.z_index,
                    src: n.src ? n.src.substring(0, 50) + '...' : undefined,
                })));
                for (const node of nodes) {
                    if (node.type === 'text') {
                        elements.push(engineNodeToTextElement(node, canvasW, canvasH));
                    } else if (node.type === 'image') {
                        elements.push(engineNodeToImageElement(node, canvasW, canvasH));
                    } else {
                        elements.push(engineNodeToShapeElement(node, canvasW, canvasH));
                    }
                }
            } catch (err) {
                console.warn('[useCanvasSync] Failed to read engine nodes:', err);
            }
        }

        // Save video overlays — they are HTML-based but still need persistence
        for (const oel of overlayElements) {
            elements.push(overlayToDesignElement(oel, canvasW, canvasH));
        }

        // 3. Sort by zIndex
        elements.sort((a, b) => a.zIndex - b.zIndex);

        console.log('[useCanvasSync] FINAL elements to save:', elements.map(e => ({
            id: e.id, type: e.type, name: e.name, zIndex: e.zIndex,
            ...(e.type === 'image' ? { src: (e as any).src?.substring(0, 50) + '...' } : {}),
            ...(e.type === 'text' ? { content: (e as any).content?.substring(0, 30) } : {}),
            ...(e.type === 'shape' ? { fill: (e as any).fill, gradientStart: (e as any).gradientStart } : {}),
        })));

        // 4. Write to store (triggers smart sizing propagation if master)
        replaceVariantElements(variantId, elements);

        const isMaster = cs.masterVariantId === variantId;
        const msg = isMaster
            ? `Saved ${elements.length} elements to master. Propagated to ${cs.variants.length - 1} sizes.`
            : `Saved ${elements.length} elements to variant.`;

        console.log(`[useCanvasSync] ${msg}`);
        return { success: true, message: msg };
    }, [variantId, canvasW, canvasH, replaceVariantElements]);

    /**
     * Save from pre-cached node data (for unmount when engine may already be freed).
     * Takes EngineNode[] directly instead of reading from the live engine.
     */
    const saveFromCachedNodes = useCallback((
        cachedNodes: EngineNode[],
        overlayElements: OverlayElement[],
    ): { success: boolean; message: string } => {
        // ★ REGRESSION GUARD: Read fresh state, never stale closure
        const cs = useDesignStore.getState().creativeSet;
        if (!variantId || !cs) {
            return { success: false, message: 'No variant or creative set active.' };
        }

        const elements: DesignElement[] = [];

        // 1. Convert cached engine nodes → DesignElements by type
        for (const node of cachedNodes) {
            if (node.type === 'text') {
                elements.push(engineNodeToTextElement(node, canvasW, canvasH));
            } else if (node.type === 'image') {
                elements.push(engineNodeToImageElement(node, canvasW, canvasH));
            } else {
                elements.push(engineNodeToShapeElement(node, canvasW, canvasH));
            }
        }

        // Save video overlays for persistence
        for (const oel of overlayElements) {
            elements.push(overlayToDesignElement(oel, canvasW, canvasH));
        }

        // 3. Sort by zIndex
        elements.sort((a, b) => a.zIndex - b.zIndex);

        // 4. Write to store
        replaceVariantElements(variantId, elements);

        const isMaster = cs.masterVariantId === variantId;
        const msg = isMaster
            ? `Saved ${elements.length} elements (from cache). Propagated to ${cs.variants.length - 1} sizes.`
            : `Saved ${elements.length} elements (from cache) to variant.`;

        console.log(`[useCanvasSync] ${msg}`);
        return { success: true, message: msg };
    }, [variantId, canvasW, canvasH, replaceVariantElements]);

    /**
     * Restore saved elements from designStore → engine + overlay
     * Returns overlay elements (text/image) that should be added to the overlay system
     */
    const restoreFromStore = useCallback(async (
        engine: Engine,
    ): Promise<{ restoredShapes: number; overlayElements: OverlayElement[] }> => {
        // ★ Use fresh state for restore too — especially important after AI adds elements
        const cs = useDesignStore.getState().creativeSet;
        if (!variantId || !cs) {
            return { restoredShapes: 0, overlayElements: [] };
        }

        const variant = cs.variants.find((v) => v.id === variantId);
        if (!variant || !variant.elements || variant.elements.length === 0) {
            console.log('[useCanvasSync] No saved elements to restore');
            return { restoredShapes: 0, overlayElements: [] };
        }

        console.log(`[useCanvasSync] Restoring ${variant.elements.length} elements from store...`);

        let restoredShapes = 0;
        const overlayElements: OverlayElement[] = [];
        const pendingBlobLoads: Promise<void>[] = [];

        for (const el of variant.elements) {
            if (el.type === 'shape') {
                const shape = el as ShapeElement;
                const { x, y, w, h } = constraintsToAbsolute(shape.constraints, canvasW, canvasH);

                let nodeId: number;
                if (shape.gradientStart && shape.gradientEnd) {
                    // Gradient rect — try shim's hex-based API first, fallback to WASM float API
                    try {
                        nodeId = engine.add_gradient_rect(x, y, w, h, shape.gradientStart, shape.gradientEnd, shape.gradientAngle ?? 135, shape.borderRadius ?? 0, shape.name);
                    } catch {
                        // WASM engine: convert hex → float RGB
                        const [r1, g1, b1, a1] = hexToRgbFloat(shape.gradientStart);
                        const [r2, g2, b2, a2] = hexToRgbFloat(shape.gradientEnd);
                        nodeId = engine.add_gradient_rect(x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, shape.gradientAngle ?? 135);
                    }
                } else if (shape.shapeType === 'ellipse') {
                    const [r, g, b, a] = hexToRgbFloat(shape.fill || '#808080');
                    // Engine expects cx, cy, rx, ry for ellipses
                    nodeId = engine.add_ellipse(x + w / 2, y + h / 2, w / 2, h / 2, r, g, b, a);
                } else if (shape.borderRadius && shape.borderRadius > 0) {
                    const [r, g, b, a] = hexToRgbFloat(shape.fill || '#808080');
                    nodeId = engine.add_rounded_rect(x, y, w, h, r, g, b, a, shape.borderRadius);
                } else {
                    const [r, g, b, a] = hexToRgbFloat(shape.fill || '#808080');
                    nodeId = engine.add_rect(x, y, w, h, r, g, b, a);
                }

                if (shape.opacity !== undefined && shape.opacity !== 1) {
                    try { engine.set_opacity(nodeId, shape.opacity); } catch { /* ok */ }
                }

                restoredShapes++;
                console.log(`[useCanvasSync] Restored shape: ${shape.name} (id=${nodeId}) at ${x},${y} ${w}x${h} color=${shape.fill}`);

                // Restore animation preset for this shape
                if (el.animation && el.animation.preset !== 'none') {
                    useAnimPresetStore.getState().setPreset(`engine-${nodeId}`, {
                        anim: el.animation.preset,
                        animDuration: el.animation.duration,
                        startTime: el.animation.startTime,
                    });
                }

            } else if (el.type === 'text') {
                const text = el as TextElement;
                const { x, y, w } = constraintsToAbsolute(text.constraints, canvasW, canvasH);

                // Convert stored hex color → r,g,b floats for engine
                const [tr, tg, tb] = hexToRgbFloat(text.color || '#ffffff');

                // IMPORTANT: engine.add_text takes POSITIONAL args, not an options object:
                // (x, y, content, fontSize, fontFamily, fontWeight, r, g, b, a, width, textAlign, name?, lineHeight?, letterSpacing?)
                const nodeId = engine.add_text(
                    x,
                    y,
                    text.content || '',
                    text.fontSize || 16,
                    text.fontFamily || 'Inter',
                    String(text.fontWeight || 400),
                    tr, tg, tb, 1.0,
                    w > 0 ? w : canvasW * 0.85,
                    text.textAlign || 'center',
                    text.name,
                    text.lineHeight,
                    text.letterSpacing,
                );

                if (text.opacity !== undefined && text.opacity !== 1) {
                    try { engine.set_opacity(nodeId, text.opacity); } catch { /* ok */ }
                }

                restoredShapes++;
                console.log(`[useCanvasSync] Restored text: "${text.name}" (id=${nodeId}) at ${x},${y} fontSize=${text.fontSize} color=${text.color}`);

                // Restore animation preset for this text element
                if (el.animation && el.animation.preset !== 'none') {
                    useAnimPresetStore.getState().setPreset(`engine-${nodeId}`, {
                        anim: el.animation.preset,
                        animDuration: el.animation.duration,
                        startTime: el.animation.startTime,
                    });
                }

            } else if (el.type === 'image') {
                const img = el as ImageElement;
                let { x, y, w, h } = constraintsToAbsolute(img.constraints, canvasW, canvasH);

                // ★ Guard: if constraints resolve to invalid position, fall back to center.
                // This handles corrupt constraints or mismatched canvas sizes.
                const isOutOfCanvas = w <= 0 || h <= 0
                    || x >= canvasW || y >= canvasH
                    || x + w <= 0 || y + h <= 0;
                if (isOutOfCanvas) {
                    console.warn(`[useCanvasSync] Image "${img.name}" resolved out-of-canvas (${x},${y} ${w}x${h}) — centering`);
                    w = Math.min(canvasW * 0.5, img.naturalWidth ?? canvasW * 0.5);
                    h = Math.min(canvasH * 0.5, img.naturalHeight ?? canvasH * 0.5);
                    x = Math.round((canvasW - w) / 2);
                    y = Math.round((canvasH - h) / 2);
                }

                // ★ REGRESSION GUARD: Collect image load Promises so we can await ALL of them.
                // Previously images were fire-and-forget — whichever resolved last ended up on top.
                // Now we await every image, then call reorder_by_z_index() for a definitive sort.
                if (img.src) {
                    // ★ Pass stored naturalWidth/naturalHeight so add_image can compute correct
                    // scaleX/scaleY for SVGs. SVGs without explicit dimensions may report 0 or
                    // inconsistent naturalWidth/Height on second load — using stored values fixes this.
                    const imgPromise = engine.add_image(
                        x, y, img.src, w, h, img.name, img.zIndex,
                        img.naturalWidth, img.naturalHeight,  // storedNatW, storedNatH
                    ).then((nodeId: number) => {
                        if (img.opacity !== undefined && img.opacity !== 1) {
                            try { engine.set_opacity(nodeId, img.opacity); } catch { /* ok */ }
                        }
                    });
                    pendingBlobLoads.push(imgPromise);
                } else {
                    console.warn(`[useCanvasSync] Image "${img.name}" has empty src — skipping restore`);
                }

                restoredShapes++;
                console.log(`[useCanvasSync] Queued image restore: "${img.name}" at ${x},${y} ${w}x${h} zIndex=${img.zIndex}`);

                // Restore animation preset
                if (el.animation && el.animation.preset !== 'none') {
                    useAnimPresetStore.getState().setPreset(img.id, {
                        anim: el.animation.preset,
                        animDuration: el.animation.duration,
                        startTime: el.animation.startTime,
                    });
                }

            } else if (el.type === 'video') {
                const vid = el as VideoElement;
                let { x, y, w, h } = constraintsToAbsolute(vid.constraints, canvasW, canvasH);

                // ★ Guard: if constraints resolve to invalid position (off-canvas or zero size),
                // fall back to full-canvas fill. This handles corrupt constraints from
                // mismatched canvas sizes or bad mouse-coordinate saves.
                const isOutOfCanvas = w <= 0 || h <= 0
                    || x >= canvasW || y >= canvasH
                    || x + w <= 0 || y + h <= 0;
                if (isOutOfCanvas) {
                    console.warn(`[useCanvasSync] Video "${vid.name}" resolved out-of-canvas (${x},${y} ${w}x${h}) — using full-canvas fallback`);
                    x = 0; y = 0; w = canvasW; h = canvasH;
                } else {
                    // Clamp to canvas bounds (allow small overflow for edge cases)
                    x = Math.max(0, Math.min(x, canvasW - 10));
                    y = Math.max(0, Math.min(y, canvasH - 10));
                    w = Math.min(w, canvasW - x);
                    h = Math.min(h, canvasH - y);
                }

                const oel: OverlayElement = {
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
                };
                overlayElements.push(oel);

                // ★ If videoSrc is empty or a stale blob, eagerly load a fresh blob URL
                // We store a promise so we can await ALL of them before returning
                if (!oel.videoSrc || oel.videoSrc.startsWith('blob:')) {
                    pendingBlobLoads.push(
                        loadVideoBlob(vid.id).then((freshUrl) => {
                            if (freshUrl) oel.videoSrc = freshUrl; // safe — still modifying before restoreElements() is called
                        }).catch(() => {/* IndexedDB unavailable */ })
                    );
                }

                // Restore animation preset
                if (el.animation && el.animation.preset !== 'none') {
                    useAnimPresetStore.getState().setPreset(vid.id, {
                        anim: el.animation.preset,
                        animDuration: el.animation.duration,
                        startTime: el.animation.startTime,
                    });
                }
            }
        }

        // Wait for all video blob URL loads AND image loads to complete
        await Promise.all(pendingBlobLoads);

        // ★ REGRESSION GUARD: After all async image loads complete, do a definitive
        // reorder of the Fabric stack by __aceZIndex. Images load asynchronously,
        // so even with individual moveObjectTo calls, timing variations can cause
        // wrong ordering when multiple images load concurrently.
        // This final pass guarantees correct layer order.
        if (typeof engine.reorder_by_z_index === 'function') {
            engine.reorder_by_z_index();
        }

        console.log(`[useCanvasSync] Restored ${restoredShapes} shapes, ${overlayElements.length} overlays`);
        return { restoredShapes, overlayElements };
    }, [variantId, canvasW, canvasH]);

    return { saveToStore, saveFromCachedNodes, restoreFromStore };
}
