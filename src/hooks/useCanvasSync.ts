// ─────────────────────────────────────────────────
// useCanvasSync — Bidirectional sync between engine + designStore
// ─────────────────────────────────────────────────
// Save helpers → canvasSyncSave.ts
// ─────────────────────────────────────────────────

import { useCallback } from 'react';
import { isAssetRef, resolveAsset } from '@/services/assetService';
import { useDesignStore } from '@/stores/designStore';
import { loadVideoBlob } from '@/stores/videoStorage';
import type { DesignElement, ShapeElement, TextElement, ImageElement, VideoElement } from '@/schema/elements.types';
import type { EngineNode } from './useCanvasEngine';
import type { OverlayElement } from './useOverlayElements';
import { useAnimPresetStore } from './useAnimationPresets';
import { constraintsToAbsolute, hexToRgbFloat } from '@/engine/elementConverters';
import {
    restoreIdbRefs, preserveCustomStyles, convertNodesToElements,
    readNodesFromEngine, addOverlaysAndSort, asyncExtractAssets,
} from './canvasSyncSave';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

/** Parse CSS shadow color string → [r, g, b, a] floats (0-1) */
function parseShadowColor(color: string): [number, number, number, number] {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) return [parseInt(m[1]!) / 255, parseInt(m[2]!) / 255, parseInt(m[3]!) / 255, m[4] !== undefined ? parseFloat(m[4]!) : 1.0];
    const hex = color.replace('#', '');
    if (hex.length >= 6) return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255, 1.0];
    return [0, 0, 0, 0.5];
}

