// ─────────────────────────────────────────────────
// templateStore — Design template library
// ─────────────────────────────────────────────────
// Save any design as a reusable template.
// Templates include layout, elements, animations, brand settings.
// ─────────────────────────────────────────────────

import { idbStorage } from './idbStorageAdapter';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { BannerVariant } from '@/schema/design.types';
import { BUILT_IN_TEMPLATES } from './builtInTemplates';
import {
    fetchTemplateOverrides,
    upsertTemplateOverride,
    deleteTemplateOverride,
} from '@/services/supabaseClient';

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
                // ★ CRITICAL: Strip locked state from ALL elements before saving.
                // Templates should always be fully editable. If admin accidentally
                // locks elements during editing, the lock MUST NOT persist into the
                // template override. Otherwise all future users get locked elements.
                const cleanVariant = {
                    ...variant,
                    elements: [...variant.elements]
                        .map(el => ({ ...el, locked: false })) // ★ Force-unlock: template overrides may have stale locked state
                        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
                };
                const snapshot = JSON.stringify(cleanVariant);
                console.log('[overrideTemplate] Saving override:', id, '| elements:', cleanVariant.elements.length, '| snapshot size:', snapshot.length);
                // ★ DEBUG: dump first text element to verify data
                for (const el of cleanVariant.elements) {
                    if (el.type === 'text') {
                        console.log('[overrideTemplate] TEXT element:', el.name, '| content:', (el as any).content?.substring(0, 30), '| fontFamily:', (el as any).fontFamily, '| fontSize:', (el as any).fontSize, '| x:', el.constraints?.horizontal?.offset, '| y:', el.constraints?.vertical?.offset, '| w:', el.constraints?.size?.width, '| h:', el.constraints?.size?.height);
                    }
                }
                // ★ Save locally first (immediate)
                set(state => {
                    state.templateOverrides[id] = snapshot;
                    const tmpl = state.templates.find(t => t.id === id);
                    if (tmpl) {
                        tmpl.variantSnapshot = snapshot;
                        if (width) tmpl.width = width;
                        if (height) tmpl.height = height;
                        tmpl.updatedAt = new Date().toISOString();
                        console.log('[overrideTemplate] Updated template in store:', tmpl.name, '| new snapshot elements:', cleanVariant.elements.length);
                    } else {
                        console.warn('[overrideTemplate] Template NOT found in store:', id);
                    }
                    state.editingTemplateId = null;
                });
                // ★ Push to Supabase (fire-and-forget) so ALL users see the change
                (async () => {
                    try {
                        const { useAuthStore } = await import('@/stores/authStore');
                        const userId = useAuthStore.getState().user?.id;
                        if (userId) {
                            const tmpl = get().templates.find(t => t.id === id);
                            const result = await upsertTemplateOverride(id, snapshot, userId, tmpl?.width, tmpl?.height);
                            if (result.error) {
                                console.error('[overrideTemplate] Cloud save FAILED:', result.error);
                            }
                        }
                    } catch (e) {
                        console.warn('[templateStore] Failed to push override to cloud:', e);
                    }
                })();
            },

            clearOverride: (id) => {
                set(state => {
                    delete state.templateOverrides[id];
                    // Revert to built-in version
                    const builtIn = BUILT_IN_TEMPLATES.find(t => t.id === id);
                    const tmpl = state.templates.find(t => t.id === id);
                    if (builtIn && tmpl) {
                        tmpl.variantSnapshot = builtIn.variantSnapshot;
                        tmpl.width = builtIn.width;
                        tmpl.height = builtIn.height;
                        tmpl.updatedAt = new Date().toISOString();
                    }
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

            syncOverridesFromCloud: async () => {
                try {
                    const cloudOverrides = await fetchTemplateOverrides();
                    if (Object.keys(cloudOverrides).length === 0) return;

                    set(state => {
                        for (const [id, override] of Object.entries(cloudOverrides)) {
                            // ★ Cloud overrides take precedence over local
                            state.templateOverrides[id] = override.snapshot;
                            const tmpl = state.templates.find(t => t.id === id);
                            if (tmpl) {
                                tmpl.variantSnapshot = override.snapshot;
                                if (override.width) tmpl.width = override.width;
                                if (override.height) tmpl.height = override.height;
                                tmpl.updatedAt = new Date().toISOString();
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

                // ★ REGRESSION GUARD: Clean up orphaned template creative sets.
                // If the app crashed or refreshed mid-template-edit, temp CSs named
                // "[Template] X" may be left behind in designStore/projectStore.
                // Deferred to avoid blocking rehydration and cross-store deadlock.
                // ★ REGRESSION GUARD: Use dynamic import() — NOT require().
                // Vite/ESM has no require(). require() causes ReferenceError crash.
                setTimeout(async () => {
                    try {
                        const { useDesignStore } = await import('@/stores/designStore');
                        const { useProjectStore } = await import('@/stores/projectStore');
                        const allCS = useDesignStore.getState().getAllCreativeSets();
                        for (const cs of allCS) {
                            if (cs.name.startsWith('[Template]')) {
                                console.log('[templateStore] Cleaning up orphaned template CS:', cs.id, cs.name);
                                useDesignStore.getState().deleteCreativeSet(cs.id);
                                useProjectStore.setState((s: any) => {
                                    s.creativeSets = s.creativeSets.filter((x: any) => x.id !== cs.id);
                                });
                            }
                        }
                    } catch (e) {
                        console.warn('[templateStore] Orphan cleanup failed:', e);
                    }
                }, 1000);

                // ★ Refresh built-in templates with latest code definitions
                const userTemplates = state.templates.filter(t => !t.isBuiltIn);
                const builtInIds = new Set(BUILT_IN_TEMPLATES.map(t => t.id));
                state.templates = [
                    ...BUILT_IN_TEMPLATES,
                    ...userTemplates.filter(t => !builtInIds.has(t.id)),
                ];

                // ★ Re-apply LOCAL persisted overrides immediately (fast)
                if (state.templateOverrides && Object.keys(state.templateOverrides).length > 0) {
                    for (const [id, snapshot] of Object.entries(state.templateOverrides)) {
                        const tmpl = state.templates.find(t => t.id === id);
                        if (tmpl && snapshot) {
                            tmpl.variantSnapshot = snapshot;
                            tmpl.updatedAt = tmpl.updatedAt || new Date().toISOString();
                        }
                    }
                    console.log('[templateStore] Re-applied', Object.keys(state.templateOverrides).length, 'local overrides');
                }

                // ★ Then fetch CLOUD overrides async (updates all users)
                // This runs AFTER hydration, so non-admin users get admin edits
                setTimeout(() => {
                    useTemplateStore.getState().syncOverridesFromCloud();
                }, 500); // slight delay to not block initial render
            },
        },
    ),
);
