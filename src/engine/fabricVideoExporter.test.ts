// ─────────────────────────────────────────────────
// fabricVideoExporter.test.ts — Export pipeline contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './fabricVideoExporter.ts'), 'utf-8');

describe('fabricVideoExporter — imports', () => {
    it('uses constraintsToAbsolute from elementConverters', () => {
        expect(src).toContain('constraintsToAbsolute');
        expect(src).toContain('elementConverters');
    });

    it('uses applyTextEffectCSS for text effects', () => {
        expect(src).toContain('applyTextEffectCSS');
    });

    it('uses computeAnimStyle for animation frames', () => {
        expect(src).toContain('computeAnimStyle');
    });

    it('uses Muxer from mp4-muxer', () => {
        expect(src).toContain('Muxer');
        expect(src).toContain('mp4-muxer');
    });
});

describe('fabricVideoExporter — render pipeline', () => {
    it('renders shapes (Rect, Ellipse)', () => {
        expect(src).toContain('new Rect(');
        expect(src).toContain('new Ellipse(');
    });

    it('renders text via Textbox', () => {
        expect(src).toContain('new Textbox(');
        expect(src).toContain('textAlign');
    });

    it('renders images via addImageFrame', () => {
        expect(src).toContain('addImageFrame');
    });

    it('handles gradient fill via Gradient class', () => {
        expect(src).toContain('new Gradient(');
        expect(src).toContain('gradientStart');
    });

    it('applies text effects during export', () => {
        expect(src).toContain("applyTextEffectCSS(tb,");
    });
});

describe('fabricVideoExporter — output', () => {
    it('encodes frames via VideoEncoder', () => {
        expect(src).toContain('VideoEncoder');
    });

    it('produces mp4 via muxer.finalize()', () => {
        expect(src).toContain('finalize');
    });

    it('has progress callback', () => {
        expect(src).toContain('onProgress');
    });

    it('handles element opacity + animation', () => {
        expect(src).toContain('opacity');
        expect(src).toContain('computeAnimStyle');
    });
});
