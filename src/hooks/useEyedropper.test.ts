// ─────────────────────────────────────────────────
// useEyedropper.test.ts — Eyedropper pixel sampling tests
// ─────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { sampleCanvasPixel } from './useEyedropper';

describe('sampleCanvasPixel', () => {
    function createMockCanvas(pixelData: number[]): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        // Mock getBoundingClientRect to match canvas dimensions
        vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, toJSON: () => {},
        });
        // Mock getContext
        const mockCtx = {
            getImageData: vi.fn().mockReturnValue({
                data: new Uint8ClampedArray(pixelData),
            }),
        };
        vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as any);
        return canvas;
    }

    it('samples red pixel correctly', () => {
        const canvas = createMockCanvas([255, 0, 0, 255]);
        expect(sampleCanvasPixel(canvas, 50, 50)).toBe('#ff0000');
    });

    it('samples green pixel correctly', () => {
        const canvas = createMockCanvas([0, 255, 0, 255]);
        expect(sampleCanvasPixel(canvas, 10, 10)).toBe('#00ff00');
    });

    it('samples blue pixel correctly', () => {
        const canvas = createMockCanvas([0, 0, 255, 255]);
        expect(sampleCanvasPixel(canvas, 0, 0)).toBe('#0000ff');
    });

    it('samples white pixel correctly', () => {
        const canvas = createMockCanvas([255, 255, 255, 255]);
        expect(sampleCanvasPixel(canvas, 50, 50)).toBe('#ffffff');
    });

    it('samples black pixel correctly', () => {
        const canvas = createMockCanvas([0, 0, 0, 255]);
        expect(sampleCanvasPixel(canvas, 50, 50)).toBe('#000000');
    });

    it('handles mixed color correctly', () => {
        const canvas = createMockCanvas([171, 205, 239, 255]); // #abcdef
        expect(sampleCanvasPixel(canvas, 50, 50)).toBe('#abcdef');
    });

    it('pads single digit hex values with zero', () => {
        const canvas = createMockCanvas([1, 2, 3, 255]);
        expect(sampleCanvasPixel(canvas, 50, 50)).toBe('#010203');
    });

    it('returns #000000 when context is null', () => {
        const canvas = document.createElement('canvas');
        vi.spyOn(canvas, 'getContext').mockReturnValue(null);
        expect(sampleCanvasPixel(canvas, 50, 50)).toBe('#000000');
    });

    it('accounts for canvas scaling (2x DPR)', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
            width: 100, height: 100, x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, toJSON: () => {},
        });
        const mockCtx = {
            getImageData: vi.fn().mockReturnValue({
                data: new Uint8ClampedArray([128, 128, 128, 255]),
            }),
        };
        vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as any);

        sampleCanvasPixel(canvas, 50, 50);
        // With 2x scaling, (50,50) CSS -> (100,100) canvas pixels
        expect(mockCtx.getImageData).toHaveBeenCalledWith(100, 100, 1, 1);
    });
});
