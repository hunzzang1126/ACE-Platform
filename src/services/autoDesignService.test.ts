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
        expect(result.cta).toBe(''); // "click here" is junk → no forced CTA
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
        expect(result.cta).toBe(''); // No forced CTA fallback
    });

    it('★ REGRESSION: should sanitize Korean junk CTA "버튼"', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({
            content: [{ type: 'text', text: '{"headline": "아이폰 17 — 혁신의 시작", "cta": "버튼", "subheadline": "", "tag": ""}' }],
        });
        const result = await callTemplateContent('아이폰 17 광고', 300, 250, 'modern', new AbortController().signal, 'Korean');
        expect(result.headline).toBe('아이폰 17 — 혁신의 시작');
        // "버튼" is a Korean UI term, not a CTA → must be sanitized to ""
        expect(result.cta).toBe('');
    });

    it('★ REGRESSION: should sanitize Korean junk subheadline "텍스트"', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({
            content: [{ type: 'text', text: '{"headline": "Summer Sale", "cta": "Shop Now", "subheadline": "텍스트", "tag": "태그"}' }],
        });
        const result = await callTemplateContent('summer sale', 300, 250, 'modern', new AbortController().signal);
        expect(result.subheadline).toBe(''); // "텍스트" is junk
        expect(result.tag).toBe(''); // "태그" is junk
    });

    it('should NOT apply title case to Korean headlines', async () => {
        vi.mocked(callAnthropicApi).mockResolvedValue({
            content: [{ type: 'text', text: '{"headline": "혁신의 새로운 기준", "cta": "지금 주문하기", "subheadline": "", "tag": ""}' }],
        });
        const result = await callTemplateContent('아이폰 광고', 300, 250, 'modern', new AbortController().signal, 'Korean');
        // Korean text should remain as-is (no Title Case transformation)
        expect(result.headline).toBe('혁신의 새로운 기준');
        expect(result.cta).toBe('지금 주문하기');
    });
});
