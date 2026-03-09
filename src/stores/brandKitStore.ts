// ─────────────────────────────────────────────────
// brandKitStore.ts — Brand Kit Library Cloud
// ─────────────────────────────────────────────────
// Persists brand assets (logos, product images, textures),
// palette, typography, and guidelines to localStorage.
// AI agents use this data for context-aware design generation.
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ── Asset Types ──

export type AssetCategory = 'logo' | 'product' | 'texture' | 'icon' | 'background' | 'photo';
export type AssetFormat = 'png' | 'svg' | 'jpg' | 'webp';

export interface BrandAsset {
    id: string;
    name: string;
    category: AssetCategory;
    tags: string[];
    /** Semantic role: 'primary_logo' | 'secondary_logo' | 'product_hero' | etc */
    role: string | null;
    /** Data URL or blob URL */
    src: string;
    /** 150px thumbnail (generated on upload) */
    thumbSrc: string;
    width: number;
    height: number;
    format: AssetFormat;
    sizeBytes: number;
    /** SHA-256 hash for dedup (Penpot pattern) */
    hash: string;
    uploadedAt: string;
    usageCount: number;
    isFavorite: boolean;
    /** Soft delete timestamp — null if active (Penpot pattern) */
    deletedAt: string | null;
    metadata: {
        hasTransparency: boolean;
        dominantColors: string[];
        suggestedPlacement: 'top-left' | 'top-right' | 'center' | 'bottom-center' | null;
    };
}

// ── Brand Palette ──

export interface BrandPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    gradients: BrandGradient[];
}

export interface BrandGradient {
    start: string;
    end: string;
    angle: number;
    name: string;
}

// ── Brand Typography ──

export interface BrandTypography {
    heading: { family: string; weights: number[]; letterSpacing: number };
    body: { family: string; weights: number[]; letterSpacing: number };
    cta: { family: string; weights: number[]; transform: 'uppercase' | 'none' | 'capitalize' };
}

// ── Brand Guidelines ──

export interface BrandGuidelines {
    name: string;
    industry: string;
    voiceTone: string;
    tagline: string;
    ctaPhrases: string[];
    forbiddenColors: string[];
    forbiddenWords: string[];
    logoPlacementRules: string;
}

// ── Brand Kit ──

export interface BrandKit {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    assets: BrandAsset[];
    palette: BrandPalette;
    typography: BrandTypography;
    guidelines: BrandGuidelines;
}

// ── Defaults ──

const DEFAULT_PALETTE: BrandPalette = {
    primary: '#c9a84c',
    secondary: '#1a1f2e',
    accent: '#ff6b35',
    background: '#0a0e1a',
    text: '#ffffff',
    gradients: [],
};

const DEFAULT_TYPOGRAPHY: BrandTypography = {
    heading: { family: 'Inter', weights: [700, 800], letterSpacing: -0.5 },
    body: { family: 'Inter', weights: [400, 500], letterSpacing: 0 },
    cta: { family: 'Inter', weights: [600, 700], transform: 'uppercase' },
};

const DEFAULT_GUIDELINES: BrandGuidelines = {
    name: '',
    industry: 'lifestyle',
    voiceTone: 'Professional',
    tagline: '',
    ctaPhrases: ['Learn More', 'Get Started', 'Shop Now'],
    forbiddenColors: [],
    forbiddenWords: [],
    logoPlacementRules: 'Logo top-right, minimum 20px from edges',
};

// ── Store Interface ──

interface BrandKitState {
    kits: BrandKit[];
    activeKitId: string | null;

    // CRUD
    createKit: (name: string) => string;
    deleteKit: (id: string) => void;
    setActiveKit: (id: string | null) => void;
    getActiveKit: () => BrandKit | null;

    // Asset Management
    addAsset: (kitId: string, asset: Omit<BrandAsset, 'id' | 'uploadedAt' | 'usageCount' | 'isFavorite' | 'deletedAt'>) => string;
    removeAsset: (kitId: string, assetId: string) => void;
    permanentDeleteAsset: (kitId: string, assetId: string) => void;
    updateAsset: (kitId: string, assetId: string, updates: Partial<BrandAsset>) => void;
    toggleFavorite: (kitId: string, assetId: string) => void;
    incrementUsage: (kitId: string, assetId: string) => void;

    // Query
    getAssetsByCategory: (kitId: string, category: AssetCategory) => BrandAsset[];
    getAssetsByTag: (kitId: string, tag: string) => BrandAsset[];
    getAssetsByRole: (kitId: string, role: string) => BrandAsset[];
    getFavorites: (kitId: string) => BrandAsset[];
    findDuplicate: (kitId: string, hash: string) => BrandAsset | null;

    // Palette / Typography / Guidelines
    updatePalette: (kitId: string, palette: Partial<BrandPalette>) => void;
    updateTypography: (kitId: string, typo: Partial<BrandTypography>) => void;
    updateGuidelines: (kitId: string, guidelines: Partial<BrandGuidelines>) => void;
}

// ── Helpers ──

function findKit(kits: BrandKit[], id: string): BrandKit | undefined {
    return kits.find(k => k.id === id);
}

function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Store Implementation ──

