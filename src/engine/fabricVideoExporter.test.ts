// ─────────────────────────────────────────────────
// fabricVideoExporter.test.ts — Video export utilities
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { downloadBlob } from './fabricVideoExporter';

describe('downloadBlob', () => {
    it('triggers download without error', () => {
        // Just verify the function exists and accepts correct params
        const createObjectURL = vi.fn(() => 'blob:test-url');
        const revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

        // Use real DOM element to avoid jsdom removeChild error
        const a = document.createElement('a');
        const clickSpy = vi.spyOn(a, 'click');
        vi.spyOn(document, 'createElement').mockReturnValue(a);

        downloadBlob(new ArrayBuffer(10), 'video.mp4');

        expect(createObjectURL).toHaveBeenCalled();
        expect(a.download).toBe('video.mp4');
        expect(clickSpy).toHaveBeenCalled();
    });
});
