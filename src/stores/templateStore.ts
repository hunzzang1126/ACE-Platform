// ─────────────────────────────────────────────────
// templateStore — Design template library
// ─────────────────────────────────────────────────
// Save any design as a reusable template.
// Templates include layout, elements, animations, brand settings.
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { BannerVariant } from '@/schema/design.types';

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
        })),
        { name: 'ace-templates' },
    ),
);
