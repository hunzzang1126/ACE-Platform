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
        exportPanelOpen: false,
        templateGalleryOpen: false,
        brandComplianceOpen: false,
        canvasRulerVisible: false,
        authModalOpen: false,
        keyframeInspectorOpen: false,
        designScoreOpen: false,
        activeSidebarTab: null,
        activeInlinePanel: null,
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

describe('uiStore — Extra Panel Toggles', () => {
    it('toggleExportPanel flips value', () => {
        expect(useUIStore.getState().exportPanelOpen).toBe(false);
        useUIStore.getState().toggleExportPanel();
        expect(useUIStore.getState().exportPanelOpen).toBe(true);
    });

    it('toggleTemplateGallery flips value', () => {
        expect(useUIStore.getState().templateGalleryOpen).toBe(false);
        useUIStore.getState().toggleTemplateGallery();
        expect(useUIStore.getState().templateGalleryOpen).toBe(true);
    });

    it('toggleBrandCompliance flips value', () => {
        expect(useUIStore.getState().brandComplianceOpen).toBe(false);
        useUIStore.getState().toggleBrandCompliance();
        expect(useUIStore.getState().brandComplianceOpen).toBe(true);
    });

    it('toggleCanvasRuler flips value', () => {
        expect(useUIStore.getState().canvasRulerVisible).toBe(false);
        useUIStore.getState().toggleCanvasRuler();
        expect(useUIStore.getState().canvasRulerVisible).toBe(true);
    });

    it('toggleAuthModal flips value', () => {
        expect(useUIStore.getState().authModalOpen).toBe(false);
        useUIStore.getState().toggleAuthModal();
        expect(useUIStore.getState().authModalOpen).toBe(true);
    });

    it('toggleKeyframeInspector flips value', () => {
        expect(useUIStore.getState().keyframeInspectorOpen).toBe(false);
        useUIStore.getState().toggleKeyframeInspector();
        expect(useUIStore.getState().keyframeInspectorOpen).toBe(true);
    });

    it('toggleDesignScore flips value', () => {
        expect(useUIStore.getState().designScoreOpen).toBe(false);
        useUIStore.getState().toggleDesignScore();
        expect(useUIStore.getState().designScoreOpen).toBe(true);
    });
});

describe('uiStore — Sidebar Tab', () => {
    it('toggleSidebarTab sets active tab', () => {
        useUIStore.getState().toggleSidebarTab('elements');
        expect(useUIStore.getState().activeSidebarTab).toBe('elements');
    });

    it('toggleSidebarTab same tab collapses to null', () => {
        useUIStore.setState({ activeSidebarTab: 'elements' });
        useUIStore.getState().toggleSidebarTab('elements');
        expect(useUIStore.getState().activeSidebarTab).toBeNull();
    });

    it('toggleSidebarTab closes inline panel', () => {
        useUIStore.setState({ activeInlinePanel: 'effects' });
        useUIStore.getState().toggleSidebarTab('elements');
        expect(useUIStore.getState().activeInlinePanel).toBeNull();
    });
});

describe('uiStore — Inline Panel', () => {
    it('setInlinePanel opens panel', () => {
        useUIStore.getState().setInlinePanel('animate');
        expect(useUIStore.getState().activeInlinePanel).toBe('animate');
    });

    it('setInlinePanel same panel toggles to null', () => {
        useUIStore.setState({ activeInlinePanel: 'animate' });
        useUIStore.getState().setInlinePanel('animate');
        expect(useUIStore.getState().activeInlinePanel).toBeNull();
    });

    it('setInlinePanel closes sidebar tab', () => {
        useUIStore.setState({ activeSidebarTab: 'elements' });
        useUIStore.getState().setInlinePanel('effects');
        expect(useUIStore.getState().activeSidebarTab).toBeNull();
    });

    it('setInlinePanel null restores sidebar tab', () => {
        useUIStore.setState({ activeSidebarTab: 'elements' });
        useUIStore.getState().setInlinePanel(null);
        expect(useUIStore.getState().activeSidebarTab).toBe('elements');
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