export const useBrandKitStore = create<BrandKitState>()(
    persist(
        immer((set, get) => ({
            kits: [],
            activeKitId: null,

            // ── CRUD ──

            createKit: (name) => {
                const id = generateId('bk');
                set(state => {
                    state.kits.push({
                        id,
                        name,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        assets: [],
                        palette: { ...DEFAULT_PALETTE },
                        typography: JSON.parse(JSON.stringify(DEFAULT_TYPOGRAPHY)),
                        guidelines: { ...DEFAULT_GUIDELINES, name },
                    });
                });
                return id;
            },

            deleteKit: (id) => {
                set(state => {
                    state.kits = state.kits.filter(k => k.id !== id);
                    if (state.activeKitId === id) state.activeKitId = null;
                });
            },

            setActiveKit: (id) => {
                set(state => { state.activeKitId = id; });
            },

            getActiveKit: () => {
                const { kits, activeKitId } = get();
                if (!activeKitId) return null;
                return findKit(kits, activeKitId) ?? null;
            },

            // ── Asset Management ──

            addAsset: (kitId, assetData) => {
                // ★ DEDUP CHECK (Penpot pattern)
                const existing = get().findDuplicate(kitId, assetData.hash);
                if (existing) return existing.id;

                const id = generateId('asset');
                set(state => {
                    const kit = findKit(state.kits, kitId);
                    if (!kit) return;
                    kit.assets.push({
                        ...assetData,
                        id,
                        uploadedAt: new Date().toISOString(),
                        usageCount: 0,
                        isFavorite: false,
                        deletedAt: null,
                    });
                    kit.updatedAt = new Date().toISOString();
                });
                return id;
            },

            removeAsset: (kitId, assetId) => {
                // ★ SOFT DELETE (Penpot pattern)
                set(state => {
                    const kit = findKit(state.kits, kitId);
                    if (!kit) return;
                    const asset = kit.assets.find(a => a.id === assetId);
                    if (asset) {
                        asset.deletedAt = new Date().toISOString();
                        kit.updatedAt = new Date().toISOString();
                    }
                });
            },

            permanentDeleteAsset: (kitId, assetId) => {
                set(state => {
                    const kit = findKit(state.kits, kitId);
                    if (!kit) return;
                    kit.assets = kit.assets.filter(a => a.id !== assetId);
                    kit.updatedAt = new Date().toISOString();
                });
            },

            updateAsset: (kitId, assetId, updates) => {
                set(state => {
                    const kit = findKit(state.kits, kitId);
                    if (!kit) return;
                    const asset = kit.assets.find(a => a.id === assetId);
                    if (asset) Object.assign(asset, updates);
                    kit.updatedAt = new Date().toISOString();
                });
            },

            toggleFavorite: (kitId, assetId) => {
                set(state => {
                    const kit = findKit(state.kits, kitId);
                    if (!kit) return;
                    const asset = kit.assets.find(a => a.id === assetId);
                    if (asset) asset.isFavorite = !asset.isFavorite;
                });
            },

            incrementUsage: (kitId, assetId) => {
                set(state => {
                    const kit = findKit(state.kits, kitId);
                    if (!kit) return;
                    const asset = kit.assets.find(a => a.id === assetId);
                    if (asset) asset.usageCount++;
                });
            },

            // ── Query ──

            getAssetsByCategory: (kitId, category) => {
                const kit = findKit(get().kits, kitId);
                if (!kit) return [];
                return kit.assets.filter(a => a.category === category && !a.deletedAt);
            },

            getAssetsByTag: (kitId, tag) => {
                const kit = findKit(get().kits, kitId);
                if (!kit) return [];
                const lower = tag.toLowerCase();
                return kit.assets.filter(a => !a.deletedAt && a.tags.some(t => t.toLowerCase() === lower));
            },

            getAssetsByRole: (kitId, role) => {
                const kit = findKit(get().kits, kitId);
                if (!kit) return [];
                return kit.assets.filter(a => a.role === role && !a.deletedAt);
            },

            getFavorites: (kitId) => {
                const kit = findKit(get().kits, kitId);
                if (!kit) return [];
                return kit.assets.filter(a => a.isFavorite && !a.deletedAt);
            },

            findDuplicate: (kitId, hash) => {
                const kit = findKit(get().kits, kitId);
                if (!kit) return null;
                return kit.assets.find(a => a.hash === hash && !a.deletedAt) ?? null;
            },

            // ── Palette / Typography / Guidelines ──

            updatePalette: (kitId, palette) => {
                set(state => {
                    const kit = findKit(state.kits, kitId);
                    if (!kit) return;
                    Object.assign(kit.palette, palette);
                    kit.updatedAt = new Date().toISOString();
                });
            },

            updateTypography: (kitId, typo) => {
                set(state => {
                    const kit = findKit(state.kits, kitId);
                    if (!kit) return;
                    if (typo.heading) Object.assign(kit.typography.heading, typo.heading);
                    if (typo.body) Object.assign(kit.typography.body, typo.body);
                    if (typo.cta) Object.assign(kit.typography.cta, typo.cta);
                    kit.updatedAt = new Date().toISOString();
                });
            },

            updateGuidelines: (kitId, guidelines) => {
                set(state => {
                    const kit = findKit(state.kits, kitId);
                    if (!kit) return;
                    Object.assign(kit.guidelines, guidelines);
                    kit.updatedAt = new Date().toISOString();
                });
            },
        })),
        { name: 'ace-brand-kits' },
    ),
);
