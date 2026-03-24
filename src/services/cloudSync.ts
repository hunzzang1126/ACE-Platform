// ─────────────────────────────────────────────────
// cloudSync — Supabase Cloud Sync Service
// ─────────────────────────────────────────────────
// Local-first architecture: IndexedDB is primary,
// Supabase syncs in background. Offline-safe.
// ─────────────────────────────────────────────────

import { getSupabase, isCloudEnabled } from './supabaseClient';
import type { CreativeSet, CreativeSetSummary, Folder } from '@/schema/design.types';

// ── Types ────────────────────────────────────────

interface CloudProject {
    id: string;
    user_id: string;
    name: string;
    folder_id: string | null;
    variant_count: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

interface CloudCreativeSet {
    id: string;
    project_id: string;
    user_id: string;
    data: CreativeSet;
    version: number;
    created_at: string;
    updated_at: string;
}

interface CloudFolder {
    id: string;
    user_id: string;
    name: string;
    parent_id: string | null;
    created_at: string;
    updated_at: string;
}

// ── Sync guard: debounce rapid saves ─────────────

const _pendingSyncs = new Map<string, ReturnType<typeof setTimeout>>();
const SYNC_DEBOUNCE_MS = 1500;

function debouncedSync(key: string, fn: () => Promise<void>) {
    const existing = _pendingSyncs.get(key);
    if (existing) clearTimeout(existing);
    _pendingSyncs.set(key, setTimeout(async () => {
        _pendingSyncs.delete(key);
        try { await fn(); } catch (e) {
            console.warn('[cloudSync] Background sync failed:', e);
        }
    }, SYNC_DEBOUNCE_MS));
}

// ── Projects (Dashboard metadata) ───────────────

/**
 * Push a single project summary to Supabase.
 * Uses upsert — safe to call repeatedly.
 */
export async function pushProject(
    userId: string,
    project: CreativeSetSummary,
): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    const { error } = await sb.from('projects').upsert({
        id: project.id,
        user_id: userId,
        name: project.name,
        folder_id: project.folderId ?? null,
        variant_count: project.variantCount,
        created_at: project.createdAt,
        updated_at: project.updatedAt,
    }, { onConflict: 'id' });

    if (error) console.warn('[cloudSync] pushProject error:', error.message);
}

/** Push project with debounce (for rapid edits) */
export function pushProjectDebounced(userId: string, project: CreativeSetSummary) {
    debouncedSync(`project-${project.id}`, () => pushProject(userId, project));
}

/**
 * Pull all projects for a user from Supabase.
 */
export async function pullProjects(userId: string): Promise<CreativeSetSummary[]> {
    const sb = getSupabase();
    if (!sb) return [];

    const { data, error } = await sb
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

    if (error || !data) {
        console.warn('[cloudSync] pullProjects error:', error?.message);
        return [];
    }

    return (data as CloudProject[]).map((p) => ({
        id: p.id,
        name: p.name,
        folderId: p.folder_id ?? undefined,
        variantCount: p.variant_count,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        createdBy: '',
    }));
}

/** Soft-delete a project (move to trash in cloud) */
export async function trashProject(projectId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    const { error } = await sb
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId);

    if (error) console.warn('[cloudSync] trashProject error:', error.message);
}

/** Restore a trashed project */
export async function restoreProject(projectId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    const { error } = await sb
        .from('projects')
        .update({ deleted_at: null })
        .eq('id', projectId);

    if (error) console.warn('[cloudSync] restoreProject error:', error.message);
}

/** Permanently delete a project and its creative sets */
export async function deleteProjectPermanently(projectId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    // creative_sets cascade on project delete
    const { error } = await sb.from('projects').delete().eq('id', projectId);
    if (error) console.warn('[cloudSync] deleteProjectPermanently error:', error.message);
}

// ── Creative Sets (Full design data) ────────────

/**
 * Push a creative set's full data to Supabase as JSONB.
 * Uses select→update/insert to avoid 409 conflict with RLS.
 * ★ Ensures parent project row exists first (FK constraint).
 */
export async function pushCreativeSet(
    userId: string,
    cs: CreativeSet,
): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    // ★ FK safety: ensure parent project row exists before creative_set insert
    await sb.from('projects').upsert({
        id: cs.id,
        user_id: userId,
        name: cs.name,
        variant_count: cs.variants?.length ?? 1,
        created_at: cs.createdAt,
        updated_at: cs.updatedAt,
    }, { onConflict: 'id' });

    const row = {
        id: cs.id,
        project_id: cs.id, // 1:1 mapping for now
        user_id: userId,
        data: cs, // stored as JSONB
        version: 1,
        created_at: cs.createdAt,
        updated_at: cs.updatedAt,
    };

    // Check if row exists, then update or insert
    const { data: existing } = await sb
        .from('creative_sets')
        .select('id')
        .eq('id', cs.id)
        .maybeSingle();

    if (existing) {
        const { error } = await sb
            .from('creative_sets')
            .update({ data: cs, updated_at: cs.updatedAt, version: 1 })
            .eq('id', cs.id);
        if (error) console.warn('[cloudSync] pushCreativeSet update error:', error.message);
    } else {
        const { error } = await sb
            .from('creative_sets')
            .insert(row);
        if (error) console.warn('[cloudSync] pushCreativeSet insert error:', error.message);
    }
}

/** Push creative set with debounce */
export function pushCreativeSetDebounced(userId: string, cs: CreativeSet) {
    debouncedSync(`cs-${cs.id}`, () => pushCreativeSet(userId, cs));
}

/**
 * Pull a single creative set from Supabase.
 */
