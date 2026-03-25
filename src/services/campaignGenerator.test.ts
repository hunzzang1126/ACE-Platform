// ─────────────────────────────────────────────────
// campaignGenerator.test.ts — Campaign generator tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildFormatDesignPrompt } from '@/services/campaignGenerator';
import type { CampaignDNA } from '@/schema/campaignTypes';

const mockDNA: CampaignDNA = {
    palette: {
        primary: '#2563EB',
        secondary: '#1E293B',
        accent: '#F59E0B',
        background: '#0F172A',
        text: '#F8FAFC',
    },
    copy: {
        headline: 'Summer Sale',
        subtext: 'Up to 50% off everything',
        cta: 'Shop Now',
    },
    mood: 'energetic',
    season: 'summer',
};

describe('campaignGenerator', () => {
    describe('buildFormatDesignPrompt', () => {
        it('should include format dimensions in prompt', () => {
            const prompt = buildFormatDesignPrompt(mockDNA, {
                id: 'social-1080x1080', name: 'Instagram Post',
                width: 1080, height: 1080, category: 'social',
            });
            expect(prompt).toContain('1080x1080');
            expect(prompt).toContain('Instagram Post');
        });

        it('should include DNA palette colors', () => {
            const prompt = buildFormatDesignPrompt(mockDNA, {
                id: 'social-1080x1080', name: 'Instagram Post',
                width: 1080, height: 1080, category: 'social',
            });
            expect(prompt).toContain('#2563EB');
            expect(prompt).toContain('#F59E0B');
        });

        it('should include copy text', () => {
            const prompt = buildFormatDesignPrompt(mockDNA, {
                id: 'social-1200x628', name: 'Facebook Ad',
                width: 1200, height: 628, category: 'social',
            });
            expect(prompt).toContain('Summer Sale');
            expect(prompt).toContain('Shop Now');
        });

        it('should use "Centered" layout for square formats', () => {
            const prompt = buildFormatDesignPrompt(mockDNA, {
                id: 'social-1080x1080', name: 'Instagram Post',
                width: 1080, height: 1080, category: 'social',
            });
            expect(prompt).toContain('Centered');
        });

        it('should use "Vertical" layout for portrait formats', () => {
            const prompt = buildFormatDesignPrompt(mockDNA, {
                id: 'social-1080x1920', name: 'Instagram Story',
                width: 1080, height: 1920, category: 'social',
            });
            expect(prompt).toContain('Vertical');
        });

        it('should use "Horizontal" layout for landscape formats', () => {
            const prompt = buildFormatDesignPrompt(mockDNA, {
                id: 'social-1200x628', name: 'Facebook Ad',
                width: 1200, height: 628, category: 'social',
            });
            expect(prompt).toContain('Horizontal');
        });

        it('should use "Single-row" layout for ultrawide formats', () => {
            const prompt = buildFormatDesignPrompt(mockDNA, {
                id: 'iab-728x90', name: 'Leaderboard',
                width: 728, height: 90, category: 'display',
            });
            expect(prompt).toContain('Single-row');
        });

        it('should use "Vertical stack" layout for skyscraper formats', () => {
            const prompt = buildFormatDesignPrompt(mockDNA, {
                id: 'iab-160x600', name: 'Wide Skyscraper',
                width: 160, height: 600, category: 'display',
            });
            expect(prompt).toContain('Vertical stack');
        });

        it('should include mood in prompt', () => {
            const prompt = buildFormatDesignPrompt(mockDNA, {
                id: 'social-1080x1080', name: 'Instagram Post',
                width: 1080, height: 1080, category: 'social',
            });
            expect(prompt).toContain('energetic');
        });
    });
});
