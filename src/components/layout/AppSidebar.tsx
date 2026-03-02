// ─────────────────────────────────────────────────
// AppSidebar — Wide sidebar with text labels (Figma-inspired)
// ─────────────────────────────────────────────────
import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IcLayout, IcBolt, IcFolder } from '@/components/ui/Icons';

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

    return (
        <aside className="sidebar">
            {/* Gradient Logo */}
            <div className="sidebar-logo" onClick={() => navigate('/')}>
                <span className="sidebar-logo-text">ACE</span>
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

            {/* User */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">YA</div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name">Young An</span>
                        <span className="sidebar-user-role">Admin</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
