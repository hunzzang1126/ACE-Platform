// ─────────────────────────────────────────────────
// shimCreators.test.ts — Element creation methods
// ─────────────────────────────────────────────────
// Covers: add_rect, add_rounded_rect, add_gradient_rect,
// add_ellipse, add_text, add_image scaling modes, replace_image_src
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './shimCreators.ts'), 'utf-8');

describe('shimCreators — exported API surface', () => {
    it('exports createCreatorMethods function', () => {
        expect(src).toContain('export function createCreatorMethods');
    });

    it('has add_rect method', () => {
        expect(src).toContain('add_rect:');
    });

    it('has add_rounded_rect with rx/ry', () => {
        expect(src).toContain('add_rounded_rect:');
        expect(src).toContain('rx: radius, ry: radius');
    });

    it('has add_gradient_rect with angle calculation', () => {
        expect(src).toContain('add_gradient_rect:');
        expect(src).toContain('Math.sin(rad)');
        expect(src).toContain('Math.cos(rad)');
    });

    it('has add_ellipse positioned by center', () => {
        expect(src).toContain('add_ellipse:');
        expect(src).toContain('left: cx - rx, top: cy - ry');
    });

    it('has add_text with all font properties', () => {
        expect(src).toContain('add_text:');
        expect(src).toContain('fontFamily');
        expect(src).toContain('fontWeight');
        expect(src).toContain('fontStyle');
        expect(src).toContain('lineHeight');
        expect(src).toContain('charSpacing');
    });

    it('has add_image with async loading', () => {
        expect(src).toContain('add_image:');
        expect(src).toContain('FabricImage.fromURL');
    });

    it('has replace_image_src method', () => {
        expect(src).toContain('replace_image_src:');
    });
});

describe('shimCreators — element identity', () => {
    it('assigns __glidId to all created elements', () => {
        const matches = src.match(/__glidId = id/g);
        // At least rect, rounded_rect, gradient_rect, ellipse, text, image = 6
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(6);
    });

    it('assigns __glidZIndex to all elements', () => {
        const matches = src.match(/__glidZIndex/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(6);
    });

    it('calls patchAceProps on all elements', () => {
        const matches = src.match(/patchAceProps\(/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(5);
    });

    it('calls syncState after element creation', () => {
        const matches = src.match(/syncState\(\)/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(4);
    });
});

describe('shimCreators — add_image scaling modes', () => {
    it('supports cover mode (uniform scale, default)', () => {
        expect(src).toContain("const uniformScale = Math.max(w / Math.max(natW, 1), h / Math.max(natH, 1))");
    });

    it("supports fill mode (independent scaleX/Y)", () => {
        expect(src).toContain("fit === 'fill'");
        expect(src).toContain('scaleX = w / Math.max(natW, 1)');
        expect(src).toContain('scaleY = h / Math.max(natH, 1)');
    });

    it('falls back to artboard-relative sizing when no dimensions given', () => {
        expect(src).toContain('artboardW * 0.7');
    });

    it('guards against zero division', () => {
        // Math.max(natW, 1) prevents NaN/Infinity
        const guards = src.match(/Math\.max\(nat[WH], 1\)/g);
        expect(guards).not.toBeNull();
        expect(guards!.length).toBeGreaterThanOrEqual(3);
    });
});

describe('shimCreators — SVG viewBox parsing', () => {
    it('parses viewBox attribute from SVG data URLs', () => {
        expect(src).toContain('viewBox=');
    });

    it('parses explicit width/height attributes from SVG', () => {
        expect(src).toContain('wMatch');
        expect(src).toContain('hMatch');
    });

    it('falls back to 200x200 when natural dimensions unavailable', () => {
        expect(src).toContain('const natW = resolvedNatW > 0 ? resolvedNatW : 200');
        expect(src).toContain('const natH = resolvedNatH > 0 ? resolvedNatH : 200');
    });
});

describe('shimCreators — data integrity', () => {
    it('★ REGRESSION: persists data: and idb: src for save cycle', () => {
        expect(src).toContain('__glidPersistSrc');
        expect(src).toContain("src.startsWith('data:') || src.startsWith('idb://')");
    });

    it('★ REGRESSION: replace_image_src updates __glidPersistSrc', () => {
        // Critical: Remove BG results are lost without this
        const replaceSection = src.slice(src.indexOf('replace_image_src'));
        expect(replaceSection).toContain('__glidPersistSrc = newSrc');
    });

    it('stores gradient metadata on gradient rects', () => {
        expect(src).toContain('__glidGradientStart');
        expect(src).toContain('__glidGradientEnd');
        expect(src).toContain('__glidGradientAngle');
    });

    it('assigns proper naming defaults', () => {
        expect(src).toContain("name || `Rectangle #${id}`");
        expect(src).toContain("name || `Rounded Rect #${id}`");
        expect(src).toContain("name || `Gradient Rect #${id}`");
        expect(src).toContain("name || `Text #${id}`");
        expect(src).toContain("name || `Image #${id}`");
    });
});
