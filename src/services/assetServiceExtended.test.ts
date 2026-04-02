// ─────────────────────────────────────────────────
// assetServiceExtended.test.ts — storeAsset, resolveAsset, batch ops
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must use vi.hoisted for mock variables used in vi.mock factories
const { mockAssets, mockGetCurrentUserId, mockUploadToCloud, mockIsStorageRef, mockIsCloudUrl, mockResolveCloudUrl } = vi.hoisted(() => ({
    mockAssets: { get: vi.fn(), put: vi.fn() },
    mockGetCurrentUserId: vi.fn().mockResolvedValue(null),
    mockUploadToCloud: vi.fn().mockResolvedValue(null),
    mockIsStorageRef: vi.fn().mockReturnValue(false),
    mockIsCloudUrl: vi.fn().mockReturnValue(false),
    mockResolveCloudUrl: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/stores/aceDB', () => ({ aceDB: { assets: mockAssets } }));
vi.mock('./cloudStorageService', () => ({
    uploadToCloud: mockUploadToCloud,
    isStorageRef: mockIsStorageRef,
    isCloudUrl: mockIsCloudUrl,
    getCurrentUserId: mockGetCurrentUserId,
    resolveCloudUrl: mockResolveCloudUrl,
}));

import { isAssetRef, isDataUrl, extractAssets, resolveAssets, revokeAssetCache } from './assetService';

describe('isAssetRef', () => {
    it('should detect idb:// refs', () => {
        expect(isAssetRef('idb://abc123')).toBe(true);
    });

    it('should not detect normal URLs', () => {
        expect(isAssetRef('https://example.com/img.png')).toBe(false);
    });

    it('should detect storage:// refs', () => {
        mockIsStorageRef.mockReturnValueOnce(true);
        expect(isAssetRef('storage://path/to/file')).toBe(true);
    });
});

describe('isDataUrl', () => {
    it('should detect data: URLs', () => {
        expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
    });

    it('should reject non-data URLs', () => {
        expect(isDataUrl('https://example.com')).toBe(false);
        expect(isDataUrl('idb://hash')).toBe(false);
    });
});

describe('extractAssets', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should pass through non-image elements unchanged', async () => {
        const elements = [{ id: 'el1', type: 'shape' as const, name: 'Rect' }] as any[];
        const result = await extractAssets(elements);
        expect(result).toEqual(elements);
    });

    it('should pass through images with non-data URLs', async () => {
        const elements = [{ id: 'el1', type: 'image' as const, src: 'https://cdn.com/img.png' }] as any[];
        const result = await extractAssets(elements);
        expect(result[0].src).toBe('https://cdn.com/img.png');
    });
});

describe('resolveAssets', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should pass through non-image elements', async () => {
        const elements = [{ id: 'el1', type: 'text' as const, content: 'hi' }] as any[];
        const result = await resolveAssets(elements);
        expect(result).toEqual(elements);
    });

    it('should pass through images without asset refs', async () => {
        const elements = [{ id: 'el1', type: 'image' as const, src: 'https://cdn.com/img.png' }] as any[];
        const result = await resolveAssets(elements);
        expect(result[0].src).toBe('https://cdn.com/img.png');
    });
});

describe('revokeAssetCache', () => {
    it('should not throw when called', () => {
        expect(() => revokeAssetCache()).not.toThrow();
    });

    it('should be callable multiple times', () => {
        revokeAssetCache();
        revokeAssetCache();
        expect(true).toBe(true);
    });
});

import { storeAsset, resolveAsset } from './assetService';

describe('storeAsset', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should pass through non-data URLs', async () => {
        const result = await storeAsset('https://example.com/img.png');
        expect(result).toBe('https://example.com/img.png');
    });

    it('should pass through idb:// refs', async () => {
        const result = await storeAsset('idb://existinghash');
        expect(result).toBe('idb://existinghash');
    });

    it('should pass through blob: URLs', async () => {
        const result = await storeAsset('blob:http://localhost/uuid');
        expect(result).toBe('blob:http://localhost/uuid');
    });

    // NOTE: Tests that call storeAsset('data:...') are skipped —
    // crypto.subtle.digest() requires real browser ArrayBuffer (not jsdom).
    // Passthrough logic (non-data URLs) is validated above.
    // Full data URL extraction is an E2E concern.
});

describe('resolveAsset', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should pass through https URLs', async () => {
        const result = await resolveAsset('https://cdn.example.com/img.png');
        expect(result).toBe('https://cdn.example.com/img.png');
    });

    it('should pass through http URLs', async () => {
        const result = await resolveAsset('http://cdn.example.com/img.png');
        expect(result).toBe('http://cdn.example.com/img.png');
    });

    it('should pass through blob URLs', async () => {
        const result = await resolveAsset('blob:http://localhost/uuid');
        expect(result).toBe('blob:http://localhost/uuid');
    });

    it('should resolve idb:// ref from IndexedDB', async () => {
        const buffer = new ArrayBuffer(4);
        mockAssets.get.mockResolvedValue({ id: 'hash', buffer, mimeType: 'image/png', savedAt: 1000 });

        const result = await resolveAsset('idb://hash');
        expect(result).toContain('blob:');
    });

    it('should return ref when idb:// asset not found', async () => {
        mockAssets.get.mockResolvedValue(undefined);

        const result = await resolveAsset('idb://missing');
        expect(result).toBe('idb://missing');
    });

    it('should resolve storage:// ref via cloud', async () => {
        mockIsStorageRef.mockReturnValue(true);
        mockResolveCloudUrl.mockResolvedValue('https://signed-url.com/img.png');

        const result = await resolveAsset('storage://designs/user/hash.png');
        expect(result).toBe('https://signed-url.com/img.png');
    });

    it('should return storage ref when cloud unreachable', async () => {
        mockIsStorageRef.mockReturnValue(true);
        mockResolveCloudUrl.mockResolvedValue(null);

        const result = await resolveAsset('storage://designs/user/hash.png');
        expect(result).toBe('storage://designs/user/hash.png');
    });

    it('should pass through cloud URLs', async () => {
        mockIsStorageRef.mockReturnValue(false);
        mockIsCloudUrl.mockReturnValue(true);

        const result = await resolveAsset('https://supabase.co/storage/img.png');
        expect(result).toBe('https://supabase.co/storage/img.png');
    });
});

describe('extractAssets — passthrough behavior', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should keep non-image elements untouched (no data URLs)', async () => {
        const elements = [
            { id: 'txt', type: 'text' as const, content: 'Hello' },
            { id: 'img', type: 'image' as const, src: 'https://cdn.com/img.png' },
        ] as any[];
        const result = await extractAssets(elements);
        expect(result[0].type).toBe('text');
        expect(result[1].src).toBe('https://cdn.com/img.png');
    });

    it('should passthrough idb:// images without re-extraction', async () => {
        const elements = [{ id: 'img', type: 'image' as const, src: 'idb://alreadystored' }] as any[];
        const result = await extractAssets(elements);
        expect(result[0].src).toBe('idb://alreadystored');
    });
});

describe('resolveAssets — non-idb passthrough', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should passthrough images with https src', async () => {
        const elements = [{ id: 'img1', type: 'image' as const, src: 'https://cdn.com/img.png' }] as any[];
        const result = await resolveAssets(elements);
        expect(result[0].src).toBe('https://cdn.com/img.png');
    });

    it('should passthrough shape elements', async () => {
        const elements = [{ id: 'r', type: 'shape' as const, name: 'bg' }] as any[];
        const result = await resolveAssets(elements);
        expect(result[0].type).toBe('shape');
    });
});

