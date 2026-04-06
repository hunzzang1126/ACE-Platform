// ─────────────────────────────────────────────────
// imageGenHelpers.test.ts — Image generation helper tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { snapToFluxResolution, extractImageUrl, buildEnhancedPrompt, generateFallbackImage } from './imageGenHelpers';

describe('imageGenHelpers', () => {
    describe('snapToFluxResolution', () => {
        it('should snap square canvas to 1024x1024', () => {
            expect(snapToFluxResolution(300, 300)).toEqual({ width: 1024, height: 1024 });
        });

        it('should snap landscape banner to wider resolution', () => {
            const result = snapToFluxResolution(728, 90);
            expect(result.width).toBeGreaterThan(result.height);
        });

        it('should snap tall skyscraper to taller resolution', () => {
            const result = snapToFluxResolution(160, 600);
            expect(result.height).toBeGreaterThan(result.width);
        });

        it('should snap 300x250 to closest landscape ratio', () => {
            const result = snapToFluxResolution(300, 250);
            expect(result.width).toBeGreaterThanOrEqual(768);
        });

        it('should snap 1080x1920 to portrait resolution', () => {
            const result = snapToFluxResolution(1080, 1920);
            expect(result.height).toBeGreaterThan(result.width);
        });

        it('should return valid positive dimensions', () => {
            const result = snapToFluxResolution(1, 1);
            expect(result.width).toBeGreaterThan(0);
            expect(result.height).toBeGreaterThan(0);
        });

        it('should handle extreme wide ratio (970x250)', () => {
            const result = snapToFluxResolution(970, 250);
            expect(result.width).toBeGreaterThan(result.height);
        });

        it('should handle mobile sizes (320x50)', () => {
            const result = snapToFluxResolution(320, 50);
            expect(result.width).toBeGreaterThan(0);
            expect(result.height).toBeGreaterThan(0);
        });
    });

    describe('extractImageUrl', () => {
        it('should extract from DALL-E b64_json format', () => {
            const resp = { data: [{ b64_json: 'abc123' }] };
            expect(extractImageUrl(resp)).toBe('data:image/png;base64,abc123');
        });

        it('should extract from DALL-E url format', () => {
            const resp = { data: [{ url: 'https://example.com/image.png' }] };
            expect(extractImageUrl(resp)).toBe('https://example.com/image.png');
        });

        it('should extract from OpenRouter message content array (image_url)', () => {
            const resp = {
                choices: [{ message: { content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,x' } }] } }],
            };
            expect(extractImageUrl(resp)).toBe('data:image/png;base64,x');
        });

        it('should extract from Anthropic image source format', () => {
            const resp = {
                choices: [{ message: { content: [{ type: 'image', source: { data: 'abc', media_type: 'image/png' } }] } }],
            };
            expect(extractImageUrl(resp)).toBe('data:image/png;base64,abc');
        });

        it('should extract from string content starting with data:image', () => {
            const resp = { choices: [{ message: { content: 'data:image/png;base64,xyz' } }] };
            expect(extractImageUrl(resp)).toBe('data:image/png;base64,xyz');
        });

        it('should extract long base64 string content', () => {
            const longStr = 'A'.repeat(2000);
            const resp = { choices: [{ message: { content: longStr } }] };
            expect(extractImageUrl(resp)).toBe(`data:image/png;base64,${longStr}`);
        });

        it('should extract URL with image extension', () => {
            const resp = { choices: [{ message: { content: 'https://cdn.example.com/image.png' } }] };
            expect(extractImageUrl(resp)).toBe('https://cdn.example.com/image.png');
        });

        it('should return null for non-image text', () => {
            const resp = { choices: [{ message: { content: 'Hello world' } }] };
            expect(extractImageUrl(resp)).toBeNull();
        });

        it('should return null for empty response', () => {
            expect(extractImageUrl({})).toBeNull();
        });

        it('should extract from Gemini images[] format', () => {
            const resp = {
                choices: [{ message: { images: [{ image_url: { url: 'https://img.com/a.png' } }] } }],
            };
            expect(extractImageUrl(resp)).toBe('https://img.com/a.png');
        });

        it('should extract from Gemini parts[] format', () => {
            const resp = {
                choices: [{ message: { parts: [{ inline_data: { data: 'base64data', mime_type: 'image/webp' } }] } }],
            };
            expect(extractImageUrl(resp)).toBe('data:image/webp;base64,base64data');
        });

        it('should handle jpg URL', () => {
            const resp = { choices: [{ message: { content: 'https://cdn.example.com/photo.jpg' } }] };
            expect(extractImageUrl(resp)).toBe('https://cdn.example.com/photo.jpg');
        });

        it('should handle webp URL', () => {
            const resp = { choices: [{ message: { content: 'https://cdn.example.com/img.webp' } }] };
            expect(extractImageUrl(resp)).toBe('https://cdn.example.com/img.webp');
        });
    });

    describe('buildEnhancedPrompt', () => {
        it('should include original prompt', () => {
            const result = buildEnhancedPrompt({ prompt: 'sunset beach', width: 300, height: 250 });
            expect(result).toContain('sunset beach');
        });

        it('should add style hints for realistic', () => {
            const result = buildEnhancedPrompt({ prompt: 'car', width: 300, height: 250, style: 'realistic' });
            expect(result).toContain('photorealistic');
        });

        it('should add color constraint', () => {
            const result = buildEnhancedPrompt({
                prompt: 'sky', width: 300, height: 250, colorConstraint: ['#ff6b35', '#c9a84c'],
            });
            expect(result).toContain('#ff6b35');
            expect(result).toContain('#c9a84c');
        });

        it('should always include masterpiece quality', () => {
            const result = buildEnhancedPrompt({ prompt: 'test', width: 100, height: 100 });
            expect(result).toContain('masterpiece');
        });

        it('should handle minimal style', () => {
            const result = buildEnhancedPrompt({ prompt: 'logo', width: 300, height: 250, style: 'minimal' });
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle abstract style', () => {
            const result = buildEnhancedPrompt({ prompt: 'pattern', width: 300, height: 250, style: 'abstract' });
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle no style', () => {
            const result = buildEnhancedPrompt({ prompt: 'flower', width: 300, height: 250 });
            expect(result).toContain('flower');
        });
    });

    describe('generateFallbackImage', () => {
        it('returns success with gradient data URL', () => {
            const result = generateFallbackImage({ prompt: 'bg', width: 300, height: 250 });
            expect(result.success).toBe(true);
            expect(result.isFallback).toBe(true);
            expect(result.model).toBe('fallback');
            expect(result.imageUrl).toContain('data:image');
        });

        it('uses color constraints when provided', () => {
            const result = generateFallbackImage({
                prompt: 'bg', width: 300, height: 250,
                colorConstraint: ['#ff0000', '#00ff00'],
            });
            expect(result.success).toBe(true);
        });

        it('handles small canvas sizes', () => {
            const result = generateFallbackImage({ prompt: 'tiny', width: 10, height: 10 });
            expect(result.success).toBe(true);
        });

        it('handles various styles', () => {
            for (const style of ['minimal', 'realistic', 'abstract'] as const) {
                const result = generateFallbackImage({ prompt: 'test', width: 100, height: 100, style });
                expect(result.success).toBe(true);
            }
        });
    });
});

