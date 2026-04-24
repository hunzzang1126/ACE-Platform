// ─────────────────────────────────────────────────
// templateStoreHelpers — Admin CRUD + Cloud sync (extracted from templateStore)
// ─────────────────────────────────────────────────
// Re-exported from templateStore for backward compatibility.

import type { BannerVariant } from '@/schema/design.types';
import type { DesignTemplate, TemplateCategory } from './templateStore';
import {
    fetchTemplateOverrides,
    upsertTemplateOverride,
    deleteTemplateOverride,
} from '@/services/supabaseClient';
import { extractTemplateAssets } from '@/services/assetService';

// ── Admin: override template variant ──

export function createOverrideHandler(
    set: Function,
    get: Function,
) {
    return (id: string, variant: BannerVariant, width?: number, height?: number) => {
        const cleanVariant = {
            ...variant,
            elements: [...variant.elements]
                .map(el => ({ ...el, locked: false }))
                .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
        };
        const snapshot = JSON.stringify(cleanVariant);
        set((state: any) => {
            state.templateOverrides[id] = snapshot;
            const tmpl = state.templates.find((t: DesignTemplate) => t.id === id);
            if (tmpl) {
                tmpl.variantSnapshot = snapshot;
                if (width) tmpl.width = width;
                if (height) tmpl.height = height;
                tmpl.updatedAt = new Date().toISOString();
            }
            state.editingTemplateId = null;
        });
        // Push to Supabase (fire-and-forget)
        (async () => {
            try {
                const publicElements = await extractTemplateAssets(cleanVariant.elements);
                const publicVariant = { ...cleanVariant, elements: publicElements };
                const publicSnapshot = JSON.stringify(publicVariant);
                set((state: any) => {
                    state.templateOverrides[id] = publicSnapshot;
                    const t = state.templates.find((t: DesignTemplate) => t.id === id);
                    if (t) t.variantSnapshot = publicSnapshot;
                });
                const { useAuthStore } = await import('@/stores/authStore');
                const userId = useAuthStore.getState().user?.id;
                if (userId) {
                    const tmpl = (get() as any).templates.find((t: DesignTemplate) => t.id === id);
                    await upsertTemplateOverride(id, publicSnapshot, userId, tmpl?.width, tmpl?.height, tmpl?.name);
                }
            } catch (e) {
                console.warn('[templateStore] Failed to push override to cloud:', e);
            }
        })();
    };
}

// ── Admin: add custom template ──

export function createAddCustomHandler(
    set: Function,
    get: Function,
) {
    return (opts: { name: string; category: TemplateCategory; variant: BannerVariant }) => {
        const slug = opts.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .slice(0, 60) || 'custom-template';
        const existing = (get() as any).templates.map((t: DesignTemplate) => t.id);
        let id = slug;
        if (existing.includes(id)) {
            id = `${slug}-${Date.now().toString(36).slice(-4)}`;
        }
        const now = new Date().toISOString();
        const variantWithMeta = {
            ...opts.variant,
            __customMeta: { name: opts.name, category: opts.category },
        };
        const snapshot = JSON.stringify(variantWithMeta);
        set((state: any) => {
            state.templates.push({
                id, name: opts.name, description: '',
                category: opts.category, tags: ['custom'],
                thumbnailSrc: '', width: 1080, height: 1080,
                variantSnapshot: snapshot,
                usageCount: 0, isBuiltIn: false, isFavorite: false,
                createdAt: now, updatedAt: now,
            });
            state.templateOverrides[id] = snapshot;
        });
        // Push to Supabase
        (async () => {
            try {
                const publicElements = await extractTemplateAssets(opts.variant.elements);
                const publicVariant = { ...variantWithMeta, elements: publicElements };
                const publicSnapshot = JSON.stringify(publicVariant);
                set((state: any) => {
                    const t = state.templates.find((t: DesignTemplate) => t.id === id);
                    if (t) t.variantSnapshot = publicSnapshot;
                    state.templateOverrides[id] = publicSnapshot;
                });
                const { useAuthStore } = await import('@/stores/authStore');
                const userId = useAuthStore.getState().user?.id;
                if (userId) {
                    await upsertTemplateOverride(id, publicSnapshot, userId, 1080, 1080, opts.name);
                    console.log('[templateStore] Custom template pushed to cloud:', id);
                }
            } catch (e) {
                console.warn('[templateStore] Failed to push custom template:', e);
            }
        })();
        return id;
    };
}

// ── Cloud Sync ──

export async function syncFromCloud(set: Function) {
    try {
        const cloudOverrides = await fetchTemplateOverrides();
        const cloudIds = new Set(Object.keys(cloudOverrides));

        set((state: any) => {
            // Deletion sync
            state.templates = state.templates.filter((t: DesignTemplate) => {
                if (t.id.startsWith('tmpl-')) return true;
                if (cloudIds.has(t.id)) return true;
                console.log(`[templateStore] Removing deleted template: ${t.id} (${t.name})`);
                delete state.templateOverrides[t.id];
                return false;
            });

            // Add/update from cloud
            for (const [id, override] of Object.entries(cloudOverrides)) {
                state.templateOverrides[id] = override.snapshot;
                const tmpl = state.templates.find((t: DesignTemplate) => t.id === id);
                if (tmpl) {
                    tmpl.variantSnapshot = override.snapshot;
                    if (override.width) tmpl.width = override.width;
                    if (override.height) tmpl.height = override.height;
                    if (override.name) tmpl.name = override.name;
                    tmpl.updatedAt = new Date().toISOString();
                } else {
                    let metaName = override.name ?? 'Custom Template';
                    let metaCategory: TemplateCategory = 'social';
                    if (!override.name) {
                        try {
                            const parsed = JSON.parse(override.snapshot);
                            if (parsed.__customMeta?.name) metaName = parsed.__customMeta.name;
                            if (parsed.__customMeta?.category) metaCategory = parsed.__customMeta.category;
                        } catch { /* defaults */ }
                    }
                    state.templates.push({
                        id, name: metaName, description: '',
                        category: metaCategory, tags: ['custom'],
                        thumbnailSrc: '', width: override.width ?? 1080, height: override.height ?? 1080,
                        variantSnapshot: override.snapshot,
                        usageCount: 0, isBuiltIn: false, isFavorite: false,
                        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                    });
                }
            }
        });
        console.log('[templateStore] Synced', cloudIds.size, 'templates from cloud');
    } catch (e) {
        console.warn('[templateStore] Cloud sync failed:', e);
    }
}

// ── Admin: delete template ──

export function createDeleteCustomHandler(
    set: Function,
    get: Function,
) {
    return (id: string) => {
        const tmpl = (get() as any).templates.find((t: DesignTemplate) => t.id === id);
        set((state: any) => {
            state.templates = state.templates.filter((t: DesignTemplate) => t.id !== id);
            delete state.templateOverrides[id];
            if (tmpl?.isBuiltIn && !state.hiddenBuiltInIds.includes(id)) {
                state.hiddenBuiltInIds.push(id);
            }
        });
        deleteTemplateOverride(id).catch(e => {
            console.warn('[templateStore] Failed to delete template from cloud:', e);
        });
    };
}
