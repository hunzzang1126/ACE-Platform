// ─────────────────────────────────────────────────
// uiStore — Regression Tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

beforeEach(() => {
    useUIStore.setState({
        sidebarOpen: true,
        aiChatOpen: false,
        propertyPanelOpen: true,
        layerPanelOpen: true,
        notification: null,
    });
});

describe('uiStore — Panel Toggles', () => {
    it('toggleSidebar flips from true to false', () => {
        expect(useUIStore.getState().sidebarOpen).toBe(true);
        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('toggleSidebar flips from false to true', () => {
        useUIStore.setState({ sidebarOpen: false });
        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('toggleAIChat flips value', () => {
        expect(useUIStore.getState().aiChatOpen).toBe(false);
        useUIStore.getState().toggleAIChat();
        expect(useUIStore.getState().aiChatOpen).toBe(true);
    });

    it('togglePropertyPanel flips value', () => {
        expect(useUIStore.getState().propertyPanelOpen).toBe(true);
        useUIStore.getState().togglePropertyPanel();
        expect(useUIStore.getState().propertyPanelOpen).toBe(false);
    });

    it('toggleLayerPanel flips value', () => {
        expect(useUIStore.getState().layerPanelOpen).toBe(true);
        useUIStore.getState().toggleLayerPanel();
        expect(useUIStore.getState().layerPanelOpen).toBe(false);
    });
});

describe('uiStore — Notifications', () => {
    it('showNotification sets message and type', () => {
        useUIStore.getState().showNotification('Saved!', 'success');
        const notif = useUIStore.getState().notification;
        expect(notif).not.toBeNull();
        expect(notif!.message).toBe('Saved!');
        expect(notif!.type).toBe('success');
    });

    it('showNotification defaults to info type', () => {
        useUIStore.getState().showNotification('Hello');
        expect(useUIStore.getState().notification!.type).toBe('info');
    });

    it('dismissNotification clears notification', () => {
        useUIStore.getState().showNotification('Test');
        expect(useUIStore.getState().notification).not.toBeNull();
        useUIStore.getState().dismissNotification();
        expect(useUIStore.getState().notification).toBeNull();
    });

    it('showNotification replaces existing notification', () => {
        useUIStore.getState().showNotification('First', 'info');
        useUIStore.getState().showNotification('Second', 'error');
        expect(useUIStore.getState().notification!.message).toBe('Second');
        expect(useUIStore.getState().notification!.type).toBe('error');
    });
});
