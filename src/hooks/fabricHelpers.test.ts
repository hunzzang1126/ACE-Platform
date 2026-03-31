// ─────────────────────────────────────────────────
// fabricHelpers — Pure function tests
// ─────────────────────────────────────────────────
// Tests for color conversion and utility functions that don't need Fabric.js.
// fabricToEngineNode is tested indirectly via engine integration tests
// since it requires Fabric.js objects.

import { describe, it, expect } from 'vitest';
import { hexToRgb01, rgbToHex, nextColor } from './fabricHelpers';

// ── hexToRgb01 ────────────────────────────────────

describe('hexToRgb01 — hex string to 0-1 float RGB', () => {
    it('#ff0000 → [1, 0, 0]', () => {
        const [r, g, b] = hexToRgb01('#ff0000');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('#00ff00 → [0, 1, 0]', () => {
        const [r, g, b] = hexToRgb01('#00ff00');
        expect(r).toBeCloseTo(0, 2);
        expect(g).toBeCloseTo(1, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('#000000 → [0, 0, 0]', () => {
        const [r, g, b] = hexToRgb01('#000000');
        expect(r).toBeCloseTo(0, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('#ffffff → [1, 1, 1]', () => {
        const [r, g, b] = hexToRgb01('#ffffff');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(1, 2);
        expect(b).toBeCloseTo(1, 2);
    });

    it('shorthand #f00 → [1, 0, 0]', () => {
        const [r, g, b] = hexToRgb01('#f00');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(0, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('rgba(128, 64, 32) → ~[0.502, 0.251, 0.125]', () => {
        const [r, g, b] = hexToRgb01('rgba(128, 64, 32, 0.5)');
        expect(r).toBeCloseTo(0.502, 2);
        expect(g).toBeCloseTo(0.251, 2);
        expect(b).toBeCloseTo(0.125, 2);
    });

    it('rgb(255, 128, 0) → ~[1, 0.502, 0]', () => {
        const [r, g, b] = hexToRgb01('rgb(255, 128, 0)');
        expect(r).toBeCloseTo(1, 2);
        expect(g).toBeCloseTo(0.502, 2);
        expect(b).toBeCloseTo(0, 2);
    });

    it('malformed input → [0.5, 0.5, 0.5] fallback', () => {
        const [r, g, b] = hexToRgb01('not-a-color');
        expect(r).toBe(0.5);
        expect(g).toBe(0.5);
        expect(b).toBe(0.5);
    });
});

// ── rgbToHex ──────────────────────────────────────

describe('rgbToHex — 0-1 float RGB to hex string', () => {
    it('[1, 0, 0] → #ff0000', () => {
        expect(rgbToHex(1, 0, 0)).toBe('#ff0000');
    });

    it('[0, 1, 0] → #00ff00', () => {
        expect(rgbToHex(0, 1, 0)).toBe('#00ff00');
    });

    it('[0, 0, 0] → #000000', () => {
        expect(rgbToHex(0, 0, 0)).toBe('#000000');
    });

    it('[1, 1, 1] → #ffffff', () => {
        expect(rgbToHex(1, 1, 1)).toBe('#ffffff');
    });

    it('[0.5, 0.5, 0.5] → #808080', () => {
        expect(rgbToHex(0.5, 0.5, 0.5)).toBe('#808080');
    });
});

// ── Round-trip: hexToRgb01 → rgbToHex ─────────────

describe('Color Round-Trip — hexToRgb01 → rgbToHex', () => {
    it('#3b82f6 survives round-trip', () => {
        const [r, g, b] = hexToRgb01('#3b82f6');
        expect(rgbToHex(r, g, b)).toBe('#3b82f6');
    });

    it('#ff5733 survives round-trip', () => {
        const [r, g, b] = hexToRgb01('#ff5733');
        expect(rgbToHex(r, g, b)).toBe('#ff5733');
    });

    it('#0f172a survives round-trip', () => {
        const [r, g, b] = hexToRgb01('#0f172a');
        expect(rgbToHex(r, g, b)).toBe('#0f172a');
    });
});

// ── nextColor ─────────────────────────────────────

describe('nextColor — pastel color cycle', () => {
    it('returns a valid hex color', () => {
        const c = nextColor();
        expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('returns different colors on successive calls', () => {
        const c1 = nextColor();
        const c2 = nextColor();
        expect(c1).not.toBe(c2);
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: __glidPersistSrc image persistence
// Fixed in v0.0.0.288 — blob: URLs caused image loss on reload
// ═══════════════════════════════════════════════════

import { GLID_CUSTOM_PROPS } from './fabricHelpers';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('★ REGRESSION: __glidPersistSrc — image data integrity', () => {

    it('GLID_CUSTOM_PROPS includes __glidPersistSrc', () => {
        expect(GLID_CUSTOM_PROPS).toContain('__glidPersistSrc');
    });

    it('fabricToEngineNode prefers __glidPersistSrc over _element.src', () => {
        const src = readFileSync(resolve(__dirname, './fabricHelpers.ts'), 'utf-8');
        // __glidPersistSrc should be checked BEFORE _element.src
        const persistIdx = src.indexOf('__glidPersistSrc');
        const elementSrcIdx = src.indexOf('imgEl?.src');
        expect(persistIdx).toBeGreaterThan(-1);
        expect(elementSrcIdx).toBeGreaterThan(-1);
        expect(persistIdx).toBeLessThan(elementSrcIdx);
    });

    it('shimCreators sets __glidPersistSrc for data: URLs', () => {
        const src = readFileSync(resolve(__dirname, './shimCreators.ts'), 'utf-8');
        expect(src).toContain('__glidPersistSrc');
        expect(src).toContain("src.startsWith('data:')");
        expect(src).toContain("src.startsWith('idb://')");
    });

    it('useCanvasSync restoreImage sets __glidPersistSrc on fabric object', () => {
        const src = readFileSync(resolve(__dirname, './useCanvasSync.ts'), 'utf-8');
        expect(src).toContain('__glidPersistSrc = stableSrc');
        expect(src).toContain('_findById');
    });

    it('fabricEngineShim exposes _findById for restoreImage', () => {
        const src = readFileSync(resolve(__dirname, './fabricEngineShim.ts'), 'utf-8');
        expect(src).toContain('_findById: findById');
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: restoreIdbRefs — blob → idb recovery
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: canvasSyncSave — restoreIdbRefs', () => {

    it('restoreIdbRefs only processes blob: URLs', () => {
        const src = readFileSync(resolve(__dirname, './canvasSyncSave.ts'), 'utf-8');
        expect(src).toContain("img.src.startsWith('blob:')");
    });

    it('restoreIdbRefs looks up by both name and id', () => {
        const src = readFileSync(resolve(__dirname, './canvasSyncSave.ts'), 'utf-8');
        expect(src).toContain('storedSrcByName');
        expect(src).toContain('storedSrcById');
    });

    it('asyncExtractAssets logs failures (not silently swallowed)', () => {
        const src = readFileSync(resolve(__dirname, './canvasSyncSave.ts'), 'utf-8');
        expect(src).toContain('Asset extraction failed');
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: Upload Library — AI images saved
// Added in v0.0.0.289
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: AI images → Upload Library integration', () => {

    it('agentGenerateFlow imports saveToUploadLibrary', () => {
        const src = readFileSync(resolve(__dirname, '../hooks/agentGenerateFlow.ts'), 'utf-8');
        expect(src).toContain('saveToUploadLibrary');
    });

    it('saveToUploadLibrary stores with source ai', () => {
        const src = readFileSync(resolve(__dirname, '../hooks/agentGenerateFlow.ts'), 'utf-8');
        expect(src).toMatch(/saveToUploadLibrary\(.*'ai'\)/s);
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: Rotation pipeline (full chain)
// Fixed in v0.0.0.305 — rotation was hardcoded to 0
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: Rotation pipeline — full chain', () => {

    it('EngineNode type includes angle field', () => {
        const src = readFileSync(resolve(__dirname, './canvasTypes.ts'), 'utf-8');
        expect(src).toContain('angle?: number');
    });

    it('fabricToEngineNode extracts obj.angle', () => {
        const src = readFileSync(resolve(__dirname, './fabricHelpers.ts'), 'utf-8');
        expect(src).toContain('angle: obj.angle');
    });

    it('absoluteToConstraints accepts angle parameter', () => {
        const src = readFileSync(resolve(__dirname, '../engine/constraintUtils.ts'), 'utf-8');
        expect(src).toContain('angle: number = 0');
        expect(src).toContain('rotation: angle');
    });

    it('elementConverters pass node.angle to absoluteToConstraints', () => {
        const src = readFileSync(resolve(__dirname, '../engine/elementConverters.ts'), 'utf-8');
        // All 3 converter functions must include node.angle
        const matches = src.match(/node\.angle \?\? 0/g);
        expect(matches).toBeTruthy();
        expect(matches!.length).toBeGreaterThanOrEqual(3);
    });

    it('fabricEngineShim exposes set_angle method', () => {
        const src = readFileSync(resolve(__dirname, './fabricEngineShim.ts'), 'utf-8');
        expect(src).toContain('set_angle');
        expect(src).toContain('obj.set({ angle })');
    });

    it('useCanvasSync restore functions call set_angle for rotation', () => {
        const src = readFileSync(resolve(__dirname, './useCanvasSync.ts'), 'utf-8');
        const matches = src.match(/engine\.set_angle/g);
        expect(matches).toBeTruthy();
        // Shape, Text, and Image restores
        expect(matches!.length).toBeGreaterThanOrEqual(3);
    });

    it('fabricHeadlessRenderer applies angle from constraints.rotation', () => {
        const src = readFileSync(resolve(__dirname, '../components/creativeset/fabricHeadlessRenderer.ts'), 'utf-8');
        const matches = src.match(/constraints\.rotation/g) ?? src.match(/constraints\?\.rotation/g);
        expect(matches).toBeTruthy();
        // At least 4 element types: shape (ellipse + rect), text, image, button
        expect(matches!.length).toBeGreaterThanOrEqual(4);
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: PlugCanvas v2 — lightweight cables
// Refactored in v0.0.0.304
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: PlugCanvas v2 — no SVG gradient bugs', () => {

    it('PlugCanvas uses solid rgba stroke, not SVG gradient', () => {
        const src = readFileSync(resolve(__dirname, '../components/creativeset/PlugCanvas.tsx'), 'utf-8');
        // Must NOT use objectBoundingBox gradient (caused invisible cables)
        expect(src).not.toContain('gradientUnits');
        expect(src).not.toContain('url(#plug-cable-grad)');
        // Should use solid color
        expect(src).toContain('rgba(');
    });

    it('PlugCanvas cable has plug-cable-flow CSS class for animation', () => {
        const src = readFileSync(resolve(__dirname, '../components/creativeset/PlugCanvas.tsx'), 'utf-8');
        expect(src).toContain('plug-cable-flow');
    });

    it('CSS defines @keyframes plug-flow animation', () => {
        const css = readFileSync(resolve(__dirname, '../styles/creativeset.css'), 'utf-8');
        expect(css).toContain('@keyframes plug-flow');
        expect(css).toContain('stroke-dashoffset');
    });

    it('PlugCanvas SVG z-index is >= 50 (above cards)', () => {
        const src = readFileSync(resolve(__dirname, '../components/creativeset/PlugCanvas.tsx'), 'utf-8');
        const match = src.match(/zIndex:\s*(\d+)/);
        expect(match).toBeTruthy();
        expect(parseInt(match![1]!)).toBeGreaterThanOrEqual(50);
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: ActiveSelection save coords (v0.0.0.311)
// Bug: Fabric.js objects inside ActiveSelection have left/top relative
// to group center → negative coords → CTA jumps to (0,0) on save.
// Fix: get_all_nodes() discards selection before reading positions.
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: ActiveSelection — save must use absolute coords', () => {

    it('fabricEngineShim imports ActiveSelection from fabric', () => {
        const src = readFileSync(resolve(__dirname, './fabricEngineShim.ts'), 'utf-8');
        expect(src).toContain('ActiveSelection');
        // Must be a top-level import, not dynamic
        expect(src).toMatch(/import\s*\{[^}]*ActiveSelection[^}]*\}\s*from\s*'fabric'/);
    });

    it('get_all_nodes discards active selection before reading positions', () => {
        const src = readFileSync(resolve(__dirname, './fabricEngineShim.ts'), 'utf-8');
        // Must call discardActiveObject BEFORE fabricToEngineNode
        const discardIdx = src.indexOf('fc.discardActiveObject()');
        const mapIdx = src.indexOf('userObjects().map(fabricToEngineNode)');
        expect(discardIdx).toBeGreaterThan(-1);
        expect(mapIdx).toBeGreaterThan(-1);
        expect(discardIdx).toBeLessThan(mapIdx);
    });

    it('get_all_nodes checks for multi-select (length > 1), not any selection', () => {
        const src = readFileSync(resolve(__dirname, './fabricEngineShim.ts'), 'utf-8');
        // Single-select should NOT trigger discard (no coordinate issue)
        expect(src).toContain('activeObjs.length > 1');
    });

    it('get_all_nodes re-creates ActiveSelection after reading', () => {
        const src = readFileSync(resolve(__dirname, './fabricEngineShim.ts'), 'utf-8');
        const discardIdx = src.indexOf('fc.discardActiveObject()');
        const reSelectIdx = src.indexOf('new ActiveSelection(activeObjs');
        expect(reSelectIdx).toBeGreaterThan(-1);
        // Re-select must happen AFTER discard
        expect(reSelectIdx).toBeGreaterThan(discardIdx);
        // Must set it as active and render
        expect(src).toContain('fc.setActiveObject(sel)');
        expect(src.indexOf('fc.renderAll()', reSelectIdx)).toBeGreaterThan(reSelectIdx);
    });

    it('fabricToEngineNode reads obj.left/obj.top directly (relies on upstream fix)', () => {
        const src = readFileSync(resolve(__dirname, './fabricHelpers.ts'), 'utf-8');
        // Must use obj.left and obj.top (not getX/getY or transform matrix)
        // because the upstream get_all_nodes ensures absolute coords
        expect(src).toContain('x: obj.left ?? 0');
        expect(src).toContain('y: obj.top ?? 0');
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: Save roundtrip coordinate sanity
// Ensures constraint conversion never produces negative offsets
// for elements visually inside the canvas bounds.
// ═══════════════════════════════════════════════════

import { absoluteToConstraints, constraintsToAbsolute } from '../engine/constraintUtils';

describe('★ REGRESSION: Constraint roundtrip — no negative drift', () => {

    const canvasW = 1920, canvasH = 1080;

    it('CTA at right-center saves and restores to same position', () => {
        // CTA positioned at right side of 1920×1080 canvas
        const x = 1600, y = 500, w = 200, h = 60;
        const constraints = absoluteToConstraints(x, y, w, h, canvasW, canvasH);
        const restored = constraintsToAbsolute(constraints, canvasW, canvasH);
        expect(restored.x).toBeCloseTo(x, 0);
        expect(restored.y).toBeCloseTo(y, 0);
        expect(restored.w).toBe(w);
        expect(restored.h).toBe(h);
    });

    it('element at canvas center survives roundtrip', () => {
        const x = 800, y = 490, w = 320, h = 100;
        const constraints = absoluteToConstraints(x, y, w, h, canvasW, canvasH);
        const restored = constraintsToAbsolute(constraints, canvasW, canvasH);
        expect(restored.x).toBeCloseTo(x, 0);
        expect(restored.y).toBeCloseTo(y, 0);
    });

    it('negative x/y input produces constraint that restores to same negative position (off-canvas)', () => {
        // This simulates the buggy scenario — if we get -160,-50 as input
        // the constraint system should faithfully store and restore it
        const x = -160, y = -50, w = 320, h = 99;
        const constraints = absoluteToConstraints(x, y, w, h, canvasW, canvasH);
        const restored = constraintsToAbsolute(constraints, canvasW, canvasH);
        // The constraint system is correct — the BUG was in reading wrong coords
        expect(restored.x).toBeCloseTo(x, 0);
        expect(restored.y).toBeCloseTo(y, 0);
    });

    it('small canvas (300x250) CTA survives roundtrip', () => {
        const x = 180, y = 200, w = 100, h = 35;
        const c = absoluteToConstraints(x, y, w, h, 300, 250);
        const r = constraintsToAbsolute(c, 300, 250);
        expect(r.x).toBeCloseTo(x, 0);
        expect(r.y).toBeCloseTo(y, 0);
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: Replace image src updates __glidPersistSrc
// Fixed in v0.0.0.332 — Remove BG results lost on save because
// __glidPersistSrc still pointed to the original (pre-BG-removal) image.
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: replaceImageSrc — updates __glidPersistSrc', () => {

    it('replace_image_src sets __glidPersistSrc to new source', () => {
        const src = readFileSync(resolve(__dirname, './shimCreators.ts'), 'utf-8');
        // The line that updates __glidPersistSrc must be INSIDE replace_image_src
        const replaceBlock = src.slice(
            src.indexOf('replace_image_src:'),
            src.indexOf('},', src.indexOf('replace_image_src:'))
        );
        expect(replaceBlock).toContain('__glidPersistSrc = newSrc');
    });

    it('__glidPersistSrc update happens AFTER _element swap, BEFORE renderAll', () => {
        const src = readFileSync(resolve(__dirname, './shimCreators.ts'), 'utf-8');
        const replaceBlock = src.slice(
            src.indexOf('replace_image_src:'),
            src.indexOf('},', src.indexOf('replace_image_src:'))
        );
        const elementIdx = replaceBlock.indexOf('_element');
        const persistIdx = replaceBlock.indexOf('__glidPersistSrc = newSrc');
        const renderIdx = replaceBlock.indexOf('fc.renderAll()');
        expect(elementIdx).toBeGreaterThan(-1);
        expect(persistIdx).toBeGreaterThan(elementIdx);
        expect(renderIdx).toBeGreaterThan(persistIdx);
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: Fill to Page + Remove BG placement
// Fixed in v0.0.0.336 — moved from Position panel to inline toolbar.
// ═══════════════════════════════════════════════════

describe('★ REGRESSION: Fill to Page is in inline toolbar, NOT Position panel', () => {

    it('ContextToolbar has FillToPageToolbarBtn component', () => {
        const src = readFileSync(resolve(__dirname, '../components/editor/ContextToolbar.tsx'), 'utf-8');
        expect(src).toContain('FillToPageToolbarBtn');
        expect(src).toContain('actions.fillToPage(nodeId)');
    });

    it('ContextToolbar has RemoveBgToolbarBtn for images', () => {
        const src = readFileSync(resolve(__dirname, '../components/editor/ContextToolbar.tsx'), 'utf-8');
        expect(src).toContain('RemoveBgToolbarBtn');
        expect(src).toContain('removeBackgroundFromUrl');
    });

    it('ContextToolbar renders both buttons for image type', () => {
        const src = readFileSync(resolve(__dirname, '../components/editor/ContextToolbar.tsx'), 'utf-8');
        const removeBgIdx = src.indexOf('RemoveBgToolbarBtn');
        const fillIdx = src.indexOf('FillToPageToolbarBtn');
        // Both should be present
        expect(removeBgIdx).toBeGreaterThan(-1);
        expect(fillIdx).toBeGreaterThan(-1);
        // Fill should come after Remove BG
        expect(fillIdx).toBeGreaterThan(removeBgIdx);
    });

    it('InlinePositionPanel does NOT contain RemoveBgInline or FillToPageInline in render', () => {
        const src = readFileSync(resolve(__dirname, '../components/editor/InlinePositionPanel.tsx'), 'utf-8');
        // The render method should NOT reference these components
        const renderSection = src.slice(0, src.indexOf('function RemoveBgInline') > -1 ? src.indexOf('function RemoveBgInline') : src.length);
        expect(renderSection).not.toContain('<RemoveBgInline');
        expect(renderSection).not.toContain('<FillToPageInline');
    });
});
