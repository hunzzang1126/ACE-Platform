// ─────────────────────────────────────────────────
// cloudSyncProjects — Project + Creative Set CRUD
// ─────────────────────────────────────────────────

import { getSupabase } from './supabaseClient';
import type { CreativeSet, CreativeSetSummary } from '@/schema/design.types';

interface CloudProject { id: string; user_id: string; name: string; folder_id: string | null; variant_count: number; created_at: string; updated_at: string; deleted_at: string | null; }
interface CloudCreativeSet { id: string; project_id: string; user_id: string; data: CreativeSet; version: number; created_at: string; updated_at: string; }

// ── Debounce ──
const _pendingSyncs = new Map<string, ReturnType<typeof setTimeout>>();
const SYNC_DEBOUNCE_MS = 1500;
export function debouncedSync(key: string, fn: () => Promise<void>) {
    const existing = _pendingSyncs.get(key);
    if (existing) clearTimeout(existing);
    _pendingSyncs.set(key, setTimeout(async () => { _pendingSyncs.delete(key); try { await fn(); } catch (e) { console.warn('[cloudSync] Background sync failed:', e); } }, SYNC_DEBOUNCE_MS));
}

// ── Projects ──
export async function pushProject(userId: string, project: CreativeSetSummary): Promise<void> {
    const sb = getSupabase(); if (!sb) return;
    const { error } = await sb.from('projects').upsert({ id: project.id, user_id: userId, name: project.name, folder_id: project.folderId ?? null, variant_count: project.variantCount, created_at: project.createdAt, updated_at: project.updatedAt }, { onConflict: 'id' });
    if (error) console.warn('[cloudSync] pushProject error:', error.message);
}
export function pushProjectDebounced(userId: string, project: CreativeSetSummary) { debouncedSync(`project-${project.id}`, () => pushProject(userId, project)); }
export async function pullProjects(userId: string): Promise<CreativeSetSummary[]> {
    const sb = getSupabase(); if (!sb) return [];
    const { data, error } = await sb.from('projects').select('*').eq('user_id', userId).is('deleted_at', null).order('updated_at', { ascending: false });
    if (error || !data) return [];
    return (data as CloudProject[]).map(p => ({ id: p.id, name: p.name, folderId: p.folder_id ?? undefined, variantCount: p.variant_count, createdAt: p.created_at, updatedAt: p.updated_at, createdBy: '' }));
}
export async function pullAllProjectsRaw(userId: string): Promise<{ id: string; name: string }[]> {
    const sb = getSupabase(); if (!sb) return [];
    const { data, error } = await sb.from('projects').select('id, name').eq('user_id', userId);
    if (error || !data) return [];
    return data as { id: string; name: string }[];
}
export async function trashProject(projectId: string): Promise<void> { const sb = getSupabase(); if (!sb) return; await sb.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', projectId); }
export async function restoreProject(projectId: string): Promise<void> { const sb = getSupabase(); if (!sb) return; await sb.from('projects').update({ deleted_at: null }).eq('id', projectId); }
export async function deleteProjectPermanently(projectId: string): Promise<void> {
    const sb = getSupabase(); if (!sb) return;
    const { error } = await sb.from('projects').delete().eq('id', projectId);
    if (error) throw new Error(`[cloudSync] deleteProject failed: ${error.message}`);
}

// ── Creative Sets ──
export async function pushCreativeSet(userId: string, cs: CreativeSet): Promise<void> {
    const sb = getSupabase(); if (!sb) return;
    await sb.from('projects').upsert({ id: cs.id, user_id: userId, name: cs.name, variant_count: cs.variants?.length ?? 1, created_at: cs.createdAt, updated_at: cs.updatedAt }, { onConflict: 'id' });
    const row = { id: cs.id, project_id: cs.id, user_id: userId, data: cs, version: 1, created_at: cs.createdAt, updated_at: cs.updatedAt };
    const { data: existing } = await sb.from('creative_sets').select('id').eq('id', cs.id).maybeSingle();
    if (existing) { await sb.from('creative_sets').update({ data: cs, updated_at: cs.updatedAt, version: 1 }).eq('id', cs.id); }
    else { await sb.from('creative_sets').insert(row); }
}
export function pushCreativeSetDebounced(userId: string, cs: CreativeSet) { debouncedSync(`cs-${cs.id}`, () => pushCreativeSet(userId, cs)); }
export async function pullCreativeSet(csId: string): Promise<CreativeSet | null> {
    const sb = getSupabase(); if (!sb) return null;
    const { data, error } = await sb.from('creative_sets').select('data').eq('id', csId).maybeSingle();
    if (error || !data) return null;
    return data.data as CreativeSet;
}
export async function pullAllCreativeSets(userId: string): Promise<Record<string, CreativeSet>> {
    const sb = getSupabase(); if (!sb) return {};
    const { data, error } = await sb.from('creative_sets').select('id, data').eq('user_id', userId);
    if (error || !data) return {};
    const result: Record<string, CreativeSet> = {};
    for (const row of data as CloudCreativeSet[]) { if (row.data) result[row.id] = row.data; }
    return result;
}
export async function deleteCreativeSetCloud(csId: string): Promise<void> {
    const sb = getSupabase(); if (!sb) return;
    const { error } = await sb.from('creative_sets').delete().eq('id', csId);
    if (error) throw new Error(`[cloudSync] deleteCreativeSet failed: ${error.message}`);
}
