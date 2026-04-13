// ─────────────────────────────────────────────────
// commandExecutor.test.ts — Tool execution routing tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/imageGenClient', () => ({
    generateImage: vi.fn(),
}));

vi.mock('./executors/designExecutor', () => ({
    executeDesignCommand: vi.fn().mockResolvedValue(null),
}));

import { executeToolCall } from './commandExecutor';
import { generateImage } from '@/services/imageGenClient';
import { executeDesignCommand } from './executors/designExecutor';

// ── Mock Engine ──

function makeEngine(overrides: Record<string, unknown> = {}) {
    return {
        canvas_width: () => 300,
        canvas_height: () => 250,
        add_image: vi.fn().mockResolvedValue(1),
        send_to_back: vi.fn(),
        get_all_nodes: () => '[]',
        delete_node: vi.fn(),
        fill_to_page: vi.fn(),
        ...overrides,
    };
}

describe('commandExecutor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── generate_image ──

    describe('generate_image', () => {
        it('should call generateImage and return success', async () => {
            vi.mocked(generateImage).mockResolvedValueOnce({
                success: true,
                imageUrl: 'https://example.com/img.png',
                model: 'flux',
                message: 'ok',
            });

            const result = await executeToolCall(
                makeEngine(), 'generate_image',
                { prompt: 'blue abstract bg' }, [],
            );

            expect(result.success).toBe(true);
            expect(result.message).toContain('Image generated');
            expect((result.data as any).image_url).toBe('https://example.com/img.png');
        });

        it('should return failure when image generation fails', async () => {
            vi.mocked(generateImage).mockRejectedValueOnce(new Error('API timeout'));

            const result = await executeToolCall(
                makeEngine(), 'generate_image',
                { prompt: 'test' }, [],
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain('Image generation failed');
        });

        it('should return failure when result.success is false', async () => {
            vi.mocked(generateImage).mockResolvedValueOnce({
                success: false,
                message: 'Content policy violation',
                model: 'flux',
            });

            const result = await executeToolCall(
                makeEngine(), 'generate_image',
                { prompt: 'bad prompt' }, [],
            );

            expect(result.success).toBe(false);
            expect(result.message).toBe('Content policy violation');
        });

        it('should use default prompt when none provided', async () => {
            vi.mocked(generateImage).mockResolvedValueOnce({
                success: true, imageUrl: 'url', model: 'flux', message: 'ok',
            });

            await executeToolCall(makeEngine(), 'generate_image', {}, []);

            expect(generateImage).toHaveBeenCalledWith(
                expect.objectContaining({ prompt: expect.stringContaining('abstract background') }),
            );
        });

        it('should use canvas dimensions from engine', async () => {
            vi.mocked(generateImage).mockResolvedValueOnce({
                success: true, imageUrl: 'url', model: 'flux', message: 'ok',
            });

            await executeToolCall(
                makeEngine({ canvas_width: () => 728, canvas_height: () => 90 }),
                'generate_image', { prompt: 'bg' }, [],
            );

            expect(generateImage).toHaveBeenCalledWith(
                expect.objectContaining({ width: 728, height: 90 }),
            );
        });

        it('should auto-place image on canvas via engine.add_image', async () => {
            const engine = makeEngine();
            vi.mocked(generateImage).mockResolvedValueOnce({
                success: true, imageUrl: 'data:image/png;base64,X', model: 'flux', message: 'ok',
            });

            const result = await executeToolCall(
                engine, 'generate_image',
                { prompt: 'hero photo' }, [],
            );

            expect(result.success).toBe(true);
            expect(engine.add_image).toHaveBeenCalledWith(0, 0, 'data:image/png;base64,X', 300, 250, 'ai_generated');
            expect(engine.send_to_back).toHaveBeenCalled();
            expect((result.data as any).nodeId).toBe(1);
        });
    });

    // ── replace_background_image ──

    describe('replace_background_image', () => {
        it('should fail when engine has no add_image', async () => {
            const result = await executeToolCall(
                {}, 'replace_background_image',
                { prompt: 'sunset' }, [],
            );
            expect(result.success).toBe(false);
            expect(result.message).toContain('not available');
        });

        it('should fail when no prompt provided', async () => {
            const result = await executeToolCall(
                makeEngine(), 'replace_background_image',
                {}, [],
            );
            expect(result.success).toBe(false);
            expect(result.message).toContain('No prompt');
        });

        it('should delete existing bg and add new image', async () => {
            const engine = makeEngine({
                get_all_nodes: () => JSON.stringify([
                    { id: 1, name: 'Background' },
                    { id: 2, name: 'Headline' },
                ]),
            });

            vi.mocked(generateImage).mockResolvedValueOnce({
                success: true, imageUrl: 'https://example.com/new-bg.png', model: 'imagen', message: 'ok',
            });

            const result = await executeToolCall(
                engine, 'replace_background_image',
                { prompt: 'dark gradient' }, [],
            );

            expect(result.success).toBe(true);
            expect(engine.delete_node).toHaveBeenCalledWith(1);
            expect(engine.add_image).toHaveBeenCalled();
            expect(engine.send_to_back).toHaveBeenCalled();
        });
    });

    // ── fill_to_page ──

    describe('fill_to_page', () => {
        it('should call engine.fill_to_page', async () => {
            const engine = makeEngine();
            const result = await executeToolCall(engine, 'fill_to_page', {}, []);
            expect(result.success).toBe(true);
            expect(engine.fill_to_page).toHaveBeenCalled();
        });

        it('should pass node_id when provided', async () => {
            const engine = makeEngine();
            await executeToolCall(engine, 'fill_to_page', { node_id: 5 }, []);
            expect(engine.fill_to_page).toHaveBeenCalledWith(5);
        });

        it('should fail when fill_to_page not available on engine', async () => {
            const result = await executeToolCall({}, 'fill_to_page', {}, []);
            expect(result.success).toBe(false);
            expect(result.message).toContain('not available');
        });
    });

    // ── generate_full_design ──

    describe('generate_full_design', () => {
        it('should fail — handled by agent orchestrator', async () => {
            const result = await executeToolCall(
                makeEngine(), 'generate_full_design', {}, [],
            );
            expect(result.success).toBe(false);
            expect(result.message).toContain('agent orchestrator');
        });
    });

    // ── Default / Unknown tools ──

    describe('default routing', () => {
        it('should route unknown tools to designExecutor', async () => {
            vi.mocked(executeDesignCommand).mockResolvedValueOnce({
                success: true, message: 'Text added',
            });

            const result = await executeToolCall(
                makeEngine(), 'add_text',
                { content: 'Hello' }, [],
            );

            expect(executeDesignCommand).toHaveBeenCalledWith('add_text', { content: 'Hello' });
            expect(result.success).toBe(true);
        });

        it('should return error when designExecutor returns null', async () => {
            vi.mocked(executeDesignCommand).mockResolvedValueOnce(null);

            const result = await executeToolCall(
                makeEngine(), 'totally_unknown_tool',
                {}, [],
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain('Unknown tool');
        });
    });

    // ── Error handling ──

    describe('error handling', () => {
        it('should catch and return errors from tool execution', async () => {
            vi.mocked(executeDesignCommand).mockRejectedValueOnce(new Error('Boom'));

            const result = await executeToolCall(
                makeEngine(), 'add_text',
                { content: 'test' }, [],
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain('Error executing');
        });
    });
});
