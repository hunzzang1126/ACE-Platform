// templateStore — Design template library (save, override, admin CRUD)

import { idbStorage } from './idbStorageAdapter';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { BannerVariant } from '@/schema/design.types';
// ★ BUILT_IN_TEMPLATES removed — templates are now cloud-only (Supabase)
import {
    fetchTemplateOverrides,
    upsertTemplateOverride,
    deleteTemplateOverride,
} from '@/services/supabaseClient';
import { cleanupOrphanedTemplateCS } from './templateStoreCleanup';
import { extractTemplateAssets } from '@/services/assetService';

// ── Types ──

export type TemplateCategory =
    | 'display'
    | 'social'
    | 'email'
    | 'video'
    | 'custom';

export interface DesignTemplate {
    id: string;
    name: string;
    description: string;
    category: TemplateCategory;
    tags: string[];
    /** Thumbnail data URL (auto-generated from canvas) */
    thumbnailSrc: string;
    /** Original canvas dimensions */
    width: number;
    height: number;
    /** Serialized variant data (elements, background, etc) */
    variantSnapshot: string; // JSON of BannerVariant
    /** Brand kit ID used when creating this template */
    brandKitId?: string;
    /** Usage count */
    usageCount: number;
    /** Is this a system/built-in template? */
    isBuiltIn: boolean;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
}

interface TemplateState {
    templates: DesignTemplate[];
    /** Admin overrides: maps template ID -> serialized variantSnapshot JSON */
    templateOverrides: Record<string, string>;
    /** Built-in template IDs hidden by admin */
    hiddenBuiltInIds: string[];
    /** Template currently being edited in canvas (admin only) */
    editingTemplateId: string | null;
    /** Temp creative set ID created for template editing (cleanup after save) */
    editingTempCsId: string | null;

    // CRUD
    saveAsTemplate: (opts: {
        name: string;
        description?: string;
        category: TemplateCategory;
        tags?: string[];
        thumbnailSrc: string;
        width: number;
        height: number;
        variant: BannerVariant;
        brandKitId?: string;
    }) => string;

    deleteTemplate: (id: string) => void;
    updateTemplate: (id: string, updates: Partial<Pick<DesignTemplate, 'name' | 'description' | 'category' | 'tags'>>) => void;
    toggleFavorite: (id: string) => void;
    incrementUsage: (id: string) => void;

    /** Admin: override a built-in template's variant snapshot */
    overrideTemplate: (id: string, variant: BannerVariant, width?: number, height?: number) => void;
    /** Admin: clear override and revert to built-in default */
    clearOverride: (id: string) => void;
    /** Set which template is being edited (null = not editing) */
    setEditingTemplateId: (id: string | null) => void;
    /** Set temp creative set ID for cleanup */
    setEditingTempCsId: (id: string | null) => void;

    /** Admin: add a brand-new custom template (1080×1080) */
    addCustomTemplate: (opts: { name: string; category: TemplateCategory; variant: BannerVariant }) => string;
    /** Admin: permanently delete a custom (non-built-in) template */
    deleteCustomTemplate: (id: string) => void;

    // Query
    getByCategory: (category: TemplateCategory) => DesignTemplate[];
    getByTag: (tag: string) => DesignTemplate[];
    getFavorites: () => DesignTemplate[];
    search: (query: string) => DesignTemplate[];
    getById: (id: string) => DesignTemplate | undefined;

    /** Instantiate a template -> returns variant data */
    instantiate: (templateId: string) => BannerVariant | null;

    /** Fetch global overrides from Supabase and apply to templates */
    syncOverridesFromCloud: () => Promise<void>;
}

