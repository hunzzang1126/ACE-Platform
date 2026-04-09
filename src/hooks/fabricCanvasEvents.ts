// ─────────────────────────────────────────────────
// fabricCanvasEvents — Canvas event setup for Fabric.js
// ─────────────────────────────────────────────────
// Registers all Fabric.js canvas events: selection, scaling,
// object lifecycle, zoom/pan, smart guides.
// ─────────────────────────────────────────────────

import { Canvas, Textbox, FabricObject, Line, Shadow } from 'fabric';
import { nextId, isArtboard, patchAceProps } from './fabricHelpers';
import { snapToGuides, type GuideLine } from './useFabricGuides';

// ★ autoShrinkTextbox REMOVED (v407-v408).
// Fabric.js Textbox computes height internally from content+width.
// Manual height/width override caused premature word-wrap and layout conflicts.
// See: text_wrapping_postmortem.md for full analysis.

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
            // ★ Uniform scale: lock aspect ratio on corner drag (like shapes/images)
            const sx = obj.scaleX ?? 1;
            const sy = obj.scaleY ?? 1;
            // Use the axis with greater change as the uniform factor
            const uniformScale = Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy;
            // Force both axes to the same scale (prevents distortion)
            obj.set({ scaleX: uniformScale, scaleY: uniformScale });

            const origFontSize = (obj as any).__glidOrigFontSize ?? obj.fontSize ?? 18;
            if (!(obj as any).__glidOrigFontSize) (obj as any).__glidOrigFontSize = obj.fontSize ?? 18;
            const newFontSize = Math.max(6, Math.min(400, Math.round(origFontSize * uniformScale)));
            const newWidth = (obj.width ?? 200) * uniformScale;
            obj.set({ fontSize: newFontSize, width: Math.max(20, newWidth), scaleX: 1, scaleY: 1 });
        } else {
            // Side handles (ml/mr): only adjust width, no font size change
            const newWidth = (obj.width ?? 200) * (obj.scaleX ?? 1);
            obj.set({ width: Math.max(20, newWidth), scaleX: 1, scaleY: 1 });
        }
    });

    // Reset original font size ref after scaling ends
    fc.on('object:modified', (opt) => {
        if (opt.target instanceof Textbox) {
            delete (opt.target as any).__glidOrigFontSize;
        }
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
            obj.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, mt: false, mb: false, ml: true, mr: true, mtr: true });
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

    // ── Figma-style transform badges (rotation + dimensions) ──
    let transformMode: 'none' | 'rotating' | 'scaling' = 'none';

    fc.on('object:rotating', () => { transformMode = 'rotating'; });
    fc.on('object:scaling', () => { transformMode = 'scaling'; });
    fc.on('object:modified', () => { transformMode = 'none'; });
    fc.on('mouse:up', () => { transformMode = 'none'; });

    fc.on('after:render', () => {
        const ctx = (fc as any).contextTop as CanvasRenderingContext2D | null;
        if (!ctx) return;

        // ★ Always clear contextTop to remove stale badge renders
        const upperEl = ctx.canvas;
        ctx.clearRect(0, 0, upperEl.width, upperEl.height);

        if (transformMode === 'none') return;
        const obj = fc.getActiveObject();
        if (!obj || isArtboard(obj)) return;

        const vpt = fc.viewportTransform!;
        const zoom = vpt[0];
        // Fabric v6: getBoundingRect() returns coords in canvas space (before viewport)
        const br = obj.getBoundingRect();
        const screenX = br.left * zoom + vpt[4];
        const screenY = br.top * zoom + vpt[5];
        const screenW = br.width * zoom;
        const screenH = br.height * zoom;
        const centerX = screenX + screenW / 2;

        // Badge style
        const fontSize = 11;
        const paddingH = 7;
        const paddingV = 3;
        const radius = 4;
        const bgColor = '#0D99FF';
        ctx.save();
        ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;

        let text = '';
        let badgeY = 0;

        if (transformMode === 'rotating') {
            const angle = Math.round((obj.angle ?? 0) % 360);
            text = `${angle >= 0 ? angle : 360 + angle}\u00B0`;
            badgeY = screenY - 12; // above the object
        } else {
            // Scaling — show actual pixel dimensions
            const w = Math.round((obj.width ?? 0) * (obj.scaleX ?? 1));
            const h = Math.round((obj.height ?? 0) * (obj.scaleY ?? 1));
            text = `${w} \u00D7 ${h}`;
            badgeY = screenY + screenH + 8; // below the object
        }

        const metrics = ctx.measureText(text);
        const badgeW = metrics.width + paddingH * 2;
        const badgeH = fontSize + paddingV * 2;
        const badgeX = centerX - badgeW / 2;

        // Draw rounded rect background
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, centerX, badgeY + badgeH / 2);
        ctx.restore();
    });
}

