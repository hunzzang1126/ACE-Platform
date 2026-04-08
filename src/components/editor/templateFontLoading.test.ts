// ─────────────────────────────────────────────────
// templateFontLoading.test.ts — Font preload on template drop
// ─────────────────────────────────────────────────
// Covers:
// - SidebarTemplateTab preloads fonts before creating Textboxes
// - refreshTextCoords is called after font load
// - main.tsx preloads core fonts at startup
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: Template drop font preloading (v417)
// ═════════════════════════════════════════════════

describe('★ REGRESSION: Template drop — font preload before Textbox creation', () => {

    const src = readFileSync(resolve(__dirname, './SidebarTemplateTab.tsx'), 'utf-8');

    it('imports ensureGoogleFont for font preloading', () => {
        expect(src).toContain("import { ensureGoogleFont }");
        expect(src).toContain("from './contextToolbarConstants'");
    });

    it('collects all font families from text elements', () => {
        expect(src).toContain('textFonts');
        expect(src).toContain("new Set<string>()");
        expect(src).toContain("el.type === 'text'");
        expect(src).toContain('fontFamily');
    });

    it('calls ensureGoogleFont for each unique font', () => {
        expect(src).toContain('ensureGoogleFont(font)');
    });

    it('preloads fonts BEFORE creating Textbox elements (order check)', () => {
        const preloadIdx = src.indexOf('ensureGoogleFont(font)');
        const addTextIdx = src.indexOf("actions.addText(");
        expect(preloadIdx).toBeGreaterThan(-1);
        expect(addTextIdx).toBeGreaterThan(-1);
        // Font preload must happen BEFORE addText calls
        expect(preloadIdx).toBeLessThan(addTextIdx);
    });

    it('uses document.fonts.load() for specific font names after element creation', () => {
        expect(src).toContain('document.fonts.load(');
        expect(src).toContain('bold 48px');
    });

    it('calls refreshTextCoords after fonts load', () => {
        expect(src).toContain('refreshTextCoords');
        // refreshTextCoords should be called inside the font load promise
        const loadIdx = src.indexOf('Promise.all(fontPromises)');
        const refreshIdx = src.indexOf('refreshTextCoords', loadIdx);
        expect(loadIdx).toBeGreaterThan(-1);
        expect(refreshIdx).toBeGreaterThan(loadIdx);
    });

    it('has safety-net delayed refreshes for slow networks', () => {
        // Should have setTimeout-based fallback refreshes
        const timeouts = src.match(/setTimeout.*refreshTextCoords/g);
        expect(timeouts).not.toBeNull();
        expect(timeouts!.length).toBeGreaterThanOrEqual(2);
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: App startup font preload (v418)
// ═════════════════════════════════════════════════

describe('★ REGRESSION: App startup — core font preloading', () => {

    const mainSrc = readFileSync(resolve(__dirname, '../../main.tsx'), 'utf-8');

    it('main.tsx defines PRELOAD_FONTS array with core template fonts', () => {
        expect(mainSrc).toContain('PRELOAD_FONTS');
        expect(mainSrc).toContain("'Anton'");
        expect(mainSrc).toContain("'Bebas Neue'");
        expect(mainSrc).toContain("'Poppins'");
        expect(mainSrc).toContain("'Inter'");
        expect(mainSrc).toContain("'Montserrat'");
    });

    it('main.tsx loads both regular(400) and bold(700) weights', () => {
        expect(mainSrc).toContain('400 16px');
        expect(mainSrc).toContain('700 16px');
    });

    it('main.tsx uses document.fonts.load() to force download', () => {
        expect(mainSrc).toContain('document.fonts.load(');
    });

    it('font preload runs before createRoot (eager loading)', () => {
        const preloadIdx = mainSrc.indexOf('document.fonts.load(');
        const renderIdx = mainSrc.indexOf('createRoot(');
        expect(preloadIdx).toBeGreaterThan(-1);
        expect(renderIdx).toBeGreaterThan(-1);
        expect(preloadIdx).toBeLessThan(renderIdx);
    });
});

// ═════════════════════════════════════════════════
// ★ REGRESSION GUARD: refreshTextCoords in CanvasEngineActions (v417)
// ═════════════════════════════════════════════════

describe('★ REGRESSION: CanvasEngineActions — refreshTextCoords', () => {

    it('canvasTypes.ts includes refreshTextCoords in CanvasEngineActions interface', () => {
        const src = readFileSync(resolve(__dirname, '../../hooks/canvasTypes.ts'), 'utf-8');
        expect(src).toContain('refreshTextCoords');
    });

    it('useCanvasEngine.ts wires refreshTextCoords from engine shim', () => {
        const src = readFileSync(resolve(__dirname, '../../hooks/useCanvasEngine.ts'), 'utf-8');
        expect(src).toContain('refreshTextCoords');
    });
});
