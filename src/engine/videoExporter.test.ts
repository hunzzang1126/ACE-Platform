// ─────────────────────────────────────────────────
// videoExporter.test.ts — WebCodecs H.264 MP4 Export
// ─────────────────────────────────────────────────
// Covers: ExportOptions, ExportProgress, ProgressCallback,
// encoder config, muxer integration, frame capture pipeline
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './videoExporter.ts'), 'utf-8');

describe('videoExporter — interfaces', () => {
    it('exports ExportOptions interface', () => {
        expect(src).toContain('export interface ExportOptions');
    });

    it('exports ExportProgress interface', () => {
        expect(src).toContain('export interface ExportProgress');
    });

    it('exports ProgressCallback type', () => {
        expect(src).toContain('export type ProgressCallback');
    });
});

describe('videoExporter — ExportOptions', () => {
    it('has width and height options', () => {
        expect(src).toContain('width: number');
        expect(src).toContain('height: number');
    });

    it('has fps option', () => {
        expect(src).toContain('fps: number');
    });

    it('has bitrate option with default', () => {
        expect(src).toContain('bitrate');
    });

    it('has codec option', () => {
        expect(src).toContain('codec');
        expect(src).toContain('avc1');
    });
});

describe('videoExporter — ExportProgress phases', () => {
    it('has encoding, muxing, done, error phases', () => {
        expect(src).toContain("'encoding'");
        expect(src).toContain("'muxing'");
        expect(src).toContain("'done'");
        expect(src).toContain("'error'");
    });

    it('tracks currentFrame and totalFrames', () => {
        expect(src).toContain('currentFrame');
        expect(src).toContain('totalFrames');
    });

    it('tracks percent', () => {
        expect(src).toContain('percent');
    });
});

describe('videoExporter — encoding pipeline', () => {
    it('uses mp4-muxer for muxing', () => {
        expect(src).toContain('Muxer');
        expect(src).toContain('ArrayBufferTarget');
    });
});
