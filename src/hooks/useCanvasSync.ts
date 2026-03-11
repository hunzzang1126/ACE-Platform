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
import { fabricJsonToElements } from '@/engine/fabricSerializer';

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
     * ★ SINGLE SOURCE OF TRUTH — Save via Fabric-native toObject().
     * Saves both fabricJSON (canonical) and derived DesignElement[] (for SmartSizing/AI).
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
        if (!engine) {
            return { success: false, message: 'Engine not ready.' };
        }

        // ── Step 1: Get canonical Fabric JSON ──
        let fabricJSON: string | undefined;
        try {
            fabricJSON = engine.getCanvasJSON();
            console.log('[useCanvasSync] Fabric JSON captured:', fabricJSON!.length, 'bytes');
        } catch (err) {
            console.warn('[useCanvasSync] Failed to get Fabric JSON, falling back to legacy:', err);
        }

        // ── Step 2: Derive DesignElement[] for SmartSizing/AI/Preview backward compat ──
        const elements: DesignElement[] = [];

        if (fabricJSON) {
            // Derive from Fabric JSON — single conversion point
            const derived = fabricJsonToElements(fabricJSON, canvasW, canvasH);
            elements.push(...derived);
        } else {
            // Fallback to legacy conversion if getCanvasJSON failed
            try {
                const raw = engine.get_all_nodes();
                const nodes: EngineNode[] = JSON.parse(raw);
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

        // Sort by zIndex
        elements.sort((a, b) => a.zIndex - b.zIndex);

        console.log('[useCanvasSync] FINAL elements to save:', elements.map(e => ({
            id: e.id, type: e.type, name: e.name, zIndex: e.zIndex,
            ...(e.type === 'image' ? { src: (e as any).src?.substring(0, 50) + '...' } : {}),
            ...(e.type === 'text' ? { content: (e as any).content?.substring(0, 30) } : {}),
            ...(e.type === 'shape' ? { fill: (e as any).fill, gradientStart: (e as any).gradientStart } : {}),
        })));

        // Write to store (triggers smart sizing propagation if master)
        replaceVariantElements(variantId, elements, fabricJSON);

        const isMaster = cs.masterVariantId === variantId;
        const msg = isMaster
            ? `Saved ${elements.length} elements to master (fabricJSON=${!!fabricJSON}). Propagated to ${cs.variants.length - 1} sizes.`
            : `Saved ${elements.length} elements to variant (fabricJSON=${!!fabricJSON}).`;

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
     * ★ SINGLE SOURCE OF TRUTH — Restore via Fabric-native loadFromJSON() when fabricJSON is present.
     * Falls back to legacy element-by-element reconstruction for old saved projects.
     * Returns overlay elements (videos) that should be added to the overlay system.
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
        if (!variant || (!variant.elements?.length && !variant.fabricJSON)) {
            console.log('[useCanvasSync] No saved elements to restore');
            return { restoredShapes: 0, overlayElements: [] };
        }

        // ── Fabric-native restore path (PREFERRED) ──
        if (variant.fabricJSON && typeof engine.loadCanvasJSON === 'function') {
            console.log(`[useCanvasSync] ★ FABRIC-NATIVE restore: ${variant.fabricJSON.length} bytes`);
            try {
                await engine.loadCanvasJSON(variant.fabricJSON);

                // Count restored objects (excluding artboard)
                const nodeCount = engine.node_count?.() ?? 0;

                // Restore animation presets from saved elements
                // (animations are stored in separate useAnimPresetStore, not in Fabric JSON)
                if (variant.elements) {
                    for (const el of variant.elements) {
                        if (el.animation && el.animation.preset !== 'none') {
                            useAnimPresetStore.getState().setPreset(el.id, {
                                anim: el.animation.preset,
                                animDuration: el.animation.duration,
                                startTime: el.animation.startTime,
                            });
                        }
                    }
                }

                // Handle video overlays (they're HTML-based, not in Fabric JSON)
                const overlayElements: OverlayElement[] = [];
                const pendingBlobLoads: Promise<void>[] = [];

                if (variant.elements) {
                    for (const el of variant.elements) {
                        if (el.type === 'video') {
                            const vid = el as VideoElement;
                            let { x, y, w, h } = constraintsToAbsolute(vid.constraints, canvasW, canvasH);

                            const isOutOfCanvas = w <= 0 || h <= 0
                                || x >= canvasW || y >= canvasH
                                || x + w <= 0 || y + h <= 0;
                            if (isOutOfCanvas) {
                                x = 0; y = 0; w = canvasW; h = canvasH;
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

                            if (!oel.videoSrc || oel.videoSrc.startsWith('blob:')) {
                                pendingBlobLoads.push(
                                    loadVideoBlob(vid.id).then((freshUrl) => {
                                        if (freshUrl) oel.videoSrc = freshUrl;
                                    }).catch(() => {/* IndexedDB unavailable */})
                                );
                            }

                            if (el.animation && el.animation.preset !== 'none') {
                                useAnimPresetStore.getState().setPreset(vid.id, {
                                    anim: el.animation.preset,
                                    animDuration: el.animation.duration,
                                    startTime: el.animation.startTime,
                                });
                            }
                        }
                    }
                }

                await Promise.all(pendingBlobLoads);

                console.log(`[useCanvasSync] ★ FABRIC-NATIVE restore complete: ${nodeCount} Fabric objects, ${overlayElements.length} overlays`);
                return { restoredShapes: nodeCount, overlayElements };

            } catch (err) {
                console.error('[useCanvasSync] Fabric-native restore failed, falling back to legacy:', err);
                // Fall through to legacy path
            }
        }

        // ── Legacy restore path (for old saved projects without fabricJSON) ──
        console.log(`[useCanvasSync] Legacy restore: ${variant.elements.length} elements from store...`);

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

                const [tr, tg, tb] = hexToRgbFloat(text.color || '#ffffff');

                const nodeId = engine.add_text(
                    x, y,
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

                const isOutOfCanvas = w <= 0 || h <= 0
                    || x >= canvasW || y >= canvasH
                    || x + w <= 0 || y + h <= 0;
                if (isOutOfCanvas) {
                    w = Math.min(canvasW * 0.5, img.naturalWidth ?? canvasW * 0.5);
                    h = Math.min(canvasH * 0.5, img.naturalHeight ?? canvasH * 0.5);
                    x = Math.round((canvasW - w) / 2);
                    y = Math.round((canvasH - h) / 2);
                }

                if (img.src) {
                    const imgPromise = engine.add_image(
                        x, y, img.src, w, h, img.name, img.zIndex,
                        img.naturalWidth, img.naturalHeight,
                    ).then((nodeId: number) => {
                        if (img.opacity !== undefined && img.opacity !== 1) {
                            try { engine.set_opacity(nodeId, img.opacity); } catch { /* ok */ }
                        }
                    });
                    pendingBlobLoads.push(imgPromise);
                }

                restoredShapes++;

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

                const isOutOfCanvas = w <= 0 || h <= 0
                    || x >= canvasW || y >= canvasH
                    || x + w <= 0 || y + h <= 0;
                if (isOutOfCanvas) {
                    x = 0; y = 0; w = canvasW; h = canvasH;
                } else {
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

                if (!oel.videoSrc || oel.videoSrc.startsWith('blob:')) {
                    pendingBlobLoads.push(
                        loadVideoBlob(vid.id).then((freshUrl) => {
                            if (freshUrl) oel.videoSrc = freshUrl;
                        }).catch(() => {/* IndexedDB unavailable */ })
                    );
                }

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
        // reorder of the Fabric stack by __aceZIndex.
        if (typeof engine.reorder_by_z_index === 'function') {
            engine.reorder_by_z_index();
        }

        console.log(`[useCanvasSync] Legacy restored ${restoredShapes} shapes, ${overlayElements.length} overlays`);
        return { restoredShapes, overlayElements };
    }, [variantId, canvasW, canvasH]);

    return { saveToStore, saveFromCachedNodes, restoreFromStore };
}
