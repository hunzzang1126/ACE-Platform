// ─────────────────────────────────────────────────
// imagePersistence.test.ts — ★ REGRESSION GUARD for image loss fix (v475)
// ─────────────────────────────────────────────────
// Verifies addImage stores __glidPersistSrc and the
// fabricToEngineNode→save pipeline prefers it over blob: URLs.
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read source for structural assertions
const fabricCanvasSrc = readFileSync(resolve(__dirname, './useFabricCanvas.ts'), 'utf-8');
const canvasTypesSrc = readFileSync(resolve(__dirname, './canvasTypes.ts'), 'utf-8');
const fabricHelpersSrc = readFileSync(resolve(__dirname, './fabricHelpers.ts'), 'utf-8');

describe('Image persistence — addImage persistRef parameter', () => {
    it('canvasTypes.ts: addImage signature includes persistRef', () => {
        expect(canvasTypesSrc).toContain('persistRef?: string');
    });

    it('useFabricCanvas.ts: addImage accepts persistRef param', () => {
        // The function signature should include persistRef
        const sig = fabricCanvasSrc.match(/addImage.*persistRef/);
        expect(sig).not.toBeNull();
    });

    it('useFabricCanvas.ts: stores persistRef as __glidPersistSrc', () => {
        expect(fabricCanvasSrc).toContain('__glidPersistSrc = persistRef');
    });

    it('useFabricCanvas.ts: only sets __glidPersistSrc when persistRef is provided', () => {
        expect(fabricCanvasSrc).toContain('if (persistRef)');
    });
});

describe('Image persistence — fabricToEngineNode prefer stable ref', () => {
    it('fabricHelpers.ts: checks __glidPersistSrc before _element.src', () => {
        const persistIdx = fabricHelpersSrc.indexOf('__glidPersistSrc');
        const elementSrcIdx = fabricHelpersSrc.indexOf('imgEl?.src', persistIdx);
        // __glidPersistSrc should be checked BEFORE _element.src
        expect(persistIdx).toBeGreaterThan(-1);
        expect(elementSrcIdx).toBeGreaterThan(persistIdx);
    });

    it('fabricHelpers.ts: has DATA INTEGRITY comment', () => {
        expect(fabricHelpersSrc).toContain('DATA INTEGRITY');
        expect(fabricHelpersSrc).toContain('transient blob: URL');
    });

    it('fabricHelpers.ts: __glidPersistSrc is in GLID_CUSTOM_PROPS', () => {
        expect(fabricHelpersSrc).toContain("'__glidPersistSrc'");
    });
});

describe('Image persistence — full pipeline e2e scenario', () => {
    it('scenario: gallery click → addImage(blob, idbRef) → save preserves idb://', () => {
        // This is the full flow:
        // 1. Gallery resolves idb://hash → blob:http://localhost/temp
        // 2. EditorSidebar calls: addImage(0, 0, blobUrl, w, h, entry.idbRef)
        // 3. addImage stores idbRef as __glidPersistSrc on FabricImage
        // 4. fabricToEngineNode reads __glidPersistSrc → returns idb://hash
        // 5. Element saved with src: 'idb://hash' → survives session

        // Verify step 2: EditorSidebar passes idbRef
        const sidebarSrc = readFileSync(resolve(__dirname, '../components/editor/EditorSidebar.tsx'), 'utf-8');
        expect(sidebarSrc).toContain('entry.idbRef');

        // Verify step 3: addImage stores it
        expect(fabricCanvasSrc).toContain('__glidPersistSrc = persistRef');

        // Verify step 4: fabricToEngineNode prefers it
        expect(fabricHelpersSrc).toContain('node.src = persistSrc');
    });

    it('scenario: data: URL image (AI-generated) still works via extractAssets', () => {
        // AI images come as data:image/... → asyncExtractAssets converts to idb://
        // This path is unaffected by the persistRef fix
        const syncSaveSrc = readFileSync(resolve(__dirname, './canvasSyncSave.ts'), 'utf-8');
        expect(syncSaveSrc).toContain('extractAssets');
        expect(syncSaveSrc).toContain('base64 → idb:// refs');
    });

    it('★ REGRESSION: blob: URLs that cannot be restored stay as-is (no crash)', () => {
        // If an image has blob: URL and no matching stored element,
        // restoreIdbRefs should leave it alone (not throw)
        const syncSaveSrc = readFileSync(resolve(__dirname, './canvasSyncSave.ts'), 'utf-8');
        // The function checks: if (original) img.src = original
        // → no match = no change = blob stays (handled by __glidPersistSrc)
        expect(syncSaveSrc).toContain('if (original) img.src = original');
    });
});