export async function pullCreativeSet(csId: string): Promise<CreativeSet | null> {
    const sb = getSupabase();
    if (!sb) return null;

    const { data, error } = await sb
        .from('creative_sets')
        .select('data')
        .eq('id', csId)
        .maybeSingle();

    if (error || !data) {
        console.warn('[cloudSync] pullCreativeSet error:', error?.message);
        return null;
    }

    return data.data as CreativeSet;
}

/**
 * Pull all creative sets for a user.
 */
export async function pullAllCreativeSets(
    userId: string,
): Promise<Record<string, CreativeSet>> {
    const sb = getSupabase();
    if (!sb) return {};

    const { data, error } = await sb
        .from('creative_sets')
        .select('id, data')
        .eq('user_id', userId);

    if (error || !data) {
        console.warn('[cloudSync] pullAllCreativeSets error:', error?.message);
        return {};
    }

    const result: Record<string, CreativeSet> = {};
    for (const row of data as CloudCreativeSet[]) {
        if (row.data) result[row.id] = row.data;
    }
    return result;
}

/** Delete a creative set from cloud */
export async function deleteCreativeSetCloud(csId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    const { error } = await sb.from('creative_sets').delete().eq('id', csId);
    if (error) console.warn('[cloudSync] deleteCreativeSetCloud error:', error.message);
}

// ── Folders ─────────────────────────────────────

/** Push a folder to cloud */
export async function pushFolder(userId: string, folder: Folder): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    const { error } = await sb.from('folders').upsert({
        id: folder.id,
        user_id: userId,
        name: folder.name,
        parent_id: folder.parentId ?? null,
        created_at: folder.createdAt,
        updated_at: folder.updatedAt,
    }, { onConflict: 'id' });

    if (error) console.warn('[cloudSync] pushFolder error:', error.message);
}

/** Pull all folders for a user */
export async function pullFolders(userId: string): Promise<Folder[]> {
    const sb = getSupabase();
    if (!sb) return [];

    const { data, error } = await sb
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error || !data) {
        console.warn('[cloudSync] pullFolders error:', error?.message);
        return [];
    }

    return (data as CloudFolder[]).map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id ?? undefined,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
    }));
}

/** Delete a folder from cloud */
export async function deleteFolderCloud(folderId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    const { error } = await sb.from('folders').delete().eq('id', folderId);
    if (error) console.warn('[cloudSync] deleteFolderCloud error:', error.message);
}

// ── Asset Storage ───────────────────────────────

const ASSET_BUCKET = 'ace-assets';

/**
 * Upload a file to Supabase Storage.
 * Returns the public URL, or null on failure.
 */
export async function uploadAsset(
    userId: string,
    file: File,
): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;

    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await sb.storage
        .from(ASSET_BUCKET)
        .upload(path, file, { upsert: false });

    if (error) {
        console.warn('[cloudSync] uploadAsset error:', error.message);
        return null;
    }

    const { data } = sb.storage.from(ASSET_BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

/** Delete an asset from storage */
export async function deleteAsset(path: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;

    const { error } = await sb.storage.from(ASSET_BUCKET).remove([path]);
    if (error) console.warn('[cloudSync] deleteAsset error:', error.message);
}

// ── Full Sync (Pull from cloud → merge local) ───

/**
 * Merge strategy: last-write-wins by updatedAt.
 * Returns merged arrays where the newer version wins.
 */
export function mergeByTimestamp<T extends { id: string; updatedAt: string }>(
    local: T[],
    cloud: T[],
): T[] {
    const merged = new Map<string, T>();

    // Add all local items
    for (const item of local) merged.set(item.id, item);

    // Override with cloud items that are newer
    for (const item of cloud) {
        const existing = merged.get(item.id);
        if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
            merged.set(item.id, item);
        }
    }

    return Array.from(merged.values());
}

/**
 * Full sync cycle: push local changes, pull cloud changes, merge.
 * Called on app start and after login.
 */
export async function fullSync(userId: string): Promise<{
    projects: CreativeSetSummary[];
    folders: Folder[];
    creativeSets: Record<string, CreativeSet>;
} | null> {
    if (!isCloudEnabled()) return null;

    try {
        console.log('[cloudSync] Starting full sync for user:', userId);

        const [cloudProjects, cloudFolders, cloudCS] = await Promise.all([
            pullProjects(userId),
            pullFolders(userId),
            pullAllCreativeSets(userId),
        ]);

        console.log('[cloudSync] Pulled:', {
            projects: cloudProjects.length,
            folders: cloudFolders.length,
            creativeSets: Object.keys(cloudCS).length,
        });

        return {
            projects: cloudProjects,
            folders: cloudFolders,
            creativeSets: cloudCS,
        };
    } catch (e) {
        console.warn('[cloudSync] Full sync failed:', e);
        return null;
    }
}

/**
 * Push all local data to cloud (used during migration).
 */
export async function pushAllToCloud(
    userId: string,
    projects: CreativeSetSummary[],
    folders: Folder[],
    creativeSets: Record<string, CreativeSet>,
): Promise<void> {
    if (!isCloudEnabled()) return;

    console.log('[cloudSync] Pushing all local data to cloud...');

    // Push in parallel batches
    const projectPromises = projects.map((p) => pushProject(userId, p));
    const folderPromises = folders.map((f) => pushFolder(userId, f));
    const csPromises = Object.values(creativeSets).map((cs) => pushCreativeSet(userId, cs));

    await Promise.allSettled([...projectPromises, ...folderPromises, ...csPromises]);

    console.log('[cloudSync] Push complete:', {
        projects: projects.length,
        folders: folders.length,
        creativeSets: Object.keys(creativeSets).length,
    });
}
