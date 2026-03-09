// ─────────────────────────────────────────────────
// brandKitStore.test.ts — Brand Kit Library Tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useBrandKitStore } from './brandKitStore';
import type { BrandAsset } from './brandKitStore';

// Reset store before each test
beforeEach(() => {
    useBrandKitStore.setState({ kits: [], activeKitId: null });
});

// ── Helper: make a mock asset ──
function mockAsset(overrides: Partial<BrandAsset> = {}): Omit<BrandAsset, 'id' | 'uploadedAt' | 'usageCount' | 'isFavorite' | 'deletedAt'> {
    return {
        name: 'Test Logo',
        category: 'logo',
        tags: ['logo', 'test'],
        role: null,
        src: 'data:image/png;base64,abc',
        thumbSrc: 'data:image/webp;base64,thumb',
        width: 400,
        height: 200,
        format: 'png',
        sizeBytes: 5000,
        hash: `hash-${Math.random().toString(36).slice(2)}`,
        metadata: {
            hasTransparency: true,
            dominantColors: ['#ff0000', '#00ff00'],
            suggestedPlacement: 'top-right',
        },
        ...overrides,
    };
}

describe('brandKitStore — Kit CRUD', () => {
    it('creates a new kit and returns its id', () => {
        const id = useBrandKitStore.getState().createKit('Nike');
        expect(id).toMatch(/^bk-/);
        expect(useBrandKitStore.getState().kits).toHaveLength(1);
        expect(useBrandKitStore.getState().kits[0].name).toBe('Nike');
    });

    it('created kit has default palette, typography, and guidelines', () => {
        useBrandKitStore.getState().createKit('Adidas');
        const kit = useBrandKitStore.getState().kits[0];

        expect(kit.palette.primary).toBe('#c9a84c');
        expect(kit.typography.heading.family).toBe('Inter');
        expect(kit.guidelines.name).toBe('Adidas');
        expect(kit.guidelines.ctaPhrases).toContain('Shop Now');
    });

    it('deletes a kit', () => {
        const id = useBrandKitStore.getState().createKit('Temp');
        expect(useBrandKitStore.getState().kits).toHaveLength(1);
        useBrandKitStore.getState().deleteKit(id);
        expect(useBrandKitStore.getState().kits).toHaveLength(0);
    });

    it('deleting active kit resets activeKitId to null', () => {
        const id = useBrandKitStore.getState().createKit('Active');
        useBrandKitStore.getState().setActiveKit(id);
        expect(useBrandKitStore.getState().activeKitId).toBe(id);
        useBrandKitStore.getState().deleteKit(id);
        expect(useBrandKitStore.getState().activeKitId).toBeNull();
    });

    it('getActiveKit returns null when no kit is active', () => {
        expect(useBrandKitStore.getState().getActiveKit()).toBeNull();
    });

    it('getActiveKit returns the active kit', () => {
        const id = useBrandKitStore.getState().createKit('Nike');
        useBrandKitStore.getState().setActiveKit(id);
        const kit = useBrandKitStore.getState().getActiveKit();
        expect(kit).not.toBeNull();
        expect(kit!.name).toBe('Nike');
    });
});

