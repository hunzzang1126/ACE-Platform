// ─────────────────────────────────────────────────
// useCloudSync — Hook to orchestrate cloud sync
// ─────────────────────────────────────────────────
// Triggers migration on first use, then syncs on
// every login. Wires store mutations to cloud push.
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import { isMigrationDone, runMigration, syncOnLogin } from '@/services/cloudMigration';
import {
    pushProjectDebounced,
    pushCreativeSetDebounced,
    pushFolder,
    trashProject,
    deleteFolderCloud,
    deleteCreativeSetCloud,
} from '@/services/cloudSync';
import { isCloudEnabled } from '@/services/supabaseClient';
import type { CreativeSetSummary, Folder, CreativeSet } from '@/schema/design.types';

/**
 * Cloud sync hook — call once in App root.
 * Handles migration + ongoing sync automatically.
 */
export function useCloudSync() {
    const user = useAuthStore((s) => s.user);
    const session = useAuthStore((s) => s.session);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncedRef = useRef(false);

    const userId = user?.id ?? null;
    const isAuthenticated = !!user && !!session;

    // ── Initial sync on login ──
    useEffect(() => {
        if (!userId || !isAuthenticated || !isCloudEnabled()) return;
        if (syncedRef.current) return;
        syncedRef.current = true;

        const run = async () => {
            setIsSyncing(true);
            try {
                const localProjects = useProjectStore.getState().creativeSets;
                const localFolders = useProjectStore.getState().folders;
                const localCS = useDesignStore.getState().allCreativeSets;

                let merged;

                if (!isMigrationDone(userId)) {
                    // First time: push everything to cloud + merge
                    merged = await runMigration(userId, localProjects, localFolders, localCS);
                } else {
                    // Subsequent logins: just sync
                    merged = await syncOnLogin(userId, localProjects, localFolders, localCS);
                }

                if (merged) {
                    // Apply merged data to stores
                    useProjectStore.setState({
                        creativeSets: merged.projects,
                        folders: merged.folders,
                    });
                    useDesignStore.setState({
                        allCreativeSets: merged.creativeSets,
                    });
                    console.log('[useCloudSync] Sync complete — stores updated');

                    // ★ ORPHAN PURGE v2: Clean up ghost projects in Supabase.
                    // A cloud project is an ORPHAN if there's no matching creative set
                    // in allCreativeSets (designStore). The old bug created project rows
                    // with ID-B while the CS had ID-A → ID-B is a ghost.
                    const purgeKey = `glid-cloud-orphan-purged-v2-${userId}`;
                    if (!localStorage.getItem(purgeKey)) {
                        try {
                            const { pullProjects, deleteProjectPermanently, deleteCreativeSetCloud } = await import('@/services/cloudSync');
                            const cloudProjects = await pullProjects(userId);
                            // Authority: only projects with matching creative set data are real
                            const realCsIds = new Set(Object.keys(merged.creativeSets));
                            let purged = 0;
                            for (const cp of cloudProjects) {
                                if (!realCsIds.has(cp.id)) {
                                    console.log('[useCloudSync] Purging orphan cloud project:', cp.id, cp.name);
                                    await deleteProjectPermanently(cp.id);
                                    await deleteCreativeSetCloud(cp.id);
                                    purged++;
                                }
                            }
                            // Also clean up the merged projects to remove orphans from store
                            if (purged > 0) {
                                const cleanedProjects = merged.projects.filter(p => realCsIds.has(p.id));
                                useProjectStore.setState({ creativeSets: cleanedProjects });
                                console.log(`[useCloudSync] Purged ${purged} orphan(s) from Supabase`);
                            }
                            localStorage.setItem(purgeKey, 'true');
                        } catch (e) {
                            console.warn('[useCloudSync] Orphan purge failed:', e);
                        }
                    }
                }
            } catch (e) {
                console.warn('[useCloudSync] Sync failed:', e);
            }
            setIsSyncing(false);
        };

        run();
    }, [userId, isAuthenticated]);

    // ── Subscribe to store changes → push to cloud ──
    useEffect(() => {
        if (!userId || !isCloudEnabled()) return;

        // Track previous state for diffing
        let prevProjects = useProjectStore.getState().creativeSets;
        let prevFolders = useProjectStore.getState().folders;
        let prevCS = useDesignStore.getState().allCreativeSets;

        // Watch projectStore changes
        const unsubProject = useProjectStore.subscribe((state) => {
            const curr = state.creativeSets;
            const currFolders = state.folders;

            // Push changed projects
            for (const project of curr) {
                const old = prevProjects.find((p: CreativeSetSummary) => p.id === project.id);
                if (!old || old.updatedAt !== project.updatedAt) {
                    pushProjectDebounced(userId, project);
                }
            }
            // Detect deleted projects (in prev but not in curr)
            for (const old of prevProjects) {
                if (!curr.find((p: CreativeSetSummary) => p.id === old.id)) {
                    trashProject(old.id);
                }
            }
            // Push changed folders
            for (const folder of currFolders) {
                const old = prevFolders.find((f: Folder) => f.id === folder.id);
                if (!old || old.updatedAt !== folder.updatedAt) {
                    pushFolder(userId, folder);
                }
            }
            // Detect deleted folders
            for (const old of prevFolders) {
                if (!currFolders.find((f: Folder) => f.id === old.id)) {
                    deleteFolderCloud(old.id);
                }
            }

            prevProjects = curr;
            prevFolders = currFolders;
        });

        // Watch designStore changes
        const unsubDesign = useDesignStore.subscribe((state) => {
            const curr = state.allCreativeSets;

            for (const [id, cs] of Object.entries(curr)) {
                const old = prevCS[id];
                if (!old || old.updatedAt !== cs.updatedAt) {
                    pushCreativeSetDebounced(userId, cs);
                }
            }
            // Detect deleted creative sets
            for (const id of Object.keys(prevCS)) {
                if (!curr[id]) {
                    deleteCreativeSetCloud(id);
                }
            }

            prevCS = curr;
        });

        return () => {
            unsubProject();
            unsubDesign();
        };
    }, [userId]);

    return { isSyncing };
}
