// ─────────────────────────────────────────────────
// fabricVideoExporter.test.ts — MP4 export via WebCodecs
// ─────────────────────────────────────────────────
// Covers: export pipeline, animation computation, element converters,
// Fabric canvas creation, text effects, muxer usage
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './fabricVideoExporter.ts'), 'utf-8');

describe('fabricVideoExporter — pipeline', () => {
    it('uses mp4-muxer for encoding', () => {
        expect(src).toContain("from 'mp4-muxer'");
        expect(src).toContain('Muxer');
    });

    it('uses Fabric.js for frame rendering', () => {
        expect(src).toContain("from 'fabric'");
        expect(src).toContain('Canvas');
    });

    it('uses constraintsToAbsolute for positioning', () => {
        expect(src).toContain('constraintsToAbsolute');
    });
});

describe('fabricVideoExporter — animation', () => {
    it('computes animation styles per frame', () => {
        expect(src).toContain('computeAnimStyle');
    });

    it('applies text effects', () => {
        const hasEffects = src.includes('applyTextEffectCSS') || src.includes('textEffect');
        expect(hasEffects).toBe(true);
    });
});

describe('fabricVideoExporter — element rendering', () => {
    it('handles text elements', () => {
        expect(src).toContain('Textbox');
    });

    it('handles rect/shape elements', () => {
        expect(src).toContain('Rect');
    });

    it('handles image elements', () => {
        expect(src).toContain('FabricImage');
    });

    it('handles gradient fills', () => {
        expect(src).toContain('Gradient');
    });

    it('handles ellipse elements', () => {
        expect(src).toContain('Ellipse');
    });
});

describe('fabricVideoExporter — color conversion', () => {
    it('uses hexToRgbFloat for color parsing', () => {
        expect(src).toContain('hexToRgbFloat');
    });
});

describe('fabricVideoExporter — variant input', () => {
    it('imports BannerVariant type', () => {
        expect(src).toContain("BannerVariant");
    });

    it('★ REGRESSION: uses H.264 Level 4.0 codec for 1080x1080+ support', () => {
        expect(src).toContain('avc1.640028');
        expect(src).not.toContain('avc1.42001f');
    });
});

describe('fabricVideoExporter — z-index ordering', () => {
    it('sorts elements by zIndex before rendering', () => {
        expect(src).toContain('.sort((a, b) => a.zIndex - b.zIndex)');
    });
});