describe('brandKitStore — Asset Management', () => {
    let kitId: string;

    beforeEach(() => {
        kitId = useBrandKitStore.getState().createKit('TestBrand');
    });

    it('adds an asset to a kit', () => {
        const assetId = useBrandKitStore.getState().addAsset(kitId, mockAsset());
        expect(assetId).toMatch(/^asset-/);

        const kit = useBrandKitStore.getState().kits[0];
        expect(kit.assets).toHaveLength(1);
        expect(kit.assets[0].name).toBe('Test Logo');
        expect(kit.assets[0].usageCount).toBe(0);
        expect(kit.assets[0].isFavorite).toBe(false);
        expect(kit.assets[0].deletedAt).toBeNull();
    });

    it('rejects duplicate assets by hash (Penpot dedup)', () => {
        const hash = 'unique-hash-123';
        const id1 = useBrandKitStore.getState().addAsset(kitId, mockAsset({ hash }));
        const id2 = useBrandKitStore.getState().addAsset(kitId, mockAsset({ hash, name: 'Duplicate' }));

        // Should return the SAME id (not create new)
        expect(id1).toBe(id2);

        const kit = useBrandKitStore.getState().kits[0];
        expect(kit.assets).toHaveLength(1);
    });

    it('soft-deletes an asset (sets deletedAt)', () => {
        const assetId = useBrandKitStore.getState().addAsset(kitId, mockAsset());
        useBrandKitStore.getState().removeAsset(kitId, assetId);

        const kit = useBrandKitStore.getState().kits[0];
        expect(kit.assets).toHaveLength(1); // still there
        expect(kit.assets[0].deletedAt).not.toBeNull();
    });

    it('permanent delete removes asset entirely', () => {
        const assetId = useBrandKitStore.getState().addAsset(kitId, mockAsset());
        useBrandKitStore.getState().permanentDeleteAsset(kitId, assetId);

        const kit = useBrandKitStore.getState().kits[0];
        expect(kit.assets).toHaveLength(0);
    });

    it('toggleFavorite flips isFavorite', () => {
        const assetId = useBrandKitStore.getState().addAsset(kitId, mockAsset());

        useBrandKitStore.getState().toggleFavorite(kitId, assetId);
        expect(useBrandKitStore.getState().kits[0].assets[0].isFavorite).toBe(true);

        useBrandKitStore.getState().toggleFavorite(kitId, assetId);
        expect(useBrandKitStore.getState().kits[0].assets[0].isFavorite).toBe(false);
    });

    it('incrementUsage increases count', () => {
        const assetId = useBrandKitStore.getState().addAsset(kitId, mockAsset());
        useBrandKitStore.getState().incrementUsage(kitId, assetId);
        useBrandKitStore.getState().incrementUsage(kitId, assetId);
        useBrandKitStore.getState().incrementUsage(kitId, assetId);

        expect(useBrandKitStore.getState().kits[0].assets[0].usageCount).toBe(3);
    });

    it('updateAsset modifies specific fields', () => {
        const assetId = useBrandKitStore.getState().addAsset(kitId, mockAsset());
        useBrandKitStore.getState().updateAsset(kitId, assetId, {
            name: 'Updated Logo',
            role: 'primary_logo',
            tags: ['logo', 'primary', 'white'],
        });

        const asset = useBrandKitStore.getState().kits[0].assets[0];
        expect(asset.name).toBe('Updated Logo');
        expect(asset.role).toBe('primary_logo');
        expect(asset.tags).toContain('primary');
    });
});