function genId(): string {
    return `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useTemplateStore = create<TemplateState>()(
    persist(
        immer((set, get) => ({
            templates: [],
            templateOverrides: {} as Record<string, string>,
            hiddenBuiltInIds: [] as string[],
            editingTemplateId: null as string | null,
            editingTempCsId: null as string | null,

            saveAsTemplate: (opts) => {
                const id = genId();
                set(state => {
                    state.templates.push({
                        id,
                        name: opts.name,
                        description: opts.description ?? '',
                        category: opts.category,
                        tags: opts.tags ?? [],
                        thumbnailSrc: opts.thumbnailSrc,
                        width: opts.width,
                        height: opts.height,
                        variantSnapshot: JSON.stringify(opts.variant),
                        brandKitId: opts.brandKitId,
                        usageCount: 0,
                        isBuiltIn: false,
                        isFavorite: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                });
                return id;
            },

            deleteTemplate: (id) => {
                set(state => {
                    state.templates = state.templates.filter(t => t.id !== id);
                });
            },

            updateTemplate: (id, updates) => {
                set(state => {
                    const tmpl = state.templates.find(t => t.id === id);
                    if (!tmpl) return;
                    Object.assign(tmpl, updates);
                    tmpl.updatedAt = new Date().toISOString();
                });
            },

            toggleFavorite: (id) => {
                set(state => {
                    const tmpl = state.templates.find(t => t.id === id);
                    if (tmpl) tmpl.isFavorite = !tmpl.isFavorite;
                });
            },

            incrementUsage: (id) => {
                set(state => {
                    const tmpl = state.templates.find(t => t.id === id);
                    if (tmpl) tmpl.usageCount++;
                });
            },

            getByCategory: (category) =>
                get().templates.filter(t => t.category === category),

            getByTag: (tag) => {
                const lower = tag.toLowerCase();
                return get().templates.filter(t => t.tags.some(tg => tg.toLowerCase() === lower));
            },

            getFavorites: () =>
                get().templates.filter(t => t.isFavorite),

            search: (query) => {
                const q = query.toLowerCase();
                return get().templates.filter(t =>
                    t.name.toLowerCase().includes(q) ||
                    t.description.toLowerCase().includes(q) ||
                    t.tags.some(tg => tg.toLowerCase().includes(q))
                );
            },

            getById: (id) => get().templates.find(t => t.id === id),

            instantiate: (templateId) => {
                const tmpl = get().getById(templateId);
                if (!tmpl) return null;
                get().incrementUsage(templateId);
                try {
                    const variant: BannerVariant = JSON.parse(tmpl.variantSnapshot);
                    // Generate new IDs so it doesn't conflict
                    variant.id = `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                    return variant;
                } catch {
                    return null;
                }
            },

            overrideTemplate: (id, variant, width, height) => {
                // ★ Strip locked state — templates must be fully editable
                const cleanVariant = {
                    ...variant,
                    elements: [...variant.elements]
                        .map(el => ({ ...el, locked: false }))
                        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
                };
                const snapshot = JSON.stringify(cleanVariant);
                set(state => {
                    state.templateOverrides[id] = snapshot;
                    const tmpl = state.templates.find(t => t.id === id);
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
                        // ★ Extract images to PUBLIC template bucket before saving
                        const publicElements = await extractTemplateAssets(cleanVariant.elements);
                        const publicVariant = { ...cleanVariant, elements: publicElements };
                        const publicSnapshot = JSON.stringify(publicVariant);
                        // Update local state with public refs
                        set(state => {
                            state.templateOverrides[id] = publicSnapshot;
                            const t = state.templates.find(t => t.id === id);
                            if (t) t.variantSnapshot = publicSnapshot;
                        });
                        const { useAuthStore } = await import('@/stores/authStore');
                        const userId = useAuthStore.getState().user?.id;
                        if (userId) {
                            const tmpl = get().templates.find(t => t.id === id);
                            await upsertTemplateOverride(id, publicSnapshot, userId, tmpl?.width, tmpl?.height, tmpl?.name);
                        }
                    } catch (e) {
                        console.warn('[templateStore] Failed to push override to cloud:', e);
                    }
                })();
            },

            clearOverride: (id) => {
                set(state => {
                    delete state.templateOverrides[id];
                    // ★ Cloud-only: just remove the template (re-fetch from cloud if needed)
                    state.templates = state.templates.filter(t => t.id !== id);
                });
                // ★ Delete from Supabase (fire-and-forget)
                deleteTemplateOverride(id).catch(e => {
                    console.warn('[templateStore] Failed to delete override from cloud:', e);
                });
            },

            setEditingTemplateId: (id) => {
                set(state => { state.editingTemplateId = id; });
            },

            setEditingTempCsId: (id) => {
                set(state => { state.editingTempCsId = id; });
            },

            // ── Admin: add custom template ──
            addCustomTemplate: (opts) => {
                // ★ Use user-set name as ID (slugified for URL safety)
                const slug = opts.name
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .trim()
                    .replace(/\s+/g, '-')
                    .slice(0, 60) || 'custom-template';
                // Avoid collision with existing templates
                const existing = get().templates.map(t => t.id);
                let id = slug;
                if (existing.includes(id)) {
                    id = `${slug}-${Date.now().toString(36).slice(-4)}`;
                }
                const now = new Date().toISOString();
                // Embed metadata in variant for cloud sync
                const variantWithMeta = {
                    ...opts.variant,
                    __customMeta: { name: opts.name, category: opts.category },
                };
                const snapshot = JSON.stringify(variantWithMeta);
                set(state => {
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
                // Push to Supabase so all users see it
                (async () => {
                    try {
                        // ★ Extract images to PUBLIC template bucket
                        const publicElements = await extractTemplateAssets(opts.variant.elements);
                        const publicVariant = { ...variantWithMeta, elements: publicElements };
                        const publicSnapshot = JSON.stringify(publicVariant);
                        // Update local state with public refs
                        set(state => {
                            const t = state.templates.find(t => t.id === id);
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
            },

            // ── Admin: delete any template (built-in = hide, custom = remove) ──
            deleteCustomTemplate: (id) => {
                const tmpl = get().templates.find(t => t.id === id);
                set(state => {
                    state.templates = state.templates.filter(t => t.id !== id);
                    delete state.templateOverrides[id];
                    // If built-in, persist as hidden so it doesn't reappear on reload
                    if (tmpl?.isBuiltIn && !state.hiddenBuiltInIds.includes(id)) {
                        state.hiddenBuiltInIds.push(id);
                    }
                });
                deleteTemplateOverride(id).catch(e => {
                    console.warn('[templateStore] Failed to delete template from cloud:', e);
                });
            },

            syncOverridesFromCloud: async () => {
                try {
                    const cloudOverrides = await fetchTemplateOverrides();
                    if (Object.keys(cloudOverrides).length === 0) return;

                    set(state => {
                        for (const [id, override] of Object.entries(cloudOverrides)) {
                            state.templateOverrides[id] = override.snapshot;
                            const tmpl = state.templates.find(t => t.id === id);
                            if (tmpl) {
                                // Existing template — update snapshot + name
                                tmpl.variantSnapshot = override.snapshot;
                                if (override.width) tmpl.width = override.width;
                                if (override.height) tmpl.height = override.height;
                                if (override.name) tmpl.name = override.name;
                                tmpl.updatedAt = new Date().toISOString();
                            } else {
                                // ★ Unknown template from cloud — create locally (custom or renamed)
                                let metaName = override.name ?? 'Custom Template';
                                let metaCategory: TemplateCategory = 'social';
                                if (!override.name) {
                                    // Fallback: read from __customMeta embedded in snapshot
                                    try {
                                        const parsed = JSON.parse(override.snapshot);
                                        if (parsed.__customMeta?.name) metaName = parsed.__customMeta.name;
                                        if (parsed.__customMeta?.category) metaCategory = parsed.__customMeta.category;
                                    } catch { /* use defaults */ }
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
                    console.log('[templateStore] Synced', Object.keys(cloudOverrides).length, 'overrides from cloud');
                } catch (e) {
                    console.warn('[templateStore] Cloud sync failed (will use local):', e);
                }
            },
        })),
        {
            name: 'ace-templates',
            storage: createJSONStorage(() => idbStorage),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                // ★ Clear editing state (never persist mid-edit flags)
                state.editingTemplateId = null;
                state.editingTempCsId = null;

                // ★ Clean up orphaned template creative sets (deferred)
                setTimeout(() => cleanupOrphanedTemplateCS(), 1000);

                // ★ Cloud-only: purge ALL hardcoded built-in templates from cache.
                // Only cloud-sourced templates (from syncOverridesFromCloud) survive.
                const hiddenSet = new Set(state.hiddenBuiltInIds ?? []);
                state.templates = state.templates.filter(t => !t.isBuiltIn && !hiddenSet.has(t.id));

                // Re-apply LOCAL persisted overrides
                if (state.templateOverrides && Object.keys(state.templateOverrides).length > 0) {
                    for (const [id, snapshot] of Object.entries(state.templateOverrides)) {
                        const tmpl = state.templates.find(t => t.id === id);
                        if (tmpl && snapshot) {
                            tmpl.variantSnapshot = snapshot;
                            tmpl.updatedAt = tmpl.updatedAt || new Date().toISOString();
                        }
                    }
                }

                // Fetch CLOUD overrides async (all users get admin edits)
                setTimeout(() => useTemplateStore.getState().syncOverridesFromCloud(), 500);
            },
        },
    ),
);
