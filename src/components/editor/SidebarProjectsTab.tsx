// ─────────────────────────────────────────────────
// SidebarProjectsTab — Creative sets from designStore
// ─────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';

export function SidebarProjectsTab() {
    const getAllCreativeSets = useDesignStore((s) => s.getAllCreativeSets);
    const navigate = useNavigate();

    const sets = useMemo(() => getAllCreativeSets(), [getAllCreativeSets]);

    if (sets.length === 0) {
        return (
            <div className="sidebar-placeholder">
                <p>No projects yet</p>
                <span>Create a design from the dashboard to see it here.</span>
            </div>
        );
    }

    return (
        <div className="sidebar-projects">
            <p className="sidebar-section-label">Your designs</p>
            <div className="sidebar-project-list">
                {sets.map((cs) => (
                    <button
                        key={cs.id}
                        className="sidebar-project-card"
                        onClick={() => navigate(`/editor/sizes/${cs.id}`)}
                    >
                        <div className="sidebar-project-info">
                            <span className="sidebar-project-name">{cs.name}</span>
                            <span className="sidebar-project-meta">
                                {cs.variants.length} variant{cs.variants.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
