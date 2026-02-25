// ─────────────────────────────────────────────────
// uiStore – Global UI State
// ─────────────────────────────────────────────────
import { create } from 'zustand';

interface UIState {
    sidebarOpen: boolean;
    aiChatOpen: boolean;
    propertyPanelOpen: boolean;
    layerPanelOpen: boolean;
    /** 글로벌 알림 메시지 */
    notification: { message: string; type: 'info' | 'success' | 'warning' | 'error' } | null;

    toggleSidebar: () => void;
    toggleAIChat: () => void;
    togglePropertyPanel: () => void;
    toggleLayerPanel: () => void;
    showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    dismissNotification: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
    sidebarOpen: true,
    aiChatOpen: false,
    propertyPanelOpen: true,
    layerPanelOpen: true,
    notification: null,

    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    toggleAIChat: () => set((s) => ({ aiChatOpen: !s.aiChatOpen })),
    togglePropertyPanel: () => set((s) => ({ propertyPanelOpen: !s.propertyPanelOpen })),
    toggleLayerPanel: () => set((s) => ({ layerPanelOpen: !s.layerPanelOpen })),

    showNotification: (message, type = 'info') => set({ notification: { message, type } }),
    dismissNotification: () => set({ notification: null }),
}));
