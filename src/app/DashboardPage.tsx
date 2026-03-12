// ─────────────────────────────────────────────────
// DashboardPage – Figma-inspired Project Dashboard
// ─────────────────────────────────────────────────
import { useCallback, useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import { useAuthStore } from '@/stores/authStore';
import { BANNER_PRESETS } from '@/schema/presets';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { IcFolder } from '@/components/ui/Icons';
import { APP_VERSION } from '@/version';

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

export function DashboardPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Auth store — dynamic user name
    const displayName = useAuthStore((s) => s.user?.displayName ?? '');
    const firstName = displayName?.split(' ')[0] || 'there';

    // Project store
    const creativeSets = useProjectStore((s) => s.creativeSets);
    const folders = useProjectStore((s) => s.folders);
    const currentFolderId = useProjectStore((s) => s.currentFolderId);
    const createCreativeSetProject = useProjectStore((s) => s.createCreativeSet);
    const navigateToFolder = useProjectStore((s) => s.navigateToFolder);

    // Design store
    const createCreativeSet = useDesignStore((s) => s.createCreativeSet);
    const openCreativeSet = useDesignStore((s) => s.openCreativeSet);

    // ── Sync: add NEW creative sets from designStore that projectStore doesn't know about ──
    // ★ REGRESSION GUARD: projectStore is AUTHORITATIVE for names, trash, and deletions.
    // NEVER overwrite names or remove items — only ADD missing entries.
    // ★★ CRITICAL: Must wait for IDB hydration to complete BEFORE syncing.
    //    IDB is async — stores start with defaults ([]) and hydrate later.
    //    If we sync before hydration, we add entries with stale names from designStore.
    useEffect(() => {
        let cancelled = false;

        // Wait for BOTH stores to finish IDB hydration
        const waitForHydration = async () => {
            // Zustand persist exposes onFinishHydration via the persist API
            const projectPersist = (useProjectStore as any).persist;
            const designPersist = (useDesignStore as any).persist;

            // If not yet hydrated, wait for hydration
            if (projectPersist?.hasHydrated && !projectPersist.hasHydrated()) {
                await new Promise<void>(resolve => {
                    const unsub = projectPersist.onFinishHydration(() => { unsub(); resolve(); });
                });
            }
            if (designPersist?.hasHydrated && !designPersist.hasHydrated()) {
                await new Promise<void>(resolve => {
                    const unsub = designPersist.onFinishHydration(() => { unsub(); resolve(); });
                });
            }

            if (cancelled) return;

            // NOW safe to sync — both stores have their persisted data
            const allCS = useDesignStore.getState().getAllCreativeSets();
            const trash = useProjectStore.getState().trash;
            const trashIds = new Set(trash.map(t => t.item.id));
            useProjectStore.setState((state) => {
                const existingIds = new Set(state.creativeSets.map(s => s.id));
                for (const cs of allCS) {
                    // Skip if already in projectStore or in trash
                    if (existingIds.has(cs.id) || trashIds.has(cs.id)) continue;
                    // Only ADD new entries — don't overwrite existing ones
                    state.creativeSets.push({
                        id: cs.id, name: cs.name, variantCount: cs.variants.length,
                        createdAt: cs.createdAt, updatedAt: cs.updatedAt, createdBy: displayName || 'User',
                    });
                }
                // Update variant counts only (not names!) for existing sets
                for (const cs of allCS) {
                    const existing = state.creativeSets.find(s => s.id === cs.id);
                    if (existing) {
                        existing.variantCount = cs.variants.length;
                        existing.updatedAt = cs.updatedAt;
                    }
                }
            });
        };

        waitForHydration();
        return () => { cancelled = true; };
    }, [displayName]);

    // ── Computed ──
    const { displaySets, displayFolders, totalSizes } = useMemo(() => {
        let sets = creativeSets.filter((s) =>
            currentFolderId ? s.folderId === currentFolderId : !s.folderId,
        );
        let flds = folders.filter((f) =>
            currentFolderId ? f.parentId === currentFolderId : !f.parentId,
        );
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            sets = sets.filter((s) => s.name.toLowerCase().includes(q));
            flds = flds.filter((f) => f.name.toLowerCase().includes(q));
        }
        const total = sets.reduce((sum, s) => sum + s.variantCount, 0);
        return { displaySets: sets, displayFolders: flds, totalSizes: total };
    }, [creativeSets, folders, currentFolderId, searchQuery]);

    // ── Handlers ──
    const handleNewCreativeSet = useCallback(() => {
        const defaultPreset = BANNER_PRESETS[0]!;
        const csId = createCreativeSet('Untitled Creative Set', defaultPreset);
        createCreativeSetProject('Untitled Creative Set');
        useProjectStore.setState((state) => {
            const last = state.creativeSets[state.creativeSets.length - 1];
            if (last) {
                state.creativeSets = state.creativeSets.filter(s => s.id !== last.id);
                state.creativeSets.push({ ...last, id: csId });
            }
        });
        navigate('/editor');
    }, [createCreativeSetProject, createCreativeSet, navigate]);

    const handleOpenSet = useCallback((id: string) => {
        const opened = openCreativeSet(id);
        if (opened) { navigate('/editor'); return; }
        const set = creativeSets.find((s) => s.id === id);
        if (set) {
            const defaultPreset = BANNER_PRESETS[0]!;
            const csId = createCreativeSet(set.name, defaultPreset);
            useProjectStore.setState((state) => {
                const entry = state.creativeSets.find(s => s.id === id);
                if (entry) entry.id = csId;
            });
            navigate('/editor');
        }
    }, [creativeSets, openCreativeSet, createCreativeSet, navigate]);

    const handleOpenFolder = useCallback((folderId: string) => {
        navigateToFolder(folderId);
    }, [navigateToFolder]);

    const isEmpty = displaySets.length === 0 && displayFolders.length === 0;

    return (
        <div className="dashboard-layout">
            <AppSidebar />
            <main className="dashboard-main">
                {/* Hero Greeting — glassmorphism card */}
                <section className="dashboard-hero">
                    <div className="dashboard-hero__glass">
                        <div className="dashboard-hero__content">
                            <h1 className="dashboard-hero__title">
                                <span className="dashboard-hero__greeting">{getGreeting()}</span>, {firstName}
                            </h1>
                            <p className="dashboard-hero__subtitle">
                                {creativeSets.length} project{creativeSets.length !== 1 ? 's' : ''} · {totalSizes} size{totalSizes !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button className="dashboard-hero__cta" onClick={handleNewCreativeSet}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" />
                            </svg>
                            New Project
                        </button>
                    </div>
                    <div className="dashboard-hero__orb dashboard-hero__orb--1" />
                    <div className="dashboard-hero__orb dashboard-hero__orb--2" />
                </section>

                {/* Search */}
                <div className="dashboard-search-bar">
                    <svg className="dashboard-search-bar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="dashboard-search-bar__input"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Content */}
                <div className="dashboard-content">
                    {/* Folders */}
                    {displayFolders.length > 0 && (
                        <div className="dashboard-section">
                            <h2 className="dashboard-section__title">Folders</h2>
                            <div className="project-grid">
                                {displayFolders.map(folder => (
                                    <div key={folder.id} className="folder-card" onDoubleClick={() => handleOpenFolder(folder.id)}>
                                        <div className="folder-card__icon"><IcFolder size={24} /></div>
                                        <span className="folder-card__name">{folder.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Projects */}
                    <div className="dashboard-section">
                        <h2 className="dashboard-section__title">
                            {currentFolderId ? 'Projects' : 'All Projects'}
                        </h2>
                        {isEmpty ? (
                            <div className="dashboard-empty">
                                <div className="dashboard-empty__icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                                    </svg>
                                </div>
                                <p>No projects yet</p>
                                <button className="dashboard-empty__btn" onClick={handleNewCreativeSet}>
                                    Create your first project
                                </button>
                            </div>
                        ) : (
                            <div className="project-grid">
                                {displaySets.map(set => (
                                    <ProjectCard
                                        key={set.id}
                                        id={set.id}
                                        name={set.name}
                                        variantCount={set.variantCount}
                                        createdAt={set.createdAt}
                                        createdBy={set.createdBy}
                                        type="set"
                                        onOpen={handleOpenSet}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Version Footer */}
                <footer className="dashboard-footer">
                    <span className="dashboard-footer__version">{APP_VERSION}</span>
                </footer>
            </main>
        </div>
    );
}
