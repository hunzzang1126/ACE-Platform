// ─────────────────────────────────────────────────
// supabaseStorage — Template + BrandKit cloud CRUD
// ─────────────────────────────────────────────────
// Extracted from supabaseClient.ts to keep files under 400L.
// Re-exported from supabaseClient for backward compat.
// ─────────────────────────────────────────────────

import { getSupabase } from './supabaseClient';

// ── Template Overrides (Global) ─────────────────

export interface TemplateOverrideRow {
    template_id: string;
    variant_snapshot: any; // JSONB
    width?: number;
    height?: number;
    updated_by: string | null;
    updated_at: string;
}

/**
 * Fetch ALL template overrides from Supabase.
 * Returns a map of templateId → { snapshot, width, height }.
 */
export async function fetchTemplateOverrides(): Promise<
    Record<string, { snapshot: string; width?: number; height?: number; name?: string }>
> {
    const sb = getSupabase();
    if (!sb) return {};

    try {
        const { data, error } = await sb
            .from('template_overrides')
            .select('template_id, variant_snapshot, width, height, name');

        if (error || !data) {
            console.warn('[fetchTemplateOverrides] Error:', error?.message);
            return {};
        }

        const result: Record<string, { snapshot: string; width?: number; height?: number; name?: string }> = {};
        for (const row of data) {
            result[row.template_id] = {
                snapshot: typeof row.variant_snapshot === 'string'
                    ? row.variant_snapshot
                    : JSON.stringify(row.variant_snapshot),
                width: row.width ?? undefined,
                height: row.height ?? undefined,
                name: row.name ?? undefined,
            };
        }
        console.log('[fetchTemplateOverrides] Loaded', Object.keys(result).length, 'global overrides');
        return result;
    } catch (e) {
        console.warn('[fetchTemplateOverrides] Failed:', e);
        return {};
    }
}

/**
 * Upsert a template override to Supabase (admin only).
 */
export async function upsertTemplateOverride(
    templateId: string,
    variantSnapshot: string,
    userId: string,
    width?: number,
    height?: number,
    name?: string,
): Promise<{ error: string | null }> {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase not configured' };

    try {
        const payload: Record<string, unknown> = {
            template_id: templateId,
            variant_snapshot: JSON.parse(variantSnapshot),
            width: width ?? null,
            height: height ?? null,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        };
        if (name !== undefined) payload.name = name;

        const { data, error } = await sb
            .from('template_overrides')
            .upsert(payload, { onConflict: 'template_id' })
            .select('template_id')
            .single();

        if (error) {
            console.error('[upsertTemplateOverride] RLS or DB error:', error.message, error.details);
            return { error: error.message };
        }
        console.log('[upsertTemplateOverride] Saved override for', data?.template_id ?? templateId);
        return { error: null };
    } catch (e: any) {
        console.warn('[upsertTemplateOverride] Failed:', e);
        return { error: e.message ?? 'Unknown error' };
    }
}

/**
 * Delete a template override from Supabase (admin only).
 */
export async function deleteTemplateOverride(
    templateId: string,
): Promise<{ error: string | null }> {
    const sb = getSupabase();
    if (!sb) return { error: 'Supabase not configured' };

    try {
        const { error } = await sb
            .from('template_overrides')
            .delete()
            .eq('template_id', templateId);

        if (error) {
            console.warn('[deleteTemplateOverride] Error:', error.message);
            return { error: error.message };
        }
        console.log('[deleteTemplateOverride] Removed override for', templateId);
        return { error: null };
    } catch (e: any) {
        console.warn('[deleteTemplateOverride] Failed:', e);
        return { error: e.message ?? 'Unknown error' };
    }
}

// ── Brand Kit Cloud CRUD ────────────────────────

const BRAND_KIT_BUCKET = 'ace-assets';
const BRAND_KIT_FILE = 'brand_kit.json';

export async function pushBrandKitCloud(
    userId: string,
    _kitId: string,
    data: unknown,
): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    const path = `${userId}/brand/${BRAND_KIT_FILE}`;
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const { error } = await sb.storage.from(BRAND_KIT_BUCKET).upload(path, blob, { upsert: true });
    if (error) console.warn('[pushBrandKitCloud] Error:', error.message);
}

export async function pullBrandKitsCloud(
    userId: string,
): Promise<Array<{ id: string; data: unknown; updated_at: string }>> {
    const sb = getSupabase();
    if (!sb) return [];
    const folder = `${userId}/brand`;
    const { data: files, error: listError } = await sb.storage.from(BRAND_KIT_BUCKET).list(folder, { limit: 1, search: BRAND_KIT_FILE });
    if (listError || !files || files.length === 0) return [];
    const path = `${folder}/${BRAND_KIT_FILE}`;
    const { data, error } = await sb.storage.from(BRAND_KIT_BUCKET).download(path);
    if (error || !data) return [];
    try {
        const kit = JSON.parse(await data.text());
        return [{ id: kit.id ?? 'default', data: kit, updated_at: kit.updatedAt ?? new Date().toISOString() }];
    } catch {
        return [];
    }
}

export async function deleteBrandKitCloud(kitId: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const path = `${user.id}/brand/${BRAND_KIT_FILE}`;
    const { error } = await sb.storage.from(BRAND_KIT_BUCKET).remove([path]);
    if (error) console.warn('[deleteBrandKitCloud] Error:', error.message);
}
