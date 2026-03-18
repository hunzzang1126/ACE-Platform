// ─────────────────────────────────────────────────
// EditorSidebar — Canva-style icon strip + expandable panel
// ─────────────────────────────────────────────────
// Left sidebar: narrow icon strip (60px) + slide-out content panel (~280px).
// Each icon tab opens a different content panel (Templates, Elements, Text, etc.)
// Clicking the active tab again closes the panel.
// ─────────────────────────────────────────────────

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { SidebarTemplateTab } from './SidebarTemplateTab';
import { SidebarElementsTab } from './SidebarElementsTab';
import { SidebarTextTab } from './SidebarTextTab';
import { SidebarUploadsTab } from './SidebarUploadsTab';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

import type { ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface Props {
    engine?: Engine;
    actions?: CanvasEngineActions | null;
    onTriggerImageUpload?: () => void;
    onTriggerVideoUpload?: () => void;
}

// ── Tab definitions ──
interface TabDef {
    id: string;
    label: string;
    icon: ReactNode;
}

const TemplatesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="9" x2="9" y2="21" />
    </svg>
);

const ElementsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
);

const TextIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="12" y1="4" x2="12" y2="20" />
        <line x1="8" y1="20" x2="16" y2="20" />
    </svg>
);

const UploadsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const BrandIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12l2 2 4-4" />
    </svg>
);

const ProjectsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

const AiIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
    </svg>
);

const TABS: TabDef[] = [
    { id: 'templates', label: 'Templates', icon: <TemplatesIcon /> },
    { id: 'elements', label: 'Elements', icon: <ElementsIcon /> },
    { id: 'text', label: 'Text', icon: <TextIcon /> },
    { id: 'uploads', label: 'Uploads', icon: <UploadsIcon /> },
    { id: 'brand', label: 'Brand', icon: <BrandIcon /> },
    { id: 'projects', label: 'Projects', icon: <ProjectsIcon /> },
    { id: 'ai', label: 'AI', icon: <AiIcon /> },
];

export function EditorSidebar({ actions, onTriggerImageUpload, onTriggerVideoUpload }: Props) {
    const activeTab = useUIStore((s) => s.activeSidebarTab);
    const toggleTab = useUIStore((s) => s.toggleSidebarTab);

    const handleTabClick = useCallback((tabId: string) => {
        toggleTab(tabId);
    }, [toggleTab]);

    const isOpen = activeTab !== null;

    return (
        <div className="sidebar-root">
            {/* Icon strip — always visible */}
            <nav className="sidebar-icons">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`sidebar-icon-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab.id)}
                        title={tab.label}
                    >
                        <span className="sidebar-icon">{tab.icon}</span>
                        <span className="sidebar-icon-label">{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Expandable panel — slides in/out */}
            {isOpen && (
                <aside className="sidebar-panel">
                    <div className="sidebar-panel-header">
                        <h3 className="sidebar-panel-title">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </h3>
                        <button
                            className="sidebar-panel-close"
                            onClick={() => toggleTab(activeTab!)}
                            title="Close panel"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                    </div>
                    <div className="sidebar-panel-content">
                        {activeTab === 'templates' && <SidebarTemplateTab actions={actions} />}
                        {activeTab === 'elements' && <SidebarElementsTab actions={actions} />}
                        {activeTab === 'text' && <SidebarTextTab actions={actions} />}
                        {activeTab === 'uploads' && (
                            <SidebarUploadsTab
                                onTriggerImageUpload={onTriggerImageUpload}
                                onTriggerVideoUpload={onTriggerVideoUpload}
                            />
                        )}
                        {activeTab === 'brand' && (
                            <div className="sidebar-placeholder">
                                <p>Brand Kit</p>
                                <span>Guidelines, logos, colors, fonts</span>
                            </div>
                        )}
                        {activeTab === 'projects' && (
                            <div className="sidebar-placeholder">
                                <p>Projects</p>
                                <span>Your designs and folders</span>
                            </div>
                        )}
                        {activeTab === 'ai' && (
                            <div className="sidebar-placeholder">
                                <p>ACE AI</p>
                                <span>Auto-design, smart layout, brand check</span>
                            </div>
                        )}
                    </div>
                </aside>
            )}
        </div>
    );
}
