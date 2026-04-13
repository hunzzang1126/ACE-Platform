// ─────────────────────────────────────────────────
// campaignTypes — Type Structure Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import type { CampaignDNA, CampaignFormatPack, CampaignStatus, Campaign } from './campaignTypes';

describe('campaignTypes — Type Shapes', () => {
    it('CampaignDNA has palette with all 5 color roles', () => {
        const dna: CampaignDNA = {
            palette: {
                primary: '#2DD4BF', secondary: '#6366F1', accent: '#c084fc',
                background: '#0B0F1A', text: '#F1F5F9',
            },
            copy: { headline: 'Test', subtext: 'Sub', cta: 'Click' },
            mood: 'professional',
        };
        expect(Object.keys(dna.palette)).toHaveLength(5);
    });

    it('CampaignDNA copy has required fields', () => {
        const dna: CampaignDNA = {
            palette: { primary: '#000', secondary: '#111', accent: '#222', background: '#333', text: '#fff' },
            copy: { headline: 'H', subtext: 'S', cta: 'C' },
            mood: 'energetic',
            season: 'summer',
        };
        expect(dna.copy.headline).toBe('H');
        expect(dna.season).toBe('summer');
    });

    it('CampaignFormatPack has id, name, desc, presets', () => {
        const pack: CampaignFormatPack = {
            id: 'pack-1', name: 'Social Bundle',
            description: 'Instagram + Facebook', presetIds: ['1080x1080', '1200x628'],
        };
        expect(pack.presetIds).toHaveLength(2);
    });

    it('CampaignStatus exhausts all possible values', () => {
        const statuses: CampaignStatus[] = ['generating', 'ready', 'error'];
        expect(statuses).toHaveLength(3);
    });

    it('Campaign has all required fields', () => {
        const campaign: Campaign = {
            id: 'c-1', name: 'Summer Sale',
            prompt: 'bold summer vibes',
            dna: {
                palette: { primary: '#f00', secondary: '#0f0', accent: '#00f', background: '#000', text: '#fff' },
                copy: { headline: 'Summer Sale', subtext: 'Up to 50% off', cta: 'Shop Now' },
                mood: 'energetic',
            },
            creativeSetIds: ['cs-1', 'cs-2'],
            packId: 'pack-social',
            status: 'ready',
            progress: 1.0,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
        };
        expect(campaign.creativeSetIds).toHaveLength(2);
        expect(campaign.progress).toBe(1.0);
    });

    it('Campaign supports optional errorMessage', () => {
        const campaign: Campaign = {
            id: 'c-2', name: 'Failed',
            prompt: 'test', packId: 'pack-1',
            dna: {
                palette: { primary: '', secondary: '', accent: '', background: '', text: '' },
                copy: { headline: '', subtext: '', cta: '' },
                mood: '',
            },
            creativeSetIds: [],
            status: 'error',
            progress: 0.3,
            errorMessage: 'API timeout',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
        };
        expect(campaign.errorMessage).toBe('API timeout');
    });
});
