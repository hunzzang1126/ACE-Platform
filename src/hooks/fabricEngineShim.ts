// ─────────────────────────────────────────────────
// fabricEngineShim — Engine compatibility layer
// ─────────────────────────────────────────────────
// Wraps Fabric.js canvas to expose an engine-compatible API.
// Used by AI tool executors, auto-design, vision QA, etc.
// Pure function — no React hooks.
// ─────────────────────────────────────────────────

import {
    Canvas, Rect, Ellipse, Shadow, Textbox,
    FabricImage, Gradient, Group, type FabricObject,
} from 'fabric';
import { useAnimPresetStore } from './useAnimationPresets';
import {
    nextId, rgbToHex, isArtboard, fabricToEngineNode, patchAceProps,
} from './fabricHelpers';

/**
 * Create an engine-compatible shim wrapping a Fabric.js Canvas.
 * This provides the same API surface as the WASM engine so AI executors
 * and other services can work with either backend.
 */
export function createEngineShim(
    fc: Canvas,
    syncState: () => void,
    artboardW: number,
    artboardH: number,
) {
    const findById = (id: number) => fc.getObjects().find((o) => (o as any).__aceId === id);
    const userObjects = () => fc.getObjects().filter(o => !isArtboard(o));

    return {
        // ── Query ────────────────────────────────────────
        get_all_nodes: () => {
            const nodes = userObjects().map(fabricToEngineNode);
            return JSON.stringify(nodes);
        },
        node_count: () => userObjects().length,
        get_selection: () => {
            const active = fc.getActiveObjects();
            return JSON.stringify(active.map((o) => (o as any).__aceId ?? 0));
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

        // ── Create: shapes ───────────────────────────────
        add_rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, name?: string) => {
            const id = nextId();
            const rect = new Rect({
                left: x, top: y, width: w, height: h,
                fill: rgbToHex(r, g, b),
                opacity: a,
            });
            (rect as any).__aceId = id;
            (rect as any).__aceName = name || `Rectangle #${id}`;
            (rect as any).__aceZIndex = userObjects().length;
            patchAceProps(rect);
            fc.add(rect);
            fc.renderAll();
            syncState();
            return id;
        },

        add_rounded_rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, radius: number, name?: string) => {
            const id = nextId();
            const rect = new Rect({
                left: x, top: y, width: w, height: h,
                fill: rgbToHex(r, g, b),
                opacity: a,
                rx: radius, ry: radius,
            });
            (rect as any).__aceId = id;
            (rect as any).__aceName = name || `Rounded Rect #${id}`;
            (rect as any).__aceZIndex = userObjects().length;
            patchAceProps(rect);
            fc.add(rect);
            fc.renderAll();
            syncState();
            return id;
        },

        add_gradient_rect: (
            x: number, y: number, w: number, h: number,
            hex1: string, hex2: string,
            angleDeg: number = 0,
            radius: number = 0,
            name?: string,
        ) => {
            const id = nextId();
            const rad = (angleDeg * Math.PI) / 180;
            const x1 = 0.5 - Math.sin(rad) * 0.5;
            const y1 = 0.5 - Math.cos(rad) * 0.5;
            const x2 = 0.5 + Math.sin(rad) * 0.5;
            const y2 = 0.5 + Math.cos(rad) * 0.5;
            const gradient = new Gradient({
                type: 'linear',
                coords: { x1: x1 * w, y1: y1 * h, x2: x2 * w, y2: y2 * h },
                colorStops: [
                    { offset: 0, color: hex1 },
                    { offset: 1, color: hex2 },
                ],
                gradientUnits: 'pixels',
            });
            const rect = new Rect({
                left: x, top: y, width: w, height: h,
                fill: gradient,
                rx: radius, ry: radius,
            });
            (rect as any).__aceId = id;
            (rect as any).__aceName = name || `Gradient Rect #${id}`;
            (rect as any).__aceZIndex = userObjects().length;
            (rect as any).__aceGradientStart = hex1;
            (rect as any).__aceGradientEnd = hex2;
            (rect as any).__aceGradientAngle = angleDeg;
            patchAceProps(rect);
            fc.add(rect);
            fc.renderAll();
            syncState();
            return id;
        },

        add_ellipse: (cx: number, cy: number, rx: number, ry: number, r: number, g: number, b: number, a: number) => {
            const id = nextId();
            const el = new Ellipse({
                left: cx - rx, top: cy - ry,
                rx, ry,
                fill: rgbToHex(r, g, b),
                opacity: a,
            });
            (el as any).__aceId = id;
            (el as any).__aceZIndex = userObjects().length;
            patchAceProps(el);
            fc.add(el);
            fc.renderAll();
            return id;
        },

        // ── Create: text ─────────────────────────────────
        add_text: (
            x: number, y: number, content: string,
            fontSize: number, fontFamily: string, fontWeight: string,
            r: number, g: number, b: number, _a: number,
            width: number, textAlign: string,
            name?: string,
            lineHeight?: number,
            letterSpacing?: number,
        ) => {
            const id = nextId();
            const tb = new Textbox(content || 'Text', {
                left: x,
                top: y,
                width: width > 0 ? width : 200,
                fontSize: fontSize || 18,
                fontFamily: fontFamily || 'Inter, system-ui, sans-serif',
                fontWeight: fontWeight || '400',
                fill: rgbToHex(r, g, b),
                textAlign: (textAlign as any) || 'left',
                lineHeight: lineHeight ?? 1.4,
                charSpacing: (letterSpacing ?? 0) * 10,
                editable: true,
            });
            (tb as any).__aceId = id;
            (tb as any).__aceName = name || `Text #${id}`;
            (tb as any).__aceZIndex = userObjects().length;
            patchAceProps(tb);
            fc.add(tb);
            fc.renderAll();
            syncState();
            return id;
        },

        // ── Create: image (async) ────────────────────────
        // ★ REGRESSION GUARD: fc.add() ALWAYS places objects at the TOP of the
        // Fabric stack — regardless of __aceZIndex. When images load async
        // (FabricImage.fromURL), all sync elements (shapes, text) are already
        // added, so the image lands on top of everything after load.
        // Fix: after fc.add(), immediately call fc.moveObjectTo(img, rank+1)
        // where rank is this image's position in the __aceZIndex-sorted list.
        add_image: async (x: number, y: number, src: string, w?: number, h?: number, name?: string, zIndex?: number): Promise<number> => {
            const id = nextId();
            try {
                const isDataUrl = src.startsWith('data:');
                const imgOptions = isDataUrl ? {} : { crossOrigin: 'anonymous' as const };
                const img = await FabricImage.fromURL(src, imgOptions);
                const natW = img.width ?? 200;
                const natH = img.height ?? 200;

                let targetW: number;
                let targetH: number;
                let scaleX: number;
                let scaleY: number;

                if (w != null && h != null) {
                    // ★ Stretch to fill — use independent scaleX/scaleY (for backgrounds)
                    targetW = w;
                    targetH = h;
                    scaleX = w / Math.max(natW, 1);
                    scaleY = h / Math.max(natH, 1);
                } else if (w != null) {
                    targetW = w;
                    targetH = natH * (targetW / Math.max(natW, 1));
                    scaleX = scaleY = targetW / Math.max(natW, 1);
                } else {
                    targetW = Math.min(natW, artboardW * 0.7);
                    targetH = natH * (targetW / Math.max(natW, 1));
                    scaleX = scaleY = targetW / Math.max(natW, 1);
                }

                img.set({ left: x, top: y, scaleX, scaleY });
                (img as any).__aceId = id;
                (img as any).__aceName = name || `Image #${id}`;
                const targetZIndex = zIndex ?? userObjects().length;
                (img as any).__aceZIndex = targetZIndex;
                patchAceProps(img);
                fc.add(img);

                // ★ Move to correct stack position IMMEDIATELY after fc.add().
                // Artboard is always at Fabric index 0. User objects start at index 1.
                // Sort all current user objects by __aceZIndex, find this image's rank,
                // then move it to rank+1 (skipping artboard at 0).
                const sortedByZ = userObjects().sort(
                    (a, b) => ((a as any).__aceZIndex ?? 0) - ((b as any).__aceZIndex ?? 0)
                );
                const rank = sortedByZ.indexOf(img);
                if (rank >= 0) {
                    fc.moveObjectTo(img, rank + 1); // +1: artboard at index 0
                }

                // Auto-select only when user adds a NEW image (no saved zIndex)
                if (zIndex === undefined) {
                    fc.setActiveObject(img);
                }
                fc.renderAll();
                syncState();
                console.log(`[EngineShim] Image added: id=${id} name="${name}" zIndex=${targetZIndex} fabricIndex=${rank + 1}`);
            } catch (err) {
                console.error('[EngineShim] Failed to load image:', err);
            }
            return id;
        },

        // Utility: re-sort all Fabric objects by __aceZIndex.
        // Call after all async image loads to fix any ordering issues.
        reorder_by_z_index: () => {
            const objs = userObjects().sort(
                (a, b) => ((a as any).__aceZIndex ?? 0) - ((b as any).__aceZIndex ?? 0)
            );
            objs.forEach((o, i) => fc.moveObjectTo(o, i + 1)); // +1: artboard at 0
            fc.renderAll();
            syncState();
        },

        // ── Grouping ─────────────────────────────────────
        group_elements: (ids: number[], name?: string): number => {
            const objects = ids.map(findById).filter(Boolean) as FabricObject[];
            if (objects.length < 2) return -1;
            const gid = nextId();
            const group = new Group(objects);
            objects.forEach(o => fc.remove(o));
            (group as any).__aceId = gid;
            (group as any).__aceName = name || `Group #${gid}`;
            (group as any).__aceZIndex = userObjects().length;
            patchAceProps(group);
            fc.add(group);
            fc.setActiveObject(group);
            fc.renderAll();
            syncState();
            return gid;
        },

        ungroup: (id: number) => {
            const obj = findById(id);
            if (!obj || !(obj instanceof Group)) return;
            const items = (obj as Group).getObjects();
            fc.remove(obj);
            items.forEach((item, i) => {
                (item as any).__aceId = nextId();
                (item as any).__aceZIndex = userObjects().length + i;
                patchAceProps(item);
                fc.add(item);
            });
            fc.renderAll();
            syncState();
        },

        // ── Selection ────────────────────────────────────
        select: (id: number) => {
            const obj = findById(id);
            if (obj) { fc.setActiveObject(obj); fc.renderAll(); }
        },
        toggle_select: (id: number) => {
            const obj = findById(id);
            if (!obj) return;
            const active = fc.getActiveObjects();
            if (active.includes(obj)) {
                fc.discardActiveObject();
            } else {
                fc.setActiveObject(obj);
            }
            fc.renderAll();
        },
        deselect_all: () => { fc.discardActiveObject(); fc.renderAll(); },

        // ── Scene management ─────────────────────────────
        delete_selected: () => {
            const active = fc.getActiveObjects().filter(o => !isArtboard(o));
            active.forEach((o) => fc.remove(o));
            fc.discardActiveObject();
            fc.renderAll();
        },
        clear_scene: () => {
            const toRemove = userObjects();
            toRemove.forEach((o) => fc.remove(o));
            fc.renderAll();
        },
        clear() { this.clear_scene(); },

        // ── Screenshot ───────────────────────────────────
        get_screenshot: (): string => {
            const artboard = fc.getObjects().find(isArtboard);
            if (!artboard) return fc.toDataURL({ format: 'png', multiplier: 1 });
            const zoom = fc.getZoom();
            const vpt = fc.viewportTransform ?? [1, 0, 0, 1, 0, 0];
            return fc.toDataURL({
                format: 'png',
                multiplier: 1,
                left: Math.round(vpt[4]),
                top: Math.round(vpt[5]),
                width: Math.round(artboardW * zoom),
                height: Math.round(artboardH * zoom),
            });
        },

        // ── Lookup ───────────────────────────────────────
        find_by_name: (name: string): number | null => {
            const obj = userObjects().find((o) => (o as any).__aceName === name);
            return obj ? ((obj as any).__aceId as number) : null;
        },
        find_all_by_type: (type: string): number[] => {
            return userObjects()
                .filter((o) => fabricToEngineNode(o).type === type)
                .map((o) => (o as any).__aceId as number);
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

        // ── Mutations ────────────────────────────────────
        send_to_front: (id: number): void => {
            const obj = findById(id);
            if (obj) {
                fc.bringObjectToFront(obj);
                (obj as any).__aceZIndex = userObjects().length - 1;
                fc.renderAll();
                syncState();
            }
        },
        remove_element: (id: number): void => {
            const obj = findById(id);
            if (obj) { fc.remove(obj); fc.renderAll(); }
        },
        set_font_size: (id: number, size: number) => {
            const obj = findById(id);
            if (obj && 'fontSize' in obj) {
                obj.set({ fontSize: size } as any);
                fc.renderAll();
                syncState();
            }
        },
        set_fill_hex: (id: number, hex: string) => {
            const obj = findById(id);
            if (obj) { obj.set({ fill: hex }); fc.renderAll(); }
        },
        set_position: (id: number, x: number, y: number) => {
            const obj = findById(id);
            if (obj) { obj.set({ left: x, top: y }); obj.setCoords(); fc.renderAll(); }
        },
        set_size: (id: number, w: number, h: number) => {
            const obj = findById(id);
            if (!obj) return;
            if (obj.type === 'image') {
                const natW = (obj as any).width ?? w;
                const natH = (obj as any).height ?? h;
                const scale = Math.min(w / Math.max(natW, 1), h / Math.max(natH, 1));
                obj.set({ scaleX: scale, scaleY: scale });
            } else {
                obj.set({ width: w, height: h, scaleX: 1, scaleY: 1 });
            }
            obj.setCoords();
            fc.renderAll();
        },
        set_opacity: (id: number, v: number) => {
            const obj = findById(id);
            if (obj) { obj.set({ opacity: v }); fc.renderAll(); }
        },
        set_fill_color: (id: number, r: number, g: number, b: number, _a: number) => {
            const obj = findById(id);
            if (obj) { obj.set({ fill: rgbToHex(r, g, b) }); fc.renderAll(); }
        },
        set_z_index: (id: number, z: number) => {
            const obj = findById(id);
            if (!obj) return;
            (obj as any).__aceZIndex = z;
            const objs = userObjects().sort((a, b) => ((a as any).__aceZIndex ?? 0) - ((b as any).__aceZIndex ?? 0));
            objs.forEach((o, i) => { fc.moveObjectTo(o, i + 1); });
            fc.renderAll();
            syncState();
        },

        // ── Effects ──────────────────────────────────────
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
        set_blend_mode: () => { },
        set_brightness: () => { },
        set_contrast: () => { },
        set_saturation: () => { },
        set_hue_rotate: () => { },
        add_keyframe: () => { },
        clear_node_keyframes: () => { },

        // ── Animation state machine ──────────────────────
        _animState: {
            playing: false,
            time: 0,
            duration: 5.0,
            looping: false,
            speed: 1.0,
            startTs: 0,
            startOffset: 0,
            rafId: 0,
        },

        anim_play() {
            const s = this._animState;
            if (s.playing) return;
            s.playing = true;
            s.startTs = performance.now();
            s.startOffset = s.time;

            const objs = fc.getObjects().filter(o => !isArtboard(o));
            for (const obj of objs) {
                if (!(obj as any).__aceOrigPos) {
                    (obj as any).__aceOrigPos = {
                        left: obj.left ?? 0,
                        top: obj.top ?? 0,
                        opacity: obj.opacity ?? 1,
                        scaleX: obj.scaleX ?? 1,
                        scaleY: obj.scaleY ?? 1,
                    };
                }
            }

            const tick = () => {
                if (!s.playing) return;
                const elapsed = (performance.now() - s.startTs) / 1000 * s.speed;
                s.time = s.startOffset + elapsed;
                if (s.time >= s.duration) {
                    if (s.looping) {
                        s.time = s.time % s.duration;
                        s.startTs = performance.now();
                        s.startOffset = s.time;
                    } else {
                        s.time = s.duration;
                        s.playing = false;
                        this._restoreOriginalPositions();
                        return;
                    }
                }
                this._applyAnimationFrame(s.time);
                s.rafId = requestAnimationFrame(tick);
            };
            s.rafId = requestAnimationFrame(tick);
        },

        _applyAnimationFrame(currentTime: number) {
            const presets = useAnimPresetStore.getState().presets;
            const objs = fc.getObjects().filter(o => !isArtboard(o));
            let needsRender = false;

            for (const obj of objs) {
                const aceId = (obj as any).__aceId;
                if (!aceId) continue;
                const config = presets[String(aceId)];
                if (!config || config.anim === 'none') continue;
                const orig = (obj as any).__aceOrigPos;
                if (!orig) continue;

                const animStart = config.startTime ?? 0;
                const animEnd = animStart + (config.animDuration ?? 0.3);
                let progress: number;
                if (currentTime <= animStart) progress = 0;
                else if (currentTime >= animEnd) progress = 1;
                else progress = (currentTime - animStart) / (animEnd - animStart);

                const inv = 1 - progress;
                const t = 1 - inv * inv * inv;

                switch (config.anim) {
                    case 'fade':
                        obj.set({ opacity: t * orig.opacity });
                        break;
                    case 'slide-left':
                        obj.set({ left: orig.left + (-300 * (1 - t)) });
                        break;
                    case 'slide-right':
                        obj.set({ left: orig.left + (300 * (1 - t)) });
                        break;
                    case 'slide-up':
                        obj.set({ top: orig.top + (-300 * (1 - t)) });
                        break;
                    case 'slide-down':
                        obj.set({ top: orig.top + (300 * (1 - t)) });
                        break;
                    case 'scale':
                        obj.set({ scaleX: orig.scaleX * t, scaleY: orig.scaleY * t });
                        break;
                    case 'ascend':
                        obj.set({ top: orig.top + (200 * (1 - t)), opacity: t * orig.opacity });
                        break;
                    case 'descend':
                        obj.set({ top: orig.top + (-200 * (1 - t)), opacity: t * orig.opacity });
                        break;
                }
                needsRender = true;
            }
            if (needsRender) fc.renderAll();
        },

        _restoreOriginalPositions() {
            const objs = fc.getObjects().filter(o => !isArtboard(o));
            for (const obj of objs) {
                const orig = (obj as any).__aceOrigPos;
                if (orig) {
                    obj.set({
                        left: orig.left,
                        top: orig.top,
                        opacity: orig.opacity,
                        scaleX: orig.scaleX,
                        scaleY: orig.scaleY,
                    });
                    delete (obj as any).__aceOrigPos;
                }
            }
            fc.renderAll();
        },

        anim_pause() {
            this._animState.playing = false;
            cancelAnimationFrame(this._animState.rafId);
        },
        anim_stop() {
            this._animState.playing = false;
            this._animState.time = 0;
            cancelAnimationFrame(this._animState.rafId);
            this._restoreOriginalPositions();
        },
        anim_seek(t: number) {
            this._animState.time = Math.max(0, Math.min(t, this._animState.duration));
            if (this._animState.playing) {
                this._animState.startTs = performance.now();
                this._animState.startOffset = this._animState.time;
            }
            this._applyAnimationFrame(this._animState.time);
        },
        anim_time(): number { return this._animState.time; },
        anim_playing(): boolean { return this._animState.playing; },
        anim_duration(): number { return this._animState.duration; },
        anim_looping(): boolean { return this._animState.looping; },
        set_duration(d: number) { this._animState.duration = d; },
        set_looping(v: boolean) { this._animState.looping = v; },
        anim_set_speed(s: number) { this._animState.speed = s; },
        anim_toggle() {
            if (this._animState.playing) this.anim_pause();
            else this.anim_play();
        },

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
