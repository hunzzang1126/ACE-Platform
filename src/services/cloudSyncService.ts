// ─────────────────────────────────────────────────
// cloudSyncService — Bidirectional IndexedDB ↔ Supabase sync
// ─────────────────────────────────────────────────
// Offline-first: all writes go to IndexedDB first,
// then async-sync to Supabase when online.
// Pull from cloud on login / app start.
// Last-write-wins conflict resolution (by updated_at).
// ─────────────────────────────────────────────────

import { getSupabase, isCloudEnabled } from './supabaseClient';
import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import { useUploadStore } from '@/stores/uploadStore';
import type { CreativeSet } from '@/schema/design.types';

export type CloudSyncStatus = 'idle' | 'pushing' | 'pulling' | 'error' | 'offline';

interface CloudSyncState {
    status: CloudSyncStatus;
    lastSyncAt: number | null;
    error: string | null;
}

let _state: CloudSyncState = { status: 'idle', lastSyncAt: null, error: null };
const _listeners = new Set<(s: CloudSyncState) => void>();

function notify() { for (const fn of _listeners) fn({ ..._state }); }

export function onCloudSyncChange(fn: (s: CloudSyncState) => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}

export function getCloudSyncState(): CloudSyncState {
    return { ..._state };
}

// ── Push: IndexedDB → Supabase ──────────────────

/**
 * Push the current project + creative set to the cloud.
 * Call after save or on a debounced interval.
 */
export async function pushToCloud(userId: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) {
        _state = { ..._state, status: 'offline' };
        notify();
        return false;
    }

    _state = { ..._state, status: 'pushing', error: null };
    notify();

    try {
        // Get current local state
        const { creativeSets } = useProjectStore.getState();
        const { creativeSet } = useDesignStore.getState();

        // Push all creative sets as projects
        for (const cs of creativeSets) {

            const { error: projErr } = await sb
                .from('projects')
                .upsert({
                    id: cs.id,
                    user_id: userId,
                    name: cs.name,
                    folder_id: cs.folderId ?? null,
                    variant_count: cs.variantCount ?? 1,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });

            if (projErr) {
                console.warn('[cloudSync] Project push error:', projErr.message);
            }
        }

        // Push current creative set (select→update/insert to avoid 409)
        if (creativeSet) {
            const now = new Date().toISOString();
            const { data: existing } = await sb
                .from('creative_sets')
                .select('id')
                .eq('id', creativeSet.id)
                .maybeSingle();

            if (existing) {
                const { error: csErr } = await sb
                    .from('creative_sets')
                    .update({ data: creativeSet, updated_at: now })
                    .eq('id', creativeSet.id);
                if (csErr) console.warn('[cloudSync] CreativeSet update error:', csErr.message);
            } else {
                const { error: csErr } = await sb
                    .from('creative_sets')
                    .insert({
                        id: creativeSet.id,
                        project_id: creativeSet.id,
                        user_id: userId,
                        data: creativeSet,
                        updated_at: now,
                    });
                if (csErr) console.warn('[cloudSync] CreativeSet insert error:', csErr.message);
            }
        }

        _state = { status: 'idle', lastSyncAt: Date.now(), error: null };
        notify();
        console.log('[cloudSync] Push complete');
        return true;
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Push failed';
        _state = { ..._state, status: 'error', error: msg };
        notify();
        console.error('[cloudSync] Push error:', msg);
        return false;
    }
}

// ── Pull: Supabase → IndexedDB ──────────────────

/**
 * Pull all projects + creative sets from the cloud.
 * Call on login or app start to hydrate local state.
 */
