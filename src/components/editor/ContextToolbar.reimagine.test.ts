// ─────────────────────────────────────────────────
// ContextToolbar.reimagine.test.ts — Reimagine feature contract tests
// ─────────────────────────────────────────────────
// Verifies the AiReplaceInline (Reimagine) widget in ContextToolbar

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ContextToolbar.tsx'), 'utf-8');

describe('ContextToolbar — Reimagine widget', () => {
    it('uses "Reimagine" as CTA label (not "AI Replace")', () => {
        expect(src).toContain('Reimagine');
        // Old label should not appear
        expect(src).not.toContain('>AI Replace<');
    });

    it('has gradient shimmer animation on button', () => {
        expect(src).toContain('@keyframes reimagine-shimmer');
        expect(src).toContain('reimagine-shimmer 3s linear infinite');
    });

    it('has glow animation on expanded input container', () => {
        expect(src).toContain('@keyframes reimagine-glow');
        expect(src).toContain('reimagine-glow 2s ease-in-out infinite');
    });

    it('includes @keyframes spin for loading spinner', () => {
        expect(src).toContain('@keyframes spin');
        expect(src).toContain("from { transform: rotate(0deg); }");
        expect(src).toContain("to { transform: rotate(360deg); }");
    });

    it('injects CSS only once via _shimmerInjected guard', () => {
        expect(src).toContain('let _shimmerInjected = false');
        expect(src).toContain('if (_shimmerInjected) return');
        expect(src).toContain('_shimmerInjected = true');
    });

    it('uses replaceImageSrc for engine nodes (not deleteNode)', () => {
        expect(src).toContain('actions.replaceImageSrc(selectedNode.id, url)');
        expect(src).not.toContain('actions.deleteNode');
    });

    it('updates overlay src via onOverlayUpdate for overlay images', () => {
        expect(src).toContain("onOverlayUpdate?.(selectedOverlay.id, { src: url })");
    });

    it('has hover scale effect on button', () => {
        expect(src).toContain("scale(1.05)");
        expect(src).toContain("scale(1)");
    });

    it('positions Reimagine first in both image toolbar sections', () => {
        // Engine node: Reimagine comes before RemoveBg and FillToPage
        const reimagineIdx = src.indexOf('AiReplaceInline w={selectedNode.w}');
        const removeBgIdx = src.indexOf('RemoveBgToolbarBtn nodeId={selectedNode.id}');
        const fillIdx = src.indexOf('FillToPageToolbarBtn nodeId={selectedNode.id}');
        expect(reimagineIdx).toBeLessThan(removeBgIdx);
        expect(reimagineIdx).toBeLessThan(fillIdx);
    });

    it('has white input background with dark text for readability', () => {
        expect(src).toContain("background: '#fff'");
        expect(src).toContain("color: '#1a1a2e'");
    });

    it('supports Escape key to cancel prompt input', () => {
        expect(src).toContain("e.key === 'Escape'");
        expect(src).toContain('setOpen(false)');
    });

    it('supports Enter key to submit prompt', () => {
        expect(src).toContain("e.key === 'Enter'");
        expect(src).toContain('handleGo()');
    });

    it('stops keyboard event propagation to prevent canvas shortcuts', () => {
        expect(src).toContain('e.stopPropagation()');
    });

    it('uses star icon SVG for the Reimagine button', () => {
        expect(src).toContain('M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z');
    });
});

describe('ContextToolbar — Reimagine image gen call', () => {
    it('enforces minimum 256px dimensions', () => {
        expect(src).toContain('Math.max(w, 256)');
        expect(src).toContain('Math.max(h, 256)');
    });

    it('dynamically imports imageGenClient', () => {
        expect(src).toContain("import('@/services/imageGenClient')");
    });

    it('handles generation failure gracefully', () => {
        expect(src).toContain("console.error('[Reimagine]'");
    });

    it('checks result.success before applying replacement', () => {
        expect(src).toContain('result.success && result.imageUrl');
    });
});
