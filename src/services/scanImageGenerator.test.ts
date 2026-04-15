// ─────────────────────────────────────────────────
// scanImageGenerator.test.ts — Scan V2 image generation tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/imageGenClient', () => ({
    generateImage: vi.fn().mockResolvedValue({
        success: true,
        imageUrl: 'data:image/png;base64,mock',
        model: 'flux' as const,
        isFallback: false,
        message: 'Generated',
    }),
}));

import { generateScanImage, type ScanImageGenRequest } from '@/services/scanImageGenerator';
import { generateImage } from '@/services/imageGenClient';

describe('scanImageGenerator', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should call generateImage with photo style', async () => {
        const req: ScanImageGenRequest = {
            description: 'Professional woman in business suit',
            style: 'photo',
            width: 400,
            height: 300,
        };
        const result = await generateScanImage(req);
        expect(result.success).toBe(true);
        expect(generateImage).toHaveBeenCalledWith(
            expect.objectContaining({
                width: 400,
                height: 300,
                model: 'flux',
                style: 'photography',
            }),
            undefined,
        );
    });

    it('should include description in prompt', async () => {
        const req: ScanImageGenRequest = {
            description: 'Red sports car on mountain road',
            style: 'photo',
            width: 600,
            height: 400,
        };
        await generateScanImage(req);
        const call = (generateImage as any).mock.calls[0]![0]!;
        expect(call.prompt).toContain('Red sports car on mountain road');
    });

    it('should add crop hint to prompt', async () => {
        const req: ScanImageGenRequest = {
            description: 'Coffee beans closeup',
            style: 'photo',
            width: 300,
            height: 300,
            crop: 'overhead flat lay',
        };
        await generateScanImage(req);
        const call = (generateImage as any).mock.calls[0]![0]!;
        expect(call.prompt).toContain('overhead flat lay');
    });

    it('should map illustration style correctly', async () => {
        const req: ScanImageGenRequest = {
            description: 'Flat design city skyline',
            style: 'illustration',
            width: 500,
            height: 200,
        };
        await generateScanImage(req);
        expect(generateImage).toHaveBeenCalledWith(
            expect.objectContaining({ style: 'illustration' }),
            undefined,
        );
    });

    it('should map texture style to abstract', async () => {
        const req: ScanImageGenRequest = {
            description: 'Concrete wall texture',
            style: 'texture',
            width: 300,
            height: 300,
        };
        await generateScanImage(req);
        expect(generateImage).toHaveBeenCalledWith(
            expect.objectContaining({ style: 'abstract' }),
            undefined,
        );
    });

    it('should include negative prompt', async () => {
        await generateScanImage({
            description: 'Nature background',
            style: 'photo',
            width: 200,
            height: 200,
        });
        expect(generateImage).toHaveBeenCalledWith(
            expect.objectContaining({
                negativePrompt: expect.stringContaining('text'),
            }),
            undefined,
        );
    });

    it('should pass abort signal through', async () => {
        const abort = new AbortController();
        await generateScanImage({
            description: 'Test',
            style: 'photo',
            width: 100,
            height: 100,
        }, abort.signal);
        expect(generateImage).toHaveBeenCalledWith(
            expect.anything(),
            abort.signal,
        );
    });
});
