// ─────────────────────────────────────────────────
// Publish Types — shared types for social publishing
// ─────────────────────────────────────────────────

export type PublishPlatform = 'instagram' | 'facebook' | 'google_ads';
export type PublishStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'scheduled';

export interface SocialAccount {
    id: string;
    userId: string;
    platform: PublishPlatform;
    platformUserId: string;
    accountName: string;
    accountAvatar?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    scopes?: string[];
    connectedAt: string;
}

export interface PublishRecord {
    id: string;
    userId: string;
    creativeSetId: string;
    variantId?: string;
    variantLabel?: string;
    platform: PublishPlatform;
    platformPostId?: string;
    socialAccountId?: string;
    status: PublishStatus;
    scheduledAt?: string;
    publishedAt?: string;
    caption?: string;
    hashtags?: string[];
    headlines?: string[];
    imageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    errorMessage?: string;
    createdAt: string;
}

export interface CampaignMetric {
    id: string;
    publishId: string;
    platform: PublishPlatform;
    metricDate: string;
    impressions: number;
    clicks: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    views: number;
    ctr: number;
    costCents: number;
    conversions: number;
}

// ── Size → Platform routing ──────────────────────
export interface SizeRoute {
    platform: PublishPlatform;
    placement: string;
    label: string;
}

export interface PublishPayload {
    creativeSetId: string;
    channels: PublishChannel[];
}

export interface PublishChannel {
    platform: PublishPlatform;
    socialAccountId: string;
    variants: PublishVariant[];
    caption?: string;
    hashtags?: string[];
    headlines?: string[];
    scheduledAt?: string;
}

export interface PublishVariant {
    variantId: string;
    variantLabel: string;
    width: number;
    height: number;
    placement: string;
    imageDataUrl?: string;
}