export function useCanvasSync(variantId: string | undefined, canvasW: number, canvasH: number) {
    const replaceVariantElements = useDesignStore((s) => s.replaceVariantElements);

    const saveToStore = useCallback((
        engineRef: React.RefObject<Engine | null>, overlayElements: OverlayElement[],
    ): { success: boolean; message: string } => {
        const cs = useDesignStore.getState().creativeSet;
        if (!variantId || !cs) return { success: false, message: 'No variant or creative set active.' };
        const engine = engineRef.current;
        if (!engine) return { success: false, message: 'Engine not ready.' };

        let elements: DesignElement[] = [];
        try { elements = readNodesFromEngine(engine, canvasW, canvasH); } catch (err) { console.warn('[useCanvasSync] Failed:', err); }
        addOverlaysAndSort(elements, overlayElements, canvasW, canvasH);

        // ★ DATA LOSS GUARD: Never overwrite existing data with empty elements.
        // If the engine returns 0 elements but the store already has data,
        // something went wrong (engine destroyed, hot reload, etc.) — ABORT.
        const existingVariant = cs.variants.find(v => v.id === variantId);
        const existingCount = existingVariant?.elements?.length ?? 0;
        if (elements.length === 0 && existingCount > 0) {
            console.warn(`[useCanvasSync] ★ BLOCKED empty save: store has ${existingCount} elements, engine returned 0. Data preserved.`);
            return { success: false, message: 'Blocked: would overwrite existing data with empty state.' };
        }

        preserveCustomStyles(elements, variantId);
        restoreIdbRefs(elements, variantId);
        replaceVariantElements(variantId, elements);
        asyncExtractAssets(elements, variantId, replaceVariantElements);

        const isMaster = cs.masterVariantId === variantId;
        const msg = isMaster ? `Saved ${elements.length} elements to master. Propagated to ${cs.variants.length - 1} sizes.` : `Saved ${elements.length} elements to variant.`;
        console.log(`[useCanvasSync] ${msg}`);
        return { success: true, message: msg };
    }, [variantId, canvasW, canvasH, replaceVariantElements]);

    const saveFromCachedNodes = useCallback((
        cachedNodes: EngineNode[], overlayElements: OverlayElement[],
    ): { success: boolean; message: string } => {
        const cs = useDesignStore.getState().creativeSet;
        if (!variantId || !cs) return { success: false, message: 'No variant or creative set active.' };
        const elements = convertNodesToElements(cachedNodes, canvasW, canvasH);
        addOverlaysAndSort(elements, overlayElements, canvasW, canvasH);

        // ★ DATA LOSS GUARD: Never overwrite existing data with empty elements.
        const existingVariant = cs.variants.find(v => v.id === variantId);
        const existingCount = existingVariant?.elements?.length ?? 0;
        if (elements.length === 0 && existingCount > 0) {
            console.warn(`[useCanvasSync] ★ BLOCKED empty save (cached): store has ${existingCount} elements, cache returned 0. Data preserved.`);
            return { success: false, message: 'Blocked: would overwrite existing data with empty state.' };
        }

        restoreIdbRefs(elements, variantId);
        replaceVariantElements(variantId, elements);

        const isMaster = cs.masterVariantId === variantId;
        const msg = isMaster ? `Saved ${elements.length} elements (from cache). Propagated to ${cs.variants.length - 1} sizes.` : `Saved ${elements.length} elements (from cache) to variant.`;
        console.log(`[useCanvasSync] ${msg}`);
        return { success: true, message: msg };
    }, [variantId, canvasW, canvasH, replaceVariantElements]);

    const restoreFromStore = useCallback(async (engine: Engine): Promise<{ restoredShapes: number; overlayElements: OverlayElement[] }> => {
        const cs = useDesignStore.getState().creativeSet;
        if (!variantId || !cs) return { restoredShapes: 0, overlayElements: [] };
        const variant = cs.variants.find((v) => v.id === variantId);
        if (!variant?.elements?.length) return { restoredShapes: 0, overlayElements: [] };

        let restoredShapes = 0;
        const overlayElements: OverlayElement[] = [];
        const pendingImageLoads: (() => Promise<void>)[] = [];
        const pendingVideoLoads: Promise<void>[] = [];
        const sortedElements = [...variant.elements].map(el => ({ ...el, locked: false })).sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

        for (const el of sortedElements) {
            if (el.type === 'shape') {
                restoreShape(engine, el as ShapeElement, canvasW, canvasH, parseShadowColor);
                restoredShapes++;
            } else if (el.type === 'text') {
                restoreText(engine, el as TextElement, canvasW, canvasH, parseShadowColor);
                restoredShapes++;
            } else if (el.type === 'image') {
                restoreImage(engine, el as ImageElement, canvasW, canvasH, parseShadowColor, pendingImageLoads);
                restoredShapes++;
            } else if (el.type === 'video') {
                restoreVideo(el as VideoElement, canvasW, canvasH, overlayElements, pendingVideoLoads);
            }

            if (el.animation && el.animation.preset !== 'none') {
                const key = el.type === 'image' || el.type === 'video' ? el.id : `engine-${el.id}`;
                useAnimPresetStore.getState().setPreset(key, { anim: el.animation.preset, animDuration: el.animation.duration, startTime: el.animation.startTime });
            }
        }

        for (const loadFn of pendingImageLoads) await loadFn();
        await Promise.all(pendingVideoLoads);

        // ★ REGRESSION GUARD: Images load asynchronously (especially AI-generated Flux images
        // from external URLs). The Fabric stack order can desync from __glidZIndex because
        // add_image inserts at stack position based on current stack, not final intended order.
        // We run an immediate reorder, then two delayed passes to catch late-loading images.
        const doReorder = () => {
            if (typeof engine.reorder_by_z_index === 'function') {
                engine.reorder_by_z_index();
            }
        };
        doReorder();
        setTimeout(doReorder, 300);
        setTimeout(doReorder, 800);
        if (typeof document !== 'undefined' && document.fonts?.ready) {
            document.fonts.ready.then(() => {
                if (typeof engine.refreshTextCoords === 'function') engine.refreshTextCoords();
                doReorder();
            });
        }

        console.log(`[useCanvasSync] Restored ${restoredShapes} shapes, ${overlayElements.length} overlays`);
        return { restoredShapes, overlayElements };
    }, [variantId, canvasW, canvasH]);

    return { saveToStore, saveFromCachedNodes, restoreFromStore };
}

// ── Restore Helpers (private) ──

