// ─────────────────────────────────────────────────
// Canvas Types — Shared type definitions for engine hooks
// ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Engine = any;

export interface SelectionBounds { x: number; y: number; w: number; h: number }

/** Node info returned by engine.get_all_nodes() */
export interface EngineNode {
    id: number;
    type: 'rect' | 'rounded_rect' | 'ellipse';
    x: number;
    y: number;
    w: number;
    h: number;
    opacity: number;
    z_index: number;
    fill_r: number;
    fill_g: number;
    fill_b: number;
    fill_a: number;
    border_radius: number;
}

export interface CanvasEngineState {
    status: 'loading' | 'ready' | 'error' | 'no-webgpu';
    errorMsg: string;
    selection: number[];
    canUndo: boolean;
    canRedo: boolean;
    nodeCount: number;
    nodes: EngineNode[];
}

export interface CanvasEngineActions {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    addRect: (x?: number, y?: number) => number | null;
    addEllipse: (x?: number, y?: number) => number | null;
    addRoundedRect: (x?: number, y?: number) => number | null;
    deleteSelected: () => void;
    selectNode: (id: number) => void;
    deselectAll: () => void;
    setNodePosition: (id: number, x: number, y: number) => void;
    setNodeSize: (id: number, w: number, h: number) => void;
    setNodeOpacity: (id: number, opacity: number) => void;
    setFillColor: (id: number, r: number, g: number, b: number, a: number) => void;
    // Z-index / layer order
    bringToFront: (id: number) => void;
    sendToBack: (id: number) => void;
    bringForward: (id: number) => void;
    sendBackward: (id: number) => void;
    // Effects
    setShadow: (id: number, offsetX: number, offsetY: number, blur: number, r: number, g: number, b: number, a: number) => void;
    removeShadow: (id: number) => void;
    setBlendMode: (id: number, mode: string) => void;
    setBrightness: (id: number, v: number) => void;
    setContrast: (id: number, v: number) => void;
    setSaturation: (id: number, v: number) => void;
    setHueRotate: (id: number, deg: number) => void;
    // Keyframe
    addKeyframe: (nodeId: number, property: string, time: number, value: number, easing: string) => void;
    // Duplicate
    duplicateSelected: () => number | null;
    // Undo / Redo
    undo: () => void;
    redo: () => void;
    // Alignment to canvas
    alignToCanvas: (id: number, alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
    // Canvas dimensions (for alignment)
    canvasWidth: number;
    canvasHeight: number;
}

export interface UseCanvasEngineResult {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    overlayRef: React.RefObject<HTMLCanvasElement | null>;
    engineRef: React.RefObject<Engine | null>;
    state: CanvasEngineState;
    actions: CanvasEngineActions;
    syncState: () => void;
    /** Manually trigger engine re-initialization (e.g. after error/timeout) */
    retryInit: () => void;
}
