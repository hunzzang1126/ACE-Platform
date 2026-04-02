// ─────────────────────────────────────────────────
// campaignStore.test.ts — Campaign state management tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./idbStorageAdapter', () => ({
    idbStorage: {
        getItem: vi.fn().mockResolvedValue(null),
        setItem: vi.fn().mockResolvedValue(undefined),
        removeItem: vi.fn().mockResolvedValue(undefined),
    },
}));

import { useCampaignStore } from './campaignStore';
import type { CampaignDNA } from '@/schema/campaignTypes';

const mockDNA: CampaignDNA = {
    industry: 'tech',
    style: 'modern',
    toneOfVoice: 'professional',
    targetAudience: 'developers',
};

describe('campaignStore', () => {
    beforeEach(() => {
        useCampaignStore.setState({ campaigns: [] });
    });

    // ── createCampaign ──

    describe('createCampaign', () => {
        it('should create a campaign and return its ID', () => {
            const id = useCampaignStore.getState().createCampaign('Test Campaign', 'Make a banner', 'pack-1', mockDNA);
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });

        it('should add campaign to the campaigns array', () => {
            useCampaignStore.getState().createCampaign('Test', 'prompt', 'pack-1', mockDNA);
            expect(useCampaignStore.getState().campaigns).toHaveLength(1);
        });

        it('should set initial status to generating with progress 0', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'prompt', 'pack-1', mockDNA);
            const campaign = useCampaignStore.getState().getCampaign(id);
            expect(campaign?.status).toBe('generating');
            expect(campaign?.progress).toBe(0);
        });

        it('should store name, prompt, packId, and dna', () => {
            const id = useCampaignStore.getState().createCampaign('My Campaign', 'Create tech banners', 'pack-2', mockDNA);
            const campaign = useCampaignStore.getState().getCampaign(id);
            expect(campaign?.name).toBe('My Campaign');
            expect(campaign?.prompt).toBe('Create tech banners');
            expect(campaign?.packId).toBe('pack-2');
            expect(campaign?.dna).toEqual(mockDNA);
        });

        it('should initialize with empty creativeSetIds', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'prompt', 'p', mockDNA);
            const campaign = useCampaignStore.getState().getCampaign(id);
            expect(campaign?.creativeSetIds).toEqual([]);
        });

        it('should set timestamps', () => {
            const before = new Date().toISOString();
            const id = useCampaignStore.getState().createCampaign('Test', 'prompt', 'p', mockDNA);
            const campaign = useCampaignStore.getState().getCampaign(id);
            expect(campaign?.createdAt).toBeDefined();
            expect(campaign?.updatedAt).toBeDefined();
            expect(campaign!.createdAt >= before).toBe(true);
        });

        it('should support multiple campaigns', () => {
            useCampaignStore.getState().createCampaign('C1', 'p1', 'pack-1', mockDNA);
            useCampaignStore.getState().createCampaign('C2', 'p2', 'pack-2', mockDNA);
            useCampaignStore.getState().createCampaign('C3', 'p3', 'pack-3', mockDNA);
            expect(useCampaignStore.getState().campaigns).toHaveLength(3);
        });
    });

    // ── updateProgress ──

    describe('updateProgress', () => {
        it('should update progress for specific campaign', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'p', 'pk', mockDNA);
            useCampaignStore.getState().updateProgress(id, 0.5);
            expect(useCampaignStore.getState().getCampaign(id)?.progress).toBe(0.5);
        });

        it('should not affect other campaigns', () => {
            const id1 = useCampaignStore.getState().createCampaign('C1', 'p', 'pk', mockDNA);
            const id2 = useCampaignStore.getState().createCampaign('C2', 'p', 'pk', mockDNA);
            useCampaignStore.getState().updateProgress(id1, 0.8);
            expect(useCampaignStore.getState().getCampaign(id2)?.progress).toBe(0);
        });

        it('should update the updatedAt timestamp', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'p', 'pk', mockDNA);
            const before = useCampaignStore.getState().getCampaign(id)?.updatedAt;
            useCampaignStore.getState().updateProgress(id, 0.9);
            const after = useCampaignStore.getState().getCampaign(id)?.updatedAt;
            expect(after! >= before!).toBe(true);
        });
    });

    // ── addCreativeSetId ──

    describe('addCreativeSetId', () => {
        it('should add a creative set ID to the campaign', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'p', 'pk', mockDNA);
            useCampaignStore.getState().addCreativeSetId(id, 'cs-001');
            expect(useCampaignStore.getState().getCampaign(id)?.creativeSetIds).toContain('cs-001');
        });

        it('should accumulate multiple IDs', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'p', 'pk', mockDNA);
            useCampaignStore.getState().addCreativeSetId(id, 'cs-001');
            useCampaignStore.getState().addCreativeSetId(id, 'cs-002');
            useCampaignStore.getState().addCreativeSetId(id, 'cs-003');
            expect(useCampaignStore.getState().getCampaign(id)?.creativeSetIds).toHaveLength(3);
        });
    });

    // ── setStatus ──

    describe('setStatus', () => {
        it('should update campaign status', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'p', 'pk', mockDNA);
            useCampaignStore.getState().setStatus(id, 'ready');
            expect(useCampaignStore.getState().getCampaign(id)?.status).toBe('ready');
        });

        it('should set progress to 1 when status is ready', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'p', 'pk', mockDNA);
            useCampaignStore.getState().setStatus(id, 'ready');
            expect(useCampaignStore.getState().getCampaign(id)?.progress).toBe(1);
        });

        it('should preserve progress when status is not ready', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'p', 'pk', mockDNA);
            useCampaignStore.getState().updateProgress(id, 0.3);
            useCampaignStore.getState().setStatus(id, 'error', 'Something failed');
            expect(useCampaignStore.getState().getCampaign(id)?.progress).toBe(0.3);
        });

        it('should store error message', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'p', 'pk', mockDNA);
            useCampaignStore.getState().setStatus(id, 'error', 'API quota exceeded');
            expect(useCampaignStore.getState().getCampaign(id)?.errorMessage).toBe('API quota exceeded');
        });
    });

    // ── deleteCampaign ──

    describe('deleteCampaign', () => {
        it('should remove the campaign from the array', () => {
            const id = useCampaignStore.getState().createCampaign('Test', 'p', 'pk', mockDNA);
            useCampaignStore.getState().deleteCampaign(id);
            expect(useCampaignStore.getState().campaigns).toHaveLength(0);
        });

        it('should not affect other campaigns', () => {
            const id1 = useCampaignStore.getState().createCampaign('C1', 'p', 'pk', mockDNA);
            const id2 = useCampaignStore.getState().createCampaign('C2', 'p', 'pk', mockDNA);
            useCampaignStore.getState().deleteCampaign(id1);
            expect(useCampaignStore.getState().campaigns).toHaveLength(1);
            expect(useCampaignStore.getState().getCampaign(id2)).toBeDefined();
        });

        it('should handle deleting non-existent campaign gracefully', () => {
            useCampaignStore.getState().deleteCampaign('non-existent');
            expect(useCampaignStore.getState().campaigns).toHaveLength(0);
        });
    });

    // ── getCampaign ──

    describe('getCampaign', () => {
        it('should return undefined for non-existent campaign', () => {
            expect(useCampaignStore.getState().getCampaign('fake-id')).toBeUndefined();
        });

        it('should return the correct campaign by ID', () => {
            const id = useCampaignStore.getState().createCampaign('Find Me', 'p', 'pk', mockDNA);
            const campaign = useCampaignStore.getState().getCampaign(id);
            expect(campaign?.name).toBe('Find Me');
        });
    });
});