function restoreShape(engine: Engine, shape: ShapeElement, canvasW: number, canvasH: number, parseShadow: typeof parseShadowColor): void {
    const { x, y, w, h } = constraintsToAbsolute(shape.constraints, canvasW, canvasH);
    let nodeId: number;
    if (shape.gradientStart && shape.gradientEnd) {
        try { nodeId = engine.add_gradient_rect(x, y, w, h, shape.gradientStart, shape.gradientEnd, shape.gradientAngle ?? 135, shape.borderRadius ?? 0, shape.name); }
        catch { const [r1, g1, b1, a1] = hexToRgbFloat(shape.gradientStart); const [r2, g2, b2, a2] = hexToRgbFloat(shape.gradientEnd); nodeId = engine.add_gradient_rect(x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, shape.gradientAngle ?? 135); }
    } else if (shape.shapeType === 'ellipse') {
        const [r, g, b, a] = hexToRgbFloat(shape.fill || '#808080'); nodeId = engine.add_ellipse(x + w / 2, y + h / 2, w / 2, h / 2, r, g, b, a);
    } else if (shape.borderRadius && shape.borderRadius > 0) {
        const [r, g, b, a] = hexToRgbFloat(shape.fill || '#808080'); nodeId = engine.add_rounded_rect(x, y, w, h, r, g, b, a, shape.borderRadius);
    } else {
        const [r, g, b, a] = hexToRgbFloat(shape.fill || '#808080'); nodeId = engine.add_rect(x, y, w, h, r, g, b, a);
    }
    if (shape.opacity !== undefined && shape.opacity !== 1) try { engine.set_opacity(nodeId, shape.opacity); } catch { /* ok */ }
    if (shape.shadow) { try { const [sr, sg, sb, sa] = parseShadow(shape.shadow.color); engine.set_shadow(nodeId, shape.shadow.offsetX, shape.shadow.offsetY, shape.shadow.blur, sr, sg, sb, sa); } catch { /* ok */ } }
    if (shape.visible === false) try { engine.set_visible?.(nodeId, false); } catch { /* ok */ }
    if (typeof engine.set_z_index === 'function') engine.set_z_index(nodeId, shape.zIndex ?? 0);
    if (shape.constraints.rotation && typeof engine.set_angle === 'function') try { engine.set_angle(nodeId, shape.constraints.rotation); } catch { /* ok */ }
}

function restoreText(engine: Engine, text: TextElement, canvasW: number, canvasH: number, parseShadow: typeof parseShadowColor): void {
    let { x, y, w, h } = constraintsToAbsolute(text.constraints, canvasW, canvasH);
    const textH = h > 0 ? h : (text.fontSize || 16) * 2;
    if (x < -w) x = 0; if (y < -textH) y = 0;
    if (x > canvasW) x = Math.max(0, canvasW - w); if (y > canvasH) y = Math.max(0, canvasH - textH);
    if (w <= 0) w = canvasW * 0.85;
    const [tr, tg, tb] = hexToRgbFloat(text.color || '#ffffff');
    const nodeId = engine.add_text(x, y, text.content || '', text.fontSize || 16, text.fontFamily || 'Inter', String(text.fontWeight || 400), tr, tg, tb, 1.0, w, text.textAlign || 'center', text.name, text.lineHeight, text.letterSpacing, text.fontStyle);
    if (text.opacity !== undefined && text.opacity !== 1) try { engine.set_opacity(nodeId, text.opacity); } catch { /* ok */ }
    if (text.shadow) { try { const [sr, sg, sb, sa] = parseShadow(text.shadow.color); engine.set_shadow(nodeId, text.shadow.offsetX, text.shadow.offsetY, text.shadow.blur, sr, sg, sb, sa); } catch { /* ok */ } }
    if (text.textEffect && text.textEffect.type !== 'none') { try { engine.set_text_effect(nodeId, text.textEffect.type, text.textEffect.intensity ?? 50, text.textEffect.color ?? '#ffffff'); } catch { /* ok */ } }
    if (text.visible === false) try { engine.set_visible?.(nodeId, false); } catch { /* ok */ }
    if (typeof engine.set_z_index === 'function') engine.set_z_index(nodeId, text.zIndex ?? 1);
    if (text.constraints.rotation && typeof engine.set_angle === 'function') try { engine.set_angle(nodeId, text.constraints.rotation); } catch { /* ok */ }
}

