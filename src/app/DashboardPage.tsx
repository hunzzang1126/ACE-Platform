// ─────────────────────────────────────────────────
// DashboardPage – Figma-inspired Project Dashboard
// ─────────────────────────────────────────────────
import { useCallback, useMemo, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import { useAuthStore } from '@/stores/authStore';
import { BANNER_PRESETS } from '@/schema/presets';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { IcFolder } from '@/components/ui/Icons';
import { APP_VERSION } from '@/version';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { UpgradeModal, type UpgradeReason } from '@/components/billing/UpgradeModal';
import { useCloudSync } from '@/hooks/useCloudSync';
import { CloudSyncIndicator } from '@/components/dashboard/CloudSyncIndicator';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { PlanStatusBar } from '@/components/dashboard/PlanStatusBar';
import { useAppI18n } from '@/i18n';





function getGreetingKey(): string {
    const h = new Date().getHours();
    if (h < 12) return 'dash.goodMorning';
    if (h < 18) return 'dash.goodAfternoon';
    return 'dash.goodEvening';
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { t } = useAppI18n();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('ace-dashboard-view') as 'grid' | 'list') || 'grid';
    });
    const handleViewChange = useCallback((mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('ace-dashboard-view', mode);
    }, []);
    const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

    // ★ Auto-refresh session after Stripe checkout success
    const syncSession = useAuthStore(s => s.syncSessionFromSupabase);
    useEffect(() => {
        if (searchParams.get('checkout') === 'success') {
            console.log('[dashboard] Checkout success detected — re-syncing plan from DB');
            syncSession();
            // Clean up URL param
            searchParams.delete('checkout');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams, syncSession]);


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

    // ★ Plan enforcement
    const { canCreateSet, remainingSets, limits } = usePlanLimits();
    const { syncStatus } = useCloudSync();
    const allSetsCount = useDesignStore(s => Object.keys(s.allCreativeSets).length);
    const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; reason: UpgradeReason }>({
        open: false, reason: 'creative_set_limit',
    });

    // ── Sync: add NEW creative sets from designStore that projectStore doesn't know about ──
    // ★ REGRESSION GUARD: projectStore is AUTHORITATIVE for names, trash, and deletions.
    // NEVER overwrite names or remove items — only ADD missing entries.
    // ★★ CRITICAL: Must wait for IDB hydration to complete BEFORE syncing.
    useEffect(() => {
        let cancelled = false;

        const waitForHydration = async () => {
            const projectPersist = (useProjectStore as any).persist;
            const designPersist = (useDesignStore as any).persist;

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

            const allCS = useDesignStore.getState().getAllCreativeSets();
            const trash = useProjectStore.getState().trash;
            const trashIds = new Set(trash.map(t => t.item.id));
            useProjectStore.setState((state) => {
                // ★ REGRESSION GUARD: Purge any existing [Template] CSs from prior sessions.
                // The earlier filter only blocks NEW additions — this removes stale ones.
                state.creativeSets = state.creativeSets.filter(cs => !cs.name.startsWith('[Template]'));

                const existingIds = new Set(state.creativeSets.map(s => s.id));
                for (const cs of allCS) {
                    if (existingIds.has(cs.id) || trashIds.has(cs.id)) continue;
                    // ★ REGRESSION GUARD: Skip temp template-editing creative sets.
                    // Admin template editing creates CSs named "[Template] X" that are
                    // cleaned up on save/cancel. They must NEVER sync to the dashboard.
                    if (cs.name.startsWith('[Template]')) continue;
                    state.creativeSets.push({
                        id: cs.id, name: cs.name, variantCount: cs.variants.length,
                        createdAt: cs.createdAt, updatedAt: cs.updatedAt, createdBy: displayName || 'User',
                    });
                }
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
        // ★ Plan enforcement: check creative set limit
        if (!canCreateSet()) {
            setUpgradeModal({ open: true, reason: 'creative_set_limit' });
            return;
        }
        const defaultPreset = BANNER_PRESETS[0]!;
        const csId = createCreativeSet(t('dash.untitledCreativeSet'), defaultPreset);
        const now = new Date().toISOString();
        useProjectStore.setState((state) => {
            state.creativeSets.push({
                id: csId,
                name: t('dash.untitledCreativeSet'),
                folderId: state.currentFolderId ?? undefined,
                variantCount: 1,
                createdAt: now,
                updatedAt: now,
                createdBy: displayName || 'User',
            });
        });
        // ★ UX FIX: Stay on dashboard, show card in rename mode.
        // User names the project first, then clicks to enter editor.
        setNewlyCreatedId(csId);
    }, [createCreativeSet, canCreateSet, displayName]);

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
                                <span className="dashboard-hero__greeting">{t(getGreetingKey())}</span>, {firstName}
                            </h1>
                            <p className="dashboard-hero__subtitle">
                                {creativeSets.length} {creativeSets.length !== 1 ? t('dash.projects') : t('dash.project')} · {totalSizes} {totalSizes !== 1 ? t('dash.sizes') : t('dash.size')}
                            </p>
                        </div>
                        <button className="dashboard-hero__cta" onClick={handleNewCreativeSet}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" />
                            </svg>
                            {t('dash.newProject')}
                        </button>
                    </div>
                    <div className="dashboard-hero__orb dashboard-hero__orb--1" />
                    <div className="dashboard-hero__orb dashboard-hero__orb--2" />
                </section>

                {/* ── Plan Status Bar ── */}
                <PlanStatusBar />



                {/* Search */}
                <div className="dashboard-search-bar">
                    <svg className="dashboard-search-bar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="dashboard-search-bar__input"
                        placeholder={t('dash.searchProjects')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <div className="dashboard-view-toggle">
                        <button
                            className={`dashboard-view-toggle__btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => handleViewChange('grid')}
                            title={t('dash.gridView')}
                        >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="1" y="1" width="6" height="6" rx="1" />
                                <rect x="9" y="1" width="6" height="6" rx="1" />
                                <rect x="1" y="9" width="6" height="6" rx="1" />
                                <rect x="9" y="9" width="6" height="6" rx="1" />
                            </svg>
                        </button>
                        <button
                            className={`dashboard-view-toggle__btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => handleViewChange('list')}
                            title={t('dash.listView')}
                        >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="1" y="2" width="14" height="2" rx="0.5" />
                                <rect x="1" y="7" width="14" height="2" rx="0.5" />
                                <rect x="1" y="12" width="14" height="2" rx="0.5" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="dashboard-content">
                    {displayFolders.length > 0 && (
                        <div className="dashboard-section">
                            <h2 className="dashboard-section__title">{t('dash.folders')}</h2>
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

                    <div className="dashboard-section">
                        <h2 className="dashboard-section__title">
                            {currentFolderId ? t('dash.projectsInFolder') : t('dash.allProjects')}
                        </h2>
                        {isEmpty ? (
                            <DashboardEmptyState onNewProject={handleNewCreativeSet} onGoTemplates={() => navigate('/templates')} />
                        ) : (
                            <div className={viewMode === 'list' ? 'project-list' : 'project-grid'}>
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
                                        initialRenaming={set.id === newlyCreatedId}
                                        viewMode={viewMode}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>


                {/* Version Footer + Sync Status */}
                <footer className="dashboard-footer">
                    <CloudSyncIndicator status={syncStatus} />
                    <span className="dashboard-footer__version">{APP_VERSION}</span>
                </footer>
            </main>

            {/* ★ Upgrade Modal */}
            <UpgradeModal
                isOpen={upgradeModal.open}
                onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
                reason={upgradeModal.reason}
                currentUsage={upgradeModal.reason === 'creative_set_limit' ? creativeSets.length : undefined}
                limit={upgradeModal.reason === 'creative_set_limit' ? limits.maxCreativeSets : undefined}
            />
        </div>
    );
}
