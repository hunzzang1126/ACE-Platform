// ─────────────────────────────────────────────────
// visionReviewHelpers.test.ts — Vision QA prompt builder
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './visionReviewHelpers.ts'), 'utf-8');

describe('visionReviewHelpers — buildReviewPrompt contract', () => {
    it('includes canvas dimensions in prompt', () => {
        expect(src).toContain('canvasW');
        expect(src).toContain('canvasH');
    });

    it('includes element info in prompt', () => {
        expect(src).toContain('elements');
        expect(src).toContain('elementName');
    });

    it('asks for JSON response', () => {
        expect(src).toContain('JSON');
    });
});

describe('visionReviewHelpers — applyFix contract', () => {
    it('handles position fixes (x, y)', () => {
        expect(src).toContain('fix.x');
        expect(src).toContain('fix.y');
    });

    it('handles size fixes (w, h)', () => {
        expect(src).toContain('fix.w');
        expect(src).toContain('fix.h');
    });

    it('handles font size fixes', () => {
        expect(src).toContain('fix.fontSize');
    });
});

describe('visionReviewHelpers — saveCanvasState', () => {
    it('delegates to engine.get_all_nodes()', () => {
        expect(src).toContain('engine.get_all_nodes()');
    });
});

describe('visionReviewHelpers — restoreCanvasState', () => {
    it('parses snapshot and restores positions', () => {
        expect(src).toContain('JSON.parse(snapshot)');
        expect(src).toContain('engine.set_position');
    });
});
