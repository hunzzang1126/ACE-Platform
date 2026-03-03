// ─────────────────────────────────────────────────
// useFabricCanvas — Fabric.js-based canvas engine
// Drop-in replacement for useCanvasEngine (WASM WebGPU)
// Handles shapes, selection, drag, resize, effects natively
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect, Ellipse, Shadow, type FabricObject } from 'fabric';
import { useEditorStore } from '@/stores/editorStore';
import type { EngineNode, CanvasEngineState, CanvasEngineActions, UseCanvasEngineResult } from './canvasTypes';

// ── Unique ID generator ──
let _nextId = 1;
function nextId(): number { return _nextId++; }

// Random pastel colors for new shapes
const SHAPE_COLORS: string[] = [
    '#547BFF', '#29D2A0', '#F05C99',
    '#FFA600', '#9966E6', '#33BFD9',
    '#F2D933',
];
let colorIdx = 0;
function nextColor(): string {
    const c = SHAPE_COLORS[colorIdx % SHAPE_COLORS.length]!;
    colorIdx++;
    return c;
}

// ── Hex ↔ RGB helpers ──
function hexToRgb01(hex: string): [number, number, number] {
    const c = hex.replace('#', '');
    return [
        parseInt(c.substring(0, 2), 16) / 255,
        parseInt(c.substring(2, 4), 16) / 255,
        parseInt(c.substring(4, 6), 16) / 255,
    ];
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Extract EngineNode from Fabric object ──
function fabricToEngineNode(obj: FabricObject): EngineNode {
    const id = (obj as any).__aceId ?? 0;
    const isEllipse = obj.type === 'ellipse';
    const fill = typeof obj.fill === 'string' ? obj.fill : '#808080';
    const [r, g, b] = hexToRgb01(fill);
    const br = (obj as any).rx ?? 0;
    return {
        id,
        type: isEllipse ? 'ellipse' : (br > 0 ? 'rounded_rect' : 'rect'),
        x: obj.left ?? 0,
        y: obj.top ?? 0,
        w: (obj.width ?? 0) * (obj.scaleX ?? 1),
        h: (obj.height ?? 0) * (obj.scaleY ?? 1),
        opacity: obj.opacity ?? 1,
        z_index: (obj as any).__aceZIndex ?? 0,
        fill_r: r,
        fill_g: g,
        fill_b: b,
        fill_a: 1,
        border_radius: br,
    };
}

/**
 * useFabricCanvas — Fabric.js canvas engine hook.
 * Same interface as useCanvasEngine for drop-in replacement.
 */
export function useFabricCanvas(
    width: number,
    height: number,
    _addDemoShapes = false,
): UseCanvasEngineResult {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const overlayRef = useRef<HTMLCanvasElement | null>(null); // unused, for interface compat
    const fabricRef = useRef<Canvas | null>(null);
    // engineRef points to a compatibility shim for save/restore
    const engineRef = useRef<any>(null);

    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-webgpu'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [selection, setSelection] = useState<number[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [nodeCount, setNodeCount] = useState(0);
    const [nodes, setNodes] = useState<EngineNode[]>([]);

    // Undo/redo stacks
    const undoStack = useRef<string[]>([]);
    const redoStack = useRef<string[]>([]);
    const skipHistory = useRef(false);

    const activeTool = useEditorStore((s) => s.activeTool);
    const setTool = useEditorStore((s) => s.setTool);

    // ── Sync state from Fabric canvas ──
    const syncState = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;

        // Build nodes from Fabric objects
        const objs = fc.getObjects();
        const engineNodes: EngineNode[] = objs.map(fabricToEngineNode);
        setNodes(engineNodes);
        setNodeCount(objs.length);

        // Selection
        const active = fc.getActiveObjects();
        const selectedIds = active.map((o) => (o as any).__aceId ?? 0).filter((id: number) => id > 0);
        setSelection(selectedIds);

        setCanUndo(undoStack.current.length > 0);
        setCanRedo(redoStack.current.length > 0);
    }, []);

    // ── Push undo snapshot ──
    const pushUndo = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc || skipHistory.current) return;
        undoStack.current.push(JSON.stringify(fc.toJSON()));
        redoStack.current = [];
        setCanUndo(true);
        setCanRedo(false);
    }, []);

    // ── Init Fabric Canvas ──
    useEffect(() => {
        const el = canvasRef.current;
        if (!el) {
            setErrorMsg('Canvas element not found');
            setStatus('error');
            return;
        }

        try {
            const fc = new Canvas(el, {
                width,
                height,
                backgroundColor: '#ffffff',
                selection: true,
                preserveObjectStacking: true,
                stopContextMenu: true,
                fireRightClick: true,
            });

            // Style selection controls
            (fc as any).selectionColor = 'rgba(74, 158, 255, 0.08)';
            (fc as any).selectionBorderColor = '#4a9eff';
            (fc as any).selectionLineWidth = 1;

            // Events
            fc.on('selection:created', () => syncState());
            fc.on('selection:updated', () => syncState());
            fc.on('selection:cleared', () => syncState());
            fc.on('object:modified', () => { pushUndo(); syncState(); });
            fc.on('object:added', () => { if (!skipHistory.current) pushUndo(); syncState(); });
            fc.on('object:removed', () => { pushUndo(); syncState(); });

            fabricRef.current = fc;

            // Create engine compatibility shim
            engineRef.current = createEngineShim(fc, syncState);

            setStatus('ready');
            console.log('[Fabric] Canvas ready:', width, '×', height);
        } catch (err) {
            console.error('[Fabric] Init error:', err);
            setErrorMsg(String(err));
            setStatus('error');
        }

        return () => {
            if (fabricRef.current) {
                fabricRef.current.dispose();
                fabricRef.current = null;
                engineRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]);

    // ── Helper: find object by ACE id ──
    const findById = useCallback((id: number): FabricObject | undefined => {
        return fabricRef.current?.getObjects().find((o) => (o as any).__aceId === id);
    }, []);

    // ── Shape creation ──
    const addRect = useCallback((x?: number, y?: number): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const id = nextId();
        const color = nextColor();
        const rect = new Rect({
            left: x ?? (width / 2 - 60),
            top: y ?? (height / 2 - 40),
            width: 120,
            height: 80,
            fill: color,
            opacity: 0.9,
        });
        (rect as any).__aceId = id;
        (rect as any).__aceZIndex = fc.getObjects().length;
        fc.add(rect);
        fc.setActiveObject(rect);
        fc.renderAll();
        syncState();
        return id;
    }, [width, height, syncState]);

    const addRoundedRect = useCallback((x?: number, y?: number): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const id = nextId();
        const color = nextColor();
        const rect = new Rect({
            left: x ?? (width / 2 - 60),
            top: y ?? (height / 2 - 40),
            width: 120,
            height: 80,
            fill: color,
            opacity: 0.9,
            rx: 12,
            ry: 12,
        });
        (rect as any).__aceId = id;
        (rect as any).__aceZIndex = fc.getObjects().length;
        fc.add(rect);
        fc.setActiveObject(rect);
        fc.renderAll();
        syncState();
        return id;
    }, [width, height, syncState]);

    const addEllipse = useCallback((x?: number, y?: number): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const id = nextId();
        const color = nextColor();
        const el = new Ellipse({
            left: x ?? (width / 2 - 60),
            top: y ?? (height / 2 - 40),
            rx: 60,
            ry: 50,
            fill: color,
            opacity: 0.9,
        });
        (el as any).__aceId = id;
        (el as any).__aceZIndex = fc.getObjects().length;
        fc.add(el);
        fc.setActiveObject(el);
        fc.renderAll();
        syncState();
        return id;
    }, [width, height, syncState]);

    // ── Delete ──
    const deleteSelected = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;
        const active = fc.getActiveObjects();
        active.forEach((obj) => fc.remove(obj));
        fc.discardActiveObject();
        fc.renderAll();
        syncState();
    }, [syncState]);

    // ── Selection ──
    const selectNode = useCallback((id: number) => {
        const fc = fabricRef.current;
        if (!fc) return;
        const obj = findById(id);
        if (obj) {
            fc.setActiveObject(obj);
            fc.renderAll();
        }
        syncState();
    }, [findById, syncState]);

    const deselectAll = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;
        fc.discardActiveObject();
        fc.renderAll();
        syncState();
    }, [syncState]);

    // ── Position / Size / Opacity ──
    const setNodePosition = useCallback((id: number, x: number, y: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ left: x, top: y });
        obj.setCoords();
        fabricRef.current?.renderAll();
    }, [findById]);

    const setNodeSize = useCallback((id: number, w: number, h: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ width: w, height: h, scaleX: 1, scaleY: 1 });
        obj.setCoords();
        fabricRef.current?.renderAll();
    }, [findById]);

    const setNodeOpacity = useCallback((id: number, opacity: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ opacity });
        fabricRef.current?.renderAll();
    }, [findById]);

    const setFillColor = useCallback((id: number, r: number, g: number, b: number, _a: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ fill: rgbToHex(r, g, b) });
        fabricRef.current?.renderAll();
        syncState();
    }, [findById, syncState]);

    // ── Z-index / layer order ──
    const bringToFront = useCallback((id: number) => {
        const fc = fabricRef.current;
        const obj = findById(id);
        if (!fc || !obj) return;
        fc.bringObjectToFront(obj);
        fc.renderAll();
        syncState();
    }, [findById, syncState]);

    const sendToBack = useCallback((id: number) => {
        const fc = fabricRef.current;
        const obj = findById(id);
        if (!fc || !obj) return;
        fc.sendObjectToBack(obj);
        fc.renderAll();
        syncState();
    }, [findById, syncState]);

    const bringForward = useCallback((id: number) => {
        const fc = fabricRef.current;
        const obj = findById(id);
        if (!fc || !obj) return;
        fc.bringObjectForward(obj);
        fc.renderAll();
        syncState();
    }, [findById, syncState]);

    const sendBackward = useCallback((id: number) => {
        const fc = fabricRef.current;
        const obj = findById(id);
        if (!fc || !obj) return;
        fc.sendObjectBackwards(obj);
        fc.renderAll();
        syncState();
    }, [findById, syncState]);

    // ── Effects ──
    const setShadow = useCallback((id: number, ox: number, oy: number, blur: number, r: number, g: number, b: number, a: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({
            shadow: new Shadow({
                color: `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`,
                blur,
                offsetX: ox,
                offsetY: oy,
            }),
        });
        fabricRef.current?.renderAll();
    }, [findById]);

    const removeShadow = useCallback((id: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ shadow: undefined });
        fabricRef.current?.renderAll();
    }, [findById]);

    // Blend mode, brightness, contrast, saturation, hue — applied via CSS filter on the canvas
    // For now, these are stubs; can be enhanced with Fabric filters
    const setBlendMode = useCallback((_id: number, _mode: string) => { /* stub */ }, []);
    const setBrightness = useCallback((_id: number, _v: number) => { /* stub */ }, []);
    const setContrast = useCallback((_id: number, _v: number) => { /* stub */ }, []);
    const setSaturation = useCallback((_id: number, _v: number) => { /* stub */ }, []);
    const setHueRotate = useCallback((_id: number, _deg: number) => { /* stub */ }, []);

    // ── Keyframe (stub — animation stays in Zustand store) ──
    const addKeyframe = useCallback((_nodeId: number, _property: string, _time: number, _value: number, _easing: string) => { /* stub */ }, []);

    // ── Duplicate ──
    const duplicateSelected = useCallback((): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const active = fc.getActiveObject();
        if (!active) return null;

        const id = nextId();
        active.clone().then((cloned: FabricObject) => {
            cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 });
            (cloned as any).__aceId = id;
            fc.add(cloned);
            fc.setActiveObject(cloned);
            fc.renderAll();
            syncState();
        });
        return id;
    }, [syncState]);

    // ── Alignment to canvas ──
    const alignToCanvas = useCallback((id: number, alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
        const obj = findById(id);
        if (!obj) return;
        const objW = (obj.width ?? 0) * (obj.scaleX ?? 1);
        const objH = (obj.height ?? 0) * (obj.scaleY ?? 1);
        switch (alignment) {
            case 'left': obj.set({ left: 0 }); break;
            case 'center-h': obj.set({ left: (width - objW) / 2 }); break;
            case 'right': obj.set({ left: width - objW }); break;
            case 'top': obj.set({ top: 0 }); break;
            case 'center-v': obj.set({ top: (height - objH) / 2 }); break;
            case 'bottom': obj.set({ top: height - objH }); break;
        }
        obj.setCoords();
        fabricRef.current?.renderAll();
        syncState();
    }, [width, height, findById, syncState]);

    // ── Mouse handlers (tool-aware) ──
    const onMouseDown = useCallback((_e: React.MouseEvent) => {
        // Fabric handles its own mouse interaction natively
        // This is only for shape tool clicks
    }, []);
    const onMouseMove = useCallback((_e: React.MouseEvent) => { }, []);
    const onMouseUp = useCallback(() => { }, []);

    // Tool-aware canvas click for shape creation
    useEffect(() => {
        const fc = fabricRef.current;
        if (!fc || status !== 'ready') return;

        const handler = (opt: any) => {
            if (activeTool === 'shape') {
                const pointer = fc.getScenePoint(opt.e);
                addRect(pointer.x - 60, pointer.y - 40);
                setTool('select');
            }
        };

        fc.on('mouse:down', handler);
        return () => { fc.off('mouse:down', handler); };
    }, [activeTool, status, addRect, setTool]);

    // ── Retry ──
    const retryInit = useCallback(() => {
        if (fabricRef.current) {
            fabricRef.current.dispose();
            fabricRef.current = null;
        }
        setStatus('loading');
        setErrorMsg('');
        // Re-init will happen via useEffect
    }, []);

    const state: CanvasEngineState = {
        status, errorMsg, selection, canUndo, canRedo, nodeCount, nodes,
    };

    const actions: CanvasEngineActions = {
        onMouseDown, onMouseMove, onMouseUp,
        addRect, addEllipse, addRoundedRect,
        deleteSelected, selectNode, deselectAll,
        setNodePosition, setNodeSize, setNodeOpacity, setFillColor,
        bringToFront, sendToBack, bringForward, sendBackward,
        setShadow, removeShadow, setBlendMode,
        setBrightness, setContrast, setSaturation, setHueRotate,
        addKeyframe, duplicateSelected,
        alignToCanvas,
        canvasWidth: width, canvasHeight: height,
    };

    return {
        canvasRef,
        overlayRef,
        engineRef,
        state,
        actions,
        syncState,
        retryInit,
    };
}