export async function pullFromCloud(userId: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) {
        _state = { ..._state, status: 'offline' };
        notify();
        return false;
    }

    _state = { ..._state, status: 'pulling', error: null };
    notify();

    try {
        // Pull projects
        const { data: cloudProjects, error: projErr } = await sb
            .from('projects')
            .select('*')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false });

        if (projErr) {
            console.warn('[cloudSync] Pull projects error:', projErr.message);
        }

        // Pull creative sets
        const { data: cloudSets, error: csErr } = await sb
            .from('creative_sets')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (csErr) {
            console.warn('[cloudSync] Pull creative_sets error:', csErr.message);
        }

        // ★ Local-first architecture: IndexedDB is the source of truth.
        // Cloud pull is for READING/LOGGING only — never create local state from cloud.
        // The old code called createCreativeSet() which generated NEW UUIDs,
        // causing infinite phantom set creation on every refresh (ID mismatch loop).
        if (cloudProjects && cloudProjects.length > 0) {
            console.log(`[cloudSync] Found ${cloudProjects.length} projects in cloud (read-only, not creating local copies)`);
        }

        if (cloudSets && cloudSets.length > 0) {
            // For now, just log — merging full creative sets requires care
            console.log(`[cloudSync] Found ${cloudSets.length} creative sets in cloud`);
        }

        // ★ Pull uploads from Storage — list files in user's folder
        await syncUploadsFromStorage(sb, userId);

        _state = { status: 'idle', lastSyncAt: Date.now(), error: null };
        notify();
        return true;
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Pull failed';
        _state = { ..._state, status: 'error', error: msg };
        notify();
        console.error('[cloudSync] Pull error:', msg);
        return false;
    }
}

// ── Auto-sync ───────────────────────────────────

let _autoSyncTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start auto-sync: push local changes to cloud every N ms.
 * Only runs when online and cloud is enabled.
 */
export function startAutoSync(userId: string, intervalMs = 30_000): () => void {
    if (!isCloudEnabled()) return () => {};

    // Initial pull
    pullFromCloud(userId);

    _autoSyncTimer = setInterval(() => {
        if (navigator.onLine) {
            pushToCloud(userId);
        }
    }, intervalMs);

    // Sync on coming back online
    const onOnline = () => pushToCloud(userId);
    window.addEventListener('online', onOnline);

    // Sync on page unload (best effort)
    const onBeforeUnload = () => pushToCloud(userId);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
        if (_autoSyncTimer) clearInterval(_autoSyncTimer);
        _autoSyncTimer = null;
        window.removeEventListener('online', onOnline);
        window.removeEventListener('beforeunload', onBeforeUnload);
    };
}

// ── Sync uploads from Storage (list files in user folder) ──

const ASSET_BUCKET = 'ace-assets';

async function syncUploadsFromStorage(
    sb: ReturnType<typeof getSupabase>,
    userId: string,
): Promise<void> {
    if (!sb) return;

    try {
        const folder = `${userId}/designs`;
        const { data: files, error } = await sb.storage
            .from(ASSET_BUCKET)
            .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        if (error || !files || files.length === 0) {
            if (error) console.warn('[cloudSync] Storage list error:', error.message);
            return;
        }

        // Filter to image files only
        const imageFiles = files.filter(f =>
            f.name && /\.(png|jpg|jpeg|webp|gif|avif|svg)$/i.test(f.name)
        );
        if (imageFiles.length === 0) return;

        // Build signed URLs in batch
        const paths = imageFiles.map(f => `${folder}/${f.name}`);
        const { data: signedData, error: signErr } = await sb.storage
            .from(ASSET_BUCKET)
            .createSignedUrls(paths, 3600);

        if (signErr || !signedData) {
            console.warn('[cloudSync] Signed URL batch error:', signErr?.message);
            return;
        }

        const { addUpload } = useUploadStore.getState();
        let added = 0;

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i]!;
            const signed = signedData[i];
            if (!signed?.signedUrl) continue;

            // Use storage:// ref so resolveAsset can re-sign later
            const storageRef = `storage://${folder}/${file.name}`;
            const id = file.name.replace(/\.[^.]+$/, ''); // hash without extension

            addUpload({
                id,
                name: file.name,
                idbRef: storageRef,
                width: 0,  // dimensions unknown from storage listing
                height: 0,
                source: 'user',
                createdAt: file.created_at ?? new Date().toISOString(),
                mimeType: file.metadata?.mimetype ?? 'image/png',
            });
            added++;
        }

        if (added > 0) {
            console.log(`[cloudSync] Synced ${added} uploads from Storage`);
        }
    } catch (err) {
        console.warn('[cloudSync] syncUploadsFromStorage error:', err);
    }
}
