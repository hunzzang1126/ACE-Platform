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
                const snapshot = JSON.stringify(variant);
                // ★ Save override OUTSIDE immer set() to avoid cross-store deadlock
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
            },

            setEditingTemplateId: (id) => {
                set(state => { state.editingTemplateId = id; });
            },

            setEditingTempCsId: (id) => {
                set(state => { state.editingTempCsId = id; });
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

                // ★ Refresh built-in templates with latest code definitions
                const userTemplates = state.templates.filter(t => !t.isBuiltIn);
                const builtInIds = new Set(BUILT_IN_TEMPLATES.map(t => t.id));
                state.templates = [
                    ...BUILT_IN_TEMPLATES,
                    ...userTemplates.filter(t => !builtInIds.has(t.id)),
                ];

                // ★ Re-apply persisted overrides on top of refreshed built-ins
                // Admin edits are stored in templateOverrides and survive logout/reload
                if (state.templateOverrides && Object.keys(state.templateOverrides).length > 0) {
                    for (const [id, snapshot] of Object.entries(state.templateOverrides)) {
                        const tmpl = state.templates.find(t => t.id === id);
                        if (tmpl && snapshot) {
                            tmpl.variantSnapshot = snapshot;
                            tmpl.updatedAt = tmpl.updatedAt || new Date().toISOString();
                        }
                    }
                    console.log('[templateStore] Re-applied', Object.keys(state.templateOverrides).length, 'template overrides');
                }
            },
        },
    ),
);
