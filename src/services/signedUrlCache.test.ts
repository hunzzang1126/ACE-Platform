// ─────────────────────────────────────────────────
// signedUrlCache.test — Tests for signed URL caching in cloudStorageService
// ─────────────────────────────────────────────────
// Verifies cache API, isStorageRef, isCloudUrl utilities.
// Integration tests (actual resolveCloudUrl) require Supabase mock —
// covered by cloudStorageService.test.ts.
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import {
    isStorageRef, isCloudUrl,
    clearSignedUrlCache, getSignedUrlCacheSize,
    resolveCloudUrl,
} from './cloudStorageService';

describe('signed URL cache API', () => {
    beforeEach(() => {
        clearSignedUrlCache();
    });

    it('cache starts empty', () => {
        expect(getSignedUrlCacheSize()).toBe(0);
    });

    it('clearSignedUrlCache resets to 0', () => {
        clearSignedUrlCache();
        expect(getSignedUrlCacheSize()).toBe(0);
    });

    it('resolveCloudUrl returns null for non-storage ref', async () => {
        const result = await resolveCloudUrl('idb://hash123');
        expect(result).toBeNull();
        expect(getSignedUrlCacheSize()).toBe(0);
    });

    it('resolveCloudUrl returns null for empty string', async () => {
        const result = await resolveCloudUrl('');
        expect(result).toBeNull();
    });

    it('resolveCloudUrl returns null for https:// URL', async () => {
        const result = await resolveCloudUrl('https://example.com/image.png');
        expect(result).toBeNull();
    });

    it('resolveCloudUrl returns null when Supabase unavailable', async () => {
        // Without Supabase initialized, resolveCloudUrl should gracefully return null
        const result = await resolveCloudUrl('storage://user-1/designs/test.png');
        expect(result).toBeNull();
        // Cache should NOT store nulls
        expect(getSignedUrlCacheSize()).toBe(0);
    });
});

describe('isStorageRef', () => {
    it('detects storage:// prefix', () => {
        expect(isStorageRef('storage://user-1/designs/abc.png')).toBe(true);
    });

    it('rejects idb:// prefix', () => {
        expect(isStorageRef('idb://hash123')).toBe(false);
    });

    it('rejects https:// prefix', () => {
        expect(isStorageRef('https://example.com/image.png')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isStorageRef('')).toBe(false);
    });

    it('rejects plain text', () => {
        expect(isStorageRef('not-a-ref')).toBe(false);
    });
});

describe('isCloudUrl', () => {
    it('detects supabase signed URLs', () => {
        expect(isCloudUrl('https://abc.supabase.co/storage/v1/object/signed/path')).toBe(true);
    });

    it('rejects non-supabase URLs', () => {
        expect(isCloudUrl('https://example.com/image.png')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isCloudUrl('')).toBe(false);
    });
});
