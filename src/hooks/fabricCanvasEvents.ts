// ─────────────────────────────────────────────────
// fabricCanvasEvents — Canvas event setup for Fabric.js
// ─────────────────────────────────────────────────
// Registers all Fabric.js canvas events: selection, scaling,
// object lifecycle, zoom/pan, smart guides.
// ─────────────────────────────────────────────────

import { Canvas, Textbox, FabricObject, Line, Shadow } from 'fabric';
import { nextId, isArtboard, patchAceProps } from './fabricHelpers';
import { snapToGuides, type GuideLine } from './useFabricGuides';

// ★ Auto-shrink: Tighten Textbox bounding box to actual rendered text width + height.
// Width: shrinks to longest rendered line (prevents right-side gap).
// Height: trims trailing lineHeight space from last line (equal top/bottom gap).
function autoShrinkTextbox(tb: Textbox): void {
    if ((tb as any).__autoShrinking) return; // guard: prevent infinite loop
    (tb as any).__autoShrinking = true;
    try {
        tb.initDimensions();
        const lineWidths: number[] = (tb as any).__lineWidths || [];
        if (lineWidths.length === 0) return;
        const longestLine = Math.max(...lineWidths);
        const minWidth = Math.max(20, longestLine + 2); // 2px breathing room
        if (tb.width > minWidth) {
            tb.set({ width: minWidth });
            tb.initDimensions(); // re-layout after width change
        }
        // ★ Trim trailing lineHeight gap: last line should not add extra lineHeight space below
        const rawHeight = tb.calcTextHeight();
        const fontSize = tb.fontSize ?? 16;
        const lh = tb.lineHeight ?? 1.15;
        const trailingGap = fontSize * (lh - 1); // extra space after last line
        const trimmedHeight = Math.max(fontSize, rawHeight - trailingGap);
        tb.set({ height: trimmedHeight });
        tb.setCoords();
    } finally {
        (tb as any).__autoShrinking = false;
    }
}

interface EventSetupParams {
    fc: Canvas;
    width: number;
    height: number;
    syncState: () => void;
    resyncZIndices: () => void;
    pushUndo: (label?: string) => void;
    guideLines: React.MutableRefObject<FabricObject[]>;
}

