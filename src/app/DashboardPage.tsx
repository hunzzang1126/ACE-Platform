// ─────────────────────────────────────────────────
// DashboardPage – Bannerflow-style File Manager
// ─────────────────────────────────────────────────
import { useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore, type SortColumn } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import { BANNER_PRESETS } from '@/schema/presets';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardToolbar } from '@/components/dashboard/DashboardToolbar';
import { CreativeSetTable } from '@/components/dashboard/CreativeSetTable';
import { Pagination } from '@/components/dashboard/Pagination';

export function DashboardPage() {
    const navigate = useNavigate();

    // Project store
    const creativeSets = useProjectStore((s) => s.creativeSets);
    const folders = useProjectStore((s) => s.folders);
    const currentFolderId = useProjectStore((s) => s.currentFolderId);
    const searchQuery = useProjectStore((s) => s.searchQuery);
    const sortColumn = useProjectStore((s) => s.sortColumn);
    const sortDirection = useProjectStore((s) => s.sortDirection);
    const currentPage = useProjectStore((s) => s.currentPage);
    const itemsPerPage = useProjectStore((s) => s.itemsPerPage);
    const createCreativeSetProject = useProjectStore((s) => s.createCreativeSet);
    const createFolder = useProjectStore((s) => s.createFolder);
    const navigateToFolder = useProjectStore((s) => s.navigateToFolder);

    // Design store
    const createCreativeSet = useDesignStore((s) => s.createCreativeSet);
    const openCreativeSet = useDesignStore((s) => s.openCreativeSet);

    // ── Sync projectStore from designStore on mount ──
    // This ensures the dashboard listing always reflects the real data
    useEffect(() => {
        const allCS = useDesignStore.getState().getAllCreativeSets();
        if (allCS.length > 0) {
            // Rebuild projectStore from designStore (source of truth)
            useProjectStore.setState((state) => {
                // Build a map of existing project entries by ID for merging
                const existingMap = new Map(state.creativeSets.map(s => [s.id, s]));

                // Update/add entries from designStore
                for (const cs of allCS) {
                    const existing = existingMap.get(cs.id);
                    if (existing) {
                        // Update variant count to reflect reality
                        existing.variantCount = cs.variants.length;
                        existing.name = cs.name;
                        existing.updatedAt = cs.updatedAt;
                    } else {
                        // Add missing entry
                        state.creativeSets.push({
                            id: cs.id,
                            name: cs.name,
                            variantCount: cs.variants.length,
                            createdAt: cs.createdAt,
                            updatedAt: cs.updatedAt,
                            createdBy: 'Young An',
                        });
                    }
                }

                // Remove entries that no longer exist in designStore
                const validIds = new Set(allCS.map(cs => cs.id));
                state.creativeSets = state.creativeSets.filter(s => validIds.has(s.id));
            });
        }
    }, []);

    // ── Computed data ──
    const { filteredItems, filteredFolders, totalItems } = useMemo(() => {
        // Filter by current folder
        let setItems = creativeSets.filter((s) =>
            currentFolderId ? s.folderId === currentFolderId : !s.folderId,
        );
        let folderItems = folders.filter((f) =>
            currentFolderId ? f.parentId === currentFolderId : !f.parentId,
        );

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            setItems = setItems.filter((s) => s.name.toLowerCase().includes(q));
            folderItems = folderItems.filter((f) => f.name.toLowerCase().includes(q));
        }

        // Sort creative sets
        const sorted = [...setItems].sort((a, b) => {
            let cmp = 0;
            switch (sortColumn) {
                case 'name': cmp = a.name.localeCompare(b.name); break;
                case 'variantCount': cmp = a.variantCount - b.variantCount; break;
                case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
                case 'createdBy': cmp = a.createdBy.localeCompare(b.createdBy); break;
            }
            return sortDirection === 'asc' ? cmp : -cmp;
        });

        const total = folderItems.length + sorted.length;

        // Paginate (sets only, folders always shown)
        const startIdx = (currentPage - 1) * itemsPerPage;
        const paginatedSets = sorted.slice(
            Math.max(0, startIdx - folderItems.length),
            Math.max(0, startIdx + itemsPerPage - folderItems.length),
        );
        const paginatedFolders = startIdx < folderItems.length
            ? folderItems.slice(startIdx, Math.min(folderItems.length, startIdx + itemsPerPage))
            : [];

        return { filteredItems: paginatedSets, filteredFolders: paginatedFolders, totalItems: total };
    }, [creativeSets, folders, currentFolderId, searchQuery, sortColumn, sortDirection, currentPage, itemsPerPage]);

    // ── Breadcrumb ──
    const breadcrumb = useMemo(() => {
        if (!currentFolderId) return ['Creative Sets'];
        const folder = folders.find((f) => f.id === currentFolderId);
        return ['Creative Sets', folder?.name ?? 'Folder'];
    }, [currentFolderId, folders]);

    // ── Handlers ──
    const handleNewCreativeSet = useCallback(() => {
        const defaultPreset = BANNER_PRESETS[0]!;
        const csId = createCreativeSet('Untitled Creative Set', defaultPreset);
        // Also add to projectStore for dashboard listing
        createCreativeSetProject('Untitled Creative Set');
        // Sync the projectStore entry ID with designStore
        useProjectStore.setState((state) => {
            const last = state.creativeSets[state.creativeSets.length - 1];
            if (last) {
                // Replace the auto-generated ID with the designStore ID
                state.creativeSets = state.creativeSets.filter(s => s.id !== last.id);
                state.creativeSets.push({ ...last, id: csId });
            }
        });
        navigate('/editor');
    }, [createCreativeSetProject, createCreativeSet, navigate]);

    const handleNewFolder = useCallback(() => {
        createFolder('New Folder');
    }, [createFolder]);

    const handleOpenSet = useCallback((id: string) => {
        // Try to open from designStore (full data preserved)
        const opened = openCreativeSet(id);
        if (opened) {
            navigate('/editor');
            return;
        }

        // Fallback: if not in designStore (legacy/demo entry), create a new creative set
        const set = creativeSets.find((s) => s.id === id);
        if (set) {
            const defaultPreset = BANNER_PRESETS[0]!;
            const csId = createCreativeSet(set.name, defaultPreset);
            // Update projectStore entry to point to the new designStore ID
            useProjectStore.setState((state) => {
                const entry = state.creativeSets.find(s => s.id === id);
                if (entry) {
                    entry.id = csId;
                }
            });
            navigate('/editor');
        }
    }, [creativeSets, openCreativeSet, createCreativeSet, navigate]);

    const handleOpenFolder = useCallback((folderId: string) => {
        navigateToFolder(folderId);
    }, [navigateToFolder]);

    const handleNavigateUp = useCallback(() => {
        if (currentFolderId) {
            const folder = folders.find((f) => f.id === currentFolderId);
            navigateToFolder(folder?.parentId ?? null);
        }
    }, [currentFolderId, folders, navigateToFolder]);

    return (
        <div className="dashboard-layout">
            <AppSidebar />
            <main className="dashboard-main">
                <DashboardToolbar
                    breadcrumb={breadcrumb}
                    onNewCreativeSet={handleNewCreativeSet}
                    onNewFolder={handleNewFolder}
                    onNavigateUp={handleNavigateUp}
                />
                <div className="dashboard-content">
                    <CreativeSetTable
                        items={filteredItems}
                        folders={filteredFolders}
                        onOpenSet={handleOpenSet}
                        onOpenFolder={handleOpenFolder}
                    />
                </div>
                <Pagination totalItems={totalItems} />
            </main>
        </div>
    );
}

