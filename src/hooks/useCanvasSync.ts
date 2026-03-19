import { useCallback } from 'react';
import { extractAssets, resolveAsset, isAssetRef } from '@/services/assetService';
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

/** Parse CSS shadow color string (rgba/rgb/hex) → [r, g, b, a] floats (0-1) */
function parseShadowColor(color: string): [number, number, number, number] {
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        return [
            parseInt(rgbaMatch[1]!) / 255,
            parseInt(rgbaMatch[2]!) / 255,
            parseInt(rgbaMatch[3]!) / 255,
            rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]!) : 1.0,
        ];
    }
    // Hex fallback
    const hex = color.replace('#', '');
    if (hex.length >= 6) {
        return [
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255,
            1.0,
        ];
    }
    return [0, 0, 0, 0.5]; // default
}


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
     * Save current canvas state → designStore.
     * ★ NOTE: fabricJSON save is DISABLED for now because Fabric toObject()
     * includes base64 image data, causing localStorage quota overflow (~1.8MB per variant).
     * We keep the fabricSerializer module for future use when storage moves to IndexedDB.
     * Currently uses the proven legacy conversion pipeline.
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

        const elements: DesignElement[] = [];

        // Convert engine nodes → DesignElements using proven legacy pipeline
        try {
            // ★ FIX: Sync z-index from actual Fabric stack order BEFORE reading.
            // Without this, __glidZIndex values from creation time are saved,
            // not the current stack position (which may have changed via reorder).
            if (typeof engine.syncZIndexFromStack === 'function') {
                engine.syncZIndexFromStack();
            }

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

        // Save video overlays — they are HTML-based but still need persistence
        for (const oel of overlayElements) {
            elements.push(overlayToDesignElement(oel, canvasW, canvasH));
        }

        // Sort by zIndex
        elements.sort((a, b) => a.zIndex - b.zIndex);

        // ★ FIX: Preserve customStyles from existing store elements.
        // set_custom_style writes to DesignElements in Zustand store,
        // but the save pipeline reads from Fabric canvas which doesn't store CSS.
        // Merge customStyles back by matching element name or id.
        const existingVariant = cs.variants.find(v => v.id === variantId);
        if (existingVariant) {
            const stylesByName = new Map<string, Record<string, string>>();
            const stylesById = new Map<string, Record<string, string>>();
            for (const el of existingVariant.elements) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cs = (el as any).customStyles;
                if (cs && Object.keys(cs).length > 0) {
                    if (el.name) stylesByName.set(el.name, cs);
                    stylesById.set(el.id, cs);
                }
            }
            for (const el of elements) {
                const existing = (el.name ? stylesByName.get(el.name) : undefined)
                    || stylesById.get(el.id);
                if (existing) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (el as any).customStyles = existing;
                }
            }
        }

        // ★★ CRITICAL: Restore idb:// refs for image elements.
        // The engine holds runtime blob: URLs (created by resolveAsset during restore).
        // blob: URLs are SESSION-SCOPED — they become ERR_FILE_NOT_FOUND on page reload.
        // Map them back to the original idb:// refs from the current store state.
        const variant = cs.variants.find(v => v.id === variantId);
        if (variant) {
            // Build lookup: element name → original src (idb:// or data:)
            const storedSrcByName = new Map<string, string>();
            const storedSrcById = new Map<string, string>();
            for (const el of variant.elements) {
                if (el.type === 'image' && (el as ImageElement).src) {
                    const src = (el as ImageElement).src!;
                    // Only preserve idb:// or data: URLs — NOT blob: URLs
                    if (src.startsWith('idb://') || src.startsWith('data:')) {
                        if (el.name) storedSrcByName.set(el.name, src);
                        storedSrcById.set(el.id, src);
                    }
                }
            }
            // Restore idb:// refs for images that currently have blob: URLs
            for (const el of elements) {
                if (el.type !== 'image') continue;
                const img = el as ImageElement;
                if (!img.src || !img.src.startsWith('blob:')) continue;
                // Try matching by name first, then by id
                const original = (img.name ? storedSrcByName.get(img.name) : undefined)
                    || storedSrcById.get(img.id);
                if (original) {
                    img.src = original;
                }
            }
        }

        // ★ Phase 2: Extract base64 images → idb:// refs (async, non-blocking)
        // Save immediately with raw data, then async-extract in background
        replaceVariantElements(variantId, elements);

        // Background: replace data URLs with idb:// refs
        extractAssets(elements).then(extracted => {
            const hasChanges = extracted.some((el, i) =>
                el.type === 'image' && (el as any).src !== (elements[i] as any).src
            );
            if (hasChanges) {
                replaceVariantElements(variantId, extracted);
                console.log('[useCanvasSync] Asset extraction complete — base64 → idb:// refs');
            }
        }).catch(err => {
            console.warn('[useCanvasSync] Asset extraction failed:', err);
        });

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

        // ★★ CRITICAL: Restore idb:// refs for images (same as saveToStore).
        // blob: URLs are session-scoped — must map back to idb:// before persisting.
        const variant = cs.variants.find(v => v.id === variantId);
        if (variant) {
            const storedSrcByName = new Map<string, string>();
            const storedSrcById = new Map<string, string>();
            for (const el of variant.elements) {
                if (el.type === 'image' && (el as ImageElement).src) {
                    const src = (el as ImageElement).src!;
                    if (src.startsWith('idb://') || src.startsWith('data:')) {
                        if (el.name) storedSrcByName.set(el.name, src);
                        storedSrcById.set(el.id, src);
                    }
                }
            }
            for (const el of elements) {
                if (el.type !== 'image') continue;
                const img = el as ImageElement;
                if (!img.src || !img.src.startsWith('blob:')) continue;
                const original = (img.name ? storedSrcByName.get(img.name) : undefined)
                    || storedSrcById.get(img.id);
                if (original) {
                    img.src = original;
                }
            }
        }

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
     * Restore saved elements from designStore → engine + overlay.
     * ★ NOTE: Fabric-native loadFromJSON() restore is DISABLED for now because:
     * - fabricJSON includes artboard object, causing duplication
     * - loadFromJSON clears the canvas (including artboard setup done by useFabricCanvas)
     * Uses the proven legacy element-by-element reconstruction.
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
        // ★ Collect async image/video loads to await SEQUENTIALLY (not parallel).
        // Loading images in parallel causes z-order race conditions:
        // each add_image() calls moveObjectTo() based on userObjects() at that instant,
        // but concurrent loads mean userObjects() is stale between resolves.
        const pendingImageLoads: (() => Promise<void>)[] = [];
        const pendingVideoLoads: Promise<void>[] = [];

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
                // ★ Restore shadow/glow effect
                if (el.shadow) {
                    try {
                        const [sr, sg, sb, sa] = parseShadowColor(el.shadow.color);
                        engine.set_shadow(nodeId, el.shadow.offsetX, el.shadow.offsetY, el.shadow.blur, sr, sg, sb, sa);
                    } catch { /* ok */ }
                }
                // ★ Restore visible/locked state
                if (el.visible === false) {
                    try { engine.set_visible?.(nodeId, false); } catch { /* ok */ }
                }
                if (el.locked) {
                    try { engine.set_locked?.(nodeId, true); } catch { /* ok */ }
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
                    text.fontStyle,
                );

                if (text.opacity !== undefined && text.opacity !== 1) {
                    try { engine.set_opacity(nodeId, text.opacity); } catch { /* ok */ }
                }
                // ★ Restore shadow/glow effect for text
                if (el.shadow) {
                    try {
                        const [sr, sg, sb, sa] = parseShadowColor(el.shadow.color);
                        engine.set_shadow(nodeId, el.shadow.offsetX, el.shadow.offsetY, el.shadow.blur, sr, sg, sb, sa);
                    } catch { /* ok */ }
                }
                // ★ Restore text effect (Canva-style: outline, neon, glitch, 70s, etc.)
                if (text.textEffect && text.textEffect.type !== 'none') {
                    try {
                        engine.set_text_effect(nodeId, text.textEffect.type, text.textEffect.intensity ?? 50, text.textEffect.color ?? '#ffffff');
                    } catch (err) {
                        console.warn('[useCanvasSync] Failed to restore text effect:', err);
                    }
                }
                // ★ Restore visible/locked
                if (el.visible === false) {
                    try { engine.set_visible?.(nodeId, false); } catch { /* ok */ }
                }
                if (el.locked) {
                    try { engine.set_locked?.(nodeId, true); } catch { /* ok */ }
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
                    // ★ SEQUENTIAL IMAGE LOADING: capture closure vars, load one at a time
                    const capturedX = x, capturedY = y, capturedW = w, capturedH = h;
                    const capturedImg = img;
                    pendingImageLoads.push(async () => {
                        const resolvedSrc = isAssetRef(capturedImg.src!)
                            ? await resolveAsset(capturedImg.src!)
                            : capturedImg.src!;
                        const nodeId = await engine.add_image(
                            capturedX, capturedY, resolvedSrc, capturedW, capturedH, capturedImg.name, capturedImg.zIndex,
                            capturedImg.naturalWidth, capturedImg.naturalHeight,
                        );
                        if (capturedImg.opacity !== undefined && capturedImg.opacity !== 1) {
                            try { engine.set_opacity(nodeId, capturedImg.opacity); } catch { /* ok */ }
                        }
                        // ★ Restore shadow for images
                        if (el.shadow) {
                            try {
                                const [sr, sg, sb, sa] = parseShadowColor(el.shadow.color);
                                engine.set_shadow(nodeId, el.shadow.offsetX, el.shadow.offsetY, el.shadow.blur, sr, sg, sb, sa);
                            } catch { /* ok */ }
                        }
                    });
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
                    pendingVideoLoads.push(
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

        // ★ SEQUENTIAL IMAGE LOADING: Load images one by one so each add_image()
        // sees the correct Fabric stack state. This prevents z-order race conditions.
        for (const loadFn of pendingImageLoads) {
            await loadFn();
        }

        // Wait for video blob loads too
        await Promise.all(pendingVideoLoads);

        // ★ DEFINITIVE REORDER: After ALL objects are added, do a final z-order sort.
        // This is the authoritative pass — any interim ordering issues are corrected here.
        if (typeof engine.reorder_by_z_index === 'function') {
            engine.reorder_by_z_index();
        }

        console.log(`[useCanvasSync] Legacy restored ${restoredShapes} shapes, ${overlayElements.length} overlays`);
        return { restoredShapes, overlayElements };
    }, [variantId, canvasW, canvasH]);

    return { saveToStore, saveFromCachedNodes, restoreFromStore };
}