describe('brandKitStore — Queries', () => {
    let kitId: string;

    beforeEach(() => {
        kitId = useBrandKitStore.getState().createKit('QueryTest');
        useBrandKitStore.getState().addAsset(kitId, mockAsset({ name: 'Logo 1', category: 'logo', hash: 'h1', tags: ['nike', 'logo'] }));
        useBrandKitStore.getState().addAsset(kitId, mockAsset({ name: 'Logo 2', category: 'logo', hash: 'h2', tags: ['adidas', 'logo'] }));
        useBrandKitStore.getState().addAsset(kitId, mockAsset({ name: 'Product', category: 'product', hash: 'h3', tags: ['shoe'] }));
        useBrandKitStore.getState().addAsset(kitId, mockAsset({ name: 'BG', category: 'background', hash: 'h4', tags: ['gradient'] }));
    });

    it('getAssetsByCategory returns correct assets', () => {
        const logos = useBrandKitStore.getState().getAssetsByCategory(kitId, 'logo');
        expect(logos).toHaveLength(2);

        const products = useBrandKitStore.getState().getAssetsByCategory(kitId, 'product');
        expect(products).toHaveLength(1);
        expect(products[0].name).toBe('Product');
    });

    it('getAssetsByCategory excludes soft-deleted assets', () => {
        const logos = useBrandKitStore.getState().getAssetsByCategory(kitId, 'logo');
        useBrandKitStore.getState().removeAsset(kitId, logos[0].id);

        const afterDelete = useBrandKitStore.getState().getAssetsByCategory(kitId, 'logo');
        expect(afterDelete).toHaveLength(1); // only Logo 2 remains
    });

    it('getAssetsByTag returns matching assets (case-insensitive)', () => {
        const nikeAssets = useBrandKitStore.getState().getAssetsByTag(kitId, 'Nike');
        expect(nikeAssets).toHaveLength(1);
        expect(nikeAssets[0].name).toBe('Logo 1');
    });

    it('getAssetsByRole returns matching assets', () => {
        // Set a role on Logo 1
        const logos = useBrandKitStore.getState().getAssetsByCategory(kitId, 'logo');
        useBrandKitStore.getState().updateAsset(kitId, logos[0].id, { role: 'primary_logo' });

        const primary = useBrandKitStore.getState().getAssetsByRole(kitId, 'primary_logo');
        expect(primary).toHaveLength(1);
        expect(primary[0].name).toBe('Logo 1');
    });

    it('getFavorites returns only favorited active assets', () => {
        const logos = useBrandKitStore.getState().getAssetsByCategory(kitId, 'logo');
        useBrandKitStore.getState().toggleFavorite(kitId, logos[0].id);

        const favs = useBrandKitStore.getState().getFavorites(kitId);
        expect(favs).toHaveLength(1);
        expect(favs[0].name).toBe('Logo 1');
    });

    it('findDuplicate returns asset with matching hash', () => {
        const dup = useBrandKitStore.getState().findDuplicate(kitId, 'h1');
        expect(dup).not.toBeNull();
        expect(dup!.name).toBe('Logo 1');
    });

    it('findDuplicate returns null for unknown hash', () => {
        const dup = useBrandKitStore.getState().findDuplicate(kitId, 'nonexistent');
        expect(dup).toBeNull();
    });

    it('query on nonexistent kitId returns empty', () => {
        expect(useBrandKitStore.getState().getAssetsByCategory('fake', 'logo')).toEqual([]);
        expect(useBrandKitStore.getState().getAssetsByTag('fake', 'nike')).toEqual([]);
        expect(useBrandKitStore.getState().getFavorites('fake')).toEqual([]);
    });
});

describe('brandKitStore — Palette / Typography / Guidelines', () => {
    let kitId: string;

    beforeEach(() => {
        kitId = useBrandKitStore.getState().createKit('StyleTest');
    });

    it('updatePalette merges partial palette', () => {
        useBrandKitStore.getState().updatePalette(kitId, {
            primary: '#e60023',
            accent: '#ff6b35',
        });

        const kit = useBrandKitStore.getState().kits[0];
        expect(kit.palette.primary).toBe('#e60023');
        expect(kit.palette.accent).toBe('#ff6b35');
        expect(kit.palette.secondary).toBe('#1a1f2e'); // unchanged
    });

    it('updateTypography merges heading only', () => {
        useBrandKitStore.getState().updateTypography(kitId, {
            heading: { family: 'Montserrat', weights: [700, 900], letterSpacing: -1 },
        });

        const kit = useBrandKitStore.getState().kits[0];
        expect(kit.typography.heading.family).toBe('Montserrat');
        expect(kit.typography.body.family).toBe('Inter'); // unchanged
    });

    it('updateGuidelines merges partial guidelines', () => {
        useBrandKitStore.getState().updateGuidelines(kitId, {
            name: 'Nike',
            industry: 'sports',
            voiceTone: 'Bold, empowering',
            tagline: 'Just Do It',
            forbiddenColors: ['#00ff00'],
        });

        const kit = useBrandKitStore.getState().kits[0];
        expect(kit.guidelines.name).toBe('Nike');
        expect(kit.guidelines.industry).toBe('sports');
        expect(kit.guidelines.tagline).toBe('Just Do It');
        expect(kit.guidelines.forbiddenColors).toContain('#00ff00');
        expect(kit.guidelines.ctaPhrases).toContain('Shop Now'); // unchanged
    });
});
