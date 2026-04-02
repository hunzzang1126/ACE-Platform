// ─────────────────────────────────────────────────
// designStyleGuides.test.ts — Style guide + color tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/anthropicClient', () => ({
    callAnthropicApi: vi.fn(),
    DEFAULT_CLAUDE_MODEL: 'test-model',
}));

import { selectStyleGuide, buildStylePromptForAI, STYLE_GUIDES, generateColorPalette } from './designStyleGuides';
import { callAnthropicApi } from '@/services/anthropicClient';

describe('designStyleGuides', () => {
    // ── selectStyleGuide (legacy sync) ──
    describe('selectStyleGuide', () => {
        it('should return a valid style guide', () => {
            const guide = selectStyleGuide('any prompt');
            expect(guide.id).toBeTruthy();
            expect(guide.colors).toBeDefined();
            expect(guide.typography).toBeDefined();
            expect(guide.spacing).toBeDefined();
        });

        it('should always return default palette', () => {
            const guide = selectStyleGuide('Nike sports ad');
            expect(guide.id).toBe('ai-generated');
        });

        it('should have valid color hex values', () => {
            const guide = selectStyleGuide('test');
            const hexRegex = /^#[0-9a-f]{6}$/i;
            expect(guide.colors.background).toMatch(hexRegex);
            expect(guide.colors.foreground).toMatch(hexRegex);
            expect(guide.colors.accent).toMatch(hexRegex);
        });

        it('should have typography scale', () => {
            const guide = selectStyleGuide('test');
            expect(guide.typography.scale.hero).toBeGreaterThan(guide.typography.scale.headline);
            expect(guide.typography.scale.headline).toBeGreaterThan(guide.typography.scale.body);
        });
    });

    // ── buildStylePromptForAI ──
    describe('buildStylePromptForAI', () => {
        const guide = selectStyleGuide('test');

        it('should include palette name', () => {
            const prompt = buildStylePromptForAI(guide, 300, 250);
            expect(prompt).toContain(guide.name);
        });

        it('should include color hex values', () => {
            const prompt = buildStylePromptForAI(guide, 300, 250);
            expect(prompt).toContain(guide.colors.background);
            expect(prompt).toContain(guide.colors.accent);
        });

        it('should include font names', () => {
            const prompt = buildStylePromptForAI(guide, 300, 250);
            expect(prompt).toContain(guide.typography.primaryFont);
        });

        it('should compute pixel sizes from canvas', () => {
            const prompt = buildStylePromptForAI(guide, 300, 250);
            const heroSize = Math.round(250 * guide.typography.scale.hero);
            expect(prompt).toContain(`${heroSize}px`);
        });

        it('should include gradient info', () => {
            const prompt = buildStylePromptForAI(guide, 300, 250);
            expect(prompt).toContain('Gradient');
            expect(prompt).toContain(guide.colors.gradientStart);
        });

        it('should include spacing/radius', () => {
            const prompt = buildStylePromptForAI(guide, 300, 250);
            expect(prompt).toContain(`${guide.spacing.safe}px`);
            expect(prompt).toContain(`${guide.radius}px`);
        });

        it('should include contrast rule', () => {
            const prompt = buildStylePromptForAI(guide, 300, 250);
            expect(prompt).toContain('4.5:1');
        });
    });

    // ── STYLE_GUIDES ──
    describe('STYLE_GUIDES', () => {
        it('should have default entry', () => {
            expect(STYLE_GUIDES['default']).toBeDefined();
            expect(STYLE_GUIDES['default'].id).toBe('ai-generated');
        });
    });

    // ── generateColorPalette ──
    describe('generateColorPalette', () => {
        it('should return default palette on AI failure', async () => {
            vi.mocked(callAnthropicApi).mockRejectedValue(new Error('API down'));
            const result = await generateColorPalette('Nike ad', new AbortController().signal);
            expect(result.palette).toBeDefined();
            expect(result.palette.colors.background).toBeTruthy();
            expect(result.needsBackgroundImage).toBe(false);
        });

        it('should parse AI response into palette', async () => {
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        name: 'Nike Bold',
                        background: '#111111',
                        surface: '#1a1a1a',
                        foreground: '#ffffff',
                        secondary: '#cccccc',
                        accent: '#ff0000',
                        accentForeground: '#ffffff',
                        gradientStart: '#111111',
                        gradientEnd: '#222222',
                        gradientAngle: 135,
                        fontPrimary: 'Futura',
                        fontSecondary: 'Helvetica',
                        radius: 4,
                        reasoning: 'Nike brand colors',
                        needsBackgroundImage: true,
                        backgroundImagePrompt: 'athletic field at night',
                    }),
                }],
            });
            const result = await generateColorPalette('Nike sports ad', new AbortController().signal);
            expect(result.palette.name).toBe('Nike Bold');
            expect(result.palette.colors.accent).toBe('#ff0000');
            expect(result.palette.typography.primaryFont).toBe('Futura');
            expect(result.needsBackgroundImage).toBe(true);
            expect(result.backgroundImagePrompt).toContain('athletic');
        });

        it('should handle markdown-wrapped JSON', async () => {
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{
                    type: 'text',
                    text: '```json\n' + JSON.stringify({
                        name: 'Test', background: '#000', surface: '#111',
                        foreground: '#fff', secondary: '#aaa', accent: '#0af',
                        accentForeground: '#fff', gradientStart: '#000', gradientEnd: '#111',
                        gradientAngle: 90, fontPrimary: 'Inter', fontSecondary: 'Inter',
                        radius: 8, reasoning: 'test', needsBackgroundImage: false,
                        backgroundImagePrompt: '',
                    }) + '\n```',
                }],
            });
            const result = await generateColorPalette('test', new AbortController().signal);
            expect(result.palette.name).toBe('Test');
        });
    });
});
