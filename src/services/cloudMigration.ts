// ─────────────────────────────────────────────────
// cloudMigration — One-time local → cloud migration
// ─────────────────────────────────────────────────
// Runs ONCE on first login after cloud sync is deployed.
// Reads all data from IndexedDB, uploads to Supabase.
// Sets a flag to prevent re-running.
// ─────────────────────────────────────────────────

import { pushAllToCloud, fullSync, mergeByTimestamp } from './cloudSync';
import type { CreativeSetSummary, Folder, CreativeSet } from '@/schema/design.types';

const MIGRATION_FLAG = 'glid-cloud-migration-done';

/**
 * Check if migration has already been completed.
 */
export function isMigrationDone(userId: string): boolean {
    try {
        return localStorage.getItem(`${MIGRATION_FLAG}-${userId}`) === 'true';
    } catch {
        return false;
    }
}

/**
 * Mark migration as complete for this user.
 */
function markMigrationDone(userId: string) {
    try {
        localStorage.setItem(`${MIGRATION_FLAG}-${userId}`, 'true');
    } catch { /* ok */ }
}

/**
 * Run the one-time migration: push local data → cloud, pull cloud → merge.
 * Returns the merged state that should be applied to stores.
 */
export async function runMigration(
    userId: string,
    localProjects: CreativeSetSummary[],
    localFolders: Folder[],
    localCreativeSets: Record<string, CreativeSet>,
): Promise<{
    projects: CreativeSetSummary[];
    folders: Folder[];
    creativeSets: Record<string, CreativeSet>;
}> {
    console.log('[cloudMigration] Starting migration for user:', userId);

    // Step 1: Push all local data to cloud
    await pushAllToCloud(userId, localProjects, localFolders, localCreativeSets);

    // Step 2: Pull cloud data (includes what we just pushed + any existing cloud data)
    const cloudData = await fullSync(userId);

    if (!cloudData) {
        console.log('[cloudMigration] Cloud pull failed — keeping local data');
        markMigrationDone(userId);
        return {
            projects: localProjects,
            folders: localFolders,
            creativeSets: localCreativeSets,
        };
    }

    // Step 3: Merge local + cloud (last-write-wins)
    const mergedProjects = mergeByTimestamp(localProjects, cloudData.projects);
    const mergedFolders = mergeByTimestamp(localFolders, cloudData.folders);

    // For creative sets, merge by updatedAt
    const mergedCS: Record<string, CreativeSet> = { ...localCreativeSets };
    for (const [id, cloudCS] of Object.entries(cloudData.creativeSets)) {
        const localCS = mergedCS[id];
        if (!localCS || new Date(cloudCS.updatedAt) > new Date(localCS.updatedAt)) {
            mergedCS[id] = cloudCS;
        }
    }

    markMigrationDone(userId);

    console.log('[cloudMigration] Migration complete:', {
        projects: mergedProjects.length,
        folders: mergedFolders.length,
        creativeSets: Object.keys(mergedCS).length,
    });

    return {
        projects: mergedProjects,
        folders: mergedFolders,
        creativeSets: mergedCS,
    };
}

/**
 * Sync on app start (post-migration).
 * Pulls cloud data, merges with local, returns merged state.
 */
export async function syncOnLogin(
    userId: string,
    localProjects: CreativeSetSummary[],
    localFolders: Folder[],
    localCreativeSets: Record<string, CreativeSet>,
): Promise<{
    projects: CreativeSetSummary[];
    folders: Folder[];
    creativeSets: Record<string, CreativeSet>;
} | null> {
    const cloudData = await fullSync(userId);
    if (!cloudData) return null;

    const mergedProjects = mergeByTimestamp(localProjects, cloudData.projects);
    const mergedFolders = mergeByTimestamp(localFolders, cloudData.folders);

    const mergedCS: Record<string, CreativeSet> = { ...localCreativeSets };
    for (const [id, cloudCS] of Object.entries(cloudData.creativeSets)) {
        const localCS = mergedCS[id];
        if (!localCS || new Date(cloudCS.updatedAt) > new Date(localCS.updatedAt)) {
            mergedCS[id] = cloudCS;
        }
    }

    return {
        projects: mergedProjects,
        folders: mergedFolders,
        creativeSets: mergedCS,
    };
}
