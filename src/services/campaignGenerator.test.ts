// ─────────────────────────────────────────────────
// campaignGenerator.test.ts — Campaign generation tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/anthropicClient', () => ({
    callAnthropicApi: vi.fn(),
    DEFAULT_CLAUDE_MODEL: 'test-model',
}));

vi.mock('@/stores/campaignStore', () => ({
    useCampaignStore: {
        getState: vi.fn().mockReturnValue({
            createCampaign: vi.fn().mockReturnValue('campaign-1'),
            addCreativeSetId: vi.fn(),
            updateProgress: vi.fn(),
            setStatus: vi.fn(),
        }),
    },
}));

vi.mock('@/stores/designStore', () => ({
    useDesignStore: {
        getState: vi.fn().mockReturnValue({
            createCreativeSet: vi.fn().mockReturnValue('cs-1'),
        }),
    },
}));

vi.mock('@/schema/campaignPacks', () => ({
    getPackById: vi.fn().mockReturnValue(null),
    getDefaultPack: vi.fn().mockReturnValue({
        id: 'social-starter',
        name: 'Social Starter',
        presetIds: ['social-square', 'story'],
    }),
}));

vi.mock('@/schema/presets', () => ({
    getPresetById: vi.fn().mockImplementation((id: string) => {
        if (id === 'social-square') return { id: 'social-square', name: 'Social Square', width: 1080, height: 1080 };
        if (id === 'story') return { id: 'story', name: 'Story', width: 1080, height: 1920 };
        return null;
    }),
}));

import { extractCampaignDNA, generateCampaign, buildFormatDesignPrompt } from './campaignGenerator';
import { callAnthropicApi } from '@/services/anthropicClient';
import type { CampaignDNA } from '@/schema/campaignTypes';

describe('campaignGenerator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('extractCampaignDNA', () => {
        it('should parse valid DNA from AI response', async () => {
            const dna = {
                palette: { primary: '#2563EB', secondary: '#1E293B', accent: '#F59E0B', background: '#0F172A', text: '#F8FAFC' },
                copy: { headline: 'Summer Sale', subtext: 'Up to 50% off everything', cta: 'Shop Now' },
                mood: 'energetic',
            };
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{ type: 'text', text: JSON.stringify(dna) }],
            });

            const result = await extractCampaignDNA('Summer fashion sale');
            expect(result.palette.primary).toBe('#2563EB');
            expect(result.copy.headline).toBe('Summer Sale');
            expect(result.mood).toBe('energetic');
        });

        it('should apply defaults for missing DNA fields', async () => {
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{ type: 'text', text: '{"palette":{},"copy":{},"mood":"bold"}' }],
            });

            const result = await extractCampaignDNA('test');
            expect(result.palette.primary).toBe('#2563EB'); // default
            expect(result.copy.headline).toBe('Your Brand Here'); // default
        });

        it('should throw on non-JSON response', async () => {
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{ type: 'text', text: 'I cannot help with that.' }],
            });

            await expect(extractCampaignDNA('test')).rejects.toThrow('Failed to extract');
        });
    });

    describe('generateCampaign', () => {
        it('should create campaign with formats', async () => {
            vi.mocked(callAnthropicApi).mockResolvedValue({
                content: [{ type: 'text', text: '{"palette":{"primary":"#000"},"copy":{"headline":"Test"},"mood":"bold"}' }],
            });

            const progress = vi.fn();
            const result = await generateCampaign('Tesla ad', undefined, undefined, progress);
            expect(result.success).toBe(true);
            expect(result.creativeSetIds.length).toBeGreaterThan(0);
            expect(progress).toHaveBeenCalled();
        });

        it('should handle DNA extraction failure', async () => {
            vi.mocked(callAnthropicApi).mockRejectedValue(new Error('API down'));

            const result = await generateCampaign('test');
            expect(result.success).toBe(false);
            expect(result.message).toContain('DNA extraction failed');
        });
    });

    describe('buildFormatDesignPrompt', () => {
        const dna: CampaignDNA = {
            palette: { primary: '#2563EB', secondary: '#1E293B', accent: '#F59E0B', background: '#0F172A', text: '#F8FAFC' },
            copy: { headline: 'Summer Sale', subtext: 'Big discounts', cta: 'Shop Now' },
            mood: 'energetic',
        };

        it('should include dimensions', () => {
            const prompt = buildFormatDesignPrompt(dna, { width: 1080, height: 1080, name: 'Social Square' } as any);
            expect(prompt).toContain('1080x1080');
        });

        it('should include DNA colors', () => {
            const prompt = buildFormatDesignPrompt(dna, { width: 300, height: 250, name: 'Med Rect' } as any);
            expect(prompt).toContain('#2563EB');
            expect(prompt).toContain('#F59E0B');
        });

        it('should include copy', () => {
            const prompt = buildFormatDesignPrompt(dna, { width: 300, height: 250, name: 'Med Rect' } as any);
            expect(prompt).toContain('Summer Sale');
            expect(prompt).toContain('Shop Now');
        });

        it('should include mood', () => {
            const prompt = buildFormatDesignPrompt(dna, { width: 300, height: 250, name: 'Med Rect' } as any);
            expect(prompt).toContain('energetic');
        });

        it('should detect ultra-wide format', () => {
            const prompt = buildFormatDesignPrompt(dna, { width: 728, height: 90, name: 'Leaderboard' } as any);
            expect(prompt).toContain('Single-row');
        });

        it('should detect portrait format', () => {
            const prompt = buildFormatDesignPrompt(dna, { width: 1080, height: 1920, name: 'Story' } as any);
            expect(prompt).toContain('Vertical');
        });
    });
});
