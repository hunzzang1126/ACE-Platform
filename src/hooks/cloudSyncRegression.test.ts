// ─────────────────────────────────────────────────
// cloudSyncRegression.test.ts — Cross-device sync regression guards
// ─────────────────────────────────────────────────
// Covers: Brand Kit, Creative Sets, Templates, Images
// All cloud-first: Supabase is source of truth.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

const readSrc = (path: string) => fs.readFileSync(path, 'utf-8');

// ═══════════════════════════════════════════════════
// 1. BRAND KIT CLOUD SYNC
// ═══════════════════════════════════════════════════

describe('★ REGRESSION GUARD: Brand Kit Cloud Sync', () => {
    it('supabaseClient exports pushBrandKitCloud', async () => {
        const mod = await import('@/services/supabaseClient');
        expect(typeof mod.pushBrandKitCloud).toBe('function');
    });

    it('supabaseClient exports pullBrandKitsCloud', async () => {
        const mod = await import('@/services/supabaseClient');
        expect(typeof mod.pullBrandKitsCloud).toBe('function');
    });

    it('supabaseClient exports deleteBrandKitCloud', async () => {
        const mod = await import('@/services/supabaseClient');
        expect(typeof mod.deleteBrandKitCloud).toBe('function');
    });

    it('brandKitHelpers exports syncBrandKitToCloud', async () => {
        const mod = await import('@/stores/brandKitHelpers');
        expect(typeof mod.syncBrandKitToCloud).toBe('function');
    });

    it('saveToBrandKit calls syncBrandKitToCloud after adding asset', () => {
        const src = readSrc('src/stores/brandKitHelpers.ts');
        expect(src).toContain('syncBrandKitToCloud(kitId)');
    });

    it('useCloudSync pulls brand kits on initial sync', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('pullBrandKitsCloud(userId)');
    });

    it('useCloudSync subscribes to brandKitStore changes', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('useBrandKitStore.subscribe');
    });

    it('useCloudSync pushes brand kit on change', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('pushBrandKitCloud(userId, kit.id, kit)');
    });

    it('useCloudSync deletes brand kit from cloud on removal', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('deleteBrandKitCloud(old.id)');
    });

    it('brand_kits_table.sql exists with RLS policies', () => {
        const sql = readSrc('supabase/brand_kits_table.sql');
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS brand_kits');
        expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
        expect(sql).toContain('auth.uid() = user_id');
    });

    it('brandKitStore uses IDB persistence (not localStorage)', () => {
        const src = readSrc('src/stores/brandKitStore.ts');
        expect(src).toContain('idbStorage');
        expect(src).toContain("name: 'glid-brand-kits'");
    });
});

// ═══════════════════════════════════════════════════
// 2. CREATIVE SET SYNC — Anti-Resurrection
// ═══════════════════════════════════════════════════

describe('★ REGRESSION GUARD: Creative Set Cloud Sync', () => {
    it('useCloudSync does NOT re-push local-only items to cloud', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('Dropping deleted CS (not in cloud)');
        expect(src).not.toContain('Pushing local-only creative sets');
    });

    it('useCloudSync uses RECENT_THRESHOLD for timing safety', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('RECENT_THRESHOLD');
        expect(src).toContain('60_000');
    });

    it('cloud data initializes mergedCS (cloud is source of truth)', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('const mergedCS: Record<string, CreativeSet> = {}');
        expect(src).toContain('cloudData.creativeSets');
    });

    it('applyMergedData has anti-resurrection guard for trash', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('ANTI-RESURRECTION GUARD');
        expect(src).toContain('trashedIds');
    });

    it('deleted projects are filtered from merged results', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('Dropping deleted project (not in cloud)');
    });

    it('store subscription detects deleted creative sets', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('deleteCreativeSetCloud(id)');
    });

    it('store subscription detects deleted projects', () => {
        const src = readSrc('src/hooks/useCloudSync.ts');
        expect(src).toContain('trashProject(old.id)');
    });
});

// ═══════════════════════════════════════════════════
// 3. TEMPLATE SYNC — Cloud-Only
// ═══════════════════════════════════════════════════

describe('★ REGRESSION GUARD: Template Cloud-Only Architecture', () => {
    it('templateStore does NOT import BUILT_IN_TEMPLATES', () => {
        const src = readSrc('src/stores/templateStore.ts');
        expect(src).not.toContain("import { BUILT_IN_TEMPLATES }");
        expect(src).toContain('BUILT_IN_TEMPLATES removed');
    });

    it('onRehydrateStorage purges isBuiltIn templates', () => {
        const src = readSrc('src/stores/templateStore.ts');
        expect(src).toContain('!t.isBuiltIn');
    });

    it('syncOverridesFromCloud is called on rehydrate', () => {
        const src = readSrc('src/stores/templateStore.ts');
        expect(src).toContain('syncOverridesFromCloud()');
    });

    it('clearOverride removes template instead of reverting to built-in', () => {
        const src = readSrc('src/stores/templateStore.ts');
        expect(src).toContain('Cloud-only: just remove the template');
        expect(src).not.toContain('Revert to built-in version');
    });
});

// ═══════════════════════════════════════════════════
// 4. IMAGE SYNC — Cloud-First
// ═══════════════════════════════════════════════════

describe('★ REGRESSION GUARD: Image Cloud-First Architecture', () => {
    it('fetchCloudUploads loads from Supabase Storage', async () => {
        const mod = await import('@/stores/uploadStore');
        expect(typeof mod.fetchCloudUploads).toBe('function');
    });

    it('SidebarUploadsTab fetches cloud images on mount', () => {
        const src = readSrc('src/components/editor/SidebarUploadsTab.tsx');
        expect(src).toContain('fetchCloudUploads');
        expect(src).toContain('cloudFetchedRef');
    });

    it('deleteFromCloud is used for Image Panel cleanup', () => {
        const src = readSrc('src/components/editor/SidebarUploadsTab.tsx');
        expect(src).toContain('deleteFromCloud');
    });

    it('extractAssets migrates idb:// to storage:// on save', () => {
        const src = readSrc('src/services/assetService.ts');
        expect(src).toContain('migrateIdbRefToCloud');
    });
});

// ═══════════════════════════════════════════════════
// 5. BRAND KIT IMAGE STORAGE
// ═══════════════════════════════════════════════════

describe('★ REGRESSION GUARD: Brand Kit Image Storage', () => {
    it('saveToBrandKit uploads to Supabase Storage', () => {
        const src = readSrc('src/stores/brandKitHelpers.ts');
        expect(src).toContain('uploadToCloud');
        expect(src).toContain("'brand'");
    });

    it('saveToBrandKit stores storage:// refs, not data URLs', () => {
        const src = readSrc('src/stores/brandKitHelpers.ts');
        expect(src).toContain('isStorageRef(src)');
    });

    it('saveToBrandKit generates and uploads thumbnails', () => {
        const src = readSrc('src/stores/brandKitHelpers.ts');
        expect(src).toContain('generateBrandThumb');
        expect(src).toContain('_thumb');
    });

    it('saveToBrandKit deduplicates by hash', () => {
        const src = readSrc('src/stores/brandKitHelpers.ts');
        expect(src).toContain('computeQuickHash');
    });
});