// ── Engine Compatibility Shim ──
// This object mimics the WASM engine API so useCanvasSync can call
// the same methods (add_rect, get_all_nodes, etc.) without changes.
function createEngineShim(fc: Canvas, syncState: () => void) {
    const findById = (id: number) => fc.getObjects().find((o) => (o as any).__aceId === id);

    return {
        // ── Node queries ──
        get_all_nodes: () => {
            const objs = fc.getObjects();
            const nodes = objs.map(fabricToEngineNode);
            return JSON.stringify(nodes);
        },
        node_count: () => fc.getObjects().length,
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

        // ── Shape creation (same API as WASM engine) ──
        add_rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number) => {
            const id = nextId();
            const rect = new Rect({
                left: x, top: y, width: w, height: h,
                fill: rgbToHex(r, g, b),
                opacity: a,
            });
            (rect as any).__aceId = id;
            (rect as any).__aceZIndex = fc.getObjects().length;
            fc.add(rect);
            fc.renderAll();
            return id;
        },
        add_rounded_rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, radius: number) => {
            const id = nextId();
            const rect = new Rect({
                left: x, top: y, width: w, height: h,
                fill: rgbToHex(r, g, b),
                opacity: a,
                rx: radius, ry: radius,
            });
            (rect as any).__aceId = id;
            (rect as any).__aceZIndex = fc.getObjects().length;
            fc.add(rect);
            fc.renderAll();
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
            (el as any).__aceZIndex = fc.getObjects().length;
            fc.add(el);
            fc.renderAll();
            return id;
        },
        add_gradient_rect: () => 0, // stub

        // ── Manipulation ──
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
        delete_selected: () => {
            const active = fc.getActiveObjects();
            active.forEach((o) => fc.remove(o));
            fc.discardActiveObject();
            fc.renderAll();
        },
        clear_scene: () => { fc.clear(); fc.backgroundColor = '#ffffff'; fc.renderAll(); },

        // ── Transform ──
        set_position: (id: number, x: number, y: number) => {
            const obj = findById(id);
            if (obj) { obj.set({ left: x, top: y }); obj.setCoords(); fc.renderAll(); }
        },
        set_size: (id: number, w: number, h: number) => {
            const obj = findById(id);
            if (obj) { obj.set({ width: w, height: h, scaleX: 1, scaleY: 1 }); obj.setCoords(); fc.renderAll(); }
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
            if (obj) { (obj as any).__aceZIndex = z; }
        },
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

        // ── Animation stubs (handled by Zustand store) ──
        anim_toggle: () => {
            const store = (window as any).__animStore;
            if (store) store.getState().toggle();
        },
        can_undo: () => false,
        can_redo: () => false,

        // ── Drag stubs (Fabric handles natively) ──
        start_move: () => { },
        start_resize: () => { },
        update_drag: () => { },
        end_drag: () => { },

        free: () => { },
    };
}
