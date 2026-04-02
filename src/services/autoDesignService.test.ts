// ─────────────────────────────────────────────────
// autoDesignService.test.ts — extractUserText + sanitizeContent
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

// Mock anthropicClient (hoisted)
vi.mock('@/services/anthropicClient', () => ({
    callAnthropicApi: vi.fn(),
    DEFAULT_CLAUDE_MODEL: 'claude-3-haiku-20240307',
}));
vi.mock('@/services/designTemplates', () => ({
    buildContentPrompt: vi.fn(() => 'prompt'),
}));

// We test the internal pure functions by importing the module
// and calling callTemplateContent with mocked API
import { callFromScratch, callAssetContext, callTemplateContent } from './autoDesignService';
import { callAnthropicApi } from '@/services/anthropicClient';

describe('autoDesignService — callFromScratch', () => {
    it('should throw when AI returns no tool_use', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
        await expect(callFromScratch('test', 300, 250, new AbortController().signal)).rejects.toThrow('AI did not return');
    });

    it('should return elements from tool_use result', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({
            content: [{ type: 'tool_use', name: 'render_banner', input: { elements: [{ type: 'rect', x: 0, y: 0, w: 300, h: 250 }] } }],
        });
        const result = await callFromScratch('test', 300, 250, new AbortController().signal);
        expect(result.mode).toBe('from_scratch');
        expect(result.elements).toHaveLength(1);
    });
});

describe('autoDesignService — callAssetContext', () => {
    it('should throw when AI returns no tool_use', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({ content: [] });
        await expect(callAssetContext('test', 'data:image/png;base64,abc', [], 300, 250, new AbortController().signal)).rejects.toThrow();
    });

    it('should return patches from tool_use', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({
            content: [{ type: 'tool_use', name: 'rearrange_banner', input: { patches: [{ id: 'el-1', x: 10, y: 20 }], additions: [] } }],
        });
        const result = await callAssetContext('test', 'data:image/png;base64,abc', [], 300, 250, new AbortController().signal);
        expect(result.mode).toBe('asset_context');
        expect(result.patches).toHaveLength(1);
    });
});

describe('autoDesignService — callTemplateContent', () => {
    it('should return user-provided headline/cta directly without API call', async () => {
        vi.mocked(callAnthropicApi).mockClear();
        const result = await callTemplateContent(
            'headline= "Summer Sale" cta= "Buy Now"', 300, 250, 'modern', new AbortController().signal,
        );
        expect(result.headline).toBe('Summer Sale');
        expect(result.cta).toBe('Buy Now');
    });

    it('should sanitize junk headlines', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({
            content: [{ type: 'text', text: '{"headline": "inter", "cta": "click here", "subheadline": "", "tag": ""}' }],
        });
        const result = await callTemplateContent('design a banner', 300, 250, 'modern', new AbortController().signal);
        expect(result.headline).toBe('Get Started Today'); // "inter" is a junk value
        expect(result.cta).toBe('Shop Now'); // "click here" is junk
    });

    it('should handle API returning markdown-wrapped JSON', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({
            content: [{ type: 'text', text: '```json\n{"headline": "Big Deal", "cta": "Shop", "subheadline": "", "tag": ""}\n```' }],
        });
        const result = await callTemplateContent('sale', 300, 250, 'classic', new AbortController().signal);
        expect(result.headline).toBe('Big Deal');
    });

    it('should fallback to defaults on JSON parse failure', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({
            content: [{ type: 'text', text: 'not valid json at all' }],
        });
        const result = await callTemplateContent('anything', 300, 250, 'modern', new AbortController().signal);
        expect(result.headline).toBe('Get Started Today');
        expect(result.cta).toBe('Shop Now');
    });
});
