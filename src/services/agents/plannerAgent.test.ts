// ─────────────────────────────────────────────────
// plannerAgent.test.ts — Design planner agent tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/anthropicClient', () => ({
    callAnthropicApi: vi.fn(),
    DEFAULT_CLAUDE_MODEL: 'test-model',
}));

vi.mock('@/services/brandContextBuilder', () => ({
    buildBrandContextForPlanner: vi.fn().mockReturnValue('BRAND: TestBrand'),
}));

vi.mock('@/engine/smartSizing', () => ({
    classifyRatio: vi.fn().mockReturnValue('landscape'),
    LAYOUT_ZONES: {
        landscape: {
            headline: { x: 5, y: 15, w: 90, h: 25 },
            image: { x: 5, y: 40, w: 90, h: 35 },
            cta: { x: 25, y: 75, w: 50, h: 20 },
        },
    },
    classifyMasterGroup: vi.fn().mockReturnValue('standard'),
    getMasterGroupDescriptions: vi.fn().mockReturnValue({ standard: 'Standard banner' }),
}));

vi.mock('@/services/toolRegistry', () => ({
    getToolSchemasByCategory: vi.fn().mockReturnValue([
        { name: 'add_text', description: 'Add text element' },
    ]),
}));

vi.mock('@/services/bannerDesignGuide', () => ({
    buildBannerStyleGuide: vi.fn().mockReturnValue('## Banner Guide'),
}));

vi.mock('@/services/designTokens', () => ({
    buildTokenPromptForAI: vi.fn().mockReturnValue('TOKENS: primary=#ff6b35'),
}));

import { runPlanner } from './plannerAgent';
import { callAnthropicApi } from '@/services/anthropicClient';

describe('plannerAgent', () => {
    describe('runPlanner', () => {
        it('should return parsed design plan from AI', async () => {
            const plan = {
                description: 'A premium Nike ad',
                elements: [
                    { role: 'background', type: 'shape', tool: 'add_shape', params: { fill: '#000' }, reasoning: 'Dark bg' },
                    { role: 'headline', type: 'text', tool: 'add_text', params: { content: 'Just Do It' }, reasoning: 'Bold headline' },
                ],
                colorPalette: ['#000', '#fff'],
                fontChoices: { heading: 'Inter', body: 'Inter', cta: 'Inter' },
            };

            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{ type: 'text', text: JSON.stringify(plan) }],
            });

            const result = await runPlanner('Nike sports ad', 300, 250, null, null, new AbortController().signal);
            expect(result.description).toBe('A premium Nike ad');
            expect(result.elements).toHaveLength(2);
            expect(result.elements[0].tool).toBe('add_shape');
        });

        it('should throw on empty plan', async () => {
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{ type: 'text', text: '{"description":"empty","elements":[]}' }],
            });

            await expect(
                runPlanner('test', 300, 250, null, null, new AbortController().signal),
            ).rejects.toThrow('empty design plan');
        });

        it('should throw on non-JSON response', async () => {
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{ type: 'text', text: 'I cannot generate that.' }],
            });

            await expect(
                runPlanner('test', 300, 250, null, null, new AbortController().signal),
            ).rejects.toThrow('valid JSON');
        });

        it('should call progress callback', async () => {
            const plan = {
                description: 'test', elements: [{ role: 'bg', type: 'shape', tool: 'add_shape', params: {}, reasoning: '' }],
            };
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{ type: 'text', text: JSON.stringify(plan) }],
            });

            const progress = vi.fn();
            await runPlanner('test', 300, 250, null, null, new AbortController().signal, progress);
            expect(progress).toHaveBeenCalledWith(expect.stringContaining('Planning'), 'planner');
        });
    });
});
