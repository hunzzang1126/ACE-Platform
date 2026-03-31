// ─────────────────────────────────────────────────
// useFabricCanvas — Fabric.js canvas engine hook
// ─────────────────────────────────────────────────
// Full-viewport canvas with artboard as background rect.
// Event handlers extracted to fabricCanvasEvents.ts.
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect, Ellipse, Shadow, PencilBrush, Textbox, FabricImage, FabricObject } from 'fabric';

// ★ Canva/Polotno-style: Global selection handle defaults
FabricObject.ownDefaults.cornerColor = '#FFFFFF';
FabricObject.ownDefaults.cornerStrokeColor = '#0D99FF';
FabricObject.ownDefaults.cornerSize = 10;
FabricObject.ownDefaults.cornerStyle = 'circle';
FabricObject.ownDefaults.transparentCorners = false;
FabricObject.ownDefaults.borderColor = '#0D99FF';
FabricObject.ownDefaults.borderScaleFactor = 1;
FabricObject.ownDefaults.padding = 0;

import { useEditorStore } from '@/stores/editorStore';
import { useHistoryStore } from '@/stores/historyStore';
import type { EngineNode, CanvasEngineState, CanvasEngineActions, UseCanvasEngineResult } from './canvasTypes';
import type { TextEffectType } from '@/schema/elements.types';
import { nextId, nextColor, rgbToHex, isArtboard, fabricToEngineNode, patchAceProps, GLID_CUSTOM_PROPS } from './fabricHelpers';
import { createEngineShim } from './fabricEngineShim';
import { setupCanvasEvents } from './fabricCanvasEvents';

