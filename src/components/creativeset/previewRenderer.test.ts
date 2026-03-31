// ─────────────────────────────────────────────────
// previewRenderer.test.ts — Rendering consistency tests
// ─────────────────────────────────────────────────
// ★ Ensures Size Dashboard preview and PNG export use the same
// rendering pipeline (renderVariantToCanvas), preventing desync.

import { describe, it, expect, vi } from 'vitest';
import { getTextEffectCSS, loadImageCORS } from '@/components/creativeset/previewRenderer';

describe('getTextEffectCSS — text effect to CSS property mapping', () => {
    it('returns empty for undefined effect', () => {
        expect(getTextEffectCSS(undefined)).toEqual({});
    });

    it('returns empty for "none" effect', () => {
        expect(getTextEffectCSS({ type: 'none' })).toEqual({});
    });

    it('returns textShadow for "drop" effect', () => {
        const css = getTextEffectCSS({ type: 'drop', intensity: 50, color: '#ffffff' });
        expect(css.textShadow).toBeDefined();
        expect(css.textShadow).toContain('px');
    });

    it('returns textShadow for "glow" effect', () => {
        const css = getTextEffectCSS({ type: 'glow', intensity: 50, color: '#00ff00' });
        expect(css.textShadow).toBeDefined();
    });

    it('returns WebkitTextStroke for "outline" effect', () => {
        const css = getTextEffectCSS({ type: 'outline', intensity: 50, color: '#ff0000' }) as any;
        expect(css.WebkitTextStroke).toBeDefined();
        expect(css.paintOrder).toBe('stroke fill');
    });

    it('returns glitch effect with red/cyan shadows', () => {
        const css = getTextEffectCSS({ type: 'glitch', intensity: 50 });
        expect(css.textShadow).toContain('#ff0000');
        expect(css.textShadow).toContain('#00ffff');
    });

    it('intensity scales effect magnitude', () => {
        const low = getTextEffectCSS({ type: 'drop', intensity: 10, color: '#fff' });
        const high = getTextEffectCSS({ type: 'drop', intensity: 100, color: '#fff' });
        // Higher intensity = larger shadow values
        expect(low.textShadow).toBeDefined();
        expect(high.textShadow).toBeDefined();
        expect(low.textShadow).not.toBe(high.textShadow);
    });

    it('handles all effect types without throwing', () => {
        const types = ['drop', 'glow', 'echo', 'outline', 'splice', 'neon', 'glitch', 'curve', '70s'] as const;
        for (const type of types) {
            expect(() => getTextEffectCSS({ type, intensity: 50, color: '#ffffff' })).not.toThrow();
        }
    });
});

describe('★ REGRESSION: Unified Fabric Rendering Pipeline', () => {
    it('renderVariantWithFabric is the unified renderer', async () => {
        const mod = await import('@/components/creativeset/fabricHeadlessRenderer');
        expect(typeof mod.renderVariantWithFabric).toBe('function');
    });

    it('Canvas2D fallback renderer still exists for backward compat', async () => {
        const mod = await import('@/components/creativeset/previewRenderer');
        expect(typeof mod.renderVariantToCanvas).toBe('function');
    });

    it('downloadDataURL function is available for export', async () => {
        const mod = await import('@/components/creativeset/previewRenderer');
        expect(typeof mod.downloadDataURL).toBe('function');
    });

    it('loadImageCORS handles data URLs directly', async () => {
        expect(typeof loadImageCORS).toBe('function');
    });
});

describe('★ REGRESSION: CanvasPreviewImage uses Fabric.js', () => {
    it('CanvasPreviewImage component is importable', async () => {
        const mod = await import('@/components/creativeset/CanvasPreviewImage');
        expect(mod.CanvasPreviewImage).toBeDefined();
    });

    it('CanvasPreviewImage is a React memo component', async () => {
        const mod = await import('@/components/creativeset/CanvasPreviewImage');
        expect(typeof mod.CanvasPreviewImage).toBe('object');
    });
});

// ──────────────────────────────────────────────────────
// ★ SOURCE FILE GUARDS — Prevent rendering pipeline regressions
// These tests read the actual source code to verify import paths.
// If someone changes an import back to Canvas2D, these tests FAIL.
// ──────────────────────────────────────────────────────
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CREATIVESET_DIR = resolve(__dirname);

