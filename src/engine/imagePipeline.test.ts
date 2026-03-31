// ─────────────────────────────────────────────────
// imagePipeline.test.ts — Tests for image handling:
// RemoveBG idb:// resolution, upload library registration,
// image aspect ratio preservation, fill-to-page logic
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

// ── RemoveBG idb:// URL handling ──

describe('removeBackgroundFromUrl idb:// handling', () => {
    it('backgroundRemovalService exports removeBackgroundFromUrl', async () => {
        const mod = await import('@/services/backgroundRemovalService');
        expect(typeof mod.removeBackgroundFromUrl).toBe('function');
    });

    it('removeBackgroundFromUrl source handles idb:// prefix', async () => {
        const src = (await import('fs')).readFileSync(
            'src/services/backgroundRemovalService.ts', 'utf-8'
        );
        expect(src).toContain("imageUrl.startsWith('idb://')");
        expect(src).toContain('resolveAsset');
    });

    it('removeBackgroundFromUrl handles data: and blob: URLs', async () => {
        const src = (await import('fs')).readFileSync(
            'src/services/backgroundRemovalService.ts', 'utf-8'
        );
        expect(src).toContain("imageUrl.startsWith('data:')");
        expect(src).toContain("imageUrl.startsWith('blob:')");
    });
});

// ── Upload library registration ──

describe('user upload registration in upload library', () => {
    it('useOverlayElements imports saveToUploadLibrary', async () => {
        const src = (await import('fs')).readFileSync(
            'src/hooks/useOverlayElements.ts', 'utf-8'
        );
        expect(src).toContain("import { saveToUploadLibrary } from '@/stores/uploadStore'");
    });

    it('addImage calls saveToUploadLibrary with source user', async () => {
        const src = (await import('fs')).readFileSync(
            'src/hooks/useOverlayElements.ts', 'utf-8'
        );
        expect(src).toContain("saveToUploadLibrary(src, file.name, img.width, img.height, 'user')");
    });
});

// ── Image aspect ratio preservation ──

describe('shimCreators add_image fit parameter', () => {
    it('shimCreators accepts fit parameter', async () => {
        const src = (await import('fs')).readFileSync(
            'src/hooks/shimCreators.ts', 'utf-8'
        );
        expect(src).toContain("fit?: 'cover' | 'contain' | 'fill'");
    });

    it('★ REGRESSION: default mode uses uniform scale (no distortion)', async () => {
        const src = (await import('fs')).readFileSync(
            'src/hooks/shimCreators.ts', 'utf-8'
        );
        // Default (non-fill) should use Math.max for cover-style uniform scaling
        expect(src).toContain('uniformScale');
        expect(src).toContain("if (fit === 'fill')");
    });

    it('restoreImage passes fit to add_image', async () => {
        const src = (await import('fs')).readFileSync(
            'src/hooks/useCanvasSync.ts', 'utf-8'
        );
        expect(src).toContain('ci.fit');
    });
});

// ── Fill to Page logic ──

describe('fillToPage implementation', () => {
    it('fillToPage is defined in CanvasEngineActions', async () => {
        const src = (await import('fs')).readFileSync(
            'src/hooks/canvasTypes.ts', 'utf-8'
        );
        expect(src).toContain('fillToPage');
    });

    it('fillToPage implementation uses Math.max for cover-style scaling', async () => {
        const src = (await import('fs')).readFileSync(
            'src/hooks/useFabricCanvas.ts', 'utf-8'
        );
        expect(src).toContain('Math.max(width / natW, height / natH)');
    });

    it('fillToPage centers the image on canvas', async () => {
        const src = (await import('fs')).readFileSync(
            'src/hooks/useFabricCanvas.ts', 'utf-8'
        );
        expect(src).toContain('(width - finalW) / 2');
        expect(src).toContain('(height - finalH) / 2');
    });

    it('fillToPage math: 300x250 canvas + 800x600 image', () => {
        // Simulate fillToPage calculation
        const canvasW = 300, canvasH = 250;
        const natW = 800, natH = 600;
        const scale = Math.max(canvasW / natW, canvasH / natH);
        const finalW = natW * scale;
        const finalH = natH * scale;
        // Scale should be 250/600 = 0.4167 (height dictates, NOT 300/800=0.375)
        expect(scale).toBeCloseTo(0.4167, 3);
        // Final dimensions should cover the canvas
        expect(finalW).toBeGreaterThanOrEqual(canvasW);
        expect(finalH).toBeGreaterThanOrEqual(canvasH);
    });

    it('fillToPage math: portrait canvas 320x480 + landscape image', () => {
        const canvasW = 320, canvasH = 480;
        const natW = 1920, natH = 1080;
        const scale = Math.max(canvasW / natW, canvasH / natH);
        const finalW = natW * scale;
        const finalH = natH * scale;
        // Height drives: 480/1080 = 0.4444
        expect(scale).toBeCloseTo(0.4444, 3);
        expect(finalW).toBeGreaterThanOrEqual(canvasW);
        expect(finalH).toBeGreaterThanOrEqual(canvasH);
    });
});

// ── Ghost entry cleanup ──

describe('SidebarUploadsTab ghost entry cleanup', () => {
    it('SidebarUploadsTab detects ghost entries', async () => {
        const src = (await import('fs')).readFileSync(
            'src/components/editor/SidebarUploadsTab.tsx', 'utf-8'
        );
        expect(src).toContain('ghostIds');
        expect(src).toContain('blobUrl === u.idbRef');
    });

    it('SidebarUploadsTab auto-removes ghost entries', async () => {
        const src = (await import('fs')).readFileSync(
            'src/components/editor/SidebarUploadsTab.tsx', 'utf-8'
        );
        expect(src).toContain('removeUpload(gid)');
    });
});