export function useFabricCanvas(width: number, height: number, _addDemoShapes = false): UseCanvasEngineResult {
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

    const getUserObjects = useCallback((): FabricObject[] => {
        return fabricRef.current?.getObjects().filter(o => !isArtboard(o)) ?? [];
    }, []);

    // ── Sync state — RAF-debounced ──
    const prevNodesJson = useRef('');
    const prevSelJson = useRef('');
    const doSync = useCallback(() => {
        syncPending.current = false;
        const engineNodes = getUserObjects().map(fabricToEngineNode).filter(n => n.id > 0);
        const nodesJson = JSON.stringify(engineNodes);
        if (nodesJson !== prevNodesJson.current) { prevNodesJson.current = nodesJson; setNodes(engineNodes); setNodeCount(engineNodes.length); }
        const fc = fabricRef.current;
        if (fc) {
            const selectedIds = fc.getActiveObjects().map(o => (o as any).__glidId ?? 0).filter((id: number) => id > 0);
            const selJson = JSON.stringify(selectedIds);
            if (selJson !== prevSelJson.current) { prevSelJson.current = selJson; setSelection(selectedIds); }
        }
        const hs = useHistoryStore.getState();
        if (hs.canUndo !== canUndo) setCanUndo(hs.canUndo);
        if (hs.canRedo !== canRedo) setCanRedo(hs.canRedo);
    }, [getUserObjects, canUndo, canRedo]);

    const syncState = useCallback(() => {
        if (!syncPending.current) { syncPending.current = true; requestAnimationFrame(doSync); }
    }, [doSync]);

    const pushUndo = useCallback((label = 'Edit') => {
        const fc = fabricRef.current;
        if (!fc || skipHistory.current) return;
        useHistoryStore.getState().pushState(label, JSON.stringify(fc.toObject(GLID_CUSTOM_PROPS)));
        setCanUndo(true); setCanRedo(false);
    }, []);

    // ★ REGRESSION GUARD: Hook-level z-index resync
    const resyncZIndices = useCallback(() => {
        const fc = fabricRef.current;
        if (!fc) return;
        fc.getObjects().filter(o => !isArtboard(o) && !(o as any).__aceGuide)
            .forEach((o, i) => { (o as any).__glidZIndex = i; });
    }, []);

    // ── Init Fabric Canvas ──
    useEffect(() => {
        const el = canvasRef.current;
        if (!el) { setErrorMsg('Canvas element not found'); setStatus('error'); return; }
        const container = el.parentElement;
        containerRef.current = container;
        const cw = container?.clientWidth ?? 1200;
        const ch = container?.clientHeight ?? 700;

        try {
            const fc = new Canvas(el, {
                width: cw, height: ch, backgroundColor: '#e8e8ec',
                selection: true, preserveObjectStacking: true,
                stopContextMenu: true, fireRightClick: true, controlsAboveOverlay: true,
            });
            (fc as any).selectionColor = 'rgba(13, 153, 255, 0.06)';
            (fc as any).selectionBorderColor = '#0D99FF';
            (fc as any).selectionLineWidth = 1;

            // ★ Artboard
            skipHistory.current = true;
            const artboard = new Rect({
                left: 0, top: 0, width, height, fill: '#ffffff',
                selectable: false, evented: true, hasControls: false, hasBorders: false,
                lockMovementX: true, lockMovementY: true, hoverCursor: 'default',
                shadow: new Shadow({ color: 'rgba(0,0,0,0.35)', blur: 24, offsetX: 0, offsetY: 6 }),
            });
            (artboard as any).__glidArtboard = true;
            patchAceProps(artboard);
            fc.add(artboard);
            fc.clipPath = new Rect({ left: 0, top: 0, width, height });
            const vpt = fc.viewportTransform!;
            vpt[4] = (cw - width) / 2; vpt[5] = (ch - height) / 2;
            fc.setViewportTransform(vpt);
            skipHistory.current = false;

            // ── Events (delegated to sub-module) ──
            setupCanvasEvents({ fc, width, height, syncState, resyncZIndices, pushUndo, guideLines });

            fabricRef.current = fc;
            engineRef.current = createEngineShim(fc, syncState, width, height);
            setStatus('ready');
            console.log('[Fabric] Canvas ready:', width, '×', height, '(viewport:', cw, '×', ch, ')');
        } catch (err) {
            console.error('[Fabric] Init error:', err);
            setErrorMsg(String(err)); setStatus('error');
        }
        return () => { if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; engineRef.current = null; } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]);

    // ── ResizeObserver ──
    useEffect(() => {
        const fc = fabricRef.current; const container = containerRef.current;
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

    const findById = useCallback((id: number) => fabricRef.current?.getObjects().find(o => (o as any).__glidId === id), []);

    // ── Shape creation ──
    const addRect = useCallback((x?: number, y?: number) => {
        const fc = fabricRef.current; if (!fc) return null;
        const id = nextId();
        const rect = new Rect({ left: x ?? (width / 2 - 60), top: y ?? (height / 2 - 40), width: 120, height: 80, fill: nextColor(), opacity: 0.9 });
        (rect as any).__glidId = id; (rect as any).__glidZIndex = getUserObjects().length; patchAceProps(rect);
        fc.add(rect); fc.setActiveObject(rect); fc.renderAll(); syncState();
        return id;
    }, [width, height, syncState, getUserObjects]);

    const addRoundedRect = useCallback((x?: number, y?: number) => {
        const fc = fabricRef.current; if (!fc) return null;
        const id = nextId();
        const rect = new Rect({ left: x ?? (width / 2 - 60), top: y ?? (height / 2 - 40), width: 120, height: 80, fill: nextColor(), opacity: 0.9, rx: 12, ry: 12 });
        (rect as any).__glidId = id; (rect as any).__glidZIndex = getUserObjects().length; patchAceProps(rect);
        fc.add(rect); fc.setActiveObject(rect); fc.renderAll(); syncState();
        return id;
    }, [width, height, syncState, getUserObjects]);

    const addEllipse = useCallback((x?: number, y?: number) => {
        const fc = fabricRef.current; if (!fc) return null;
        const id = nextId();
        const el = new Ellipse({ left: x ?? (width / 2 - 60), top: y ?? (height / 2 - 40), rx: 60, ry: 50, fill: nextColor(), opacity: 0.9 });
        (el as any).__glidId = id; (el as any).__glidZIndex = getUserObjects().length; patchAceProps(el);
        fc.add(el); fc.setActiveObject(el); fc.renderAll(); syncState();
        return id;
    }, [width, height, syncState, getUserObjects]);

    // ── Text ──
    const addText = useCallback((x: number, y: number, content?: string, opts?: { fontSize?: number; fontFamily?: string; fontWeight?: string; color?: string; textAlign?: string; lineHeight?: number; width?: number; }) => {
        const fc = fabricRef.current; if (!fc) return null;
        const id = nextId();
        const tb = new Textbox(content || 'Type here...', { left: x, top: y, width: opts?.width ?? 200, fontSize: opts?.fontSize ?? 18, fontFamily: opts?.fontFamily ?? 'Inter, system-ui, sans-serif', fontWeight: opts?.fontWeight ?? '400', fill: opts?.color ?? '#000000', textAlign: (opts?.textAlign as any) ?? 'left', lineHeight: opts?.lineHeight ?? 1.4, editable: true, splitByGrapheme: false });
        tb.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, mt: false, mb: false, ml: true, mr: true, mtr: false });
        (tb as any).__glidId = id; (tb as any).__glidName = `Text #${id}`; (tb as any).__glidZIndex = getUserObjects().length; patchAceProps(tb);
        fc.add(tb); fc.setActiveObject(tb); fc.renderAll(); syncState();
        return id;
    }, [syncState, getUserObjects]);

    const updateText = useCallback((id: number, updates: Partial<{ content: string; fontSize: number; fontFamily: string; fontWeight: string; color: string; textAlign: string; lineHeight: number; letterSpacing: number; }>) => {
        const obj = findById(id); if (!obj || !(obj instanceof Textbox)) return;
        if (updates.content !== undefined) obj.set('text', updates.content);
        if (updates.fontSize !== undefined) obj.set('fontSize', updates.fontSize);
        if (updates.fontFamily !== undefined) obj.set('fontFamily', updates.fontFamily);
        if (updates.fontWeight !== undefined) obj.set('fontWeight', updates.fontWeight);
        if (updates.color !== undefined) obj.set('fill', updates.color);
        if (updates.textAlign !== undefined) obj.set('textAlign', updates.textAlign as any);
        if (updates.lineHeight !== undefined) obj.set('lineHeight', updates.lineHeight);
        if (updates.letterSpacing !== undefined) obj.set('charSpacing', updates.letterSpacing * 10);
        fabricRef.current?.renderAll(); syncState();
    }, [findById, syncState]);

    const getTextContent = useCallback((id: number) => { const obj = findById(id); return obj instanceof Textbox ? obj.text ?? null : null; }, [findById]);

    // ── Image ──
    const addImage = useCallback(async (x: number, y: number, src: string, w?: number, h?: number) => {
        const fc = fabricRef.current; if (!fc) return null;
        const id = nextId();
        try {
            const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
            const natW = img.width ?? 200; const natH = img.height ?? 200;
            const targetW = w ?? Math.min(natW, width * 0.6); const scale = targetW / natW;
            img.set({ left: x, top: y, scaleX: targetW / natW, scaleY: (h ?? natH * scale) / natH });
            (img as any).__glidId = id; (img as any).__glidName = `Image #${id}`; (img as any).__glidZIndex = getUserObjects().length; patchAceProps(img);
            fc.add(img); fc.setActiveObject(img); fc.renderAll(); syncState();
            return id;
        } catch (err) { console.error('[Fabric] Failed to load image:', err); return null; }
    }, [width, syncState, getUserObjects]);

    // ── Actions ──
    const deleteSelected = useCallback(() => { const fc = fabricRef.current; if (!fc) return; fc.getActiveObjects().filter(o => !isArtboard(o)).forEach(o => fc.remove(o)); fc.discardActiveObject(); fc.renderAll(); syncState(); }, [syncState]);
    const clearAll = useCallback(() => { const fc = fabricRef.current; if (!fc) return; skipHistory.current = true; fc.getObjects().filter(o => !isArtboard(o) && !(o as any).__aceGuide).forEach(o => fc.remove(o)); fc.discardActiveObject(); fc.renderAll(); skipHistory.current = false; syncState(); }, [syncState]);
    const selectNode = useCallback((id: number) => { const fc = fabricRef.current; if (!fc) return; const obj = findById(id); if (obj) { fc.setActiveObject(obj); fc.renderAll(); } syncState(); }, [findById, syncState]);
    const deselectAll = useCallback(() => { fabricRef.current?.discardActiveObject(); fabricRef.current?.renderAll(); syncState(); }, [syncState]);
    const setNodePosition = useCallback((id: number, x: number, y: number) => { const obj = findById(id); if (obj) { obj.set({ left: x, top: y }); obj.setCoords(); fabricRef.current?.renderAll(); } }, [findById]);
    const setNodeSize = useCallback((id: number, w: number, h: number) => { const obj = findById(id); if (obj) { obj.set({ width: w, height: h, scaleX: 1, scaleY: 1 }); obj.setCoords(); fabricRef.current?.renderAll(); } }, [findById]);
    const setNodeOpacity = useCallback((id: number, opacity: number) => { const obj = findById(id); if (obj) { obj.set({ opacity }); fabricRef.current?.renderAll(); } }, [findById]);
    const setFillColor = useCallback((id: number, r: number, g: number, b: number, _a: number) => { const obj = findById(id); if (obj) { obj.set({ fill: rgbToHex(r, g, b) }); fabricRef.current?.renderAll(); syncState(); } }, [findById, syncState]);

    // ── Z-index ──
    const bringToFront = useCallback((id: number) => { const fc = fabricRef.current; const obj = findById(id); if (!fc || !obj) return; fc.bringObjectToFront(obj); resyncZIndices(); fc.renderAll(); syncState(); }, [findById, syncState, resyncZIndices]);
    const sendToBack = useCallback((id: number) => { const fc = fabricRef.current; const obj = findById(id); if (!fc || !obj) return; fc.sendObjectToBack(obj); const ab = fc.getObjects().find(isArtboard); if (ab) fc.sendObjectToBack(ab); resyncZIndices(); fc.renderAll(); syncState(); }, [findById, syncState, resyncZIndices]);
    const bringForward = useCallback((id: number) => { const fc = fabricRef.current; const obj = findById(id); if (!fc || !obj) return; fc.bringObjectForward(obj); resyncZIndices(); fc.renderAll(); syncState(); }, [findById, syncState, resyncZIndices]);
    const sendBackward = useCallback((id: number) => { const fc = fabricRef.current; const obj = findById(id); if (!fc || !obj) return; fc.sendObjectBackwards(obj); const ab = fc.getObjects().find(isArtboard); if (ab) fc.sendObjectToBack(ab); resyncZIndices(); fc.renderAll(); syncState(); }, [findById, syncState, resyncZIndices]);

    // ── Effects ──
    const setShadow = useCallback((id: number, ox: number, oy: number, blur: number, r: number, g: number, b: number, a: number) => { const obj = findById(id); if (obj) { obj.set({ shadow: new Shadow({ color: `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`, blur, offsetX: ox, offsetY: oy }) }); fabricRef.current?.renderAll(); } }, [findById]);
    const removeShadow = useCallback((id: number) => { const obj = findById(id); if (obj) { obj.set({ shadow: undefined }); fabricRef.current?.renderAll(); } }, [findById]);
    const setBlendMode = useCallback((_id: number, _mode: string) => { }, []);
    const setBrightness = useCallback((_id: number, _v: number) => { }, []);
    const setContrast = useCallback((_id: number, _v: number) => { }, []);
    const setSaturation = useCallback((_id: number, _v: number) => { }, []);
    const setHueRotate = useCallback((_id: number, _deg: number) => { }, []);
    const addKeyframe = useCallback((_nodeId: number, _property: string, _time: number, _value: number, _easing: string) => { }, []);

    // ── Text Effects ──
    const setTextEffect = useCallback((id: number, effectType: TextEffectType, intensity: number, color: string) => {
        const obj = findById(id); if (!obj) return;
        (obj as any).__glidTextEffectType = effectType; (obj as any).__glidTextEffectIntensity = intensity; (obj as any).__glidTextEffectColor = color;
        engineRef.current?.set_text_effect?.(id, effectType, intensity, color);
        fabricRef.current?.renderAll(); syncState();
    }, [findById, syncState]);

    const removeTextEffect = useCallback((id: number) => {
        const obj = findById(id); if (!obj) return;
        (obj as any).__glidTextEffectType = 'none'; (obj as any).__glidTextEffectIntensity = 0; (obj as any).__glidTextEffectColor = '';
        if ((obj as any).__glidOriginalFill && obj instanceof Textbox) { obj.set({ fill: (obj as any).__glidOriginalFill }); delete (obj as any).__glidOriginalFill; }
        obj.set({ shadow: undefined, stroke: undefined, strokeWidth: 0 } as any);
        delete (obj as any).__glidCustomStyles; obj.dirty = true;
        if (obj instanceof Textbox) obj.set({ paintFirst: 'fill' } as any);
        fabricRef.current?.renderAll(); syncState();
    }, [findById, syncState]);

    // ── Undo / Redo ──
    const restoreArtboardFlags = useCallback((fc: Canvas) => {
        fc.getObjects().forEach(obj => {
            if ((obj as any).__glidArtboard) obj.set({ selectable: false, evented: false, hasControls: false, hasBorders: false, lockMovementX: true, lockMovementY: true, hoverCursor: 'default' });
            else if (!(obj as any).__glidId) { (obj as any).__glidId = nextId(); (obj as any).__glidZIndex = 0; }
            if (obj instanceof Textbox) {
                obj.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, mt: false, mb: false, ml: true, mr: true, mtr: false });
                if ((obj.scaleX ?? 1) !== 1 || (obj.scaleY ?? 1) !== 1) obj.set({ width: Math.max(20, (obj.width ?? 200) * (obj.scaleX ?? 1)), scaleX: 1, scaleY: 1 });
            }
            patchAceProps(obj);
        });
    }, []);

    const undo = useCallback(() => { const fc = fabricRef.current; const hs = useHistoryStore.getState(); if (!fc || !hs.canUndo) return; hs.pushState('redo-save', JSON.stringify(fc.toObject(GLID_CUSTOM_PROPS))); const entry = hs.undo(); if (!entry?.canvasState) return; skipHistory.current = true; fc.loadFromJSON(entry.canvasState).then(() => { restoreArtboardFlags(fc); fc.renderAll(); skipHistory.current = false; syncState(); }); }, [syncState, restoreArtboardFlags]);
    const redo = useCallback(() => { const fc = fabricRef.current; const hs = useHistoryStore.getState(); if (!fc || !hs.canRedo) return; const entry = hs.redo(); if (!entry?.canvasState) return; skipHistory.current = true; fc.loadFromJSON(entry.canvasState).then(() => { restoreArtboardFlags(fc); fc.renderAll(); skipHistory.current = false; syncState(); }); }, [syncState, restoreArtboardFlags]);

    // ── Duplicate ──
    const duplicateSelected = useCallback(() => { const fc = fabricRef.current; if (!fc) return null; const active = fc.getActiveObject(); if (!active || isArtboard(active)) return null; const id = nextId(); active.clone().then((cloned: FabricObject) => { cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 }); (cloned as any).__glidId = id; fc.add(cloned); fc.setActiveObject(cloned); fc.renderAll(); syncState(); }); return id; }, [syncState]);

    // ── Alignment ──
    const alignToCanvas = useCallback((id: number, alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
        const obj = findById(id); if (!obj) return;
        const objW = (obj.width ?? 0) * (obj.scaleX ?? 1); const objH = (obj.height ?? 0) * (obj.scaleY ?? 1);
        switch (alignment) { case 'left': obj.set({ left: 0 }); break; case 'center-h': obj.set({ left: (width - objW) / 2 }); break; case 'right': obj.set({ left: width - objW }); break; case 'top': obj.set({ top: 0 }); break; case 'center-v': obj.set({ top: (height - objH) / 2 }); break; case 'bottom': obj.set({ top: height - objH }); break; }
        obj.setCoords(); fabricRef.current?.renderAll(); syncState();
    }, [width, height, findById, syncState]);

    // ── Tool-aware canvas click ──
    useEffect(() => { const fc = fabricRef.current; if (!fc || status !== 'ready') return; const handler = (opt: any) => { const p = fc.getScenePoint(opt.e); if (activeTool === 'shape') { addRect(p.x - 60, p.y - 40); setTool('select'); } else if (activeTool === 'text') { addText(p.x, p.y); setTool('select'); } else if (activeTool === 'image') { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none'; input.onchange = () => { const file = input.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => addImage(p.x, p.y, reader.result as string); reader.readAsDataURL(file); document.body.removeChild(input); } }; document.body.appendChild(input); input.click(); setTool('select'); } }; fc.on('mouse:down', handler); return () => { fc.off('mouse:down', handler); }; }, [activeTool, status, addRect, addText, addImage, setTool]);

    // ── Pen tool ──
    useEffect(() => { const fc = fabricRef.current; if (!fc || status !== 'ready') return; if (activeTool === 'pen') { fc.isDrawingMode = true; fc.freeDrawingBrush = new PencilBrush(fc); fc.freeDrawingBrush.color = '#333333'; fc.freeDrawingBrush.width = 2; } else { fc.isDrawingMode = false; } fc.renderAll(); }, [activeTool, status]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
            if ((e.metaKey || e.ctrlKey) && e.key === '0') { e.preventDefault(); const fc = fabricRef.current; if (fc) { const c = containerRef.current; const cw = c?.clientWidth ?? 1200; const ch = c?.clientHeight ?? 700; const fit = Math.min(cw / width * 0.85, ch / height * 0.85, 1); const vpt = fc.viewportTransform!; vpt[0] = fit; vpt[3] = fit; vpt[4] = (cw - width * fit) / 2; vpt[5] = (ch - height * fit) / 2; fc.setViewportTransform(vpt); fc.renderAll(); } return; }
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }
            if (!e.metaKey && !e.ctrlKey && !e.altKey) { switch (e.key.toLowerCase()) { case 'v': setTool('select'); break; case 's': setTool('shape'); break; case 't': setTool('text'); break; case 'p': setTool('pen'); break; case 'h': setTool('hand'); break; case 'z': setTool('zoom'); break; } }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo, setTool, width, height]);

    const retryInit = useCallback(() => { if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; } setStatus('loading'); setErrorMsg(''); }, []);
    const onMouseDown = useCallback((_e: React.MouseEvent) => { }, []);
    const onMouseMove = useCallback((_e: React.MouseEvent) => { }, []);
    const onMouseUp = useCallback(() => { }, []);

    const state: CanvasEngineState = { status, errorMsg, selection, canUndo, canRedo, nodeCount, nodes };
    const actions: CanvasEngineActions = {
        onMouseDown, onMouseMove, onMouseUp, addRect, addEllipse, addRoundedRect,
        addGradientRect: (x, y, w, h, c1, c2, angle?, radius?, name?) => engineRef.current?.add_gradient_rect?.(x, y, w, h, c1, c2, angle, radius, name) ?? null,
        addText, updateText, getTextContent, addImage, deleteSelected, clearAll, selectNode, deselectAll,
        setNodePosition, setNodeSize, setNodeOpacity, setFillColor, bringToFront, sendToBack, bringForward, sendBackward,
        setShadow, removeShadow, setTextEffect, removeTextEffect, setBlendMode, setBrightness, setContrast, setSaturation, setHueRotate, addKeyframe, duplicateSelected,
        groupSelected: (name?: string) => { const fc = fabricRef.current; if (!fc) return null; const ids = fc.getActiveObjects().map(o => (o as any).__glidId as number).filter(id => id > 0); if (ids.length < 2) return null; return engineRef.current?.group_elements(ids, name) ?? null; },
        ungroupSelected: () => { const fc = fabricRef.current; if (!fc) return; const active = fc.getActiveObject(); if (!active) return; const id = (active as any).__glidId; if (id) engineRef.current?.ungroup(id); },
        undo, redo, alignToCanvas,
        replaceImageSrc: async (id: number, newSrc: string) => { await engineRef.current?.replace_image_src(id, newSrc); },
        fillToPage: (id: number) => {
            const obj = findById(id); if (!obj) return;
            const natW = (obj as any).width ?? 200;
            const natH = (obj as any).height ?? 200;
            // ★ Cover mode: uniform scale so image covers entire canvas
            const scale = Math.max(width / natW, height / natH);
            const finalW = natW * scale;
            const finalH = natH * scale;
            obj.set({ left: (width - finalW) / 2, top: (height - finalH) / 2, scaleX: scale, scaleY: scale });
            obj.setCoords(); fabricRef.current?.renderAll(); pushUndo('Fill to Page'); syncState();
        },
        canvasWidth: width, canvasHeight: height,
    };

    return { canvasRef, overlayRef, engineRef, state, actions, syncState, retryInit };
}

export { createEngineShim } from './fabricEngineShim';
