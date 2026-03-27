// ─────────────────────────────────────────────────
// cloudSync — Supabase Cloud Sync Service (barrel + Folders/Assets/FullSync)
// ─────────────────────────────────────────────────
// Projects + Creative Sets → cloudSyncProjects.ts
// ─────────────────────────────────────────────────

import { getSupabase, isCloudEnabled } from './supabaseClient';
import type { CreativeSet, CreativeSetSummary, Folder } from '@/schema/design.types';

// Re-export all project/CS operations for backward compatibility
export { pushProject, pushProjectDebounced, pullProjects, pullAllProjectsRaw, trashProject, restoreProject, deleteProjectPermanently, pushCreativeSet, pushCreativeSetDebounced, pullCreativeSet, pullAllCreativeSets, deleteCreativeSetCloud } from './cloudSyncProjects';
import { pushProject, pullProjects, pushCreativeSet, pullAllCreativeSets } from './cloudSyncProjects';

// ── Folders ──
interface CloudFolder { id: string; user_id: string; name: string; parent_id: string | null; created_at: string; updated_at: string; }

export async function pushFolder(userId: string, folder: Folder): Promise<void> {
    const sb = getSupabase(); if (!sb) return;
    const { error } = await sb.from('folders').upsert({ id: folder.id, user_id: userId, name: folder.name, parent_id: folder.parentId ?? null, created_at: folder.createdAt, updated_at: folder.updatedAt }, { onConflict: 'id' });
    if (error) console.warn('[cloudSync] pushFolder error:', error.message);
}
export async function pullFolders(userId: string): Promise<Folder[]> {
    const sb = getSupabase(); if (!sb) return [];
    const { data, error } = await sb.from('folders').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    if (error || !data) return [];
    return (data as CloudFolder[]).map(f => ({ id: f.id, name: f.name, parentId: f.parent_id ?? undefined, createdAt: f.created_at, updatedAt: f.updated_at }));
}
export async function deleteFolderCloud(folderId: string): Promise<void> {
    const sb = getSupabase(); if (!sb) return;
    await sb.from('folders').delete().eq('id', folderId);
}

// ── Assets ──
const ASSET_BUCKET = 'ace-assets';
export async function uploadAsset(userId: string, file: File): Promise<string | null> {
    const sb = getSupabase(); if (!sb) return null;
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from(ASSET_BUCKET).upload(path, file, { upsert: false });
    if (error) { console.warn('[cloudSync] uploadAsset error:', error.message); return null; }
    return sb.storage.from(ASSET_BUCKET).getPublicUrl(path).data.publicUrl;
}
export async function deleteAsset(path: string): Promise<void> {
    const sb = getSupabase(); if (!sb) return;
    await sb.storage.from(ASSET_BUCKET).remove([path]);
}

// ── Merge + Full Sync ──
export function mergeByTimestamp<T extends { id: string; updatedAt: string }>(local: T[], cloud: T[]): T[] {
    const merged = new Map<string, T>();
    for (const item of local) merged.set(item.id, item);
    for (const item of cloud) { const existing = merged.get(item.id); if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) merged.set(item.id, item); }
    return Array.from(merged.values());
}

export async function fullSync(userId: string): Promise<{ projects: CreativeSetSummary[]; folders: Folder[]; creativeSets: Record<string, CreativeSet> } | null> {
    if (!isCloudEnabled()) return null;
    try {
        const [cloudProjects, cloudFolders, cloudCS] = await Promise.all([pullProjects(userId), pullFolders(userId), pullAllCreativeSets(userId)]);
        return { projects: cloudProjects, folders: cloudFolders, creativeSets: cloudCS };
    } catch { return null; }
}

export async function pushAllToCloud(userId: string, projects: CreativeSetSummary[], folders: Folder[], creativeSets: Record<string, CreativeSet>): Promise<void> {
    if (!isCloudEnabled()) return;
    await Promise.allSettled([...projects.map(p => pushProject(userId, p)), ...folders.map(f => pushFolder(userId, f)), ...Object.values(creativeSets).map(cs => pushCreativeSet(userId, cs))]);
}
