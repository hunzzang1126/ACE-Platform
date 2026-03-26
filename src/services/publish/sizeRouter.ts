// ─────────────────────────────────────────────────
// Size Router — maps variant dimensions to platforms
// ─────────────────────────────────────────────────
// Given a width×height, returns which platforms/placements it fits.
// This is the "auto-routing" logic for creative set publishing.
// ─────────────────────────────────────────────────

import type { SizeRoute, PublishPlatform } from './publishTypes';

// ── Size → Platform mapping rules ──
interface SizeRule {
    width: number;
    height: number;
    routes: SizeRoute[];
}

const SIZE_RULES: SizeRule[] = [
    // Instagram
    { width: 1080, height: 1080, routes: [
        { platform: 'instagram', placement: 'feed', label: 'Instagram Feed' },
        { platform: 'facebook', placement: 'feed', label: 'Facebook Feed' },
    ]},
    { width: 1080, height: 1920, routes: [
        { platform: 'instagram', placement: 'stories', label: 'Instagram Stories' },
        { platform: 'facebook', placement: 'stories', label: 'Facebook Stories' },
    ]},
    { width: 1080, height: 1350, routes: [
        { platform: 'instagram', placement: 'feed_portrait', label: 'Instagram Feed (Portrait)' },
    ]},

    // Facebook
    { width: 1200, height: 628, routes: [
        { platform: 'facebook', placement: 'link_ad', label: 'Facebook Link Ad' },
        { platform: 'google_ads', placement: 'discover', label: 'Google Discover' },
    ]},
    { width: 1200, height: 630, routes: [
        { platform: 'facebook', placement: 'link_ad', label: 'Facebook Link Ad' },
    ]},

    // Google Display Network
    { width: 300, height: 250, routes: [
        { platform: 'google_ads', placement: 'medium_rectangle', label: 'GDN Medium Rectangle' },
    ]},
    { width: 336, height: 280, routes: [
        { platform: 'google_ads', placement: 'large_rectangle', label: 'GDN Large Rectangle' },
    ]},
    { width: 728, height: 90, routes: [
        { platform: 'google_ads', placement: 'leaderboard', label: 'GDN Leaderboard' },
    ]},
    { width: 160, height: 600, routes: [
        { platform: 'google_ads', placement: 'wide_skyscraper', label: 'GDN Wide Skyscraper' },
    ]},
    { width: 320, height: 50, routes: [
        { platform: 'google_ads', placement: 'mobile_banner', label: 'GDN Mobile Banner' },
    ]},
    { width: 320, height: 100, routes: [
        { platform: 'google_ads', placement: 'mobile_large', label: 'GDN Mobile Large Banner' },
    ]},
    { width: 970, height: 250, routes: [
        { platform: 'google_ads', placement: 'billboard', label: 'GDN Billboard' },
    ]},
    { width: 970, height: 90, routes: [
        { platform: 'google_ads', placement: 'large_leaderboard', label: 'GDN Large Leaderboard' },
    ]},
    { width: 468, height: 60, routes: [
        { platform: 'google_ads', placement: 'banner', label: 'GDN Banner' },
    ]},
    { width: 250, height: 250, routes: [
        { platform: 'google_ads', placement: 'square', label: 'GDN Square' },
    ]},
];

/**
 * Get platform routes for a given size.
 * Returns exact matches first, then fuzzy matches (±10px tolerance).
 */
export function getRoutesForSize(width: number, height: number): SizeRoute[] {
    // Exact match
    const exact = SIZE_RULES.find(r => r.width === width && r.height === height);
    if (exact) return exact.routes;

    // Fuzzy match (±10px tolerance for slight size differences)
    const fuzzy = SIZE_RULES.find(r =>
        Math.abs(r.width - width) <= 10 && Math.abs(r.height - height) <= 10
    );
    if (fuzzy) return fuzzy.routes;

    // Aspect ratio match for social (square = IG, landscape = FB, portrait = IG stories)
    const ratio = width / height;
    const routes: SizeRoute[] = [];

    if (Math.abs(ratio - 1) < 0.05) {
        // Square → Instagram Feed
        routes.push({ platform: 'instagram', placement: 'feed', label: 'Instagram Feed (auto)' });
        routes.push({ platform: 'facebook', placement: 'feed', label: 'Facebook Feed (auto)' });
    } else if (ratio > 1.5 && ratio < 2.2) {
        // Wide landscape → Facebook Link / Google Display
        routes.push({ platform: 'facebook', placement: 'link_ad', label: 'Facebook Link Ad (auto)' });
        routes.push({ platform: 'google_ads', placement: 'responsive', label: 'Google Responsive Ad (auto)' });
    } else if (ratio < 0.7) {
        // Tall portrait → Stories
        routes.push({ platform: 'instagram', placement: 'stories', label: 'Instagram Stories (auto)' });
        routes.push({ platform: 'facebook', placement: 'stories', label: 'Facebook Stories (auto)' });
    }

    return routes;
}

/**
 * Group variants by platform for bulk publishing.
 */
export function groupVariantsByPlatform(
    variants: Array<{ id: string; label: string; width: number; height: number }>
): Map<PublishPlatform, Array<{ variantId: string; label: string; width: number; height: number; placement: string; platformLabel: string }>> {
    const grouped = new Map<PublishPlatform, Array<{ variantId: string; label: string; width: number; height: number; placement: string; platformLabel: string }>>();

    for (const v of variants) {
        const routes = getRoutesForSize(v.width, v.height);
        for (const route of routes) {
            if (!grouped.has(route.platform)) {
                grouped.set(route.platform, []);
            }
            grouped.get(route.platform)!.push({
                variantId: v.id,
                label: v.label,
                width: v.width,
                height: v.height,
                placement: route.placement,
                platformLabel: route.label,
            });
        }
    }

    return grouped;
}

/**
 * Get all supported size presets with their platform destinations.
 */
export function getAllSizePresets(): Array<{ width: number; height: number; routes: SizeRoute[] }> {
    return SIZE_RULES.map(r => ({ width: r.width, height: r.height, routes: r.routes }));
}
