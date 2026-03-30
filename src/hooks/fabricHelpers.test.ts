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
