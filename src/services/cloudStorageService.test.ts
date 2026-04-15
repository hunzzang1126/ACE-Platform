// ─────────────────────────────────────────────────
// cloudStorageService.test.ts — Supabase Storage tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
    storage: {
        from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: null }),
            createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null }),
            remove: vi.fn().mockResolvedValue({ error: null }),
        }),
    },
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
};

vi.mock('@/services/supabaseClient', () => ({
    getSupabase: vi.fn().mockImplementation(() => mockSupabase),
}));

// Mock crypto.subtle
Object.defineProperty(globalThis, 'crypto', {
    value: {
        subtle: {
            digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        },
    },
    writable: true,
});

import {
    isStorageRef, isCloudUrl, getCurrentUserId,
    resolveCloudUrl, deleteFromCloud, uploadToCloud,
    clearSignedUrlCache,
} from './cloudStorageService';

describe('cloudStorageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearSignedUrlCache();  // ★ Prevent cache hits from previous tests
    });

    describe('isStorageRef', () => {
        it('should detect storage:// prefix', () => {
            expect(isStorageRef('storage://user-1/designs/abc.png')).toBe(true);
        });

        it('should reject non-storage refs', () => {
            expect(isStorageRef('idb://hash')).toBe(false);
            expect(isStorageRef('https://example.com')).toBe(false);
            expect(isStorageRef('data:image/png;base64,abc')).toBe(false);
        });
    });

    describe('isCloudUrl', () => {
        it('should detect Supabase signed URLs', () => {
            expect(isCloudUrl('https://xyz.supabase.co/storage/v1/object/sign/bucket/file.png')).toBe(true);
        });

        it('should reject non-Supabase URLs', () => {
            expect(isCloudUrl('https://example.com/img.png')).toBe(false);
        });
    });

    describe('getCurrentUserId', () => {
        it('should return user ID from auth', async () => {
            const id = await getCurrentUserId();
            expect(id).toBe('user-1');
        });

        it('should return null when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            const id = await getCurrentUserId();
            expect(id).toBeNull();
        });

        it('should return null when no user', async () => {
            mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
            const id = await getCurrentUserId();
            expect(id).toBeNull();
        });
    });

    describe('resolveCloudUrl', () => {
        it('should return null for non-storage refs', async () => {
            const result = await resolveCloudUrl('https://example.com');
            expect(result).toBeNull();
        });

        it('should resolve storage ref to signed URL', async () => {
            const result = await resolveCloudUrl('storage://user-1/designs/abc.png');
            expect(result).toBe('https://signed.url');
        });

        it('should return null when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            const result = await resolveCloudUrl('storage://user-1/designs/abc.png');
            expect(result).toBeNull();
        });
    });

    describe('deleteFromCloud', () => {
        it('should return false for non-storage refs', async () => {
            expect(await deleteFromCloud('idb://hash')).toBe(false);
        });

        it('should delete storage ref', async () => {
            const result = await deleteFromCloud('storage://user-1/designs/abc.png');
            expect(result).toBe(true);
        });

        it('should return false when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            expect(await deleteFromCloud('storage://user-1/designs/abc.png')).toBe(false);
        });
    });

    describe('uploadToCloud', () => {
        it('should return null when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            const result = await uploadToCloud(new Blob(['test']), 'uploads', 'user-1');
            expect(result).toBeNull();
        });

        it('should upload blob and return storage ref', async () => {
            const result = await uploadToCloud(new Blob(['test'], { type: 'image/png' }), 'designs', 'user-1');
            expect(result).toContain('storage://');
        });
    });

    // ── Template Storage (PUBLIC bucket) ──────────
    describe('isTemplateStorageRef', () => {
        it('should detect tmpl-storage:// prefix', async () => {
            const { isTemplateStorageRef } = await import('./cloudStorageService');
            expect(isTemplateStorageRef('tmpl-storage://abc123.png')).toBe(true);
        });

        it('should reject non-template refs', async () => {
            const { isTemplateStorageRef } = await import('./cloudStorageService');
            expect(isTemplateStorageRef('storage://user/file.png')).toBe(false);
            expect(isTemplateStorageRef('idb://hash')).toBe(false);
            expect(isTemplateStorageRef('https://example.com')).toBe(false);
        });
    });

    describe('uploadToTemplateStorage', () => {
        it('should return null when no supabase', async () => {
            const { getSupabase } = await import('@/services/supabaseClient');
            vi.mocked(getSupabase).mockReturnValueOnce(null);
            const { uploadToTemplateStorage } = await import('./cloudStorageService');
            const result = await uploadToTemplateStorage(new Blob(['test']));
            expect(result).toBeNull();
        });

        it('should upload blob and return tmpl-storage:// ref', async () => {
            const { uploadToTemplateStorage } = await import('./cloudStorageService');
            const result = await uploadToTemplateStorage(new Blob(['test'], { type: 'image/png' }));
            expect(result).toContain('tmpl-storage://');
        });
    });

    describe('resolveTemplateStorageUrl', () => {
        it('should return null for non-template refs', async () => {
            const { resolveTemplateStorageUrl } = await import('./cloudStorageService');
            expect(resolveTemplateStorageUrl('storage://user/file.png')).toBeNull();
        });

        it('should return public URL for template ref', async () => {
            mockSupabase.storage.from.mockReturnValueOnce({
                ...mockSupabase.storage.from(),
                getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://public.url/img.png' } }),
            });
            const { resolveTemplateStorageUrl } = await import('./cloudStorageService');
            const result = resolveTemplateStorageUrl('tmpl-storage://abc123.png');
            expect(result).toBe('https://public.url/img.png');
        });
    });
});
