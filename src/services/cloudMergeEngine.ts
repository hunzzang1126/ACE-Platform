// ─────────────────────────────────────────────────
// cloudMergeEngine — Bidirectional merge for projects
// ─────────────────────────────────────────────────
// Pure functions — NO side effects, NO store writes.
// Last-write-wins conflict resolution by updatedAt.
// ─────────────────────────────────────────────────

import type { CreativeSetSummary } from '@/schema/design.types';

/** Shape of a cloud project row from Supabase */
export interface CloudProjectRow {
    id: string;
    name: string;
    folder_id: string | null;
    variant_count: number;
    updated_at: string;
    deleted_at: string | null;
}

/** Result of merging local + cloud project lists */
export interface MergeResult {
    merged: CreativeSetSummary[];
    conflicts: string[];      // Human-readable conflict log
    added: number;             // New items from cloud
    updated: number;           // Items updated from cloud
    deletedLocally: number;    // Items soft-deleted from cloud
}

/**
 * Merge local and cloud project lists using last-write-wins.
 *
 * Rules:
 * 1. Items in both → compare updatedAt → keep newer
 * 2. Items only in local → keep (cloud hasn't seen them yet)
 * 3. Items only in cloud → add to local (new from another device)
 * 4. Items with deleted_at in cloud → remove from local
 *
 * ★ PURE FUNCTION — returns new array, never mutates inputs.
 */
export function mergeProjectLists(
    local: CreativeSetSummary[],
    cloud: CloudProjectRow[],
): MergeResult {
    const conflicts: string[] = [];
    let added = 0;
    let updated = 0;
    let deletedLocally = 0;

    // Index by ID for O(1) lookup
    const localMap = new Map<string, CreativeSetSummary>();
    for (const item of local) localMap.set(item.id, item);

    const cloudMap = new Map<string, CloudProjectRow>();
    for (const item of cloud) cloudMap.set(item.id, item);

    // Collect IDs deleted in cloud
    const cloudDeletedIds = new Set<string>();
    for (const item of cloud) {
        if (item.deleted_at) cloudDeletedIds.add(item.id);
    }

    const merged: CreativeSetSummary[] = [];

    // Pass 1: Process all local items
    for (const localItem of local) {
        // Deleted in cloud → remove locally
        if (cloudDeletedIds.has(localItem.id)) {
            deletedLocally++;
            conflicts.push(`Deleted: "${localItem.name}" (removed on another device)`);
            continue;
        }

        const cloudItem = cloudMap.get(localItem.id);

        if (!cloudItem) {
            // Only in local → keep as-is
            merged.push(localItem);
            continue;
        }

        // Both exist → compare timestamps
        const localTime = new Date(localItem.updatedAt).getTime();
        const cloudTime = new Date(cloudItem.updated_at).getTime();

        if (cloudTime > localTime) {
            // Cloud is newer → update local with cloud data
            merged.push(cloudRowToSummary(cloudItem, localItem));
            updated++;
            conflicts.push(`Updated: "${cloudItem.name}" (newer on cloud)`);
        } else {
            // Local is newer or same → keep local
            merged.push(localItem);
        }
    }

    // Pass 2: Add items only in cloud (not deleted)
    for (const cloudItem of cloud) {
        if (cloudItem.deleted_at) continue;
        if (localMap.has(cloudItem.id)) continue;

        // New from cloud → add to local
        merged.push(cloudRowToSummary(cloudItem));
        added++;
    }

    return { merged, conflicts, added, updated, deletedLocally };
}

/**
 * Convert a cloud project row to a CreativeSetSummary.
 * Preserves local-only fields (createdBy, createdAt) when available.
 */
function cloudRowToSummary(
    cloud: CloudProjectRow,
    existing?: CreativeSetSummary,
): CreativeSetSummary {
    return {
        id: cloud.id,
        name: cloud.name,
        folderId: cloud.folder_id ?? undefined,
        variantCount: cloud.variant_count ?? existing?.variantCount ?? 1,
        createdAt: existing?.createdAt ?? cloud.updated_at,
        updatedAt: cloud.updated_at,
        createdBy: existing?.createdBy ?? 'cloud',
    };
}
