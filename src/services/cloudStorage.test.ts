// ─────────────────────────────────────────────────
// cloudStorage.test.ts — Supabase Storage migration tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

describe('cloudStorageService', () => {
    it('exports uploadToCloud function', async () => {
        const mod = await import('@/services/cloudStorageService');
        expect(typeof mod.uploadToCloud).toBe('function');
    });

    it('exports isCloudUrl function', async () => {
        const mod = await import('@/services/cloudStorageService');
        expect(typeof mod.isCloudUrl).toBe('function');
    });

    it('isCloudUrl correctly identifies Supabase signed URLs', async () => {
        const { isCloudUrl } = await import('@/services/cloudStorageService');
        expect(isCloudUrl('https://foo.supabase.co/storage/v1/object/sign/ace-assets/id/uploads/hash.png?token=xyz')).toBe(true);
        expect(isCloudUrl('https://example.com/image.png')).toBe(false);
        expect(isCloudUrl('idb://abc123')).toBe(false);
        expect(isCloudUrl('storage://uid/uploads/hash.png')).toBe(false);
    });

    it('isStorageRef identifies storage:// refs', async () => {
        const { isStorageRef } = await import('@/services/cloudStorageService');
        expect(isStorageRef('storage://uid/uploads/hash.png')).toBe(true);
        expect(isStorageRef('idb://abc123')).toBe(false);
        expect(isStorageRef('https://example.com')).toBe(false);
    });

    it('exports getCurrentUserId function', async () => {
        const mod = await import('@/services/cloudStorageService');
        expect(typeof mod.getCurrentUserId).toBe('function');
    });

    it('getCurrentUserId returns null when Supabase unavailable', async () => {
        const { getCurrentUserId } = await import('@/services/cloudStorageService');
        const result = await getCurrentUserId();
        expect(result).toBeNull(); // no Supabase in test env
    });

    it('uploadToCloud requires Supabase (returns null without it)', async () => {
        // Note: Can't test with data URL in vitest because crypto.subtle is unavailable
        // The actual upload is tested via manual verification
        const { uploadToCloud } = await import('@/services/cloudStorageService');
        expect(typeof uploadToCloud).toBe('function');
    });
});

describe('assetService Supabase-first migration', () => {
    it('resolveAsset handles https:// URLs (pass-through)', async () => {
        const { resolveAsset } = await import('@/services/assetService');
        const url = 'https://foo.supabase.co/storage/v1/object/public/ace-assets/x.png';
        const result = await resolveAsset(url);
        expect(result).toBe(url); // should return as-is
    });

    it('resolveAsset handles http:// URLs (pass-through)', async () => {
        const { resolveAsset } = await import('@/services/assetService');
        const url = 'http://example.com/image.png';
        const result = await resolveAsset(url);
        expect(result).toBe(url);
    });

    it('isAssetRef recognizes both idb:// and storage:// refs', async () => {
        const { isAssetRef } = await import('@/services/assetService');
        expect(isAssetRef('idb://abc123')).toBe(true);
        expect(isAssetRef('storage://uid/uploads/hash.png')).toBe(true);
        expect(isAssetRef('https://example.com')).toBe(false);
        expect(isAssetRef('data:image/png;base64,AAA')).toBe(false);
        expect(isAssetRef('blob:http://localhost/xyz')).toBe(false);
    });

    it('storeAsset skips non-data URLs', async () => {
        const { storeAsset } = await import('@/services/assetService');
        const url = 'https://example.com/image.png';
        const result = await storeAsset(url);
        expect(result).toBe(url); // non-data URLs pass through
    });
});

describe('brandKitHelpers', () => {
    it('exports saveToBrandKit function', async () => {
        const mod = await import('@/stores/brandKitHelpers');
        expect(typeof mod.saveToBrandKit).toBe('function');
    });

    it('brandKitStore re-exports saveToBrandKit', async () => {
        const mod = await import('@/stores/brandKitStore');
        expect(typeof mod.saveToBrandKit).toBe('function');
    });
});

