// ─────────────────────────────────────────────────
// useFabricCanvas — Fabric.js-based canvas engine
// Full-viewport canvas with artboard as background rect
// Handles shapes, selection, drag, resize, zoom/pan natively
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect, Ellipse, Shadow, PencilBrush, type FabricObject } from 'fabric';
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

// ── Check if object is the artboard background ──
function isArtboard(obj: FabricObject): boolean {
    return (obj as any).__aceArtboard === true;
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

// ── Custom properties to include in serialization ──
const ACE_CUSTOM_PROPS = ['__aceId', '__aceZIndex', '__aceArtboard'];

// Patch a Fabric object to include ACE custom props in toObject()
function patchAceProps(obj: FabricObject): void {
    const original = obj.toObject.bind(obj);
    obj.toObject = function (additionalProps?: string[]) {
        const data = original(additionalProps);
        data.__aceId = (this as any).__aceId;
        data.__aceZIndex = (this as any).__aceZIndex;
        if ((this as any).__aceArtboard) data.__aceArtboard = true;
        return data;
    };
}

/**
 * useFabricCanvas — Fabric.js canvas engine hook.
 * Canvas fills the viewport, artboard is a background rect.
 * Shapes can extend beyond the artboard freely.
 */
export function useFabricCanvas(
    width: number,
    height: number,
    _addDemoShapes = false,
): UseCanvasEngineResult {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const overlayRef = useRef<HTMLCanvasElement | null>(null); // unused, interface compat
    const fabricRef = useRef<Canvas | null>(null);
    const engineRef = useRef<any>(null);
    const containerRef = useRef<HTMLElement | null>(null);

    const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-webgpu'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [selection, setSelection] = useState<number[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [nodeCount, setNodeCount] = useState(0);
    const [nodes, setNodes] = useState<EngineNode[]>([]);

    const undoStack = useRef<string[]>([]);
    const redoStack = useRef<string[]>([]);
    const skipHistory = useRef(false);
    const syncPending = useRef(false);

    const activeTool = useEditorStore((s) => s.activeTool);
    const setTool = useEditorStore((s) => s.setTool);

    // ── Get user-created objects (exclude artboard background) ──
    const getUserObjects = useCallback((): FabricObject[] => {
        const fc = fabricRef.current;
        if (!fc) return [];
        return fc.getObjects().filter(o => !isArtboard(o));
    }, []);

    // ── Sync state — RAF-debounced to prevent render cascades ──
    const doSync = useCallback(() => {
        syncPending.current = false;
        const objs = getUserObjects();
        const engineNodes: EngineNode[] = objs.map(fabricToEngineNode);
        setNodes(engineNodes);
        setNodeCount(objs.length);

        const fc = fabricRef.current;
        if (fc) {
            const active = fc.getActiveObjects();
            const selectedIds = active.map((o) => (o as any).__aceId ?? 0).filter((id: number) => id > 0);
            setSelection(selectedIds);
        }

        setCanUndo(undoStack.current.length > 0);
        setCanRedo(redoStack.current.length > 0);
    }, [getUserObjects]);

    const syncState = useCallback(() => {
        if (!syncPending.current) {
            syncPending.current = true;
            requestAnimationFrame(doSync);
        }
    }, [doSync]);

    const pushUndo = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc || skipHistory.current) return;
        undoStack.current.push(JSON.stringify(fc.toObject(ACE_CUSTOM_PROPS)));
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

        // Find the container (ed-canvas-area) to get viewport dimensions
        const container = el.parentElement;
        containerRef.current = container;
        const cw = container?.clientWidth ?? 1200;
        const ch = container?.clientHeight ?? 700;

        try {
            const fc = new Canvas(el, {
                width: cw,
                height: ch,
                backgroundColor: '#16191f', // Dark workspace background
                selection: true,
                preserveObjectStacking: true,
                stopContextMenu: true,
                fireRightClick: true,
            });

            // Style selection controls
            (fc as any).selectionColor = 'rgba(74, 158, 255, 0.08)';
            (fc as any).selectionBorderColor = '#4a9eff';
            (fc as any).selectionLineWidth = 1;

            // ── Add artboard background rect (skip undo history) ──
            skipHistory.current = true;
            const artboard = new Rect({
                left: 0,
                top: 0,
                width,
                height,
                fill: '#ffffff',
                selectable: false,
                evented: false,
                hasControls: false,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
                hoverCursor: 'default',
                shadow: new Shadow({
                    color: 'rgba(0,0,0,0.3)',
                    blur: 20,
                    offsetX: 0,
                    offsetY: 4,
                }),
            });
            (artboard as any).__aceArtboard = true;
            patchAceProps(artboard);
            fc.add(artboard);

            // Center the artboard in the viewport
            const vpt = fc.viewportTransform!;
            vpt[4] = (cw - width) / 2;
            vpt[5] = (ch - height) / 2;
            fc.setViewportTransform(vpt);
            skipHistory.current = false;

            // Events
            fc.on('selection:created', () => syncState());
            fc.on('selection:updated', () => syncState());
            fc.on('selection:cleared', () => syncState());
            fc.on('object:modified', () => { pushUndo(); syncState(); });
            fc.on('object:added', (opt) => {
                // Auto-assign __aceId to objects w/o one (PencilBrush paths, loadFromJSON)
                const obj = opt.target;
                if (obj && !(obj as any).__aceId && !isArtboard(obj)) {
                    (obj as any).__aceId = nextId();
                    (obj as any).__aceZIndex = fc.getObjects().filter(o => !isArtboard(o)).length;
                    patchAceProps(obj);
                }
                if (!skipHistory.current) pushUndo();
                syncState();
            });
            fc.on('object:removed', () => { pushUndo(); syncState(); });

            // ── Zoom with Ctrl+Wheel ──
            fc.on('mouse:wheel', (opt) => {
                const e = opt.e as WheelEvent;
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    const delta = e.deltaY > 0 ? -0.08 : 0.08;
                    let newZoom = (fc.getZoom() || 1) + delta;
                    newZoom = Math.max(0.1, Math.min(5, newZoom));
                    const point = fc.getScenePoint(e);
                    fc.zoomToPoint(point, newZoom);
                    fc.renderAll();
                }
            });

            // ── Pan with Alt+drag or middle mouse ──
            let isPanning = false;
            let lastPanX = 0;
            let lastPanY = 0;

            fc.on('mouse:down', (opt) => {
                const e = opt.e as MouseEvent;
                if (e.altKey || e.button === 1) {
                    isPanning = true;
                    lastPanX = e.clientX;
                    lastPanY = e.clientY;
                    fc.setCursor('grabbing');
                    e.preventDefault();
                }
            });
            fc.on('mouse:move', (opt) => {
                if (!isPanning) return;
                const e = opt.e as MouseEvent;
                const vpt = fc.viewportTransform!;
                vpt[4] += e.clientX - lastPanX;
                vpt[5] += e.clientY - lastPanY;
                lastPanX = e.clientX;
                lastPanY = e.clientY;
                fc.setViewportTransform(vpt);
                fc.renderAll();
            });
            fc.on('mouse:up', () => {
                if (isPanning) {
                    isPanning = false;
                    fc.setCursor('default');
                }
            });

            fabricRef.current = fc;
            engineRef.current = createEngineShim(fc, syncState, width, height);

            setStatus('ready');
            console.log('[Fabric] Canvas ready:', width, '×', height, '(viewport:', cw, '×', ch, ')');
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

    // ── ResizeObserver: keep Fabric canvas = viewport size ──
    useEffect(() => {
        const fc = fabricRef.current;
        const container = containerRef.current;
        if (!fc || !container) return;

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width: cw, height: ch } = entry.contentRect;
                if (cw > 0 && ch > 0) {
                    fc.setDimensions({ width: cw, height: ch });
                    fc.renderAll();
                }
            }
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, [status]);

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
        (rect as any).__aceZIndex = getUserObjects().length;
        patchAceProps(rect);
        fc.add(rect);
        fc.setActiveObject(rect);
        fc.renderAll();
        syncState();
        return id;
    }, [width, height, syncState, getUserObjects]);

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
        (rect as any).__aceZIndex = getUserObjects().length;
        patchAceProps(rect);
        fc.add(rect);
        fc.setActiveObject(rect);
        fc.renderAll();
        syncState();
        return id;
    }, [width, height, syncState, getUserObjects]);

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
        (el as any).__aceZIndex = getUserObjects().length;
        patchAceProps(el);
        fc.add(el);
        fc.setActiveObject(el);
        fc.renderAll();
        syncState();
        return id;
    }, [width, height, syncState, getUserObjects]);

    // ── Delete ──
    const deleteSelected = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;
        const active = fc.getActiveObjects().filter(o => !isArtboard(o));
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
        // Send to back but keep above artboard
        fc.sendObjectToBack(obj);
        // Move artboard to absolute bottom
        const artboard = fc.getObjects().find(isArtboard);
        if (artboard) fc.sendObjectToBack(artboard);
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
        // Ensure artboard stays at bottom
        const artboard = fc.getObjects().find(isArtboard);
        if (artboard) fc.sendObjectToBack(artboard);
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

    const setBlendMode = useCallback((_id: number, _mode: string) => { }, []);
    const setBrightness = useCallback((_id: number, _v: number) => { }, []);
    const setContrast = useCallback((_id: number, _v: number) => { }, []);
    const setSaturation = useCallback((_id: number, _v: number) => { }, []);
    const setHueRotate = useCallback((_id: number, _deg: number) => { }, []);
    const addKeyframe = useCallback((_nodeId: number, _property: string, _time: number, _value: number, _easing: string) => { }, []);

    // ── Undo / Redo ──
    const restoreArtboardFlags = useCallback((fc: Canvas) => {
        // After loadFromJSON, re-apply behavioral flags on artboard and ensure all objects have aceId
        fc.getObjects().forEach((obj) => {
            if ((obj as any).__aceArtboard) {
                obj.set({
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    hasBorders: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hoverCursor: 'default',
                });
            } else if (!(obj as any).__aceId) {
                // Ensure every non-artboard object has a unique ID
                (obj as any).__aceId = nextId();
                (obj as any).__aceZIndex = 0;
            }
            // Re-patch toObject for all objects after deserialization
            patchAceProps(obj);
        });
    }, []);

    const undo = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc || undoStack.current.length === 0) return;
        redoStack.current.push(JSON.stringify(fc.toObject(ACE_CUSTOM_PROPS)));
        const prev = undoStack.current.pop()!;
        skipHistory.current = true;
        fc.loadFromJSON(prev).then(() => {
            restoreArtboardFlags(fc);
            fc.renderAll();
            skipHistory.current = false;
            syncState();
        });
    }, [syncState, restoreArtboardFlags]);

    const redo = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc || redoStack.current.length === 0) return;
        undoStack.current.push(JSON.stringify(fc.toObject(ACE_CUSTOM_PROPS)));
        const next = redoStack.current.pop()!;
        skipHistory.current = true;
        fc.loadFromJSON(next).then(() => {
            restoreArtboardFlags(fc);
            fc.renderAll();
            skipHistory.current = false;
            syncState();
        });
    }, [syncState, restoreArtboardFlags]);

    // ── Duplicate ──
    const duplicateSelected = useCallback((): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const active = fc.getActiveObject();
        if (!active || isArtboard(active)) return null;

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

    // ── Mouse handlers (stubs — Fabric handles natively) ──
    const onMouseDown = useCallback((_e: React.MouseEvent) => { }, []);
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

    // ── Pen tool activation ──
    useEffect(() => {
        const fc = fabricRef.current;
        if (!fc || status !== 'ready') return;

        if (activeTool === 'pen') {
            fc.isDrawingMode = true;
            fc.freeDrawingBrush = new PencilBrush(fc);
            fc.freeDrawingBrush.color = '#333333';
            fc.freeDrawingBrush.width = 2;
        } else {
            fc.isDrawingMode = false;
        }
        fc.renderAll();
    }, [activeTool, status]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if ((e.target as HTMLElement)?.isContentEditable) return;

            // Cmd+Z / Ctrl+Z → undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }
            // Cmd+Shift+Z / Ctrl+Y → redo
            if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                redo();
                return;
            }
            // Tool shortcuts (single key, no modifiers)
            if (!e.metaKey && !e.ctrlKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'v': setTool('select'); break;
                    case 's': setTool('shape'); break;
                    case 't': setTool('text'); break;
                    case 'p': setTool('pen'); break;
                    case 'h': setTool('hand'); break;
                    case 'z': setTool('zoom'); break;
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo, setTool]);

    // NOTE: the following shape-tool useEffect was closed above, remove duplicate closure


    const retryInit = useCallback(() => {
        if (fabricRef.current) {
            fabricRef.current.dispose();
            fabricRef.current = null;
        }
        setStatus('loading');
        setErrorMsg('');
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
        undo, redo,
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
function createEngineShim(fc: Canvas, syncState: () => void, artboardW: number, artboardH: number) {
    const findById = (id: number) => fc.getObjects().find((o) => (o as any).__aceId === id);
    const userObjects = () => fc.getObjects().filter(o => !isArtboard(o));

    return {
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

        add_rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number) => {
            const id = nextId();
            const rect = new Rect({
                left: x, top: y, width: w, height: h,
                fill: rgbToHex(r, g, b),
                opacity: a,
            });
            (rect as any).__aceId = id;
            (rect as any).__aceZIndex = userObjects().length;
            patchAceProps(rect);
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
            (rect as any).__aceZIndex = userObjects().length;
            patchAceProps(rect);
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
            (el as any).__aceZIndex = userObjects().length;
            patchAceProps(el);
            fc.add(el);
            fc.renderAll();
            return id;
        },
        add_gradient_rect: () => 0,

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
            const active = fc.getActiveObjects().filter(o => !isArtboard(o));
            active.forEach((o) => fc.remove(o));
            fc.discardActiveObject();
            fc.renderAll();
        },
        clear_scene: () => {
            // Remove all user objects, keep artboard
            const toRemove = userObjects();
            toRemove.forEach((o) => fc.remove(o));
            fc.renderAll();
        },

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

        anim_toggle: () => {
            const store = (window as any).__animStore;
            if (store) store.getState().toggle();
        },
        can_undo: () => false,
        can_redo: () => false,
        start_move: () => { },
        start_resize: () => { },
        update_drag: () => { },
        end_drag: () => { },
        free: () => { },
    };
}
