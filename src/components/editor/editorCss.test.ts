// editor.css — Contract tests for UX overhaul CSS classes

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve(__dirname, '../../styles/editor.css'), 'utf-8');

describe('★ Resize Handle CSS (v0.0.0.599)', () => {
    it('defines bp-resize-handle class', () => {
        expect(css).toContain('.bp-resize-handle');
    });

    it('uses ns-resize cursor for vertical drag', () => {
        expect(css).toContain('cursor: ns-resize');
    });

    it('defines bp-resize-dots class', () => {
        expect(css).toContain('.bp-resize-dots');
    });

    it('has hover feedback on resize handle', () => {
        expect(css).toContain('.bp-resize-handle:hover');
    });

    it('highlights dots on hover', () => {
        expect(css).toContain('.bp-resize-handle:hover .bp-resize-dots');
    });
});

describe('★ Playhead CSS — Premiere-style (v0.0.0.599)', () => {
    it('defines bp-playhead class', () => {
        expect(css).toContain('.bp-playhead');
    });

    it('uses pointer-events:auto for dragging', () => {
        expect(css).toContain('pointer-events: auto');
    });

    it('uses col-resize cursor for scrubbing', () => {
        expect(css).toContain('cursor: col-resize');
    });
});
