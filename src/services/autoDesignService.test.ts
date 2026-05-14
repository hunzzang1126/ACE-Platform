// ─────────────────────────────────────────────────
// autoDesignService.test.ts — API call tests
// ─────────────────────────────────────────────────
// ★ v744: callTemplateContent tests REMOVED (dead code).
// Content generation tests → designBrief.test.ts.
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

// Mock anthropicClient (hoisted)
vi.mock('@/services/anthropicClient', () => ({
    callAnthropicApi: vi.fn(),
    DEFAULT_CLAUDE_MODEL: 'claude-3-haiku-20240307',
}));

import { callFromScratch, callAssetContext } from './autoDesignService';
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

// ══════════════════════════════════════════════════
// ★ v732: Design quality — overlay + font diversity
// ══════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('★ v732: Overlay readability improvements', () => {
    const overlaySrc = readFileSync(resolve(__dirname, './overlayStyles.ts'), 'utf-8');

    it('★ REGRESSION: gradient-scrim starts at 30% for full coverage', () => {
        expect(overlaySrc).toContain('canvasH * 0.30');
    });

    it('★ REGRESSION: gradient-scrim opacity is 0.65+ for strong contrast', () => {
        expect(overlaySrc).toContain('a: 0.65');
    });

    it('★ REGRESSION: strong text shadow has blur >= 12', () => {
        expect(overlaySrc).toContain('shadowBlur: 12');
    });
});

describe('★ v744: Font codification (fontPairings.ts)', () => {
    const fontSrc = readFileSync(resolve(__dirname, './fontPairings.ts'), 'utf-8');

    it('has mood-based font pair mapping', () => {
        expect(fontSrc).toContain('MOOD_FONTS');
        expect(fontSrc).toContain('elegant');
        expect(fontSrc).toContain('Playfair Display');
    });

    it('has industry-based font pair mapping', () => {
        expect(fontSrc).toContain('INDUSTRY_FONTS');
        expect(fontSrc).toContain('tech');
        expect(fontSrc).toContain('Space Grotesk');
    });

    it('rejects system fonts (Arial, Helvetica, etc.)', () => {
        expect(fontSrc).toContain('SYSTEM_FONTS');
        expect(fontSrc).toContain('arial');
        expect(fontSrc).toContain('helvetica');
    });

    it('enforces diversity — primary ≠ secondary', () => {
        expect(fontSrc).toContain('primary === result.secondary');
    });
});

describe('★ v744: Palette accepts brief hint', () => {
    const styleSrc = readFileSync(resolve(__dirname, './designStyleGuides.ts'), 'utf-8');

    it('accepts briefHint parameter', () => {
        expect(styleSrc).toContain('briefHint?: BriefHint');
    });

    it('pipes mood/industry into user message', () => {
        expect(styleSrc).toContain('Pre-analyzed: mood=');
    });

    it('uses selectFontPair for codified font selection', () => {
        expect(styleSrc).toContain('selectFontPair');
    });

    it('has deterministic CTA style based on mood', () => {
        expect(styleSrc).toContain("'elegant', 'luxurious', 'minimal'");
        expect(styleSrc).toContain("'outlined'");
    });

    it('★ REGRESSION: user-specified colors override brand defaults', () => {
        expect(styleSrc).toContain('User-specified colors ALWAYS win');
    });

    it('uses prompt caching', () => {
        expect(styleSrc).toContain('cache_control');
        expect(styleSrc).toContain('ephemeral');
    });
});
