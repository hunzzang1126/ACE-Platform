// ─────────────────────────────────────────────────
// backgroundRemovalService.test.ts
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { blobToDataUrl } from '@/services/backgroundRemovalService';

// NOTE: The actual removeBackground function requires WASM
// which is not available in vitest. We test the utility functions
// and verify the service module exports correctly.

describe('backgroundRemovalService', () => {
    describe('blobToDataUrl', () => {
        it('should convert a blob to a data URL', async () => {
            const blob = new Blob(['test content'], { type: 'text/plain' });
            const dataUrl = await blobToDataUrl(blob);
            expect(dataUrl).toMatch(/^data:text\/plain;base64,/);
        });

        it('should handle image blobs', async () => {
            // Create a minimal PNG-like blob
            const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
            const dataUrl = await blobToDataUrl(blob);
            expect(dataUrl).toMatch(/^data:image\/png;base64,/);
        });
    });

    describe('module exports', () => {
        it('should export removeBackground function', async () => {
            const mod = await import('@/services/backgroundRemovalService');
            expect(typeof mod.removeBackground).toBe('function');
        });

        it('should export removeBackgroundFromUrl function', async () => {
            const mod = await import('@/services/backgroundRemovalService');
            expect(typeof mod.removeBackgroundFromUrl).toBe('function');
        });

        it('should export blobToDataUrl function', async () => {
            const mod = await import('@/services/backgroundRemovalService');
            expect(typeof mod.blobToDataUrl).toBe('function');
        });
    });
});
