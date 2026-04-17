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

// ══════════════════════════════════════════════════
// ★ REGRESSION: Image fill-to-page default (v0.0.0.613)
// Previously images were inserted at raw pixel size → distortion
// ══════════════════════════════════════════════════
describe('★ REGRESSION: Image insert uses fill-to-page by default', () => {
    it('EditorSidebar passes canvas dimensions (not entry.width/height) to addImage', () => {
        const sidebarSrc = readFileSync(resolve(__dirname, '../components/editor/EditorSidebar.tsx'), 'utf-8');
        // Must use canvasWidth/canvasHeight, NOT entry.width/entry.height
        expect(sidebarSrc).toContain('actions.canvasWidth');
        expect(sidebarSrc).toContain('actions.canvasHeight');
        expect(sidebarSrc).not.toContain('entry.width, entry.height');
    });

    it('addImage uses cover-mode uniform scaling (Math.max) when w/h provided', () => {
        expect(fabricCanvasSrc).toContain('Math.max(w / natW, h / natH)');
    });

    it('addImage centers the image within the target area', () => {
        expect(fabricCanvasSrc).toContain('(w - natW * scale) / 2');
        expect(fabricCanvasSrc).toContain('(h - natH * scale) / 2');
    });

    it('addImage never uses independent scaleX/scaleY for cover mode', () => {
        // In the cover-mode branch, scaleX and scaleY must be the same variable
        expect(fabricCanvasSrc).toContain('scaleX = scale; scaleY = scale;');
    });
});

describe('★ REGRESSION: Cover-mode scaling math', () => {
    // Pure math tests — no mocking needed
    function coverScale(natW: number, natH: number, targetW: number, targetH: number) {
        const scale = Math.max(targetW / natW, targetH / natH);
        return {
            scale,
            finalX: (targetW - natW * scale) / 2,
            finalY: (targetH - natH * scale) / 2,
            renderedW: natW * scale,
            renderedH: natH * scale,
        };
    }

    it('landscape image on square canvas: vertical overflow, centered', () => {
        const r = coverScale(4000, 3000, 1080, 1080);
        // scale = max(1080/4000, 1080/3000) = max(0.27, 0.36) = 0.36
        expect(r.scale).toBe(0.36);
        expect(r.renderedW).toBe(1440); // wider than canvas
        expect(r.renderedH).toBe(1080); // exactly canvas height
        expect(r.finalX).toBe(-180);    // centered: (1080-1440)/2
        expect(r.finalY).toBe(0);
    });

    it('portrait image on square canvas: horizontal overflow, centered', () => {
        const r = coverScale(3000, 4000, 1080, 1080);
        expect(r.scale).toBe(0.36);
        expect(r.renderedW).toBe(1080);
        expect(r.renderedH).toBe(1440);
        expect(r.finalX).toBe(0);
        expect(r.finalY).toBe(-180);
    });

    it('square image on square canvas: exact fit', () => {
        const r = coverScale(2000, 2000, 1080, 1080);
        expect(r.scale).toBe(0.54);
        expect(r.finalX).toBe(0);
        expect(r.finalY).toBe(0);
    });

    it('wide banner (970x250): landscape image fills width', () => {
        const r = coverScale(4000, 3000, 970, 250);
        // scale = max(970/4000, 250/3000) = max(0.2425, 0.0833) = 0.2425
        expect(r.scale).toBe(0.2425);
        expect(r.renderedW).toBe(970);
        expect(r.renderedH).toBeCloseTo(727.5);
        expect(r.finalX).toBe(0);
        expect(r.finalY).toBeCloseTo(-238.75);
    });

    it('cover mode always covers entire canvas — never leaves gaps', () => {
        const scenarios = [
            { natW: 4000, natH: 3000, tW: 1080, tH: 1080 },
            { natW: 800, natH: 1200, tW: 300, tH: 250 },
            { natW: 1920, natH: 1080, tW: 160, tH: 600 },
        ];
        for (const s of scenarios) {
            const r = coverScale(s.natW, s.natH, s.tW, s.tH);
            expect(r.renderedW).toBeGreaterThanOrEqual(s.tW);
            expect(r.renderedH).toBeGreaterThanOrEqual(s.tH);
        }
    });
});
