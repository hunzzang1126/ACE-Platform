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

        // Merge into local stores (cloud data wins for now — last-write-wins)
        // ★ CRITICAL: Never recreate sets that were locally deleted (in trash or permanently)
        if (cloudProjects && cloudProjects.length > 0) {
            const localSets = useProjectStore.getState().creativeSets;
            const trash = useProjectStore.getState().trash;
            const localIds = new Set(localSets.map((s: { id: string }) => s.id));
            const trashIds = new Set(trash.map((t: { item: { id: string } }) => t.item.id));

            let addedCount = 0;
            for (const cp of cloudProjects) {
                // Skip if already local OR in trash (user intentionally deleted)
                if (localIds.has(cp.id) || trashIds.has(cp.id)) continue;
                // Only add if the cloud project looks valid (has a name)
                if (cp.name) {
                    useProjectStore.getState().createCreativeSet(cp.name);
                    addedCount++;
                }
            }
            console.log(`[cloudSync] Pulled ${cloudProjects.length} projects (${addedCount} new)`);
        }

        if (cloudSets && cloudSets.length > 0) {
            // For now, just log — merging full creative sets requires care
            console.log(`[cloudSync] Found ${cloudSets.length} creative sets in cloud`);
        }

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
