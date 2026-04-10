// ─────────────────────────────────────────────────
// publishTypes — Schema Integrity Tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import type {
    PublishPlatform, PublishStatus, SocialAccount,
    PublishRecord, CampaignMetric, SizeRoute,
    PublishPayload, PublishChannel, PublishVariant,
} from './publishTypes';

describe('publishTypes — Type Compile Check', () => {
    it('PublishPlatform accepts valid platforms', () => {
        const platforms: PublishPlatform[] = ['instagram', 'facebook', 'google_ads'];
        expect(platforms).toHaveLength(3);
    });

    it('PublishStatus covers all lifecycle states', () => {
        const statuses: PublishStatus[] = ['pending', 'publishing', 'published', 'failed', 'scheduled'];
        expect(statuses).toHaveLength(5);
    });

    it('SocialAccount has required auth fields', () => {
        const account: SocialAccount = {
            id: 'acc-1', userId: 'u-1', platform: 'instagram',
            platformUserId: 'ig-123', accountName: 'test',
            accessToken: 'tok', connectedAt: '2026-01-01',
        };
        expect(account.platform).toBe('instagram');
        expect(account.accessToken).toBeDefined();
    });

    it('PublishRecord has required tracking fields', () => {
        const record: PublishRecord = {
            id: 'pub-1', userId: 'u-1', creativeSetId: 'cs-1',
            platform: 'facebook', status: 'pending',
            createdAt: '2026-01-01',
        };
        expect(record.status).toBe('pending');
    });

    it('CampaignMetric has all analytics fields', () => {
        const metric: CampaignMetric = {
            id: 'm-1', publishId: 'pub-1', platform: 'google_ads',
            metricDate: '2026-01-01',
            impressions: 1000, clicks: 50, reach: 800,
            engagement: 100, likes: 30, comments: 5,
            shares: 3, saves: 2, views: 500,
            ctr: 0.05, costCents: 1500, conversions: 10,
        };
        expect(metric.ctr).toBe(0.05);
        expect(metric.conversions).toBe(10);
    });

    it('SizeRoute links size to platform placement', () => {
        const route: SizeRoute = {
            platform: 'google_ads', placement: 'leaderboard', label: 'GDN Leaderboard',
        };
        expect(route.placement).toBe('leaderboard');
    });

    it('PublishPayload structures multi-channel publish', () => {
        const variant: PublishVariant = {
            variantId: 'v-1', variantLabel: '1080x1080',
            width: 1080, height: 1080, placement: 'feed',
        };
        const channel: PublishChannel = {
            platform: 'instagram', socialAccountId: 'acc-1',
            variants: [variant],
        };
        const payload: PublishPayload = {
            creativeSetId: 'cs-1', channels: [channel],
        };
        expect(payload.channels).toHaveLength(1);
        expect(payload.channels[0]!.variants[0]!.width).toBe(1080);
    });
});
