// ─────────────────────────────────────────────────
// editorStore – Editor UI State
// ─────────────────────────────────────────────────
import { create } from 'zustand';

export type EditorLayer = 'dashboard' | 'general' | 'detail';
export type EditorTool = 'select' | 'shape' | 'text' | 'image' | 'video' | 'hand' | 'zoom';

interface EditorState {
    /** 현재 활성 레이어 (3-Layer Flow) */
    activeLayer: EditorLayer;
    /** 선택된 요소 ID 목록 */
    selectedElementIds: string[];
    /** 현재 편집 중인 배너 변형 ID (Detail Editor용) */
    activeVariantId: string | null;
    /** 줌 레벨 (1 = 100%) */
    zoom: number;
    /** 패닝 오프셋 */
    panX: number;
    panY: number;
    /** 활성 도구 */
    activeTool: EditorTool;

    // ── Actions ──
    setLayer: (layer: EditorLayer) => void;
    selectElements: (ids: string[]) => void;
    addToSelection: (id: string) => void;
    clearSelection: () => void;
    setActiveVariant: (variantId: string | null) => void;
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
    setTool: (tool: EditorTool) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
    activeLayer: 'dashboard',
    selectedElementIds: [],
    activeVariantId: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    activeTool: 'select',

    setLayer: (layer) => set({ activeLayer: layer }),

    selectElements: (ids) => set({ selectedElementIds: ids }),

    addToSelection: (id) =>
        set((s) => ({
            selectedElementIds: s.selectedElementIds.includes(id)
                ? s.selectedElementIds
                : [...s.selectedElementIds, id],
        })),

    clearSelection: () => set({ selectedElementIds: [] }),

    setActiveVariant: (variantId) => set({ activeVariantId: variantId }),

    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(zoom, 10)) }),

    setPan: (x, y) => set({ panX: x, panY: y }),

    setTool: (tool) => set({ activeTool: tool }),
}));
