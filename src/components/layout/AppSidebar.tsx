// ─────────────────────────────────────────────────
// AppSidebar — Wide sidebar with text labels (Figma-inspired)
// ─────────────────────────────────────────────────
import { type ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IcLayout, IcBolt } from '@/components/ui/Icons';
import { useAuthStore } from '@/stores/authStore';
import { SettingsPanel } from '@/components/panels/SettingsPanel';

const NAV_ITEMS: { icon: ReactNode; label: string; path: string }[] = [
    {
        icon: <IcLayout size={18} />,
        label: 'Projects',
        path: '/',
    },
    {
        icon: <IcBolt size={18} />,
        label: 'Activity',
        path: '/activity',
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
        ),
        label: 'Brand Kit',
        path: '/brand',
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="9" height="9" rx="1" />
                <rect x="13" y="2" width="9" height="9" rx="1" />
                <rect x="2" y="13" width="9" height="9" rx="1" />
                <rect x="13" y="13" width="9" height="9" rx="1" />
            </svg>
        ),
        label: 'Templates',
        path: '/templates',
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
        ),
        label: 'Trash',
        path: '/trash',
    },
];

export function AppSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const role = useAuthStore(s => s.role);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const displayName = user?.displayName ?? 'User';
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <>
            <aside className="sidebar">
                {/* Gradient Logo */}
                <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
                    <span className="sidebar-logo-text">Glid</span>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path === '/' && location.pathname === '/');
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="sidebar-icon">{item.icon}</span>
                                <span className="sidebar-label">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* User + Settings */}
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">{initials}</div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{displayName}</span>
                            <span className="sidebar-user-role">{role === 'admin' ? 'Admin' : 'User'}</span>
                        </div>
                        <button
                            onClick={() => setSettingsOpen(true)}
                            title="Settings"
                            style={{
                                background: 'none', border: 'none', color: '#86868b',
                                cursor: 'pointer', padding: 4, marginLeft: 'auto',
                                borderRadius: 6, display: 'flex', alignItems: 'center',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f7')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#86868b')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Settings slide-out */}
            <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </>
    );
}
