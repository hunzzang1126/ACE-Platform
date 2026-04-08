// ─────────────────────────────────────────────────
// fabricCanvasEvents.test.ts — Transform badge regression tests
// ─────────────────────────────────────────────────
// Covers:
// - Figma-style rotation angle badge
// - Figma-style dimension badge during scaling
// - Line element handler
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './fabricCanvasEvents.ts'), 'utf-8');
const sidebarSrc = readFileSync(resolve(__dirname, '../components/editor/SidebarElementsTab.tsx'), 'utf-8');

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Transform badges (v421)
// ═════════════════════════════════════════════════

describe('★ REGRESSION: Figma-style transform badges', () => {

    it('tracks transformMode for rotating and scaling', () => {
        expect(src).toContain("let transformMode: 'none' | 'rotating' | 'scaling' = 'none'");
    });

    it('sets mode to rotating on object:rotating event', () => {
        expect(src).toContain("fc.on('object:rotating'");
        expect(src).toContain("transformMode = 'rotating'");
    });

    it('sets mode to scaling on object:scaling event', () => {
        expect(src).toContain("fc.on('object:scaling'");
        // Note: object:scaling is also used for text scaling logic
        expect(src).toContain("transformMode = 'scaling'");
    });

    it('resets mode on object:modified and mouse:up', () => {
        expect(src).toContain("transformMode = 'none'");
        // Should be reset in both events
        const noneOccurrences = src.match(/transformMode = 'none'/g);
        expect(noneOccurrences).not.toBeNull();
        expect(noneOccurrences!.length).toBeGreaterThanOrEqual(2); // modified + mouseup
    });

    it('draws on after:render event', () => {
        expect(src).toContain("fc.on('after:render'");
    });

    it('uses contextTop for drawing (Fabric v6 API)', () => {
        expect(src).toContain('contextTop');
        // Must NOT use getTopContext (which doesn't exist in Fabric v6)
        expect(src).not.toContain('getTopContext');
    });

    it('shows rotation angle with degree symbol', () => {
        // Unicode degree sign \u00B0
        expect(src).toContain('\\u00B0');
        expect(src).toContain('obj.angle');
    });

    it('shows dimensions with multiplication sign during scaling', () => {
        // Unicode multiplication sign \u00D7
        expect(src).toContain('\\u00D7');
        expect(src).toContain('obj.width');
        expect(src).toContain('obj.scaleX');
    });

    it('uses Figma-blue badge color (#0D99FF)', () => {
        expect(src).toContain("'#0D99FF'");
    });

    it('applies viewport transform for correct screen positioning', () => {
        expect(src).toContain('viewportTransform');
        expect(src).toContain('getBoundingRect');
    });

    it('skips artboard objects', () => {
        expect(src).toContain('isArtboard(obj)');
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Line element handler (v420)
// ═════════════════════════════════════════════════

describe('★ REGRESSION: Line element — SidebarElementsTab', () => {

    it('has a Line shape definition in SHAPES array', () => {
        expect(sidebarSrc).toContain("id: 'line'");
        expect(sidebarSrc).toContain("label: 'Line'");
    });

    it('handleAdd switch includes case line', () => {
        expect(sidebarSrc).toContain("case 'line'");
    });

    it('Line creates a thin rect (h=3) for save/load compatibility', () => {
        expect(sidebarSrc).toContain('setNodeSize(nodeId, w, 3)');
    });

    it('Line uses amber color matching icon', () => {
        // 0.96, 0.62, 0.04 ≈ #f59e0b
        expect(sidebarSrc).toContain('0.96, 0.62, 0.04');
    });

    it('Line is centered on canvas', () => {
        expect(sidebarSrc).toContain('cw * 0.6');
        expect(sidebarSrc).toContain('(cw - w) / 2');
        expect(sidebarSrc).toContain('ch / 2');
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Ghost badge fix (v426)
// contextTop must be cleared before drawing badge
// ═════════════════════════════════════════════════
describe('★ REGRESSION: Transform badge ghost trail fix (v426)', () => {

    it('clears contextTop before drawing (prevents ghost accumulation)', () => {
        // The clearRect must happen BEFORE the transformMode check
        const renderSection = src.slice(src.indexOf("fc.on('after:render'"));
        const clearRectIdx = renderSection.indexOf('clearRect');
        const modeCheckIdx = renderSection.indexOf("transformMode === 'none'");
        expect(clearRectIdx).toBeGreaterThan(-1);
        expect(modeCheckIdx).toBeGreaterThan(-1);
        // clearRect must come BEFORE the mode check
        expect(clearRectIdx).toBeLessThan(modeCheckIdx);
    });

    it('accesses ctx.canvas for full-width clear', () => {
        expect(src).toContain('upperEl.width');
        expect(src).toContain('upperEl.height');
    });

    it('clears the entire contextTop surface', () => {
        expect(src).toContain('ctx.clearRect(0, 0, upperEl.width, upperEl.height)');
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Text uniform corner scaling (v427)
// Corner handles should lock aspect ratio like shapes
// ═════════════════════════════════════════════════
describe('★ REGRESSION: Text uniform corner scaling (v427)', () => {

    it('forces scaleX === scaleY on corner drag', () => {
        expect(src).toContain('obj.set({ scaleX: uniformScale, scaleY: uniformScale })');
    });

    it('uses larger axis change for uniform factor (not Math.max)', () => {
        // v427 replaced Math.max(scaleX, scaleY) with axis-change-based logic
        expect(src).toContain('Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy');
        // Old pattern should NOT exist
        expect(src).not.toContain('Math.max(obj.scaleX ?? 1, obj.scaleY ?? 1)');
    });

    it('side handles only adjust width (no uniform scaling)', () => {
        // The else branch should only set width, not fontSize
        // Check that 'Side handles' comment exists for documentation
        expect(src).toContain('Side handles (ml/mr): only adjust width');
    });

    it('clamps font size between 6 and 400', () => {
        expect(src).toContain('Math.max(6, Math.min(400');
    });

    it('stores original font size for proportional calculation', () => {
        expect(src).toContain('__glidOrigFontSize');
    });

    it('resets __glidOrigFontSize on object:modified', () => {
        expect(src).toContain("delete (opt.target as any).__glidOrigFontSize");
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Artboard color methods (v425)
// Engine shim must provide get/set for artboard fill
// ═════════════════════════════════════════════════
describe('★ REGRESSION: Artboard color engine methods (v425)', () => {
    const shimSrc = readFileSync(resolve(__dirname, './fabricEngineShim.ts'), 'utf-8');

    it('exposes get_artboard_color method', () => {
        expect(shimSrc).toContain('get_artboard_color');
        expect(shimSrc).toContain('__glidArtboard');
    });

    it('exposes set_artboard_color method', () => {
        expect(shimSrc).toContain('set_artboard_color');
        expect(shimSrc).toContain("ab.set({ fill: color })");
    });

    it('get_artboard_color returns string fill or null', () => {
        expect(shimSrc).toContain("typeof ab.fill === 'string' ? ab.fill : null");
    });

    it('set_artboard_color triggers renderAll after setting fill', () => {
        expect(shimSrc).toContain('fc.renderAll()');
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Restore applies backgroundColor (v425)
// useCanvasSync must set artboard color during restore
// ═════════════════════════════════════════════════
describe('★ REGRESSION: Restore applies variant backgroundColor (v425)', () => {
    const syncSrc = readFileSync(resolve(__dirname, './useCanvasSync.ts'), 'utf-8');

    it('calls set_artboard_color during restoreFromStore', () => {
        expect(syncSrc).toContain('set_artboard_color');
        expect(syncSrc).toContain('variant.backgroundColor');
    });

    it('guards with typeof check for safety', () => {
        expect(syncSrc).toContain("typeof engine.set_artboard_color === 'function'");
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Template save reads live artboard color (v424)
// useEditorPageEffects must use get_artboard_color, not stale variant
// ═════════════════════════════════════════════════
describe('★ REGRESSION: Template save uses live artboard color (v424)', () => {
    const effectsSrc = readFileSync(resolve(__dirname, '../app/useEditorPageEffects.ts'), 'utf-8');

    it('reads artboard color from engine, not just variant', () => {
        expect(effectsSrc).toContain('get_artboard_color');
    });

    it('falls back to variant.backgroundColor if engine method unavailable', () => {
        expect(effectsSrc).toContain("existingVariant?.backgroundColor ?? '#ffffff'");
    });

    it('uses optional chaining for get_artboard_color (backwards compat)', () => {
        expect(effectsSrc).toContain('engine.get_artboard_color?.()');
    });
});