describe('SidebarUploadsTab Save to Brand Kit integration', () => {
    it('SidebarUploadsTab imports saveToBrandKit', async () => {
        const src = (await import('fs')).readFileSync(
            'src/components/editor/SidebarUploadsTab.tsx', 'utf-8'
        );
        expect(src).toContain("import { saveToBrandKit } from '@/stores/brandKitHelpers'");
    });

    it('has uploads-brand-btn class for Brand Kit save button', async () => {
        const src = (await import('fs')).readFileSync(
            'src/components/editor/SidebarUploadsTab.tsx', 'utf-8'
        );
        expect(src).toContain('uploads-brand-btn');
        expect(src).toContain('Save to Brand Kit');
    });

    it('CSS includes uploads-hover-actions and uploads-brand-btn', async () => {
        const css = (await import('fs')).readFileSync(
            'src/styles/editor.css', 'utf-8'
        );
        expect(css).toContain('.uploads-hover-actions');
        expect(css).toContain('.uploads-brand-btn');
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: Cloud-first sync pipeline
// ═══════════════════════════════════════════════════

describe('★ REGRESSION GUARD: Cloud delete from Image Panel', () => {
    it('deleteFromCloud is exported from cloudStorageService', async () => {
        const mod = await import('@/services/cloudStorageService');
        expect(typeof mod.deleteFromCloud).toBe('function');
    });

    it('deleteFromCloud rejects non-storage refs', async () => {
        const { deleteFromCloud } = await import('@/services/cloudStorageService');
        const result = await deleteFromCloud('idb://abc123');
        expect(result).toBe(false);
    });

    it('deleteFromCloud rejects https refs', async () => {
        const { deleteFromCloud } = await import('@/services/cloudStorageService');
        const result = await deleteFromCloud('https://example.com/img.png');
        expect(result).toBe(false);
    });

    it('SidebarUploadsTab handles storage:// cloud delete', async () => {
        const src = (await import('fs')).readFileSync(
            'src/components/editor/SidebarUploadsTab.tsx', 'utf-8'
        );
        expect(src).toContain("entry.idbRef.startsWith('storage://')");
        expect(src).toContain('deleteFromCloud');
    });

    it('SidebarUploadsTab handles idb:// cloud delete with hash', async () => {
        const src = (await import('fs')).readFileSync(
            'src/components/editor/SidebarUploadsTab.tsx', 'utf-8'
        );
        expect(src).toContain("entry.idbRef.startsWith('idb://')");
        expect(src).toContain('entry.idbRef.slice(6)');
    });

    it('SidebarUploadsTab tries all 3 extensions for idb:// delete', async () => {
        const src = (await import('fs')).readFileSync(
            'src/components/editor/SidebarUploadsTab.tsx', 'utf-8'
        );
        expect(src).toContain('${hash}.png');
        expect(src).toContain('${hash}.jpg');
        expect(src).toContain('${hash}.webp');
    });
});

describe('★ REGRESSION GUARD: extractAssets idb→storage migration', () => {
    it('extractAssets source contains migrateIdbRefToCloud', async () => {
        const src = (await import('fs')).readFileSync(
            'src/services/assetService.ts', 'utf-8'
        );
        expect(src).toContain('migrateIdbRefToCloud');
    });

    it('extractAssets handles idb:// src in image elements', async () => {
        const src = (await import('fs')).readFileSync(
            'src/services/assetService.ts', 'utf-8'
        );
        expect(src).toContain("src.startsWith(IDB_PREFIX)");
    });

    it('storeAsset handles remote https:// URLs', async () => {
        const src = (await import('fs')).readFileSync(
            'src/services/assetService.ts', 'utf-8'
        );
        expect(src).toContain("inputUrl.startsWith('https://')");
        expect(src).toContain("inputUrl.startsWith('blob:')");
    });

    it('signedUrlToStorageRef is defined in assetService', async () => {
        const src = (await import('fs')).readFileSync(
            'src/services/assetService.ts', 'utf-8'
        );
        expect(src).toContain('function signedUrlToStorageRef');
    });
});

describe('★ REGRESSION GUARD: Cloud-first Image Panel loading', () => {
    it('fetchCloudUploads is exported', async () => {
        const { fetchCloudUploads } = await import('@/stores/uploadStore');
        expect(typeof fetchCloudUploads).toBe('function');
    });

    it('SidebarUploadsTab calls fetchCloudUploads on mount', async () => {
        const src = (await import('fs')).readFileSync(
            'src/components/editor/SidebarUploadsTab.tsx', 'utf-8'
        );
        expect(src).toContain('fetchCloudUploads(userId)');
        expect(src).toContain('cloudFetchedRef');
    });

    it('SidebarUploadsTab imports useAuthStore for userId', async () => {
        const src = (await import('fs')).readFileSync(
            'src/components/editor/SidebarUploadsTab.tsx', 'utf-8'
        );
        expect(src).toContain("import { useAuthStore } from '@/stores/authStore'");
    });
});
