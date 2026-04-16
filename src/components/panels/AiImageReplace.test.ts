// ─────────────────────────────────────────────────
// AiImageReplace.test.ts — Source-level contract tests
// ─────────────────────────────────────────────────
// Tests the AI image replacement components via source inspection.
// These components depend on React + dynamic imports, so we verify
// contract correctness rather than rendering.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './AiImageReplace.tsx'), 'utf-8');

describe('AiImageReplace — callImageGen helper', () => {
    it('enforces minimum 256px for generation dimensions', () => {
        expect(src).toContain('Math.max(w, 256)');
        expect(src).toContain('Math.max(h, 256)');
    });

    it('uses generateBackgroundImage from imageGenClient', () => {
        expect(src).toContain("import('@/services/imageGenClient')");
        expect(src).toContain('generateBackgroundImage');
    });

    it('creates abort controller for each generation call', () => {
        expect(src).toContain('new AbortController().signal');
    });
});

describe('AiImageReplaceSection — engine node variant', () => {
    it('uses replaceImageSrc to swap image (not deleteNode)', () => {
        expect(src).toContain('actions.replaceImageSrc(nodeId, result.imageUrl)');
        expect(src).not.toContain('actions.deleteNode');
    });

    it('clears prompt on successful replacement', () => {
        expect(src).toContain("setPrompt('')");
    });

    it('sets error state on failure', () => {
        expect(src).toContain("setError(result.message || 'Image generation failed')");
        expect(src).toContain("setError('Generation failed. Try again.')");
    });

    it('prevents submission when loading or empty prompt', () => {
        expect(src).toContain('if (!trimmed || loading) return');
    });

    it('resets loading state in finally block', () => {
        expect(src).toContain('} finally {');
        expect(src).toContain('setLoading(false)');
    });

    it('accepts required props: nodeId, nodeW, nodeH, canvasWidth, canvasHeight, actions', () => {
        expect(src).toContain('nodeId: number');
        expect(src).toContain('nodeW: number');
        expect(src).toContain('nodeH: number');
        expect(src).toContain('canvasWidth: number');
        expect(src).toContain('canvasHeight: number');
        expect(src).toContain('actions: CanvasEngineActions');
    });
});

describe('AiOverlayReplaceSection — overlay variant', () => {
    it('calls onReplace callback with new image URL', () => {
        expect(src).toContain('onReplace(result.imageUrl)');
    });

    it('accepts overlayW, overlayH, and onReplace props', () => {
        expect(src).toContain('overlayW: number');
        expect(src).toContain('overlayH: number');
        expect(src).toContain('onReplace: (newSrc: string) => void');
    });

    it('uses same callImageGen helper as engine variant', () => {
        // Both variants call the same function
        const callCount = (src.match(/callImageGen\(/g) || []).length;
        expect(callCount).toBeGreaterThanOrEqual(2);
    });
});

describe('AiImageReplace — shared UI elements', () => {
    it('includes input with placeholder text', () => {
        expect(src).toContain('placeholder="Describe replacement..."');
    });

    it('includes ReplaceButton with gradient styling', () => {
        expect(src).toContain('ReplaceButton');
        expect(src).toContain('linear-gradient(135deg, #6366f1, #2dd4bf)');
    });

    it('includes loading spinner SVG animation', () => {
        expect(src).toContain("animation: 'spin 1s linear infinite'");
    });

    it('shows error messages in red', () => {
        expect(src).toContain("color: '#f87171'");
    });

    it('exports both section components', () => {
        expect(src).toContain('export function AiImageReplaceSection');
        expect(src).toContain('export function AiOverlayReplaceSection');
    });
});
