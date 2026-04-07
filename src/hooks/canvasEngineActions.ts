// ─────────────────────────────────────────────────
// canvasEngineActions — Action creators for canvas engine
// ─────────────────────────────────────────────────

import { useCallback } from 'react';
import type { EngineNode, Engine } from './canvasTypes';

// Color palette for new shapes
const SHAPE_COLORS: [number, number, number][] = [
    [0.33, 0.55, 1.0], [0.16, 0.82, 0.63], [0.94, 0.36, 0.60],
    [1.0, 0.65, 0.0], [0.60, 0.40, 0.90], [0.20, 0.75, 0.85], [0.95, 0.85, 0.20],
];
let colorIdx = 0;
function nextColor(): [number, number, number] { const c = SHAPE_COLORS[colorIdx % SHAPE_COLORS.length]!; colorIdx++; return c; }

/** Create all canvas engine action callbacks */
export function useCanvasEngineActions(
    engineRef: React.RefObject<Engine | null>,
    width: number, height: number,
    nodes: EngineNode[], selection: number[],
    syncState: () => void,
) {
    const addRect = useCallback((x?: number, y?: number): number | null => {
        const e = engineRef.current; if (!e) return null;
        const [r, g, b] = nextColor();
        const id = e.add_rect(x ?? width / 2 - 60, y ?? height / 2 - 40, 120, 80, r, g, b, 0.9);
        e.select(id); syncState(); return id;
    }, [width, height, syncState]);

    const addRoundedRect = useCallback((x?: number, y?: number): number | null => {
        const e = engineRef.current; if (!e) return null;
        const [r, g, b] = nextColor();
        const id = e.add_rounded_rect(x ?? width / 2 - 60, y ?? height / 2 - 40, 120, 80, r, g, b, 0.9, 12.0);
        e.select(id); syncState(); return id;
    }, [width, height, syncState]);

    const addEllipse = useCallback((x?: number, y?: number): number | null => {
        const e = engineRef.current; if (!e) return null;
        const [r, g, b] = nextColor();
        const id = e.add_ellipse(x ?? width / 2, y ?? height / 2, 60, 50, r, g, b, 0.9);
        e.select(id); syncState(); return id;
    }, [width, height, syncState]);

    const deleteSelected = useCallback(() => { const e = engineRef.current; if (!e) return; e.delete_selected(); syncState(); }, [syncState]);
    const selectNode = useCallback((id: number) => { const e = engineRef.current; if (!e) return; e.select(id); syncState(); }, [syncState]);
    const deselectAll = useCallback(() => { const e = engineRef.current; if (!e) return; e.deselect_all(); syncState(); }, [syncState]);
    const setNodePosition = useCallback((id: number, x: number, y: number) => { const e = engineRef.current; if (!e) return; try { e.set_position(id, x, y); } catch { /* */ } }, []);
    const setNodeSize = useCallback((id: number, w: number, h: number) => { const e = engineRef.current; if (!e) return; try { e.set_size(id, w, h); } catch { /* */ } }, []);
    const setNodeOpacity = useCallback((id: number, o: number) => { const e = engineRef.current; if (!e) return; try { e.set_opacity(id, o); } catch { /* */ } }, []);
    const setFillColor = useCallback((id: number, r: number, g: number, b: number, a: number) => { const e = engineRef.current; if (!e) return; try { e.set_fill_color(id, r, g, b, a); } catch { /* */ } syncState(); }, [syncState]);

    // Z-order
    const bringToFront = useCallback((id: number) => { const e = engineRef.current; if (!e) return; const maxZ = nodes.reduce((m, n) => Math.max(m, n.z_index), 0); try { e.set_z_index_and_reorder(id, maxZ + 1); } catch { /* */ } syncState(); }, [nodes, syncState]);
    const sendToBack = useCallback((id: number) => { const e = engineRef.current; if (!e) return; const minZ = nodes.reduce((m, n) => Math.min(m, n.z_index), 0); try { e.set_z_index_and_reorder(id, minZ - 1); } catch { /* */ } syncState(); }, [nodes, syncState]);
    const bringForward = useCallback((id: number) => { const e = engineRef.current; if (!e) return; const n = nodes.find(n => n.id === id); if (!n) return; try { e.set_z_index_and_reorder(id, n.z_index + 1); } catch { /* */ } syncState(); }, [nodes, syncState]);
    const sendBackward = useCallback((id: number) => { const e = engineRef.current; if (!e) return; const n = nodes.find(n => n.id === id); if (!n) return; try { e.set_z_index_and_reorder(id, n.z_index - 1); } catch { /* */ } syncState(); }, [nodes, syncState]);

    // Effects
    const setShadow = useCallback((id: number, ox: number, oy: number, blur: number, r: number, g: number, b: number, a: number) => { const e = engineRef.current; if (!e) return; try { e.set_shadow(id, ox, oy, blur, r, g, b, a); } catch { /* */ } }, []);
    const removeShadow = useCallback((id: number) => { const e = engineRef.current; if (!e) return; try { e.remove_shadow(id); } catch { /* */ } }, []);
    const setBlendMode = useCallback((id: number, m: string) => { const e = engineRef.current; if (!e) return; try { e.set_blend_mode(id, m); } catch { /* */ } }, []);
    const setBrightness = useCallback((id: number, v: number) => { const e = engineRef.current; if (!e) return; try { e.set_brightness(id, v); } catch { /* */ } }, []);
    const setContrast = useCallback((id: number, v: number) => { const e = engineRef.current; if (!e) return; try { e.set_contrast(id, v); } catch { /* */ } }, []);
    const setSaturation = useCallback((id: number, v: number) => { const e = engineRef.current; if (!e) return; try { e.set_saturation(id, v); } catch { /* */ } }, []);
    const setHueRotate = useCallback((id: number, deg: number) => { const e = engineRef.current; if (!e) return; try { e.set_hue_rotate(id, deg); } catch { /* */ } }, []);
    const addKeyframe = useCallback((nodeId: number, property: string, time: number, value: number, easing: string) => { const e = engineRef.current; if (!e) return; try { e.add_keyframe(nodeId, property, time, value, easing); } catch { /* */ } }, []);

    // Duplicate
    const duplicateSelected = useCallback((): number | null => {
        const e = engineRef.current; if (!e || selection.length === 0) return null;
        const node = nodes.find(n => n.id === selection[0]); if (!node) return null;
        const [r, g, b] = nextColor();
        let newId: number | null = null;
        try {
            if (node.type === 'ellipse') newId = e.add_ellipse(node.x + 20, node.y + 20, node.w / 2, node.h / 2, r, g, b, node.opacity);
            else if (node.type === 'rounded_rect') newId = e.add_rounded_rect(node.x + 20, node.y + 20, node.w, node.h, r, g, b, node.opacity, 12.0);
            else newId = e.add_rect(node.x + 20, node.y + 20, node.w, node.h, r, g, b, node.opacity);
            if (newId != null) e.select(newId);
        } catch { /* */ }
        syncState(); return newId;
    }, [selection, nodes, syncState]);



    // Alignment
    const alignToCanvas = useCallback((id: number, alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
        const e = engineRef.current; if (!e) return;
        const node = nodes.find(n => n.id === id); if (!node) return;
        let x = node.x, y = node.y;
        switch (alignment) { case 'left': x = 0; break; case 'center-h': x = (width - node.w) / 2; break; case 'right': x = width - node.w; break; case 'top': y = 0; break; case 'center-v': y = (height - node.h) / 2; break; case 'bottom': y = height - node.h; break; }
        try { e.set_position(id, x, y); } catch { /* */ }
        syncState();
    }, [nodes, width, height, syncState]);

    return {
        addRect, addRoundedRect, addEllipse,
        deleteSelected, selectNode, deselectAll,
        setNodePosition, setNodeSize, setNodeOpacity, setFillColor,
        bringToFront, sendToBack, bringForward, sendBackward,
        setShadow, removeShadow, setBlendMode,
        setBrightness, setContrast, setSaturation, setHueRotate,
        addKeyframe, duplicateSelected, alignToCanvas,

    };
}
