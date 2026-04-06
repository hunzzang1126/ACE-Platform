// ─────────────────────────────────────────────────
// gifExporter.test.ts — GIF export utilities
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { downloadGif, type GifExportOptions, type GifExportResult } from './gifExporter';

describe('GifExportOptions', () => {
    it('accepts valid options', () => {
        const opts: GifExportOptions = { width: 300, height: 250, fps: 15, duration: 3, quality: 10, repeat: 0 };
        expect(opts.width).toBe(300);
    });
});

describe('downloadGif', () => {
    it('triggers GIF download', () => {
        const createObjectURL = vi.fn(() => 'blob:test');
        const revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

        const a = document.createElement('a');
        const clickSpy = vi.spyOn(a, 'click');
        vi.spyOn(document, 'createElement').mockReturnValue(a);

        const result: GifExportResult = {
            blob: new Blob(['gif']),
            filename: 'test.gif',
            frameCount: 10,
            duration: 2,
        };
        downloadGif(result);
        expect(a.download).toBe('test.gif');
        expect(clickSpy).toHaveBeenCalled();
    });
});
