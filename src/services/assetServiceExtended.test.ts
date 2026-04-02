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
});
