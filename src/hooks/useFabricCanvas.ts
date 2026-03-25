// ─────────────────────────────────────────────────
// useFabricCanvas — Fabric.js canvas engine hook
// ─────────────────────────────────────────────────
// Full-viewport canvas with artboard as background rect.
// Handles shapes, selection, drag, resize, zoom/pan natively.
//
// Split architecture:
//   fabricHelpers.ts    — shared utilities (ID gen, color conversion, types)
//   fabricEngineShim.ts — engine-compatible API (used by AI executors)
//   useFabricCanvas.ts  — React hook (this file)
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect, Ellipse, Shadow, PencilBrush, Textbox, FabricImage, Line, type FabricObject } from 'fabric';
import { useEditorStore } from '@/stores/editorStore';
import { useHistoryStore } from '@/stores/historyStore';
import type { EngineNode, CanvasEngineState, CanvasEngineActions, UseCanvasEngineResult } from './canvasTypes';
import type { TextEffectType } from '@/schema/elements.types';
import {
    nextId, nextColor, rgbToHex, hexToRgb01,
    isArtboard, fabricToEngineNode, patchAceProps, GLID_CUSTOM_PROPS,
} from './fabricHelpers';
import { createEngineShim } from './fabricEngineShim';
import { snapToGuides, type GuideLine } from './useFabricGuides';

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
    const overlayRef = useRef<HTMLCanvasElement | null>(null);
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

    const skipHistory = useRef(false);
    const syncPending = useRef(false);
    const guideLines = useRef<FabricObject[]>([]);

    const activeTool = useEditorStore((s) => s.activeTool);
    const setTool = useEditorStore((s) => s.setTool);

    // ── Get user-created objects (exclude artboard) ──
    const getUserObjects = useCallback((): FabricObject[] => {
        const fc = fabricRef.current;
        if (!fc) return [];
        return fc.getObjects().filter(o => !isArtboard(o));
    }, []);

    // ── Sync state — RAF-debounced ──
    const prevNodesJson = useRef('');
    const prevSelJson = useRef('');

    const doSync = useCallback(() => {
        syncPending.current = false;
        const objs = getUserObjects();
        const engineNodes: EngineNode[] = objs
            .map(fabricToEngineNode)
            .filter(n => n.id > 0);

        const nodesJson = JSON.stringify(engineNodes);
        if (nodesJson !== prevNodesJson.current) {
            prevNodesJson.current = nodesJson;
            setNodes(engineNodes);
            setNodeCount(engineNodes.length);
        }

        const fc = fabricRef.current;
        if (fc) {
            const active = fc.getActiveObjects();
            const selectedIds = active.map((o) => (o as any).__glidId ?? 0).filter((id: number) => id > 0);
            const selJson = JSON.stringify(selectedIds);
            if (selJson !== prevSelJson.current) {
                prevSelJson.current = selJson;
                setSelection(selectedIds);
            }
        }

        // Sync undo/redo state from historyStore
        const hs = useHistoryStore.getState();
        if (hs.canUndo !== canUndo) setCanUndo(hs.canUndo);
        if (hs.canRedo !== canRedo) setCanRedo(hs.canRedo);
    }, [getUserObjects, canUndo, canRedo]);

    const syncState = useCallback(() => {
        if (!syncPending.current) {
            syncPending.current = true;
            requestAnimationFrame(doSync);
        }
    }, [doSync]);

    const pushUndo = useCallback((label = 'Edit') => {
        const fc = fabricRef.current;
        if (!fc || skipHistory.current) return;
        useHistoryStore.getState().pushState(label, JSON.stringify(fc.toObject(GLID_CUSTOM_PROPS)));
        setCanUndo(true);
        setCanRedo(false);
    }, []);

    // ── Z-index resync (hook-level, accessible to all useCallbacks) ──
    // ★ REGRESSION GUARD: This MUST be a hook-level function, NOT scoped inside useEffect.
    // All z-order mutations (bringToFront, sendToBack, etc.) call this after Fabric stack changes.
    // fabricToEngineNode reads __glidZIndex during save — if stale, saved z_index is wrong.
    const resyncZIndices = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;
        const userObjs = fc.getObjects().filter(o => !isArtboard(o) && !(o as any).__aceGuide);
        userObjs.forEach((o, i) => { (o as any).__glidZIndex = i; });
    }, []);

    // ── Smart guide rendering helpers ──
    const renderGuideLines = useCallback((guides: GuideLine[]) => {
        const fc = fabricRef.current;
        if (!fc) return;
        // Remove old guide lines
        for (const line of guideLines.current) fc.remove(line);
        guideLines.current = [];

        for (const g of guides) {
            const color = g.type === 'canvas-center' ? '#67d5ff' : g.type === 'center' ? '#67d5ff' : '#ff6b9d';
            let fabricLine: FabricObject;
            if (g.axis === 'vertical') {
                fabricLine = new Line([g.position, 0, g.position, height], {
                    stroke: color, strokeWidth: 1, selectable: false, evented: false,
                    strokeDashArray: g.type === 'canvas-center' ? [4, 4] : undefined,
                });
            } else {
                fabricLine = new Line([0, g.position, width, g.position], {
                    stroke: color, strokeWidth: 1, selectable: false, evented: false,
                    strokeDashArray: g.type === 'canvas-center' ? [4, 4] : undefined,
                });
            }
            (fabricLine as any).__aceGuide = true;
            fc.add(fabricLine);
            guideLines.current.push(fabricLine);
        }
        fc.renderAll();
    }, [width, height]);

    const clearGuideLines = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;
        for (const line of guideLines.current) fc.remove(line);
        guideLines.current = [];
        fc.renderAll();
    }, []);

    // ── Init Fabric Canvas ──
    useEffect(() => {
        const el = canvasRef.current;
        if (!el) {
            setErrorMsg('Canvas element not found');
            setStatus('error');
            return;
        }

        const container = el.parentElement;
        containerRef.current = container;
        const cw = container?.clientWidth ?? 1200;
        const ch = container?.clientHeight ?? 700;

        try {
            const fc = new Canvas(el, {
                width: cw, height: ch,
                backgroundColor: '#e8e8ec',
                selection: true,
                preserveObjectStacking: true,
                stopContextMenu: true,
                fireRightClick: true,
                // ★ Render selection handles above clipPath overlay so
                // users can resize/move elements near artboard edges.
                controlsAboveOverlay: true,
            });

            (fc as any).selectionColor = 'rgba(74, 158, 255, 0.08)';
            (fc as any).selectionBorderColor = '#4a9eff';
            (fc as any).selectionLineWidth = 1;

            // ★ Artboard: white background with shadow
            skipHistory.current = true;
            const artboard = new Rect({
                left: 0, top: 0, width, height,
                fill: '#ffffff',
                selectable: false, evented: true, // evented:true to catch clicks
                hasControls: false, hasBorders: false,
                lockMovementX: true, lockMovementY: true,
                hoverCursor: 'default',
                shadow: new Shadow({ color: 'rgba(0,0,0,0.35)', blur: 24, offsetX: 0, offsetY: 6 }),
            });
            (artboard as any).__glidArtboard = true;
            patchAceProps(artboard);
            fc.add(artboard);

            // ★ Figma-style artboard clipping: clip all canvas rendering to artboard bounds.
            // Elements can be dragged outside, but only the portion within the artboard is visible.
            // DO NOT use absolutePositioned — the artboard is centered via viewport transform
            // (vpt[4], vpt[5]). The clipPath must follow the same transform so they stay aligned.
            fc.clipPath = new Rect({
                left: 0, top: 0,
                width, height,
            });

            const vpt = fc.viewportTransform!;
            vpt[4] = (cw - width) / 2;
            vpt[5] = (ch - height) / 2;
            fc.setViewportTransform(vpt);
            skipHistory.current = false;

            // ── Events ──
            fc.on('selection:created', () => syncState());
            fc.on('selection:updated', () => syncState());
            fc.on('selection:cleared', () => syncState());

            // ★ REGRESSION GUARD: After any transform (move/resize/rotate), recompute
            // __glidZIndex for ALL objects based on actual Fabric stack position.
            // Previously, __glidZIndex was set only at add-time and never updated,
            // causing z-index corruption when objects were reordered.
            // Use hook-level resyncZIndices (accessible from all useCallback hooks).
            fc.on('object:modified', () => {
                resyncZIndices();
                pushUndo('Transform element');
                clearGuideLines();
                syncState();
            });

            // ★ Canva-style: Textbox width-only resize.
            // When a Textbox is scaled (via ml/mr handles), convert scaleX→width
            // and reset scaleX/scaleY to 1 so text reflows within the new width.
            fc.on('object:scaling', (opt) => {
                const obj = opt.target;
                if (!obj || !(obj instanceof Textbox)) return;
                // Convert visual scale to actual width
                const newWidth = (obj.width ?? 200) * (obj.scaleX ?? 1);
                obj.set({
                    width: Math.max(20, newWidth),
                    scaleX: 1,
                    scaleY: 1,
                });
            });
            fc.on('object:added', (opt) => {
                const obj = opt.target;
                if (obj && !(obj as any).__glidId && !isArtboard(obj) && !(obj as any).__aceGuide) {
                    (obj as any).__glidId = nextId();
                    (obj as any).__glidZIndex = fc.getObjects().filter(o => !isArtboard(o) && !(o as any).__aceGuide).length;
                    patchAceProps(obj);
                }
                if (!skipHistory.current && !(obj as any)?.__aceGuide) pushUndo('Add element');
                syncState();
            });
            fc.on('object:removed', () => { resyncZIndices(); pushUndo('Remove element'); syncState(); });

            // Deselect on background/artboard click (outside any user object)
            fc.on('mouse:down', (opt) => {
                const e = opt.e as MouseEvent;
                if (e.altKey || e.button === 1) return; // handled below for pan
                const target = opt.target;
                // Click hit the artboard rect or nothing (gray surround) → deselect all
                if (!target || isArtboard(target)) {
                    fc.discardActiveObject();
                    fc.renderAll();
                    syncState();
                }
            });

            // ── Smart guides on drag ──
            fc.on('object:moving', (opt) => {
                const obj = opt.target;
                if (!obj || isArtboard(obj) || (obj as any).__aceGuide) return;
                const others = fc.getObjects()
                    .filter(o => o !== obj && !isArtboard(o) && !(o as any).__aceGuide)
                    .map(o => ({ x: o.left ?? 0, y: o.top ?? 0, w: (o.width ?? 0) * (o.scaleX ?? 1), h: (o.height ?? 0) * (o.scaleY ?? 1) }));
                const dragging = {
                    x: obj.left ?? 0, y: obj.top ?? 0,
                    w: (obj.width ?? 0) * (obj.scaleX ?? 1),
                    h: (obj.height ?? 0) * (obj.scaleY ?? 1),
                };
                const result = snapToGuides(dragging, others, width, height, 6);
                if (result.x !== null) obj.set('left', result.x);
                if (result.y !== null) obj.set('top', result.y);
                renderGuideLines(result.guides);
            });
            fc.on('mouse:up', () => clearGuideLines());


            // ──────────────────────────────────────────────────────────────────
            // ★ REMOVED: CSS inset() clip-path approach (was causing SVG clipping).
            // The clip-path was applied with wrong inset values (e.g. inset(301px 864px 153px)),
            // cutting into the artboard and clipping images inside it.
            // Artboard boundaries are shown via the artboard shadow Rect only.
            // ──────────────────────────────────────────────────────────────────

            fc.on('mouse:wheel', (opt) => {
                const e = opt.e as WheelEvent;
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault(); e.stopPropagation();

                    // ★ Canva-style zoom: smooth multiplicative factor, ~3x slower than before
                    // Before: additive ±0.08 (jumpy). Now: multiplicative ×0.975/1.025 (smooth).
                    const zoomFactor = e.deltaY > 0 ? 0.975 : 1.025;
                    let newZoom = (fc.getZoom() || 1) * zoomFactor;
                    newZoom = Math.max(0.2, Math.min(4, newZoom));

                    // ★ Canva-style: zoom toward artboard CENTER, not cursor position.
                    // This ensures the canvas artboard always stays visible and centered
                    // — users never "lose" the canvas by zooming into empty gray space.
                    const vpt = fc.viewportTransform!;
                    const artboardCenterX = width / 2;
                    const artboardCenterY = height / 2;
                    // Convert artboard center to screen coordinates
                    const screenCX = artboardCenterX * vpt[0] + vpt[4];
                    const screenCY = artboardCenterY * vpt[3] + vpt[5];
                    // Compute new viewport to keep artboard center at the same screen position
                    vpt[0] = newZoom;
                    vpt[3] = newZoom;
                    vpt[4] = screenCX - artboardCenterX * newZoom;
                    vpt[5] = screenCY - artboardCenterY * newZoom;
                    fc.setViewportTransform(vpt);
                    fc.renderAll();
                } else {
                    // ★ Scroll-to-pan: trackpad two-finger or mouse scroll = pan canvas
                    // deltaX = horizontal pan, deltaY = vertical pan
                    // 0.4x dampening for smooth, controlled panning
                    e.preventDefault(); e.stopPropagation();
                    const vpt = fc.viewportTransform!;
                    vpt[4] -= e.deltaX * 0.4;
                    vpt[5] -= e.deltaY * 0.4;
                    fc.setViewportTransform(vpt);
                    fc.renderAll();
                }
            });

            // ── Pan (Alt+drag / middle mouse) ──
            let isPanning = false;
            let lastPanX = 0, lastPanY = 0;

            fc.on('mouse:down', (opt) => {
                const e = opt.e as MouseEvent;
                if (e.altKey || e.button === 1) {
                    isPanning = true; lastPanX = e.clientX; lastPanY = e.clientY;
                    fc.setCursor('grabbing'); e.preventDefault();
                }
            });
            fc.on('mouse:move', (opt) => {
                if (!isPanning) return;
                const e = opt.e as MouseEvent;
                const vpt = fc.viewportTransform!;
                vpt[4] += e.clientX - lastPanX; vpt[5] += e.clientY - lastPanY;
                lastPanX = e.clientX; lastPanY = e.clientY;
                fc.setViewportTransform(vpt); fc.renderAll();
            });
            fc.on('mouse:up', () => { if (isPanning) { isPanning = false; fc.setCursor('default'); } });

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

    // ── ResizeObserver ──
    useEffect(() => {
        const fc = fabricRef.current;
        const container = containerRef.current;
        if (!fc || !container) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width: cw, height: ch } = entry.contentRect;
                if (cw > 0 && ch > 0) { fc.setDimensions({ width: cw, height: ch }); fc.renderAll(); }
            }
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, [status]);

    // ── Helper: find by Glid id ──
    const findById = useCallback((id: number): FabricObject | undefined => {
        return fabricRef.current?.getObjects().find((o) => (o as any).__glidId === id);
    }, []);

    // ── Shape creation ──
    const addRect = useCallback((x?: number, y?: number): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const id = nextId();
        const rect = new Rect({
            left: x ?? (width / 2 - 60), top: y ?? (height / 2 - 40),
            width: 120, height: 80, fill: nextColor(), opacity: 0.9,
        });
        (rect as any).__glidId = id;
        (rect as any).__glidZIndex = getUserObjects().length;
        patchAceProps(rect);
        fc.add(rect); fc.setActiveObject(rect); fc.renderAll(); syncState();
        return id;
    }, [width, height, syncState, getUserObjects]);

    const addRoundedRect = useCallback((x?: number, y?: number): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const id = nextId();
        const rect = new Rect({
            left: x ?? (width / 2 - 60), top: y ?? (height / 2 - 40),
            width: 120, height: 80, fill: nextColor(), opacity: 0.9, rx: 12, ry: 12,
        });
        (rect as any).__glidId = id;
        (rect as any).__glidZIndex = getUserObjects().length;
        patchAceProps(rect);
        fc.add(rect); fc.setActiveObject(rect); fc.renderAll(); syncState();
        return id;
    }, [width, height, syncState, getUserObjects]);

    const addEllipse = useCallback((x?: number, y?: number): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const id = nextId();
        const el = new Ellipse({
            left: x ?? (width / 2 - 60), top: y ?? (height / 2 - 40),
            rx: 60, ry: 50, fill: nextColor(), opacity: 0.9,
        });
        (el as any).__glidId = id;
        (el as any).__glidZIndex = getUserObjects().length;
        patchAceProps(el);
        fc.add(el); fc.setActiveObject(el); fc.renderAll(); syncState();
        return id;
    }, [width, height, syncState, getUserObjects]);

    // ── Text ──
    const addText = useCallback((x: number, y: number, content?: string, opts?: {
        fontSize?: number; fontFamily?: string; fontWeight?: string;
        color?: string; textAlign?: string; lineHeight?: number; width?: number;
    }): number | null => {
        const fc = fabricRef.current;
        if (!fc) return null;
        const id = nextId();
        const tb = new Textbox(content || 'Type here...', {
            left: x, top: y, width: opts?.width ?? 200,
            fontSize: opts?.fontSize ?? 18,
            fontFamily: opts?.fontFamily ?? 'Inter, system-ui, sans-serif',
            fontWeight: opts?.fontWeight ?? '400',
            fill: opts?.color ?? '#000000',
            textAlign: (opts?.textAlign as any) ?? 'left',
            lineHeight: opts?.lineHeight ?? 1.4,
            editable: true, splitByGrapheme: false,
        });
        // ★ Canva-style: restrict Textbox to width-only resize.
        // Only ml (middle-left) and mr (middle-right) handles are visible.
        // Corner handles and mt/mb are disabled to prevent proportional scaling.
        tb.setControlsVisibility({
            tl: false, tr: false, bl: false, br: false,
            mt: false, mb: false,
            ml: true, mr: true,
            mtr: false, // no rotation for text
        });
        (tb as any).__glidId = id;
        (tb as any).__glidName = `Text #${id}`;
        (tb as any).__glidZIndex = getUserObjects().length;
        patchAceProps(tb);
        fc.add(tb); fc.setActiveObject(tb); fc.renderAll(); syncState();
        return id;
    }, [syncState, getUserObjects]);

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

    const getTextContent = useCallback((id: number): string | null => {
        const obj = findById(id);
        if (!obj || !(obj instanceof Textbox)) return null;
        return obj.text ?? null;
    }, [findById]);

    // ── Image ──
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
            img.set({ left: x, top: y, scaleX: targetW / natW, scaleY: targetH / natH });
            (img as any).__glidId = id;
            (img as any).__glidName = `Image #${id}`;
            (img as any).__glidZIndex = getUserObjects().length;
            patchAceProps(img);
            fc.add(img); fc.setActiveObject(img); fc.renderAll(); syncState();
            return id;
        } catch (err) {
            console.error('[Fabric] Failed to load image:', err);
            return null;
        }
    }, [width, syncState, getUserObjects]);

    // ── Delete / Select / Position / Color ──
    const deleteSelected = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;
        fc.getActiveObjects().filter(o => !isArtboard(o)).forEach((obj) => fc.remove(obj));
        fc.discardActiveObject(); fc.renderAll(); syncState();
    }, [syncState]);

    const clearAll = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;
        skipHistory.current = true;
        const toRemove = fc.getObjects().filter(o => !isArtboard(o) && !(o as any).__aceGuide);
        toRemove.forEach(o => fc.remove(o));
        fc.discardActiveObject();
        fc.renderAll();
        skipHistory.current = false;
        syncState();
    }, [syncState]);

    const selectNode = useCallback((id: number) => {
        const fc = fabricRef.current;
        if (!fc) return;
        const obj = findById(id);
        if (obj) { fc.setActiveObject(obj); fc.renderAll(); }
        syncState();
    }, [findById, syncState]);

    const deselectAll = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;
        fc.discardActiveObject(); fc.renderAll(); syncState();
    }, [syncState]);

    const setNodePosition = useCallback((id: number, x: number, y: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ left: x, top: y }); obj.setCoords(); fabricRef.current?.renderAll();
    }, [findById]);

    const setNodeSize = useCallback((id: number, w: number, h: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ width: w, height: h, scaleX: 1, scaleY: 1 }); obj.setCoords(); fabricRef.current?.renderAll();
    }, [findById]);

    const setNodeOpacity = useCallback((id: number, opacity: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ opacity }); fabricRef.current?.renderAll();
    }, [findById]);

    const setFillColor = useCallback((id: number, r: number, g: number, b: number, _a: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ fill: rgbToHex(r, g, b) }); fabricRef.current?.renderAll(); syncState();
    }, [findById, syncState]);

    // ── Z-index ──
    // ★ REGRESSION GUARD: After every Fabric stack reorder call (bringObjectToFront etc.),
    // resyncZIndices() MUST be called to update __glidZIndex on ALL objects.
    // fabricToEngineNode reads __glidZIndex to determine z_index during save.
    // If __glidZIndex is stale, the saved z_index is wrong and layer order reverts on re-enter.
    const bringToFront = useCallback((id: number) => {
        const fc = fabricRef.current; const obj = findById(id);
        if (!fc || !obj) return;
        fc.bringObjectToFront(obj);
        resyncZIndices(); // ★ MUST call after every Fabric stack change
        fc.renderAll(); syncState();
    }, [findById, syncState, resyncZIndices]);

    const sendToBack = useCallback((id: number) => {
        const fc = fabricRef.current; const obj = findById(id);
        if (!fc || !obj) return;
        fc.sendObjectToBack(obj);
        const artboard = fc.getObjects().find(isArtboard);
        if (artboard) fc.sendObjectToBack(artboard); // Artboard must stay at the very back
        resyncZIndices(); // ★ MUST call after every Fabric stack change
        fc.renderAll(); syncState();
    }, [findById, syncState, resyncZIndices]);

    const bringForward = useCallback((id: number) => {
        const fc = fabricRef.current; const obj = findById(id);
        if (!fc || !obj) return;
        fc.bringObjectForward(obj);
        resyncZIndices(); // ★ MUST call after every Fabric stack change
        fc.renderAll(); syncState();
    }, [findById, syncState, resyncZIndices]);

    const sendBackward = useCallback((id: number) => {
        const fc = fabricRef.current; const obj = findById(id);
        if (!fc || !obj) return;
        fc.sendObjectBackwards(obj);
        const artboard = fc.getObjects().find(isArtboard);
        if (artboard) fc.sendObjectToBack(artboard);
        resyncZIndices(); // ★ MUST call after every Fabric stack change
        fc.renderAll(); syncState();
    }, [findById, syncState, resyncZIndices]);

    // ── Effects ──
    const setShadow = useCallback((id: number, ox: number, oy: number, blur: number, r: number, g: number, b: number, a: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ shadow: new Shadow({ color: `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`, blur, offsetX: ox, offsetY: oy }) });
        fabricRef.current?.renderAll();
    }, [findById]);

    const removeShadow = useCallback((id: number) => {
        const obj = findById(id);
        if (!obj) return;
        obj.set({ shadow: undefined }); fabricRef.current?.renderAll();
    }, [findById]);

    const setBlendMode = useCallback((_id: number, _mode: string) => { }, []);
    const setBrightness = useCallback((_id: number, _v: number) => { }, []);
    const setContrast = useCallback((_id: number, _v: number) => { }, []);
    const setSaturation = useCallback((_id: number, _v: number) => { }, []);
    const setHueRotate = useCallback((_id: number, _deg: number) => { }, []);
    const addKeyframe = useCallback((_nodeId: number, _property: string, _time: number, _value: number, _easing: string) => { }, []);

    // ── Text Effects (Canva-style) ──
    // ★ SYNC: Effect type/intensity/color stored as __glid* props on Fabric object
    // → serialized via GLID_CUSTOM_PROPS → survives save/load/undo/redo.
    const setTextEffect = useCallback((id: number, effectType: TextEffectType, intensity: number, color: string) => {
        const obj = findById(id);
        if (!obj) return;
        (obj as any).__glidTextEffectType = effectType;
        (obj as any).__glidTextEffectIntensity = intensity;
        (obj as any).__glidTextEffectColor = color;
        // Apply visual via engine shim helper
        engineRef.current?.set_text_effect?.(id, effectType, intensity, color);
        fabricRef.current?.renderAll();
        syncState();
    }, [findById, syncState]);

    const removeTextEffect = useCallback((id: number) => {
        const obj = findById(id);
        if (!obj) return;
        (obj as any).__glidTextEffectType = 'none';
        (obj as any).__glidTextEffectIntensity = 0;
        (obj as any).__glidTextEffectColor = '';
        // ★ Restore original fill before clearing stroke (effects like hollow set fill='transparent')
        if ((obj as any).__glidOriginalFill && obj instanceof Textbox) {
            obj.set({ fill: (obj as any).__glidOriginalFill });
            delete (obj as any).__glidOriginalFill;
        }
        obj.set({ shadow: undefined, stroke: undefined, strokeWidth: 0 } as any);
        delete (obj as any).__glidCustomStyles;
        obj.dirty = true;
        if (obj instanceof Textbox) {
            obj.set({ paintFirst: 'fill' } as any);
        }
        fabricRef.current?.renderAll();
        syncState();
    }, [findById, syncState]);

    // ── Undo / Redo ──
    const restoreArtboardFlags = useCallback((fc: Canvas) => {
        fc.getObjects().forEach((obj) => {
            if ((obj as any).__glidArtboard) {
                obj.set({
                    selectable: false, evented: false, hasControls: false, hasBorders: false,
                    lockMovementX: true, lockMovementY: true, hoverCursor: 'default',
                });
            } else if (!(obj as any).__glidId) {
                (obj as any).__glidId = nextId();
                (obj as any).__glidZIndex = 0;
            }
            // ★ Canva-style: ensure restored Textbox objects have width-only resize handles
            if (obj instanceof Textbox) {
                obj.setControlsVisibility({
                    tl: false, tr: false, bl: false, br: false,
                    mt: false, mb: false,
                    ml: true, mr: true,
                    mtr: false,
                });
                // Normalize any stale scaling
                if ((obj.scaleX ?? 1) !== 1 || (obj.scaleY ?? 1) !== 1) {
                    const newWidth = (obj.width ?? 200) * (obj.scaleX ?? 1);
                    obj.set({ width: Math.max(20, newWidth), scaleX: 1, scaleY: 1 });
                }
            }
            patchAceProps(obj);
        });
    }, []);

    const undo = useCallback(() => {
        const fc = fabricRef.current;
        const hs = useHistoryStore.getState();
        if (!fc || !hs.canUndo) return;
        // Save current state for redo
        hs.pushState('redo-save', JSON.stringify(fc.toObject(GLID_CUSTOM_PROPS)));
        const entry = hs.undo();
        if (!entry?.canvasState) return;
        skipHistory.current = true;
        fc.loadFromJSON(entry.canvasState).then(() => {
            restoreArtboardFlags(fc); fc.renderAll(); skipHistory.current = false; syncState();
        });
    }, [syncState, restoreArtboardFlags]);

    const redo = useCallback(() => {
        const fc = fabricRef.current;
        const hs = useHistoryStore.getState();
        if (!fc || !hs.canRedo) return;
        const entry = hs.redo();
        if (!entry?.canvasState) return;
        skipHistory.current = true;
        fc.loadFromJSON(entry.canvasState).then(() => {
            restoreArtboardFlags(fc); fc.renderAll(); skipHistory.current = false; syncState();
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
            (cloned as any).__glidId = id;
            fc.add(cloned); fc.setActiveObject(cloned); fc.renderAll(); syncState();
        });
        return id;
    }, [syncState]);

    // ── Alignment ──
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
        obj.setCoords(); fabricRef.current?.renderAll(); syncState();
    }, [width, height, findById, syncState]);

    // ── Mouse handlers (stubs — Fabric handles natively) ──
    const onMouseDown = useCallback((_e: React.MouseEvent) => { }, []);
    const onMouseMove = useCallback((_e: React.MouseEvent) => { }, []);
    const onMouseUp = useCallback(() => { }, []);

    // ── Tool-aware canvas click ──
    useEffect(() => {
        const fc = fabricRef.current;
        if (!fc || status !== 'ready') return;
        const handler = (opt: any) => {
            const pointer = fc.getScenePoint(opt.e);
            if (activeTool === 'shape') { addRect(pointer.x - 60, pointer.y - 40); setTool('select'); }
            else if (activeTool === 'text') { addText(pointer.x, pointer.y); setTool('select'); }
            else if (activeTool === 'image') {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => { addImage(pointer.x, pointer.y, reader.result as string); };
                    reader.readAsDataURL(file);
                    document.body.removeChild(input);
                };
                document.body.appendChild(input); input.click(); setTool('select');
            }
        };
        fc.on('mouse:down', handler);
        return () => { fc.off('mouse:down', handler); };
    }, [activeTool, status, addRect, addText, addImage, setTool]);

    // ── Pen tool ──
    useEffect(() => {
        const fc = fabricRef.current;
        if (!fc || status !== 'ready') return;
        if (activeTool === 'pen') {
            fc.isDrawingMode = true;
            fc.freeDrawingBrush = new PencilBrush(fc);
            fc.freeDrawingBrush.color = '#333333';
            fc.freeDrawingBrush.width = 2;
        } else { fc.isDrawingMode = false; }
        fc.renderAll();
    }, [activeTool, status]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if ((e.target as HTMLElement)?.isContentEditable) return;
            if ((e.metaKey || e.ctrlKey) && e.key === '0') {
                e.preventDefault();
                // ★ Reset zoom to fit artboard in container
                const fc = fabricRef.current;
                if (fc) {
                    const container = containerRef.current;
                    const cw = container?.clientWidth ?? 1200;
                    const ch = container?.clientHeight ?? 700;
                    const fitZoom = Math.min(cw / width * 0.85, ch / height * 0.85, 1);
                    const vpt = fc.viewportTransform!;
                    vpt[0] = fitZoom;
                    vpt[3] = fitZoom;
                    vpt[4] = (cw - width * fitZoom) / 2;
                    vpt[5] = (ch - height * fitZoom) / 2;
                    fc.setViewportTransform(vpt);
                    fc.renderAll();
                }
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }
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

    const retryInit = useCallback(() => {
        if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
        setStatus('loading'); setErrorMsg('');
    }, []);

    // ── Return ──
    const state: CanvasEngineState = { status, errorMsg, selection, canUndo, canRedo, nodeCount, nodes };

    const actions: CanvasEngineActions = {
        onMouseDown, onMouseMove, onMouseUp,
        addRect, addEllipse, addRoundedRect,
        addGradientRect: (x, y, w, h, c1, c2, angle?, radius?, name?) =>
            engineRef.current?.add_gradient_rect?.(x, y, w, h, c1, c2, angle, radius, name) ?? null,
        addText, updateText, getTextContent, addImage,
        deleteSelected, clearAll, selectNode, deselectAll,
        setNodePosition, setNodeSize, setNodeOpacity, setFillColor,
        bringToFront, sendToBack, bringForward, sendBackward,
        setShadow, removeShadow, setTextEffect, removeTextEffect, setBlendMode,
        setBrightness, setContrast, setSaturation, setHueRotate,
        addKeyframe, duplicateSelected,
        groupSelected: (name?: string) => {
            const fc = fabricRef.current;
            if (!fc) return null;
            const ids = fc.getActiveObjects().map(o => (o as any).__glidId as number).filter(id => id > 0);
            if (ids.length < 2) return null;
            return engineRef.current?.group_elements(ids, name) ?? null;
        },
        ungroupSelected: () => {
            const fc = fabricRef.current;
            if (!fc) return;
            const active = fc.getActiveObject();
            if (!active) return;
            const id = (active as any).__glidId;
            if (id) engineRef.current?.ungroup(id);
        },
        undo, redo, alignToCanvas,
        replaceImageSrc: async (id: number, newSrc: string) => {
            await engineRef.current?.replace_image_src(id, newSrc);
        },
        canvasWidth: width, canvasHeight: height,
    };

    return { canvasRef, overlayRef, engineRef, state, actions, syncState, retryInit };
}

// Re-export for backward compatibility
export { createEngineShim } from './fabricEngineShim';
