// ─────────────────────────────────────────────────
// useFabricCanvas — Fabric.js-based canvas engine
// Full-viewport canvas with artboard as background rect
// Handles shapes, selection, drag, resize, zoom/pan natively
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect, Ellipse, Shadow, PencilBrush, Textbox, FabricImage, Gradient, Group, type FabricObject } from 'fabric';
import { useEditorStore } from '@/stores/editorStore';
import { useAnimPresetStore } from './useAnimationPresets';
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
    const objType = obj.type;
    const fill = typeof obj.fill === 'string' ? obj.fill : '#808080';
    const [r, g, b] = hexToRgb01(fill);
    const br = (obj as any).rx ?? 0;

    // Determine ACE type from Fabric type
    let aceType: EngineNode['type'] = 'rect';
    let name = `Rectangle #${id}`;
    if (objType === 'ellipse') {
        aceType = 'ellipse';
        name = `Ellipse #${id}`;
    } else if (objType === 'textbox' || objType === 'i-text') {
        aceType = 'text';
        name = (obj as any).__aceName || `Text #${id}`;
    } else if (objType === 'image') {
        aceType = 'image';
        name = (obj as any).__aceName || `Image #${id}`;
    } else if (objType === 'path') {
        aceType = 'path';
        name = `Path #${id}`;
    } else if (br > 0) {
        aceType = 'rounded_rect';
        name = `Rounded Rect #${id}`;
    }

    const node: EngineNode = {
        id,
        type: aceType,
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
        name,
    };

    // Text-specific properties
    if (aceType === 'text' && obj instanceof Textbox) {
        node.content = obj.text ?? '';
        node.fontSize = obj.fontSize ?? 16;
        node.fontFamily = obj.fontFamily ?? 'Inter';
        node.fontWeight = String(obj.fontWeight ?? '400');
        node.color = typeof obj.fill === 'string' ? obj.fill : '#000000';
        node.textAlign = obj.textAlign ?? 'left';
        node.lineHeight = obj.lineHeight ?? 1.4;
    }

    // Image-specific properties
    if (aceType === 'image') {
        const imgEl = (obj as any)._element;
        if (imgEl?.src) {
            node.src = imgEl.src;
        }
        // Capture natural dimensions for aspect ratio preservation
        if (imgEl?.naturalWidth) node.naturalWidth = imgEl.naturalWidth;
        if (imgEl?.naturalHeight) node.naturalHeight = imgEl.naturalHeight;
    }

    return node;
}

// ── Custom properties to include in serialization ──
const ACE_CUSTOM_PROPS = ['__aceId', '__aceZIndex', '__aceArtboard', '__aceName'];

