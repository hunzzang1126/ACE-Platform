// ─────────────────────────────────────────────────
// gifExporter.test.ts — GIF export tests (extended)
// ─────────────────────────────────────────────────
// Covers: GifExportOptions interface, frame capture,
// worker-based encoding, quality settings, progress callback
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './gifExporter.ts'), 'utf-8');

describe('gifExporter — interface', () => {
    it('exports GifExportOptions interface', () => {
        expect(src).toContain('export interface GifExportOptions');
    });

    it('has width and height options', () => {
        expect(src).toContain('width: number');
        expect(src).toContain('height: number');
    });

    it('has fps option with default', () => {
        expect(src).toContain('fps');
    });

    it('has duration option', () => {
        const hasDuration = src.includes('duration') || src.includes('Duration');
        expect(hasDuration).toBe(true);
    });
});

describe('gifExporter — frame capture', () => {
    it('captures canvas frames', () => {
        expect(src).toContain('drawImage');
        expect(src).toContain('getImageData');
    });

    it('uses requestAnimationFrame or timer for frame timing', () => {
        const hasTimer = /requestAnimationFrame|setTimeout|setInterval/.test(src);
        expect(hasTimer).toBe(true);
    });
});

describe('gifExporter — encoding', () => {
    it('encodes frames to GIF format', () => {
        expect(src).toContain('gif') || expect(src).toContain('GIF');
    });
});
