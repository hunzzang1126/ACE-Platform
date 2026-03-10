// ─────────────────────────────────────────────────
// uiStore – Global UI State
// ─────────────────────────────────────────────────
import { create } from 'zustand';

interface UIState {
    sidebarOpen: boolean;
    aiChatOpen: boolean;
    propertyPanelOpen: boolean;
    layerPanelOpen: boolean;
    /** New panels */
    exportPanelOpen: boolean;
    templateGalleryOpen: boolean;
    brandComplianceOpen: boolean;
    canvasRulerVisible: boolean;
    authModalOpen: boolean;
    keyframeInspectorOpen: boolean;
    /** 글로벌 알림 메시지 */
    notification: { message: string; type: 'info' | 'success' | 'warning' | 'error' } | null;

    toggleSidebar: () => void;
    toggleAIChat: () => void;
    togglePropertyPanel: () => void;
    toggleLayerPanel: () => void;
    toggleExportPanel: () => void;
    toggleTemplateGallery: () => void;
    toggleBrandCompliance: () => void;
    toggleCanvasRuler: () => void;
    toggleAuthModal: () => void;
    toggleKeyframeInspector: () => void;
    showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    dismissNotification: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
    sidebarOpen: true,
    aiChatOpen: false,
    propertyPanelOpen: true,
    layerPanelOpen: true,
    exportPanelOpen: false,
    templateGalleryOpen: false,
    brandComplianceOpen: false,
    canvasRulerVisible: false,
    authModalOpen: false,
    keyframeInspectorOpen: false,
    notification: null,

    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    toggleAIChat: () => set((s) => ({ aiChatOpen: !s.aiChatOpen })),
    togglePropertyPanel: () => set((s) => ({ propertyPanelOpen: !s.propertyPanelOpen })),
    toggleLayerPanel: () => set((s) => ({ layerPanelOpen: !s.layerPanelOpen })),
    toggleExportPanel: () => set((s) => ({ exportPanelOpen: !s.exportPanelOpen })),
    toggleTemplateGallery: () => set((s) => ({ templateGalleryOpen: !s.templateGalleryOpen })),
    toggleBrandCompliance: () => set((s) => ({ brandComplianceOpen: !s.brandComplianceOpen })),
    toggleCanvasRuler: () => set((s) => ({ canvasRulerVisible: !s.canvasRulerVisible })),
    toggleAuthModal: () => set((s) => ({ authModalOpen: !s.authModalOpen })),
    toggleKeyframeInspector: () => set((s) => ({ keyframeInspectorOpen: !s.keyframeInspectorOpen })),

    showNotification: (message, type = 'info') => set({ notification: { message, type } }),
    dismissNotification: () => set({ notification: null }),
}));

