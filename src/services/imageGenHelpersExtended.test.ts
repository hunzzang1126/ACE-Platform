// ─────────────────────────────────────────────────
// imageGenHelpersExtended.test.ts — extractImageUrl uncovered paths
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { snapToFluxResolution, extractImageUrl, buildEnhancedPrompt } from './imageGenHelpers';

describe('extractImageUrl — uncovered response formats', () => {
    it('should extract DALL-E b64_json from data array', () => {
        expect(extractImageUrl({ data: [{ b64_json: 'ABC' }] })).toBe('data:image/png;base64,ABC');
    });

    it('should extract DALL-E url from data array', () => {
        expect(extractImageUrl({ data: [{ url: 'https://img.com/a.png' }] })).toBe('https://img.com/a.png');
    });

    it('should extract from Gemini images[] with image_url.url', () => {
        const resp = { choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,X' } }] } }] };
        expect(extractImageUrl(resp)).toBe('data:image/png;base64,X');
    });

    it('should extract from Gemini images[] with source.data and media_type', () => {
        const resp = { choices: [{ message: { images: [{ type: 'image', source: { data: 'Y', media_type: 'image/webp' } }] } }] };
        expect(extractImageUrl(resp)).toBe('data:image/webp;base64,Y');
    });

    it('should default to image/png when media_type missing in images[]', () => {
        const resp = { choices: [{ message: { images: [{ type: 'image', source: { data: 'Z' } }] } }] };
        expect(extractImageUrl(resp)).toBe('data:image/png;base64,Z');
    });

    it('should extract from parts[] inline_data with default mime', () => {
        const resp = { choices: [{ message: { parts: [{ inline_data: { data: 'Q' } }] } }] };
        expect(extractImageUrl(resp)).toBe('data:image/png;base64,Q');
    });

    it('should handle string content starting with data:image', () => {
        const resp = { choices: [{ message: { content: 'data:image/jpeg;base64,JPEG' } }] };
        expect(extractImageUrl(resp)).toBe('data:image/jpeg;base64,JPEG');
    });

    it('should detect long base64 string (>1000 chars, no spaces)', () => {
        const long = 'A'.repeat(1500);
        const resp = { choices: [{ message: { content: long } }] };
        expect(extractImageUrl(resp)).toBe(`data:image/png;base64,${long}`);
    });

    it('should detect HTTP URL with .jpg extension', () => {
        const resp = { choices: [{ message: { content: 'https://cdn.example.com/photo.jpg' } }] };
        expect(extractImageUrl(resp)).toBe('https://cdn.example.com/photo.jpg');
    });

    it('should detect HTTP URL with .webp extension', () => {
        const resp = { choices: [{ message: { content: 'https://cdn.example.com/photo.webp' } }] };
        expect(extractImageUrl(resp)).toBe('https://cdn.example.com/photo.webp');
    });

    it('should detect HTTP URL with "image" in path', () => {
        const resp = { choices: [{ message: { content: 'https://api.example.com/image/gen/123' } }] };
        expect(extractImageUrl(resp)).toBe('https://api.example.com/image/gen/123');
    });

    it('should return null for short text content', () => {
        expect(extractImageUrl({ choices: [{ message: { content: 'Sorry, I cannot do that.' } }] })).toBeNull();
    });

    it('should extract from content array - image_url type', () => {
        const resp = { choices: [{ message: { content: [{ type: 'image_url', image_url: { url: 'http://img.com/x.png' } }] } }] };
        expect(extractImageUrl(resp)).toBe('http://img.com/x.png');
    });

    it('should extract from content array - inline_data type', () => {
        const resp = { choices: [{ message: { content: [{ inline_data: { data: 'DATA', mime_type: 'image/bmp' } }] } }] };
        expect(extractImageUrl(resp)).toBe('data:image/bmp;base64,DATA');
    });

    it('should extract from content array - image source type', () => {
        const resp = { choices: [{ message: { content: [{ type: 'image', source: { data: 'SRC_DATA' } }] } }] };
        expect(extractImageUrl(resp)).toBe('data:image/png;base64,SRC_DATA');
    });

    it('should extract from content array - string data URL', () => {
        const resp = { choices: [{ message: { content: ['data:image/gif;base64,GIF'] } }] };
        expect(extractImageUrl(resp)).toBe('data:image/gif;base64,GIF');
    });

    it('should extract from content array - text block with data URL', () => {
        const resp = { choices: [{ message: { content: [{ type: 'text', text: 'data:image/png;base64,TXT' }] } }] };
        expect(extractImageUrl(resp)).toBe('data:image/png;base64,TXT');
    });

    it('should extract from content array - text block with long base64', () => {
        const long = 'B'.repeat(2000);
        const resp = { choices: [{ message: { content: [{ type: 'text', text: long }] } }] };
        expect(extractImageUrl(resp)).toBe(`data:image/png;base64,${long}`);
    });

    it('should return null for empty data array', () => {
        expect(extractImageUrl({ data: [] })).toBeNull();
    });

    it('should return null for empty content array', () => {
        expect(extractImageUrl({ choices: [{ message: { content: [] } }] })).toBeNull();
    });
});

describe('snapToFluxResolution — all aspect ratios', () => {
    it('1:1 → 1024x1024', () => {
        const r = snapToFluxResolution(500, 500);
        expect(r).toEqual({ width: 1024, height: 1024 });
    });

    it('4:3 → landscape', () => {
        const r = snapToFluxResolution(400, 300);
        expect(r.width).toBeGreaterThan(r.height);
    });

    it('3:4 → portrait', () => {
        const r = snapToFluxResolution(300, 400);
        expect(r.height).toBeGreaterThan(r.width);
    });

    it('16:9 → HD landscape', () => {
        const r = snapToFluxResolution(1920, 1080);
        expect(r.width / r.height).toBeGreaterThan(1.5);
    });

    it('9:16 → HD portrait', () => {
        const r = snapToFluxResolution(1080, 1920);
        expect(r.height / r.width).toBeGreaterThan(1.5);
    });

    it('ultra-wide (728x90) → wide banner', () => {
        const r = snapToFluxResolution(728, 90);
        expect(r.width / r.height).toBeGreaterThan(2);
    });

    it('ultra-tall (160x600) → tall banner', () => {
        const r = snapToFluxResolution(160, 600);
        expect(r.height / r.width).toBeGreaterThan(2);
    });

    it('3:2 landscape', () => {
        const r = snapToFluxResolution(600, 400);
        expect(r.width).toBeGreaterThan(r.height);
    });
});

describe('buildEnhancedPrompt — all styles', () => {
    const styles = ['realistic', 'illustration', 'abstract', 'minimal', 'photography'];
    for (const style of styles) {
        it(`should add ${style} descriptors`, () => {
            const result = buildEnhancedPrompt({ prompt: 'test', width: 300, height: 250, style } as any);
            expect(result.length).toBeGreaterThan(10);
            expect(result).toContain('test');
        });
    }

    it('should include color constraints', () => {
        const result = buildEnhancedPrompt({ prompt: 'bg', width: 300, height: 250, colorConstraint: ['#ff0', '#00f'] });
        expect(result).toContain('#ff0');
        expect(result).toContain('palette');
    });

    it('should handle no style', () => {
        const result = buildEnhancedPrompt({ prompt: 'plain', width: 300, height: 250 });
        expect(result).toContain('plain');
        expect(result).toContain('masterpiece');
    });
});
