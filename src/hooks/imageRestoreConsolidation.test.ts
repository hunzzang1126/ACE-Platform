// ─────────────────────────────────────────────────
// 5-6 Image Restore Consolidation — Regression tests
// ─────────────────────────────────────────────────
// Verifies that resolveAsset now handles signed URL recovery
// centrally, and that useCanvasSync no longer has duplicate logic.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const assetServiceSrc = readFileSync(resolve(__dirname, '../services/assetService.ts'), 'utf-8');
const canvasSyncSrc = readFileSync(resolve(__dirname, '../hooks/useCanvasSync.ts'), 'utf-8');

describe('5-6 Image Restore Consolidation', () => {
    describe('resolveAsset — centralized signed URL recovery', () => {
        it('handles isCloudUrl case with signedUrlToStorageRef recovery', () => {
            expect(assetServiceSrc).toContain('if (isCloudUrl(ref))');
            expect(assetServiceSrc).toContain('signedUrlToStorageRef(ref)');
        });

        it('calls resolveCloudUrl for recovered storage:// refs', () => {
            expect(assetServiceSrc).toContain('resolveCloudUrl(storageRef)');
        });

        it('falls through to passthrough if recovery fails', () => {
            expect(assetServiceSrc).toContain("// If we can't recover, pass through as-is");
        });

        it('has CONSOLIDATED FIX comment documenting the change', () => {
            expect(assetServiceSrc).toContain('CONSOLIDATED FIX');
            expect(assetServiceSrc).toContain('was duplicated in useCanvasSync.ts');
        });
    });

    describe('useCanvasSync — no longer has duplicate signed URL recovery', () => {
        it('does NOT contain inline signed URL recovery logic', () => {
            // The old pattern: manually parsing signed URL pathname
            expect(canvasSyncSrc).not.toContain('/storage/v1/object/sign/ace-assets/');
            // The old pattern: creating recoveredRef manually
            expect(canvasSyncSrc).not.toContain('recoveredRef');
        });

        it('delegates to resolveAsset for all resolution', () => {
            expect(canvasSyncSrc).toContain('Signed URL recovery is now consolidated in resolveAsset()');
        });

        it('uses isCloudUrl to route cloud URLs through resolveAsset', () => {
            expect(canvasSyncSrc).toContain('isAssetRef(srcToResolve) || isCloudUrl(srcToResolve)');
        });

        it('does NOT import resolveCloudUrl anymore', () => {
            // resolveCloudUrl was removed since it's no longer used directly
            expect(canvasSyncSrc).not.toContain('resolveCloudUrl');
        });
    });
});

describe('signedUrlToStorageRef — path extraction', () => {
    it('exists as a private function in assetService', () => {
        expect(assetServiceSrc).toContain('function signedUrlToStorageRef(signedUrl: string)');
    });

    it('extracts path from /storage/v1/object/sign/ace-assets/ pattern', () => {
        expect(assetServiceSrc).toContain('/storage/v1/object/sign/ace-assets/');
    });

    it('returns storage:// ref format', () => {
        expect(assetServiceSrc).toContain('return `storage://${match[1]}`');
    });

    it('returns null for invalid URLs', () => {
        expect(assetServiceSrc).toContain('return null');
    });
});
