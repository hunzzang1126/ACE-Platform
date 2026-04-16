// ─────────────────────────────────────────────────
// useCloudSync — Cloud-First Sync Hook
// ─────────────────────────────────────────────────
// ★ CLOUD-FIRST ARCHITECTURE (v514):
// Supabase is the source of truth. IndexedDB is cache.
// On every app start: pull from cloud → merge local-only → update stores.
// Falls back to local cache ONLY when offline.
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import { isMigrationDone, runMigration } from '@/services/cloudMigration';
import {
    pushProjectDebounced,
    pushCreativeSetDebounced,
    pushCreativeSet,
    pushProject,
    pushFolder,
    trashProject,
    deleteFolderCloud,
    deleteCreativeSetCloud,
    fullSync,
    mergeByTimestamp,
    pushAllToCloud,
} from '@/services/cloudSync';
import { isCloudEnabled } from '@/services/supabaseClient';
import type { CreativeSetSummary, Folder, CreativeSet } from '@/schema/design.types';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

/**
 * Cloud-first sync hook — call once in App root.
 * ★ Always reads from cloud first, falls back to local cache if offline.
 */
export function useCloudSync() {
    const user = useAuthStore((s) => s.user);
    const session = useAuthStore((s) => s.session);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
    const syncedRef = useRef(false);

    const userId = user?.id ?? null;
    const isAuthenticated = !!user && !!session;

    // ── Cloud-first initial sync ──
    useEffect(() => {
        if (!userId || !isAuthenticated) return;
        if (syncedRef.current) return;
        syncedRef.current = true;

        const run = async () => {
            setIsSyncing(true);
            setSyncStatus('syncing');

            try {
                // ★ Wait for IDB hydration so we can read local cache
                const { projectStoreReady } = await import('@/stores/projectStore');
                const { designStoreReady } = await import('@/stores/designStore');
                await Promise.all([projectStoreReady, designStoreReady]);

                const localProjects = useProjectStore.getState().creativeSets;
                const localFolders = useProjectStore.getState().folders;
                const localCS = useDesignStore.getState().allCreativeSets;

                if (!isCloudEnabled()) {
                    // ★ Offline mode — use local cache as-is
                    console.log('[useCloudSync] Cloud disabled — using local cache');
                    setSyncStatus('offline');
                    setIsSyncing(false);
                    return;
                }

                // ── Step 1: First-time migration (push local → cloud) ──
                if (!isMigrationDone(userId)) {
                    const migrated = await runMigration(userId, localProjects, localFolders, localCS);
                    if (migrated) {
                        applyMergedData(migrated, localProjects, localFolders, localCS);
                    }
                    setSyncStatus('synced');
                    setIsSyncing(false);
                    return;
                }

                // ── Step 2: Cloud-first read ──
                const cloudData = await fullSync(userId);

                if (cloudData) {
                    // ★ Cloud is source of truth — merge with local
                    const mergedProjects = mergeByTimestamp(localProjects, cloudData.projects);
                    const mergedFolders = mergeByTimestamp(localFolders, cloudData.folders);

                    // ★ Cloud is source of truth — DO NOT re-add local-only items.
                    // If something exists locally but not in cloud, it was DELETED
                    // on another device. Bringing it back would undo the delete.
                    // Exception: items created in the last 60s (created right before sync).
                    const mergedCS: Record<string, CreativeSet> = {};
                    // Start with cloud data (source of truth)
                    for (const [id, cs] of Object.entries(cloudData.creativeSets)) {
                        mergedCS[id] = cs;
                    }
                    const now = Date.now();
                    const RECENT_THRESHOLD = 60_000; // 60 seconds
                    for (const [id, cs] of Object.entries(localCS)) {
                        if (!mergedCS[id]) {
                            const projectEntry = localProjects.find(p => p.id === id);
                            const projectAge = projectEntry?.createdAt
                                ? now - new Date(projectEntry.createdAt).getTime()
                                : Infinity;
                            if (projectAge < RECENT_THRESHOLD) {
                                mergedCS[id] = cs;
                                console.log(`[useCloudSync] Keeping very recent local CS: ${id}`);
                            } else {
                                console.log(`[useCloudSync] Dropping deleted CS (not in cloud): ${id}`);
                            }
                        }
                    }
                    // Same for project summaries: only keep very recent ones
                    const cloudProjectIds = new Set(mergedProjects.map(p => p.id));
                    for (const p of localProjects) {
                        if (!cloudProjectIds.has(p.id)) {
                            const age = p.createdAt
                                ? now - new Date(p.createdAt).getTime()
                                : Infinity;
                            if (age < RECENT_THRESHOLD) {
                                mergedProjects.push(p);
                                console.log(`[useCloudSync] Keeping very recent local project: ${p.id}`);
                            } else {
                                console.log(`[useCloudSync] Dropping deleted project (not in cloud): ${p.id}`);
                            }
                        }
                    }

                    // ★ Apply merged data to stores
                    applyMergedData(
                        { projects: mergedProjects, folders: mergedFolders, creativeSets: mergedCS },
                        localProjects, localFolders, localCS,
                    );

                    console.log('[useCloudSync] Cloud-first sync complete — stores updated');
                    setSyncStatus('synced');
                } else {
                    // ★ Cloud pull failed — use local cache (offline fallback)
                    console.warn('[useCloudSync] Cloud pull failed — using local cache');
                    setSyncStatus('offline');
                }
            } catch (e) {
                console.warn('[useCloudSync] Sync failed:', e);
                setSyncStatus('error');
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

    return { isSyncing, syncStatus };
}

// ── Helper: Apply merged data to stores with anti-resurrection guard ──
function applyMergedData(
    merged: { projects: CreativeSetSummary[]; folders: Folder[]; creativeSets: Record<string, CreativeSet> },
    _localProjects: CreativeSetSummary[],
    _localFolders: Folder[],
    _localCS: Record<string, CreativeSet>,
) {
    // ★ ANTI-RESURRECTION GUARD: Never restore trashed items from cloud
    const localTrash = useProjectStore.getState().trash;
    const trashedIds = new Set(localTrash.map(t => t.item.id));

    const safeProjects = merged.projects.filter(p => !trashedIds.has(p.id));
    const safeCS: Record<string, CreativeSet> = {};
    for (const [id, cs] of Object.entries(merged.creativeSets)) {
        if (!trashedIds.has(id)) safeCS[id] = cs;
    }

    useProjectStore.setState({
        creativeSets: safeProjects,
        folders: merged.folders,
    });
    useDesignStore.setState({
        allCreativeSets: safeCS,
    });
}
