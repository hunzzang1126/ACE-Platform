// ─────────────────────────────────────────────────
// SidebarProjectsTab — Creative sets from designStore
// ─────────────────────────────────────────────────

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';
import { useProjectStore } from '@/stores/projectStore';

export function SidebarProjectsTab() {
    const getAllCreativeSets = useDesignStore((s) => s.getAllCreativeSets);
    const openCreativeSet = useDesignStore((s) => s.openCreativeSet);
    const activeId = useDesignStore((s) => s.activeCreativeSetId);
    const trashedIds = useProjectStore((s) => new Set(s.trash.map((t) => t.item.id)));
    const navigate = useNavigate();

    // Filter out trashed items — they exist in designStore but should not show
    const sets = useMemo(() => {
        return getAllCreativeSets().filter((cs) => !trashedIds.has(cs.id));
    }, [getAllCreativeSets, trashedIds]);

    const handleSwitch = useCallback((id: string) => {
        const ok = openCreativeSet(id);
        if (ok) navigate('/editor');
    }, [openCreativeSet, navigate]);

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
                        className={`sidebar-project-card${cs.id === activeId ? ' active' : ''}`}
                        onClick={() => handleSwitch(cs.id)}
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