/** Setup all Fabric.js canvas events. Called once during canvas init. */
export function setupCanvasEvents({
    fc, width, height, syncState, resyncZIndices, pushUndo, guideLines,
}: EventSetupParams) {

    // ── Selection ──
    fc.on('selection:created', () => syncState());
    fc.on('selection:updated', () => syncState());
    fc.on('selection:cleared', () => syncState());

    // ★ REGRESSION GUARD: resync z-indices after transform
    fc.on('object:modified', () => {
        resyncZIndices();
        pushUndo('Transform element');
        clearGuideLines();
        syncState();
    });

    // ── Text scaling ──
    fc.on('object:scaling', (opt) => {
        const obj = opt.target;
        if (!obj || !(obj instanceof Textbox)) return;
        const corner = (obj as any).__corner;
        const isCorner = corner && ['tl', 'tr', 'bl', 'br'].includes(corner);
        if (isCorner) {
            const uniformScale = Math.max(obj.scaleX ?? 1, obj.scaleY ?? 1);
            const origFontSize = (obj as any).__glidOrigFontSize ?? obj.fontSize ?? 18;
            if (!(obj as any).__glidOrigFontSize) (obj as any).__glidOrigFontSize = obj.fontSize ?? 18;
            const newFontSize = Math.max(6, Math.min(400, Math.round(origFontSize * uniformScale)));
            const newWidth = (obj.width ?? 200) * (obj.scaleX ?? 1);
            obj.set({ fontSize: newFontSize, width: Math.max(20, newWidth), scaleX: 1, scaleY: 1 });
        } else {
            const newWidth = (obj.width ?? 200) * (obj.scaleX ?? 1);
            obj.set({ width: Math.max(20, newWidth), scaleX: 1, scaleY: 1 });
        }
    });

    // Reset original font size ref after scaling ends + auto-shrink
    fc.on('object:modified', (opt) => {
        if (opt.target instanceof Textbox) {
            delete (opt.target as any).__glidOrigFontSize;
            autoShrinkTextbox(opt.target);
        }
    });

    // ★ Auto-shrink during text editing (typing)
    fc.on('text:changed', (opt) => {
        if (opt.target instanceof Textbox) autoShrinkTextbox(opt.target);
    });

    // ── Object lifecycle ──
    fc.on('object:added', (opt) => {
        const obj = opt.target;
        if (obj && !(obj as any).__glidId && !isArtboard(obj) && !(obj as any).__aceGuide) {
            (obj as any).__glidId = nextId();
            (obj as any).__glidZIndex = fc.getObjects().filter(o => !isArtboard(o) && !(o as any).__aceGuide).length;
            patchAceProps(obj);
        }
        if (obj instanceof Textbox) {
            obj.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, mt: false, mb: false, ml: true, mr: true, mtr: false });
            if ((obj.scaleX ?? 1) !== 1 || (obj.scaleY ?? 1) !== 1) {
                obj.set({ width: Math.max(20, (obj.width ?? 200) * (obj.scaleX ?? 1)), scaleX: 1, scaleY: 1 });
            }
            // ★ On add: only trim trailing height gap. Do NOT shrink width here —
            // templates/restore set width intentionally and shrinking it corrupts sub-head positions.
            obj.initDimensions();
            const rawH = obj.calcTextHeight();
            const fs = obj.fontSize ?? 16;
            const lhVal = obj.lineHeight ?? 1.15;
            const gap = fs * (lhVal - 1);
            obj.set({ height: Math.max(fs, rawH - gap) });
            obj.setCoords();
        }
        if (!(obj as any)?.__aceGuide) pushUndo('Add element');
        syncState();
    });
    fc.on('object:removed', () => { resyncZIndices(); pushUndo('Remove element'); syncState(); });

    // ── Deselect on background click ──
    fc.on('mouse:down', (opt) => {
        const e = opt.e as MouseEvent;
        if (e.altKey || e.button === 1) return;
        if (!opt.target || isArtboard(opt.target)) {
            fc.discardActiveObject(); fc.renderAll(); syncState();
        }
    });

    // ── Smart guides ──
    fc.on('object:moving', (opt) => {
        const obj = opt.target;
        if (!obj || isArtboard(obj) || (obj as any).__aceGuide) return;
        const others = fc.getObjects()
            .filter(o => o !== obj && !isArtboard(o) && !(o as any).__aceGuide)
            .map(o => ({ x: o.left ?? 0, y: o.top ?? 0, w: (o.width ?? 0) * (o.scaleX ?? 1), h: (o.height ?? 0) * (o.scaleY ?? 1) }));
        const dragging = { x: obj.left ?? 0, y: obj.top ?? 0, w: (obj.width ?? 0) * (obj.scaleX ?? 1), h: (obj.height ?? 0) * (obj.scaleY ?? 1) };
        const result = snapToGuides(dragging, others, width, height, 6);
        if (result.x !== null) obj.set('left', result.x);
        if (result.y !== null) obj.set('top', result.y);
        renderGuideLines(result.guides);
    });
    fc.on('mouse:up', () => clearGuideLines());

    // ── Zoom (Ctrl+scroll) + Pan (scroll/trackpad) ──
    fc.on('mouse:wheel', (opt) => {
        const e = opt.e as WheelEvent;
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault(); e.stopPropagation();
            const zoomFactor = e.deltaY > 0 ? 0.975 : 1.025;
            let newZoom = (fc.getZoom() || 1) * zoomFactor;
            newZoom = Math.max(0.2, Math.min(4, newZoom));
            const vpt = fc.viewportTransform!;
            const screenCX = (width / 2) * vpt[0] + vpt[4];
            const screenCY = (height / 2) * vpt[3] + vpt[5];
            vpt[0] = newZoom; vpt[3] = newZoom;
            vpt[4] = screenCX - (width / 2) * newZoom;
            vpt[5] = screenCY - (height / 2) * newZoom;
            fc.setViewportTransform(vpt); fc.renderAll();
        } else {
            e.preventDefault(); e.stopPropagation();
            const vpt = fc.viewportTransform!;
            vpt[4] -= e.deltaX * 0.4; vpt[5] -= e.deltaY * 0.4;
            fc.setViewportTransform(vpt); fc.renderAll();
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

    // ── Guide line rendering helpers ──
    function renderGuideLines(guides: GuideLine[]) {
        for (const line of guideLines.current) fc.remove(line);
        guideLines.current = [];
        for (const g of guides) {
            const color = g.type === 'canvas-center' || g.type === 'center' ? '#67d5ff' : '#ff6b9d';
            const fabricLine = g.axis === 'vertical'
                ? new Line([g.position, 0, g.position, height], { stroke: color, strokeWidth: 1, selectable: false, evented: false, strokeDashArray: g.type === 'canvas-center' ? [4, 4] : undefined })
                : new Line([0, g.position, width, g.position], { stroke: color, strokeWidth: 1, selectable: false, evented: false, strokeDashArray: g.type === 'canvas-center' ? [4, 4] : undefined });
            (fabricLine as any).__aceGuide = true;
            fc.add(fabricLine);
            guideLines.current.push(fabricLine);
        }
        fc.renderAll();
    }

    function clearGuideLines() {
        for (const line of guideLines.current) fc.remove(line);
        guideLines.current = [];
        fc.renderAll();
    }
}