// Patch a Fabric object to include ACE custom props in toObject()
function patchAceProps(obj: FabricObject): void {
    const original = obj.toObject.bind(obj);
    obj.toObject = function (additionalProps?: string[]) {
        const data = original(additionalProps);
        data.__aceId = (this as any).__aceId;
        data.__aceZIndex = (this as any).__aceZIndex;
        if ((this as any).__aceArtboard) data.__aceArtboard = true;
        if ((this as any).__aceName) data.__aceName = (this as any).__aceName;
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
    // Stale-check: only update React state if data actually changed
    const prevNodesJson = useRef('');
    const prevSelJson = useRef('');

    const doSync = useCallback(() => {
        syncPending.current = false;
        const objs = getUserObjects();
        const engineNodes: EngineNode[] = objs
            .map(fabricToEngineNode)
            .filter(n => n.id > 0);

        // Only update nodes if they actually changed (prevents render cascades)
        const nodesJson = JSON.stringify(engineNodes);
        if (nodesJson !== prevNodesJson.current) {
            prevNodesJson.current = nodesJson;
            setNodes(engineNodes);
            setNodeCount(engineNodes.length);
        }

        const fc = fabricRef.current;
        if (fc) {
            const active = fc.getActiveObjects();
            const selectedIds = active.map((o) => (o as any).__aceId ?? 0).filter((id: number) => id > 0);
            const selJson = JSON.stringify(selectedIds);
            if (selJson !== prevSelJson.current) {
                prevSelJson.current = selJson;
                setSelection(selectedIds);
            }
        }

        const hasUndo = undoStack.current.length > 0;
        const hasRedo = redoStack.current.length > 0;
        if (hasUndo !== canUndo) setCanUndo(hasUndo);
        if (hasRedo !== canRedo) setCanRedo(hasRedo);
    }, [getUserObjects, canUndo, canRedo]);

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

    // ── Text creation ──
    const addText = useCallback((x: number, y: number, content?: string, opts?: {
        fontSize?: number; fontFamily?: string; fontWeight?: string;
        color?: string; textAlign?: string; lineHeight?: number;
        width?: number;
    }): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const id = nextId();
        const tb = new Textbox(content || 'Type here...', {
            left: x,
            top: y,
            width: opts?.width ?? 200,
            fontSize: opts?.fontSize ?? 18,
            fontFamily: opts?.fontFamily ?? 'Inter, system-ui, sans-serif',
            fontWeight: opts?.fontWeight ?? '400',
            fill: opts?.color ?? '#000000',
            textAlign: (opts?.textAlign as any) ?? 'left',
            lineHeight: opts?.lineHeight ?? 1.4,
            editable: true,
            splitByGrapheme: false,
        });
        (tb as any).__aceId = id;
        (tb as any).__aceName = `Text #${id}`;
        (tb as any).__aceZIndex = getUserObjects().length;
        patchAceProps(tb);
        fc.add(tb);
        fc.setActiveObject(tb);
        fc.renderAll();
        syncState();
        return id;
    }, [syncState, getUserObjects]);

    // ── Text update ──
    const updateText = useCallback((id: number, updates: Partial<{
        content: string; fontSize: number; fontFamily: string;
        fontWeight: string; color: string; textAlign: string;
        lineHeight: number; letterSpacing: number;
    }>) => {
        const obj = findById(id);
        if (!obj || !(obj instanceof Textbox)) return;
        if (updates.content !== undefined) obj.set('text', updates.content);
        if (updates.fontSize !== undefined) obj.set('fontSize', updates.fontSize);
        if (updates.fontFamily !== undefined) obj.set('fontFamily', updates.fontFamily);
        if (updates.fontWeight !== undefined) obj.set('fontWeight', updates.fontWeight);
        if (updates.color !== undefined) obj.set('fill', updates.color);
        if (updates.textAlign !== undefined) obj.set('textAlign', updates.textAlign as any);
        if (updates.lineHeight !== undefined) obj.set('lineHeight', updates.lineHeight);
        if (updates.letterSpacing !== undefined) obj.set('charSpacing', updates.letterSpacing * 10);
        fabricRef.current?.renderAll();
        syncState();
    }, [findById, syncState]);

    // ── Text content getter ──
    const getTextContent = useCallback((id: number): string | null => {
        const obj = findById(id);
        if (!obj || !(obj instanceof Textbox)) return null;
        return obj.text ?? null;
    }, [findById]);

    // ── Image creation ──
    const addImage = useCallback(async (x: number, y: number, src: string, w?: number, h?: number): Promise<number | null> => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const id = nextId();
        try {
            const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
            const natW = img.width ?? 200;
            const natH = img.height ?? 200;
            const targetW = w ?? Math.min(natW, width * 0.6);
            const scale = targetW / natW;
            const targetH = h ?? (natH * scale);
            img.set({
                left: x,
                top: y,
                scaleX: targetW / natW,
                scaleY: targetH / natH,
            });
            (img as any).__aceId = id;
            (img as any).__aceName = `Image #${id}`;
            (img as any).__aceZIndex = getUserObjects().length;
            patchAceProps(img);
            fc.add(img);
            fc.setActiveObject(img);
            fc.renderAll();
            syncState();
            return id;
        } catch (err) {
            console.error('[Fabric] Failed to load image:', err);
            return null;
        }
    }, [width, syncState, getUserObjects]);

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
            const pointer = fc.getScenePoint(opt.e);
            if (activeTool === 'shape') {
                addRect(pointer.x - 60, pointer.y - 40);
                setTool('select');
            } else if (activeTool === 'text') {
                addText(pointer.x, pointer.y);
                setTool('select');
            } else if (activeTool === 'image') {
                // Open file dialog for image upload
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.style.display = 'none';
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = reader.result as string;
                        addImage(pointer.x, pointer.y, dataUrl);
                    };
                    reader.readAsDataURL(file);
                    document.body.removeChild(input);
                };
                document.body.appendChild(input);
                input.click();
                setTool('select');
            }
        };

        fc.on('mouse:down', handler);
        return () => { fc.off('mouse:down', handler); };
    }, [activeTool, status, addRect, addText, addImage, setTool]);

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
        addText, updateText, getTextContent, addImage,
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

        add_gradient_rect: (x: number, y: number, w: number, h: number, r1: number, g1: number, b1: number, _a1: number, r2: number, g2: number, b2: number, _a2: number, angle_deg: number) => {
            const id = nextId();
            // Convert angle to gradient coordinates
            const rad = (angle_deg * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const rect = new Rect({
                left: x, top: y, width: w, height: h,
                fill: new Gradient({
                    type: 'linear',
                    coords: {
                        x1: 0.5 - cos * 0.5,
                        y1: 0.5 - sin * 0.5,
                        x2: 0.5 + cos * 0.5,
                        y2: 0.5 + sin * 0.5,
                    },
                    colorStops: [
                        { offset: 0, color: rgbToHex(r1, g1, b1) },
                        { offset: 1, color: rgbToHex(r2, g2, b2) },
                    ],
                    gradientUnits: 'percentage',
                }),
            });
            (rect as any).__aceId = id;
            (rect as any).__aceZIndex = userObjects().length;
            patchAceProps(rect);
            fc.add(rect);
            fc.renderAll();
            return id;
        },

        // ── Text (Fabric Textbox) — positional args for AI tool compatibility ──
        add_text: (
            x: number, y: number, content: string,
            fontSize: number, fontFamily: string, fontWeight: string,
            r: number, g: number, b: number, _a: number,
            width: number, textAlign: string,
            name?: string,
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
                lineHeight: 1.4,
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

        // ── Image (Fabric Image) ── async
        add_image: async (x: number, y: number, src: string, w?: number, h?: number, name?: string): Promise<number> => {
            const id = nextId();
            try {
                // data: URLs must NOT have crossOrigin set — CORS doesn't apply
                // and 'anonymous' flag causes browsers to reject them
                const isDataUrl = src.startsWith('data:');
                const imgOptions = isDataUrl ? {} : { crossOrigin: 'anonymous' as const };
                const img = await FabricImage.fromURL(src, imgOptions);
                const natW = img.width ?? 200;
                const natH = img.height ?? 200;

                let targetW: number;
                let targetH: number;

                if (w != null && h != null) {
                    // Both dimensions provided (restore path) — use UNIFORM scale
                    // to preserve aspect ratio. Fit within the bounding box.
                    const uniformScale = Math.min(w / Math.max(natW, 1), h / Math.max(natH, 1));
                    targetW = natW * uniformScale;
                    targetH = natH * uniformScale;
                } else if (w != null) {
                    // Only width provided — auto-calculate height
                    targetW = w;
                    targetH = natH * (targetW / Math.max(natW, 1));
                } else {
                    // No dimensions — use natural size clamped to artboard
                    targetW = Math.min(natW, artboardW * 0.7);
                    targetH = natH * (targetW / Math.max(natW, 1));
                }

                const uniformScaleVal = targetW / Math.max(natW, 1);
                img.set({
                    left: x,
                    top: y,
                    scaleX: uniformScaleVal,
                    scaleY: uniformScaleVal,
                });
                (img as any).__aceId = id;
                (img as any).__aceName = name || `Image #${id}`;
                (img as any).__aceZIndex = userObjects().length;
                patchAceProps(img);
                fc.add(img);
                fc.setActiveObject(img);
                fc.renderAll();
                syncState();
                console.log(`[EngineShim] Image added: id=${id} name="${name}" at (${x},${y}) size=${Math.round(targetW)}x${Math.round(targetH)}`);
            } catch (err) {
                console.error('[EngineShim] Failed to load image:', err);
            }
            return id;
        },

        // ── Grouping ─────────────────────────────────────
        group_elements: (ids: number[], name?: string): number => {
            const objects = ids.map(findById).filter(Boolean) as FabricObject[];
            if (objects.length < 2) return -1;

            const gid = nextId();
            const group = new Group(objects, {
                // Fabric Group auto-calculates position from children
            });
            // Remove individual objects from canvas (they're now in the group)
            objects.forEach(o => fc.remove(o));
            (group as any).__aceId = gid;
            (group as any).__aceName = name || `Group #${gid}`;
            (group as any).__aceZIndex = userObjects().length;
            patchAceProps(group);
            fc.add(group);
            fc.setActiveObject(group);
            fc.renderAll();
            syncState();
            console.log(`[EngineShim] Grouped ${ids.length} objects → id=${gid} name="${name}"`);
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
            console.log(`[EngineShim] Ungrouped id=${id}, ${items.length} objects released`);
        },

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
            const toRemove = userObjects();
            toRemove.forEach((o) => fc.remove(o));
            fc.renderAll();
        },
        // Alias: AI executor calls engine.clear()
        clear() { this.clear_scene(); },

        // ── Screenshot (artboard-only crop) ──────────────
        // Returns base64 PNG data URL clipped to artboard bounds.
        // Used by Vision Feedback Loop after each render pass.
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

        // ── Find element by layer name ─────────────────────
        find_by_name: (name: string): number | null => {
            const obj = userObjects().find((o) => (o as any).__aceName === name);
            return obj ? ((obj as any).__aceId as number) : null;
        },

        // ── Send element to front (highest zIndex) ─────────
        send_to_front: (id: number): void => {
            const obj = findById(id);
            if (obj) {
                fc.bringObjectToFront(obj);
                (obj as any).__aceZIndex = userObjects().length - 1;
                fc.renderAll();
                syncState();
            }
        },

        // ── Find all element IDs of a given type ───────────
        find_all_by_type: (type: string): number[] => {
            return userObjects()
                .filter((o) => {
                    const n = fabricToEngineNode(o);
                    return n.type === type;
                })
                .map((o) => (o as any).__aceId as number);
        },

        // ── Remove a single element from canvas ────────────
        remove_element: (id: number): void => {
            const obj = findById(id);
            if (obj) {
                fc.remove(obj);
                fc.renderAll();
            }
        },

        // ── Get data src for an image element ──────────────
        get_image_src: (id: number): string => {
            const obj = findById(id);
            if (!obj || obj.type !== 'image') return '';
            return (obj as any)._element?.src ?? '';
        },

        // ── Get display size for any element ──────────────
        get_element_bounds: (id: number): { x: number; y: number; w: number; h: number } | null => {
            const obj = findById(id);
            if (!obj) return null;
            const n = fabricToEngineNode(obj);
            return { x: n.x, y: n.y, w: n.w, h: n.h };
        },

        // ── Set font size (for text elements) ─────────────
        set_font_size: (id: number, size: number) => {
            const obj = findById(id);
            if (obj && (obj as any).set && 'fontSize' in obj) {
                obj.set({ fontSize: size } as any);
                fc.renderAll();
                syncState();
            }
        },

        // ── Set fill by hex color string ───────────────────
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
                // Fabric Images: size is controlled by scaleX/scaleY, not width/height
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
        clear_node_keyframes: () => { },

        // ── Animation state machine ──
        // Drives timeline time AND applies transforms to Fabric objects.
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

            // Snapshot original positions before animation starts
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
                        // Restore positions when animation ends
                        this._restoreOriginalPositions();
                        return;
                    }
                }

                // ★ Apply animation transforms to Fabric objects
                this._applyAnimationFrame(s.time);

                s.rafId = requestAnimationFrame(tick);
            };
            s.rafId = requestAnimationFrame(tick);
        },

        /** Apply animation presets to all Fabric objects at given time */
        _applyAnimationFrame(currentTime: number) {
            const presets = useAnimPresetStore.getState().presets;

            const objs = fc.getObjects().filter(o => !isArtboard(o));
            let needsRender = false;

            for (const obj of objs) {
                const aceId = (obj as any).__aceId;
                if (!aceId) continue;

                const key = String(aceId);
                const config = presets[key];
                if (!config || config.anim === 'none') continue;

                const orig = (obj as any).__aceOrigPos;
                if (!orig) continue;

                // Compute animation progress
                const animStart = config.startTime ?? 0;
                const animEnd = animStart + (config.animDuration ?? 0.3);
                let progress: number;
                if (currentTime <= animStart) {
                    progress = 0;
                } else if (currentTime >= animEnd) {
                    progress = 1;
                } else {
                    progress = (currentTime - animStart) / (animEnd - animStart);
                }
                // Ease-out
                const inv = 1 - progress;
                const t = 1 - inv * inv * inv;

                // Apply transforms based on preset type
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
                        obj.set({
                            top: orig.top + (200 * (1 - t)),
                            opacity: t * orig.opacity,
                        });
                        break;
                    case 'descend':
                        obj.set({
                            top: orig.top + (-200 * (1 - t)),
                            opacity: t * orig.opacity,
                        });
                        break;
                }
                needsRender = true;
            }

            if (needsRender) {
                fc.renderAll();
            }
        },

        /** Restore all objects to their original positions */
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
            // Keep objects at current animated positions (don't restore)
        },
        anim_stop() {
            this._animState.playing = false;
            this._animState.time = 0;
            cancelAnimationFrame(this._animState.rafId);
            // Restore to original positions
            this._restoreOriginalPositions();
        },
        anim_seek(t: number) {
            this._animState.time = Math.max(0, Math.min(t, this._animState.duration));
            if (this._animState.playing) {
                this._animState.startTs = performance.now();
                this._animState.startOffset = this._animState.time;
            }
            // Apply frame at seek position
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
            if (this._animState.playing) {
                this.anim_pause();
            } else {
                this.anim_play();
            }
        },

        render_frame: () => { fc.renderAll(); },
        /** Returns [scaleX, 0, 0, scaleY, translateX, translateY] — Fabric's viewportTransform.
         *  Used by EditorCanvas to sync HTML overlay elements with the artboard position. */
        get_viewport_transform: (): number[] => {
            return fc.viewportTransform ? [...fc.viewportTransform] : [1, 0, 0, 1, 0, 0];
        },
        can_undo: () => false,
        can_redo: () => false,
        start_move: () => { },
        start_resize: () => { },
        update_drag: () => { },
        end_drag: () => { },
        free: () => {
            cancelAnimationFrame(0); // cleanup
        },
    };
}
