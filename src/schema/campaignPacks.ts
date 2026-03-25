// ─────────────────────────────────────────────────
// campaignPacks.ts — Pre-defined campaign format bundles
// ─────────────────────────────────────────────────
// Each pack is a curated set of BannerPreset IDs
// that make sense together for a specific use case.
// ─────────────────────────────────────────────────

import type { CampaignFormatPack } from './campaignTypes';

/** Social media starter — 3 core formats */
const SOCIAL_STARTER: CampaignFormatPack = {
    id: 'social-starter',
    name: 'Social Starter',
    description: 'Instagram Post + Story + Facebook Ad',
    presetIds: [
        'social-1080x1080',    // Instagram Post
        'social-1080x1920',    // Instagram Story
        'social-1200x628',     // Facebook Ad
    ],
};

/** Full social coverage — 6 platforms */
const FULL_SOCIAL: CampaignFormatPack = {
    id: 'full-social',
    name: 'Full Social',
    description: 'All social platforms — Instagram, Facebook, Twitter, LinkedIn',
    presetIds: [
        'social-1080x1080',    // Instagram Post
        'social-1080x1920',    // Instagram Story
        'social-1200x628',     // Facebook Ad
        'social-1200x1200',    // Facebook Square
        'social-1600x900',     // Twitter/X Header
        'social-1200x675',     // LinkedIn Sponsored
    ],
};

/** Display advertising pack — 4 IAB standard sizes */
const DISPLAY_PACK: CampaignFormatPack = {
    id: 'display-pack',
    name: 'Display Pack',
    description: 'Google Ads standard sizes — Banner, Leaderboard, Skyscraper, Mobile',
    presetIds: [
        'iab-300x250',     // Medium Rectangle
        'iab-728x90',      // Leaderboard
        'iab-160x600',     // Wide Skyscraper
        'iab-320x50',      // Mobile Banner
    ],
};

/** Full funnel — social + display + video thumbnail */
const FULL_FUNNEL: CampaignFormatPack = {
    id: 'full-funnel',
    name: 'Full Funnel',
    description: 'Complete campaign — social + display ads + email header',
    presetIds: [
        // Social
        'social-1080x1080',    // Instagram Post
        'social-1080x1920',    // Instagram Story
        'social-1200x628',     // Facebook Ad
        'social-1600x900',     // Twitter/X Header
        // Display
        'iab-300x250',         // Medium Rectangle
        'iab-728x90',          // Leaderboard
        'iab-160x600',         // Wide Skyscraper
        // Video
        'video-1920x1080',     // YouTube Thumbnail
    ],
};

// ── Registry ──

export const CAMPAIGN_PACKS: CampaignFormatPack[] = [
    SOCIAL_STARTER,
    FULL_SOCIAL,
    DISPLAY_PACK,
    FULL_FUNNEL,
];

export function getPackById(id: string): CampaignFormatPack | undefined {
    return CAMPAIGN_PACKS.find(p => p.id === id);
}

export function getDefaultPack(): CampaignFormatPack {
    return SOCIAL_STARTER;
}
