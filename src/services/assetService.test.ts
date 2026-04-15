// ─────────────────────────────────────────────────
// assetService.test.ts — Asset extraction + resolution tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock aceDB
vi.mock('@/stores/aceDB', () => ({
    aceDB: {
        assets: {
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue(undefined),
        },
    },
}));

// Mock cloudStorageService
vi.mock('./cloudStorageService', () => ({
    uploadToCloud: vi.fn().mockResolvedValue(null),
    isStorageRef: vi.fn((ref: string) => ref.startsWith('storage://')),
    isCloudUrl: vi.fn((ref: string) => ref.includes('.supabase.co')),
    getCurrentUserId: vi.fn().mockResolvedValue(null),
    resolveCloudUrl: vi.fn().mockResolvedValue(null),
    uploadToTemplateStorage: vi.fn().mockResolvedValue(null),
    isTemplateStorageRef: vi.fn((ref: string) => ref.startsWith('tmpl-storage://')),
    resolveTemplateStorageUrl: vi.fn().mockReturnValue(null),
}));

// Mock crypto.subtle
const mockDigest = vi.fn().mockResolvedValue(new ArrayBuffer(32));
Object.defineProperty(globalThis, 'crypto', {
    value: { subtle: { digest: mockDigest } },
    writable: true,
});

import { isAssetRef, isDataUrl, revokeAssetCache, resolveAsset } from './assetService';

describe('assetService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isAssetRef', () => {
        it('should detect idb:// references', () => {
            expect(isAssetRef('idb://abc123')).toBe(true);
        });

        it('should detect storage:// references', () => {
            expect(isAssetRef('storage://designs/img.png')).toBe(true);
        });

        it('should reject data URLs', () => {
            expect(isAssetRef('data:image/png;base64,abc')).toBe(false);
        });

        it('should reject https URLs', () => {
            expect(isAssetRef('https://example.com/img.png')).toBe(false);
        });

        it('should reject blob URLs', () => {
            expect(isAssetRef('blob:http://localhost/abc')).toBe(false);
        });
    });

    describe('isDataUrl', () => {
        it('should detect data URLs', () => {
            expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
        });

        it('should reject non-data URLs', () => {
            expect(isDataUrl('https://example.com')).toBe(false);
            expect(isDataUrl('idb://hash')).toBe(false);
        });
    });

    describe('resolveAsset', () => {
        it('should pass through https URLs', async () => {
            const url = 'https://example.com/img.png';
            const result = await resolveAsset(url);
            expect(result).toBe(url);
        });

        it('should pass through blob URLs', async () => {
            const url = 'blob:http://localhost/abc';
            const result = await resolveAsset(url);
            expect(result).toBe(url);
        });

        it('should return ref when idb asset not found', async () => {
            const ref = 'idb://missing-hash';
            const result = await resolveAsset(ref);
            expect(result).toBe(ref);
        });
    });

    describe('revokeAssetCache', () => {
        it('should not throw when cache is empty', () => {
            expect(() => revokeAssetCache()).not.toThrow();
        });
    });
});
