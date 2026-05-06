// ─────────────────────────────────────────────────
// fabricEngineShim — Engine compatibility layer (orchestrator)
// ─────────────────────────────────────────────────
// Wraps Fabric.js canvas to expose an engine-compatible API.
// Sub-modules: shimAnimation, shimTextEffects, shimCreators
// ─────────────────────────────────────────────────

import {
    Canvas, Shadow, ActiveSelection, type FabricObject,
} from 'fabric';
import { loadGoogleFont } from '@/services/fontLoader';
import {
    nextId, rgbToHex, isArtboard, fabricToEngineNode, GLID_CUSTOM_PROPS,
    patchAceProps,
} from './fabricHelpers';
import { createAnimationMethods } from './shimAnimation';
import { createTextEffectMethods } from './shimTextEffects';
import { createCreatorMethods } from './shimCreators';
import { createFilterMethods } from './shimFilters';
import type { ShimContext } from './shimTypes';

/**
 * Create an engine-compatible shim wrapping a Fabric.js Canvas.
 * Delegates to sub-modules for element creation, text effects, and animation.
 */
export function createEngineShim(
    fc: Canvas,
    syncState: () => void,
    artboardW: number,
    artboardH: number,
) {
    const findById = (id: number) => fc.getObjects().find((o) => (o as any).__glidId === id);
    const userObjects = () => fc.getObjects().filter(o => !isArtboard(o));

    // Shared context for sub-modules
    const ctx: ShimContext = { fc, syncState, findById, userObjects, artboardW, artboardH };

    return {
        // ── Sub-module methods (spread) ──────────────────
        ...createCreatorMethods(ctx),
        ...createTextEffectMethods(ctx),
        ...createAnimationMethods(fc, userObjects),
        ...createFilterMethods(ctx),

        // ── Query ────────────────────────────────────────
        // ★ _findById: internal — used by restoreImage to set __glidPersistSrc
        _findById: findById,
        get_all_nodes: () => {
            // ★ FIX: Fabric.js objects inside an ActiveSelection have their
            // left/top temporarily offset to be relative to the selection center.
            // We must discard the selection before reading positions, then re-select.
            const activeObjs = fc.getActiveObjects();
            const hadMultiSelect = activeObjs.length > 1;
            if (hadMultiSelect) fc.discardActiveObject();
            const result = JSON.stringify(userObjects().map(fabricToEngineNode));
            // Re-select after reading (UX: save doesn't visually deselect)
            if (hadMultiSelect && activeObjs.length > 1) {
                const sel = new ActiveSelection(activeObjs, { canvas: fc });
                fc.setActiveObject(sel);
                fc.renderAll();
            }
            return result;
        },
        get_canvas_size: () => ({ width: artboardW, height: artboardH }),
        /** Read artboard fill color for template save */
        get_artboard_color: (): string | null => {
            const ab = fc.getObjects().find(o => (o as any).__glidArtboard);
            if (!ab) return null;
            return typeof ab.fill === 'string' ? ab.fill : null;
        },
        /** Set artboard fill color (used during restore) */
        set_artboard_color: (color: string): void => {
            const ab = fc.getObjects().find(o => (o as any).__glidArtboard);
            if (ab) { ab.set({ fill: color }); fc.renderAll(); }
        },
        getCanvasJSON: (): string => JSON.stringify(fc.toObject(GLID_CUSTOM_PROPS)),
        loadCanvasJSON: async (jsonStr: string): Promise<void> => {
            await fc.loadFromJSON(jsonStr);
            fc.renderAll();
        },
        node_count: () => userObjects().length,
        get_selection: () => {
            const active = fc.getActiveObjects();
            return JSON.stringify(active.map((o) => (o as any).__glidId ?? 0));
        },
        selection_bounds: () => {
            const active = fc.getActiveObject();
            if (!active) return 'null';
            const bounds = active.getBoundingRect();
            return JSON.stringify({ x: bounds.left, y: bounds.top, w: bounds.width, h: bounds.height });
        },
        selection_handles: () => '[]',
        rubber_band_rect: () => 'null',
        hit_test: () => JSON.stringify({ type: 'none' }),

        // ── Z-Order ──────────────────────────────────────
        reorder_by_z_index: () => {
            const objs = userObjects().sort(
                (a, b) => ((a as any).__glidZIndex ?? 0) - ((b as any).__glidZIndex ?? 0)
            );
            objs.forEach((o, i) => fc.moveObjectTo(o, i + 1));
            objs.forEach(o => { o.dirty = true; o.setCoords(); });
            fc.renderAll(); syncState();
        },
        syncZIndexFromStack: () => {
            let idx = 0;
            for (const obj of fc.getObjects()) {
                if ((obj as any).__glidId != null) (obj as any).__glidZIndex = idx++;
            }
        },
        set_z_index: (nodeId: number, zIndex: number) => {
            const obj = findById(nodeId);
            if (obj) (obj as any).__glidZIndex = zIndex;
        },
        set_z_index_and_reorder: (id: number, z: number) => {
            const obj = findById(id);
            if (!obj) return;
            (obj as any).__glidZIndex = z;
            const objs = userObjects().sort((a, b) => ((a as any).__glidZIndex ?? 0) - ((b as any).__glidZIndex ?? 0));
            objs.forEach((o, i) => { fc.moveObjectTo(o, i + 1); });
            objs.forEach(o => { o.dirty = true; o.setCoords(); });
            fc.renderAll(); syncState();
        },

        // ── Export (Pixel-perfect from Fabric canvas) ────
        // ★ This is the ONLY correct way to export. Guarantees output
        // matches exactly what user sees in the Canvas Editor.
        exportToDataURL: (): string => {
            // Hide artboard so only user content is exported
            const artboard = fc.getObjects().find(o => isArtboard(o));
            if (artboard) artboard.visible = false;
            fc.renderAll();
            const dataUrl = fc.toDataURL({
                format: 'png',
                left: 0,
                top: 0,
                width: artboardW,
                height: artboardH,
                multiplier: 1,
            });
            if (artboard) artboard.visible = true;
            fc.renderAll();
            return dataUrl;
        },

        // ── Utility ──────────────────────────────────────
        refreshTextCoords: () => {
            let refreshed = 0;
            for (const obj of userObjects()) {
                if (obj.type === 'textbox' || obj.type === 'text') {
                    if (typeof (obj as any).initDimensions === 'function') (obj as any).initDimensions();
                    obj.setCoords();
                    refreshed++;
                }
            }
            for (const obj of userObjects()) obj.setCoords();
            if (refreshed > 0) fc.renderAll();
        },
        setCustomStyles: (elementName: string, styles: Record<string, string>) => {
            const nameLower = elementName.toLowerCase();
            for (const obj of userObjects()) {
                const objName = ((obj as any).__glidName ?? '').toLowerCase();
                if (objName.includes(nameLower)) {
                    (obj as any).__glidCustomStyles = { ...((obj as any).__glidCustomStyles || {}), ...styles };
                }
            }
            fc.renderAll();
        },

        // ── Visibility / Lock ────────────────────────────
        set_visible: (nodeId: number, visible: boolean) => {
            const obj = userObjects().find(o => (o as any).__glidId === nodeId);
            if (obj) { obj.visible = visible; fc.renderAll(); }
        },
        set_locked: (nodeId: number, locked: boolean) => {
            const obj = userObjects().find(o => (o as any).__glidId === nodeId);
            if (obj) {
                (obj as any).lockMovementX = locked;
                (obj as any).lockMovementY = locked;
                (obj as any).lockScalingX = locked;
                (obj as any).lockScalingY = locked;
                (obj as any).lockRotation = locked;
                obj.selectable = !locked;
                fc.renderAll();
            }
        },
        set_name: (id: number, name: string) => {
            const obj = findById(id);
            if (obj) { (obj as any).__glidName = name; syncState(); }
        },

        // ── Selection ────────────────────────────────────
        select: (id: number) => {
            const obj = findById(id);
            if (obj) { fc.setActiveObject(obj); fc.renderAll(); }
        },
        toggle_select: (id: number) => {
            const obj = findById(id);
            if (!obj) return;
            if (fc.getActiveObjects().includes(obj)) fc.discardActiveObject();
            else fc.setActiveObject(obj);
            fc.renderAll();
        },
        deselect_all: () => { fc.discardActiveObject(); fc.renderAll(); },
        delete_selected: () => {
            fc.getActiveObjects().filter(o => !isArtboard(o)).forEach(o => fc.remove(o));
            fc.discardActiveObject(); fc.renderAll();
        },
        clear_scene: () => { userObjects().forEach(o => fc.remove(o)); fc.renderAll(); },
        clear() { this.clear_scene(); },

        // ── Screenshot ───────────────────────────────────
        get_screenshot: (): string => {
            const zoom = fc.getZoom();
            const vpt = fc.viewportTransform ?? [1, 0, 0, 1, 0, 0];
            return fc.toDataURL({
                format: 'png', multiplier: 1,
                left: Math.round(vpt[4]), top: Math.round(vpt[5]),
                width: Math.round(artboardW * zoom), height: Math.round(artboardH * zoom),
            });
        },

        // ── Lookup ───────────────────────────────────────
        find_by_name: (name: string): number | null => {
            const obj = userObjects().find(o => (o as any).__glidName === name);
            return obj ? ((obj as any).__glidId as number) : null;
        },
        find_all_by_type: (type: string): number[] => {
            return userObjects().filter(o => fabricToEngineNode(o).type === type).map(o => (o as any).__glidId as number);
        },
        get_element_bounds: (id: number): { x: number; y: number; w: number; h: number } | null => {
            const obj = findById(id);
            if (!obj) return null;
            const n = fabricToEngineNode(obj);
            return { x: n.x, y: n.y, w: n.w, h: n.h };
        },
        get_image_src: (id: number): string => {
            const obj = findById(id);
            if (!obj || obj.type !== 'image') return '';
            return (obj as any)._element?.src ?? '';
        },

        // ── Property setters ─────────────────────────────
        send_to_front: (id: number): void => {
            const obj = findById(id);
            if (!obj) return;
            // Set highest z-index, then full reorder to keep everything consistent
            const maxZ = userObjects().reduce((m, o) => Math.max(m, (o as any).__glidZIndex ?? 0), 0);
            (obj as any).__glidZIndex = maxZ + 1;
            const sorted = userObjects().sort((a, b) => ((a as any).__glidZIndex ?? 0) - ((b as any).__glidZIndex ?? 0));
            sorted.forEach((o, i) => { fc.moveObjectTo(o, i + 1); (o as any).__glidZIndex = i; });
            sorted.forEach(o => { o.dirty = true; o.setCoords(); });
            fc.renderAll(); syncState();
        },
        // ★ REGRESSION GUARD: NEVER use fc.sendObjectToBack() — it places the object
        // at Fabric index 0, BEHIND the artboard. This makes all elements invisible
        // because they render outside the artboard's clipping boundary.
        // Use moveObjectTo(obj, 1) to place just above the artboard.
        send_to_back: (id: number): void => {
            const obj = findById(id);
            if (!obj) return;
            (obj as any).__glidZIndex = -1;
            const sorted = userObjects().sort((a, b) => ((a as any).__glidZIndex ?? 0) - ((b as any).__glidZIndex ?? 0));
            sorted.forEach((o, i) => { fc.moveObjectTo(o, i + 1); (o as any).__glidZIndex = i; });
            sorted.forEach(o => { o.dirty = true; o.setCoords(); });
            fc.renderAll(); syncState();
        },
        remove_element: (id: number): void => {
            const obj = findById(id);
            if (obj) { fc.remove(obj); fc.renderAll(); }
        },
        set_font_size: (id: number, size: number) => {
            const obj = findById(id);
            if (obj && 'fontSize' in obj) { obj.set({ fontSize: size } as any); fc.renderAll(); syncState(); }
        },
        set_text_content: (id: number, text: string) => {
            const obj = findById(id);
            if (obj && 'text' in obj) {
                obj.set({ text } as any);
                obj.setCoords(); // ★ CRITICAL: Recalculate bounding box for new text
                fc.renderAll();
                syncState();
            }
        },
        set_fill_hex: (id: number, hex: string) => {
            const obj = findById(id);
            if (obj) { obj.set({ fill: hex }); fc.renderAll(); syncState(); }
        },
        set_font_family: (id: number, family: string) => {
            const obj = findById(id);
            if (!obj || !('fontFamily' in obj)) return;
            // ★ Load Google Font first, then apply
            loadGoogleFont(family).then(() => {
                obj.set({ fontFamily: family } as any);
                obj.setCoords();
                fc.renderAll();
                syncState();
            });
        },
        set_font_weight: (id: number, weight: number) => {
            const obj = findById(id);
            if (obj && 'fontWeight' in obj) { obj.set({ fontWeight: weight } as any); obj.setCoords(); fc.renderAll(); syncState(); }
        },
        set_position: (id: number, x: number, y: number) => {
            const obj = findById(id);
            if (!obj) return;
            // -1 sentinel = keep current value
            const newX = x >= 0 ? x : (obj.left ?? 0);
            const newY = y >= 0 ? y : (obj.top ?? 0);
            obj.set({ left: newX, top: newY }); obj.setCoords(); fc.renderAll(); syncState();
        },
        set_angle: (id: number, angle: number) => {
            const obj = findById(id);
            if (obj) { obj.set({ angle }); obj.setCoords(); fc.renderAll(); syncState(); }
        },
        set_size: (id: number, w: number, h: number) => {
            const obj = findById(id);
            if (!obj) return;
            // -1 sentinel = keep current value
            const curW = (obj as any).width ?? 100;
            const curH = (obj as any).height ?? 100;
            const newW = w >= 0 ? w : curW;
            const newH = h >= 0 ? h : curH;
            if (obj.type === 'image') {
                // ★ FILL mode: independent scaleX/scaleY to exactly match target dimensions.
                // Previous code used Math.min (contain mode) which left gaps when
                // image aspect ratio didn't match target. Background images MUST fill.
                const natW = (obj as any).width ?? newW;
                const natH = (obj as any).height ?? newH;
                obj.set({ scaleX: newW / Math.max(natW, 1), scaleY: newH / Math.max(natH, 1) });
            } else {
                obj.set({ width: newW, height: newH, scaleX: 1, scaleY: 1 });
            }
            obj.setCoords(); fc.renderAll(); syncState();
        },
        fill_to_page: (id?: number) => {
            let obj: FabricObject | undefined;
            if (id != null) obj = findById(id);
            else {
                const images = userObjects().filter(o => o.type === 'image');
                obj = images.find(o => ((o as any).__glidName ?? '').toLowerCase().includes('background')) ?? images[0];
            }
            if (!obj || obj.type !== 'image') return;
            const natW = (obj as any).width ?? 1;
            const natH = (obj as any).height ?? 1;
            const scale = Math.max(artboardW / Math.max(natW, 1), artboardH / Math.max(natH, 1));
            const offsetX = (artboardW - natW * scale) / 2;
            const offsetY = (artboardH - natH * scale) / 2;
            obj.set({ scaleX: scale, scaleY: scale, left: offsetX, top: offsetY });
            obj.setCoords(); fc.renderAll(); syncState();
        },
        set_opacity: (id: number, v: number) => {
            const obj = findById(id);
            if (obj) { obj.set({ opacity: v }); fc.renderAll(); }
        },
        set_fill_color: (id: number, r: number, g: number, b: number, _a: number) => {
            const obj = findById(id);
            if (obj) { obj.set({ fill: rgbToHex(r, g, b) }); fc.renderAll(); }
        },

        // ── Effects: shadow ──────────────────────────────
        set_shadow: (id: number, ox: number, oy: number, blur: number, r: number, g: number, b: number, a: number) => {
            const obj = findById(id);
            if (!obj) return;
            obj.set({
                shadow: new Shadow({
                    color: `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`,
                    blur, offsetX: ox, offsetY: oy,
                }),
            });
            fc.renderAll();
        },
        remove_shadow: (id: number) => {
            const obj = findById(id);
            if (obj) { obj.set({ shadow: undefined }); fc.renderAll(); }
        },

        // ── Filters: provided by shimFilters.ts ─────────
        // set_blend_mode, set_brightness, set_contrast, set_saturation,
        // set_hue_rotate, set_blur → all from createFilterMethods(ctx)
        add_keyframe: () => { },
        clear_node_keyframes: () => { },

        // ── Render / viewport ────────────────────────────
        render_frame: () => { fc.renderAll(); },
        get_viewport_transform: (): number[] => {
            return fc.viewportTransform ? [...fc.viewportTransform] : [1, 0, 0, 1, 0, 0];
        },
        can_undo: () => false,
        can_redo: () => false,
        start_move: () => { },
        start_resize: () => { },
        update_drag: () => { },
        end_drag: () => { },
        free: () => { cancelAnimationFrame(0); },
    };
}