function restoreImage(engine: Engine, img: ImageElement, canvasW: number, canvasH: number, parseShadow: typeof parseShadowColor, pendingLoads: (() => Promise<void>)[]): void {
    let { x, y, w, h } = constraintsToAbsolute(img.constraints, canvasW, canvasH);
    const isOut = w <= 0 || h <= 0 || x >= canvasW || y >= canvasH || x + w <= 0 || y + h <= 0;
    if (isOut) { w = Math.min(canvasW * 0.5, img.naturalWidth ?? canvasW * 0.5); h = Math.min(canvasH * 0.5, img.naturalHeight ?? canvasH * 0.5); x = Math.round((canvasW - w) / 2); y = Math.round((canvasH - h) / 2); }
    if (img.src) {
        // ★ DATA INTEGRITY: Remember the stored src (idb:// or data:) BEFORE resolving.
        // After resolve, the blob: URL is transient and session-scoped.
        // __glidPersistSrc preserves the stable ref for subsequent saves.
        const stableSrc = img.src;
        const cx = x, cy = y, cw = w, ch = h, ci = img;
        pendingLoads.push(async () => {
            const resolved = isAssetRef(ci.src!) ? await resolveAsset(ci.src!) : ci.src!;
            const nodeId = await engine.add_image(cx, cy, resolved, cw, ch, ci.name, ci.zIndex, ci.naturalWidth, ci.naturalHeight);
            // ★ Set persistent src on the Fabric object so save reads idb:// not blob:
            if (nodeId != null && engine._findById) {
                try {
                    const fabricObj = engine._findById(nodeId);
                    if (fabricObj) (fabricObj as any).__glidPersistSrc = stableSrc;
                } catch { /* ok */ }
            }
            if (ci.opacity !== undefined && ci.opacity !== 1) try { engine.set_opacity(nodeId, ci.opacity); } catch { /* ok */ }
            if (ci.shadow) { try { const [sr, sg, sb, sa] = parseShadow(ci.shadow.color); engine.set_shadow(nodeId, ci.shadow.offsetX, ci.shadow.offsetY, ci.shadow.blur, sr, sg, sb, sa); } catch { /* ok */ } }
            if (ci.constraints.rotation && typeof engine.set_angle === 'function') try { engine.set_angle(nodeId, ci.constraints.rotation); } catch { /* ok */ }
        });
    }
}

function restoreVideo(vid: VideoElement, canvasW: number, canvasH: number, overlayElements: OverlayElement[], pendingLoads: Promise<void>[]): void {
    let { x, y, w, h } = constraintsToAbsolute(vid.constraints, canvasW, canvasH);
    const isOut = w <= 0 || h <= 0 || x >= canvasW || y >= canvasH || x + w <= 0 || y + h <= 0;
    if (isOut) { x = 0; y = 0; w = canvasW; h = canvasH; } else { x = Math.max(0, Math.min(x, canvasW - 10)); y = Math.max(0, Math.min(y, canvasH - 10)); w = Math.min(w, canvasW - x); h = Math.min(h, canvasH - y); }
    const oel: OverlayElement = {
        id: vid.id, type: 'video', x, y, w, h, name: vid.name,
        videoSrc: vid.videoSrc || '', posterSrc: vid.posterSrc, fileName: vid.fileName,
        objectFit: (vid.fit === 'cover' || vid.fit === 'contain' || vid.fit === 'fill') ? vid.fit : 'cover',
        muted: vid.muted ?? true, loop: vid.loop ?? true, autoplay: vid.autoplay ?? true,
        opacity: vid.opacity ?? 1, visible: vid.visible !== false, locked: vid.locked ?? false, zIndex: vid.zIndex ?? 1,
    };
    overlayElements.push(oel);
    if (!oel.videoSrc || oel.videoSrc.startsWith('blob:')) {
        pendingLoads.push(loadVideoBlob(vid.id).then((url) => { if (url) oel.videoSrc = url; }).catch(() => {}));
    }
}
