// templateStore — Design template library (save, override, admin CRUD)
// ★ BUILT_IN_TEMPLATES removed — cloud-only architecture

import { idbStorage } from './idbStorageAdapter';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { BannerVariant } from '@/schema/design.types';
import {
    upsertTemplateOverride,
    deleteTemplateOverride,
} from '@/services/supabaseClient';
import { cleanupOrphanedTemplateCS } from './templateStoreCleanup';
import {
    createOverrideHandler,
    createAddCustomHandler,
    createDeleteCustomHandler,
    syncFromCloud,
} from './templateStoreHelpers';

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
    thumbnailSrc: string;
    width: number;
    height: number;
    variantSnapshot: string;
    brandKitId?: string;
    usageCount: number;
    isBuiltIn: boolean;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
}

interface TemplateState {
    templates: DesignTemplate[];
    templateOverrides: Record<string, string>;
    hiddenBuiltInIds: string[];
    editingTemplateId: string | null;
    editingTempCsId: string | null;

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
    overrideTemplate: (id: string, variant: BannerVariant, width?: number, height?: number) => void;
    clearOverride: (id: string) => void;
    setEditingTemplateId: (id: string | null) => void;
    setEditingTempCsId: (id: string | null) => void;
    addCustomTemplate: (opts: { name: string; category: TemplateCategory; variant: BannerVariant }) => string;
    deleteCustomTemplate: (id: string) => void;
    getByCategory: (category: TemplateCategory) => DesignTemplate[];
    getByTag: (tag: string) => DesignTemplate[];
    getFavorites: () => DesignTemplate[];
    search: (query: string) => DesignTemplate[];
    getById: (id: string) => DesignTemplate | undefined;
    instantiate: (templateId: string) => BannerVariant | null;
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
                        id, name: opts.name, description: opts.description ?? '',
                        category: opts.category, tags: opts.tags ?? [],
                        thumbnailSrc: opts.thumbnailSrc, width: opts.width, height: opts.height,
                        variantSnapshot: JSON.stringify(opts.variant),
                        brandKitId: opts.brandKitId, usageCount: 0,
                        isBuiltIn: false, isFavorite: false,
                        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                    });
                });
                return id;
            },

            deleteTemplate: (id) => { set(state => { state.templates = state.templates.filter(t => t.id !== id); }); },

            updateTemplate: (id, updates) => {
                set(state => {
                    const tmpl = state.templates.find(t => t.id === id);
                    if (!tmpl) return;
                    Object.assign(tmpl, updates);
                    tmpl.updatedAt = new Date().toISOString();
                });
                const tmpl = get().templates.find(t => t.id === id);
                if (tmpl) {
                    (async () => {
                        try {
                            const { useAuthStore } = await import('@/stores/authStore');
                            const userId = useAuthStore.getState().user?.id;
                            if (userId) await upsertTemplateOverride(id, tmpl.variantSnapshot, userId, tmpl.width, tmpl.height, tmpl.name);
                        } catch (err) { console.warn('[templateStore] Sync name update failed:', err); }
                    })();
                }
            },

            toggleFavorite: (id) => { set(state => { const t = state.templates.find(t => t.id === id); if (t) t.isFavorite = !t.isFavorite; }); },
            incrementUsage: (id) => { set(state => { const t = state.templates.find(t => t.id === id); if (t) t.usageCount++; }); },

            getByCategory: (category) => get().templates.filter(t => t.category === category),
            getByTag: (tag) => { const lower = tag.toLowerCase(); return get().templates.filter(t => t.tags.some(tg => tg.toLowerCase() === lower)); },
            getFavorites: () => get().templates.filter(t => t.isFavorite),
            search: (query) => { const q = query.toLowerCase(); return get().templates.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tg => tg.toLowerCase().includes(q))); },
            getById: (id) => get().templates.find(t => t.id === id),

            instantiate: (templateId) => {
                const tmpl = get().getById(templateId);
                if (!tmpl) return null;
                get().incrementUsage(templateId);
                try {
                    const variant: BannerVariant = JSON.parse(tmpl.variantSnapshot);
                    variant.id = `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                    return variant;
                } catch { return null; }
            },

            // ★ Delegated to templateStoreHelpers.ts
            overrideTemplate: (...args) => createOverrideHandler(set, get)(...args),
            clearOverride: (id) => {
                // Cloud-only: just remove the template (no built-in revert)
                set(state => { delete state.templateOverrides[id]; state.templates = state.templates.filter(t => t.id !== id); });
                deleteTemplateOverride(id).catch(e => console.warn('[templateStore] Failed to delete override:', e));
            },
            setEditingTemplateId: (id) => { set(state => { state.editingTemplateId = id; }); },
            setEditingTempCsId: (id) => { set(state => { state.editingTempCsId = id; }); },
            addCustomTemplate: (...args) => createAddCustomHandler(set, get)(...args),
            deleteCustomTemplate: (...args) => createDeleteCustomHandler(set, get)(...args),
            syncOverridesFromCloud: () => syncFromCloud(set),
        })),
        {
            name: 'ace-templates',
            storage: createJSONStorage(() => idbStorage),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                state.editingTemplateId = null;
                state.editingTempCsId = null;
                setTimeout(() => cleanupOrphanedTemplateCS(), 1000);
                const hiddenSet = new Set(state.hiddenBuiltInIds ?? []);
                state.templates = state.templates.filter(t => !t.isBuiltIn && !hiddenSet.has(t.id));
                if (state.templateOverrides && Object.keys(state.templateOverrides).length > 0) {
                    for (const [id, snapshot] of Object.entries(state.templateOverrides)) {
                        const tmpl = state.templates.find(t => t.id === id);
                        if (tmpl && snapshot) { tmpl.variantSnapshot = snapshot; tmpl.updatedAt = tmpl.updatedAt || new Date().toISOString(); }
                    }
                }
                setTimeout(() => useTemplateStore.getState().syncOverridesFromCloud(), 500);
            },
        },
    ),
);