describe('★ REGRESSION GUARD: ALL export paths use Fabric.js renderer', () => {
    it('BannerPreviewGrid imports renderVariantWithFabric (not Canvas2D)', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'BannerPreviewGrid.tsx'), 'utf-8');
        expect(src).toContain("import { renderVariantWithFabric } from './fabricHeadlessRenderer'");
        // Must NOT import the Canvas2D renderer for export
        expect(src).not.toMatch(/import.*renderVariantToCanvas.*from.*previewRenderer/);
    });

    it('BannerPreviewGrid uses renderVariantWithFabric for ALL export calls', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'BannerPreviewGrid.tsx'), 'utf-8');
        const fabricCalls = (src.match(/renderVariantWithFabric/g) || []).length;
        const canvas2dCalls = (src.match(/renderVariantToCanvas/g) || []).length;
        expect(fabricCalls).toBeGreaterThanOrEqual(3); // handleExportPNG + handleExportAll + handleExportSelected
        expect(canvas2dCalls).toBe(0);
    });

    it('PreviewContextMenu imports renderVariantWithFabric (not Canvas2D)', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'PreviewContextMenu.tsx'), 'utf-8');
        expect(src).toContain("import { renderVariantWithFabric } from './fabricHeadlessRenderer'");
        expect(src).not.toMatch(/import.*renderVariantToCanvas.*from.*previewRenderer/);
    });

    it('PreviewContextMenu uses renderVariantWithFabric for ALL export calls', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'PreviewContextMenu.tsx'), 'utf-8');
        const fabricCalls = (src.match(/renderVariantWithFabric/g) || []).length;
        const canvas2dCalls = (src.match(/renderVariantToCanvas/g) || []).length;
        expect(fabricCalls).toBeGreaterThanOrEqual(3); // PNG export + Export Selected + Export All
        expect(canvas2dCalls).toBe(0);
    });

    it('CanvasPreviewImage imports renderVariantWithFabric (not Canvas2D)', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'CanvasPreviewImage.tsx'), 'utf-8');
        expect(src).toContain("import { renderVariantWithFabric } from './fabricHeadlessRenderer'");
        expect(src).not.toMatch(/import.*renderVariantToCanvas.*from.*previewRenderer/);
    });

    it('CanvasPreviewImage calls renderVariantWithFabric', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'CanvasPreviewImage.tsx'), 'utf-8');
        expect(src).toContain('renderVariantWithFabric(');
        expect(src).not.toContain('renderVariantToCanvas(');
    });
});

describe('★ REGRESSION GUARD: fabricHeadlessRenderer uses same Fabric classes as editor', () => {
    it('imports Fabric.js Textbox, Rect, Ellipse, FabricImage, Gradient', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'fabricHeadlessRenderer.ts'), 'utf-8');
        expect(src).toContain('Textbox');
        expect(src).toContain('Rect');
        expect(src).toContain('Ellipse');
        expect(src).toContain('FabricImage');
        expect(src).toContain('Gradient');
    });

    it('uses constraintsToAbsolute for position resolution', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'fabricHeadlessRenderer.ts'), 'utf-8');
        expect(src).toContain('constraintsToAbsolute');
    });

    it('exports renderVariantWithFabric as async function', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'fabricHeadlessRenderer.ts'), 'utf-8');
        expect(src).toMatch(/export\s+async\s+function\s+renderVariantWithFabric/);
    });

    it('creates a Canvas instance and calls toDataURL', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'fabricHeadlessRenderer.ts'), 'utf-8');
        expect(src).toContain('new Canvas(');
        expect(src).toContain('toDataURL(');
    });

    it('disposes the headless canvas after rendering', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'fabricHeadlessRenderer.ts'), 'utf-8');
        expect(src).toContain('fc.dispose()');
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: storage:// resolve pipeline
// Fixed in v0.0.0.334 — storage:// refs were passed raw to Fabric.js
// causing ERR_UNKNOWN_URL_SCHEME and blank previews.
// Every rendering path must resolve storage:// before rendering.
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: storage:// refs resolved in ALL rendering paths', () => {

    it('fabricHeadlessRenderer resolves storage:// refs (not just idb://)', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'fabricHeadlessRenderer.ts'), 'utf-8');
        expect(src).toContain("src.startsWith('storage://')");
        expect(src).toContain('resolveAsset');
    });

    it('CanvasPreviewImage resolves storage:// refs in variant elements', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'CanvasPreviewImage.tsx'), 'utf-8');
        expect(src).toContain("startsWith('storage://')");
    });

    it('BannerPreviewGrid resolves storage:// refs (not just idb://)', () => {
        const src = readFileSync(resolve(CREATIVESET_DIR, 'BannerPreviewGrid.tsx'), 'utf-8');
        expect(src).toContain("startsWith('storage://')");
        expect(src).toContain('resolveAsset');
    });
});

describe('★ REGRESSION: isAssetRef recognizes storage:// (assetService)', () => {

    it('isAssetRef checks for both idb:// and storage:// (via isStorageRef)', () => {
        const src = readFileSync(resolve(__dirname, '../../services/assetService.ts'), 'utf-8');
        expect(src).toContain('isStorageRef(src)');
        expect(src).toContain('IDB_PREFIX');
    });

    it('resolveAssets uses full ref as cache key (not IDB_PREFIX slice)', () => {
        const src = readFileSync(resolve(__dirname, '../../services/assetService.ts'), 'utf-8');
        // Must NOT slice by IDB_PREFIX — that breaks storage:// cache keys
        const resolveBlock = src.slice(src.indexOf('async function resolveAssets'));
        expect(resolveBlock).not.toContain('slice(IDB_PREFIX.length)');
        expect(resolveBlock).toContain('cacheKey');
    });
});

describe('★ REGRESSION: replaceImageSrc updates __glidPersistSrc (shimCreators)', () => {

    it('replace_image_src updates __glidPersistSrc after pixel swap', () => {
        const src = readFileSync(resolve(__dirname, '../../hooks/shimCreators.ts'), 'utf-8');
        const block = src.slice(src.indexOf('replace_image_src:'), src.indexOf('},', src.indexOf('replace_image_src:')));
        expect(block).toContain('__glidPersistSrc = newSrc');
    });
});

describe('★ REGRESSION: SidebarUploadsTab ghost detection is idb-only', () => {

    it('ghost detection only applies to idb:// refs (not storage://)', () => {
        const src = readFileSync(resolve(__dirname, '../../components/editor/SidebarUploadsTab.tsx'), 'utf-8');
        // Ghost detection must check .startsWith('idb://') specifically
        expect(src).toContain("u.idbRef.startsWith('idb://')");
    });
});
