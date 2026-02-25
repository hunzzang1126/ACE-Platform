// ─────────────────────────────────────────────────
// Banner Preset Definitions (IAB + Social)
// ─────────────────────────────────────────────────
import type { BannerPreset } from './design.types';

export const BANNER_PRESETS: BannerPreset[] = [
    // ── IAB Display ──
    { id: 'iab-300x250', name: 'Medium Rectangle', width: 300, height: 250, category: 'display' },
    { id: 'iab-728x90', name: 'Leaderboard', width: 728, height: 90, category: 'display' },
    { id: 'iab-160x600', name: 'Wide Skyscraper', width: 160, height: 600, category: 'display' },
    { id: 'iab-320x50', name: 'Mobile Banner', width: 320, height: 50, category: 'display' },
    { id: 'iab-970x250', name: 'Billboard', width: 970, height: 250, category: 'display' },
    { id: 'iab-300x600', name: 'Half Page', width: 300, height: 600, category: 'display' },
    { id: 'iab-320x480', name: 'Mobile Interstitial', width: 320, height: 480, category: 'display' },
    { id: 'iab-468x60', name: 'Full Banner', width: 468, height: 60, category: 'display' },

    // ── Social Media ──
    { id: 'social-1080x1080', name: 'Instagram Post', width: 1080, height: 1080, category: 'social' },
    { id: 'social-1080x1920', name: 'Instagram Story', width: 1080, height: 1920, category: 'social' },
    { id: 'social-1200x628', name: 'Facebook Ad', width: 1200, height: 628, category: 'social' },
    { id: 'social-1200x1200', name: 'Facebook Square', width: 1200, height: 1200, category: 'social' },
    { id: 'social-1600x900', name: 'Twitter/X Header', width: 1600, height: 900, category: 'social' },
    { id: 'social-1200x675', name: 'LinkedIn Sponsored', width: 1200, height: 675, category: 'social' },

    // ── Video ──
    { id: 'video-1920x1080', name: 'Full HD (16:9)', width: 1920, height: 1080, category: 'video' },
    { id: 'video-1080x1920', name: 'Vertical Video', width: 1080, height: 1920, category: 'video' },
];

export function getPresetById(id: string): BannerPreset | undefined {
    return BANNER_PRESETS.find((p) => p.id === id);
}

export function getPresetsByCategory(category: BannerPreset['category']): BannerPreset[] {
    return BANNER_PRESETS.filter((p) => p.category === category);
}
