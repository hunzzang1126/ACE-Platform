// ─────────────────────────────────────────────────
// EditorSidebar — Canva-style icon strip + expandable panel
// ─────────────────────────────────────────────────
// Left sidebar: narrow icon strip (60px) + slide-out content panel (~280px).
// Each icon tab opens a different content panel (Templates, Elements, Text, etc.)
// Clicking the active tab again closes the panel.
// ★ Inline panels (Effects/Animate/Position) override the sidebar panel when active.
// ─────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { SidebarTemplateTab } from './SidebarTemplateTab';
import { SidebarElementsTab } from './SidebarElementsTab';
import { SidebarTextTab } from './SidebarTextTab';
import { SidebarUploadsTab } from './SidebarUploadsTab';
import { SidebarBrandTab } from './SidebarBrandTab';
import { SidebarProjectsTab } from './SidebarProjectsTab';
import { InlineEffectsPanel } from './InlineEffectsPanel';
import { InlineAnimatePanel } from './InlineAnimatePanel';
import { InlinePositionPanel } from './InlinePositionPanel';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import type { CanvasEngineActions, EngineNode } from '@/hooks/canvasTypes';
import { useAppI18n } from '@/i18n';

import type { ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface Props {
    engine?: Engine;
    actions?: CanvasEngineActions | null;
    nodes?: EngineNode[];
    selection?: number[];
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

export function EditorSidebar({ actions, nodes = [], selection = [], onTriggerImageUpload, onTriggerVideoUpload }: Props) {
    const activeTab = useUIStore((s) => s.activeSidebarTab);
    const toggleTab = useUIStore((s) => s.toggleSidebarTab);
    const activeInlinePanel = useUIStore((s) => s.activeInlinePanel);
    const setInlinePanel = useUIStore((s) => s.setInlinePanel);
    const { limits } = usePlanLimits();
    const brandCloudEnabled = limits.brandCloudEnabled;
    const [showUpgrade, setShowUpgrade] = useState(false);
    const { t } = useAppI18n();

    const TAB_LABELS: Record<string, string> = {
        templates: t('editor.sidebarTemplates'), elements: t('editor.sidebarElements'),
        text: t('editor.sidebarText'), uploads: t('editor.sidebarUploads'),
        brand: t('editor.sidebarBrand'), projects: t('editor.sidebarProjects'), ai: 'AI',
    };

    const handleTabClick = useCallback((tabId: string) => {
        toggleTab(tabId);
    }, [toggleTab]);

    // Selected node for inline panels
    const selectedNode = nodes.find((n) => selection.includes(n.id)) ?? null;

    const isOpen = activeTab !== null || activeInlinePanel !== null;

    // ── Determine panel title ──
    const panelTitle = activeInlinePanel
        ? (activeInlinePanel === 'effects' ? t('editor.effects') : activeInlinePanel === 'animate' ? t('editor.animate') : t('editor.position'))
        : TAB_LABELS[activeTab ?? ''] ?? activeTab;

    return (
        <div className="sidebar-root">
            {/* Icon strip — always visible */}
            <nav className="sidebar-icons">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`sidebar-icon-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab.id)}
                        title={TAB_LABELS[tab.id] || tab.label}
                    >
                        <span className="sidebar-icon">{tab.icon}</span>
                        <span className="sidebar-icon-label">{TAB_LABELS[tab.id] || tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Expandable panel — slides in/out */}
            {isOpen && (
                <aside className="sidebar-panel">
                    {/* Header — only for sidebar tabs (inline panels have their own) */}
                    {activeTab && !activeInlinePanel && (
                        <div className="sidebar-panel-header">
                            <h3 className="sidebar-panel-title">{panelTitle}</h3>
                            <button
                                className="sidebar-panel-close"
                                onClick={() => toggleTab(activeTab)}
                                title="Close panel"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                            </button>
                        </div>
                    )}
                    <div className="sidebar-panel-content">
                        {/* ── Inline panels (from context toolbar) ── */}
                        {activeInlinePanel === 'effects' && (
                            <InlineEffectsPanel
                                selectedNode={selectedNode}
                                actions={actions ?? null}
                                onClose={() => setInlinePanel(null)}
                            />
                        )}
                        {activeInlinePanel === 'animate' && (
                            <InlineAnimatePanel
                                selectedNode={selectedNode}
                                onClose={() => setInlinePanel(null)}
                            />
                        )}
                        {activeInlinePanel === 'position' && (
                            <InlinePositionPanel
                                selectedNode={selectedNode}
                                actions={actions ?? null}
                                onClose={() => setInlinePanel(null)}
                            />
                        )}

                        {/* ── Sidebar tabs ── */}
                        {!activeInlinePanel && activeTab === 'templates' && <SidebarTemplateTab actions={actions} />}
                        {!activeInlinePanel && activeTab === 'elements' && <SidebarElementsTab actions={actions} />}
                        {!activeInlinePanel && activeTab === 'text' && <SidebarTextTab actions={actions} />}
                        {!activeInlinePanel && activeTab === 'uploads' && (
                            <SidebarUploadsTab
                                onTriggerImageUpload={onTriggerImageUpload}
                                onTriggerVideoUpload={onTriggerVideoUpload}
                                onImageSelect={(blobUrl, entry) => {
                                    if (actions?.addImage) {
                                        // ★ Fill to Page by default: pass canvas dimensions
                                        // so addImage uses cover-mode scaling (uniform, centered).
                                        actions.addImage(0, 0, blobUrl, actions.canvasWidth, actions.canvasHeight, entry.idbRef);
                                    }
                                }}
                            />
                        )}
                        {!activeInlinePanel && activeTab === 'brand' && (
                            brandCloudEnabled
                                ? <SidebarBrandTab actions={actions} />
                                : <BrandLockedPlaceholder onUpgrade={() => setShowUpgrade(true)} />
                        )}
                        <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} reason="brand_cloud" />
                        {!activeInlinePanel && activeTab === 'projects' && <SidebarProjectsTab />}
                        {!activeInlinePanel && activeTab === 'ai' && (
                            <div className="sidebar-placeholder">
                                <p>ACE AI</p>
                                <span>{t('editor.aiSidebarHint')}</span>
                            </div>
                        )}
                    </div>
                </aside>
            )}
        </div>
    );
}

// ── Brand Kit locked placeholder for non-enterprise users ──
function BrandLockedPlaceholder({ onUpgrade }: { onUpgrade: () => void }) {
    const { t } = useAppI18n();
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: '40px 20px', textAlign: 'center',
        }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #71717a)" strokeWidth="1.2" strokeLinecap="round" opacity="0.4">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #e4e4e7)', margin: 0 }}>
                {t('editor.sidebarBrand')}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted, #71717a)', margin: 0, lineHeight: 1.5 }}>
                {t('editor.brandLockedHint')}
            </p>
            <button
                onClick={onUpgrade}
                style={{
                    marginTop: 4, padding: '8px 20px',
                    background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
                {t('editor.upgradeEnterprise')}
            </button>
        </div>
    );
}
