// ─────────────────────────────────────────────────
// smartSizingTypes — Types, zones, role detection
// ─────────────────────────────────────────────────

import type { DesignElement } from '@/schema/elements.types';
import { resolveConstraints } from '@/schema/constraints.types';

// ── Aspect Ratio Categories ──

export type SizeCategory =
    | 'ultra-wide'    // > 4.0  (728×90, 970×90)
    | 'wide'          // 2.0~4.0 (970×250)
    | 'landscape'     // 1.2~2.0 (300×250)
    | 'square'        // 0.8~1.2 (1080×1080)
    | 'portrait'      // 0.5~0.8 (320×480, 300×600)
    | 'ultra-tall';   // < 0.5   (160×600, 1080×1920)

export type ElementRole = 'background' | 'headline' | 'subtext' | 'cta' | 'logo' | 'image' | 'decoration';

export function classifyRatio(w: number, h: number): SizeCategory {
    const ratio = w / h;
    if (ratio > 4.0) return 'ultra-wide';
    if (ratio > 2.0) return 'wide';
    if (ratio > 1.2) return 'landscape';
    if (ratio > 0.8) return 'square';
    if (ratio > 0.5) return 'portrait';
    return 'ultra-tall';
}

export function detectElementRole(element: DesignElement, masterW: number, masterH: number): ElementRole {
    const name = element.name.toLowerCase();
    // ★ REGRESSION GUARD: Use word boundaries (\b) to prevent false positives.
    if (name.match(/\b(bg|background)\b/)) return 'background';
    if (name.match(/\b(cta|button|shop|buy|learn|sign up|start|get started)\b/)) return 'cta';
    if (name.match(/\b(logo|brand)\b/)) return 'logo';
    if (name.match(/\b(head|title|headline)\b|main.*text/)) return 'headline';
    if (name.match(/\b(sub|desc|body|caption)\b/)) return 'subtext';
    if (name.match(/\b(hero|photo)\b|banner.*img/)) return 'image';

    if (element.type === 'shape') {
        const resolved = resolveConstraints(element.constraints, masterW, masterH);
        return (resolved.width * resolved.height) / (masterW * masterH) > 0.6 ? 'background' : 'decoration';
    }
    if (element.type === 'button') return 'cta';
    if (element.type === 'image') {
        const resolved = resolveConstraints(element.constraints, masterW, masterH);
        return (resolved.width * resolved.height) / (masterW * masterH) > 0.6 ? 'background' : 'image';
    }
    if (element.type === 'text') {
        return ((element as { fontSize?: number }).fontSize ?? 16) >= 24 ? 'headline' : 'subtext';
    }
    return 'decoration';
}

// ── Layout Zone System ──

export interface LayoutZone {
    x: number; y: number; w: number; h: number;
    maxFontScale: number;
}

type LayoutMap = Record<ElementRole, LayoutZone>;

export const LAYOUT_ZONES: Record<SizeCategory, LayoutMap> = {
    'ultra-wide': {
        background: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 1 },
        logo: { x: 0.02, y: 0.1, w: 0.15, h: 0.8, maxFontScale: 0.5 },
        image: { x: 0.02, y: 0, w: 0.25, h: 1, maxFontScale: 1 },
        headline: { x: 0.20, y: 0.1, w: 0.50, h: 0.5, maxFontScale: 0.6 },
        subtext: { x: 0.20, y: 0.55, w: 0.50, h: 0.35, maxFontScale: 0.5 },
        cta: { x: 0.75, y: 0.15, w: 0.22, h: 0.7, maxFontScale: 0.7 },
        decoration: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 0.5 },
    },
    'wide': {
        background: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 1 },
        logo: { x: 0.03, y: 0.05, w: 0.15, h: 0.2, maxFontScale: 0.7 },
        image: { x: 0, y: 0, w: 0.45, h: 1, maxFontScale: 1 },
        headline: { x: 0.48, y: 0.08, w: 0.48, h: 0.35, maxFontScale: 0.8 },
        subtext: { x: 0.48, y: 0.42, w: 0.48, h: 0.25, maxFontScale: 0.6 },
        cta: { x: 0.48, y: 0.70, w: 0.30, h: 0.22, maxFontScale: 0.8 },
        decoration: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 0.6 },
    },
    'landscape': {
        background: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 1 },
        logo: { x: 0.05, y: 0.05, w: 0.2, h: 0.15, maxFontScale: 0.8 },
        image: { x: 0, y: 0, w: 0.5, h: 1, maxFontScale: 1 },
        headline: { x: 0.08, y: 0.15, w: 0.84, h: 0.30, maxFontScale: 1 },
        subtext: { x: 0.08, y: 0.48, w: 0.84, h: 0.20, maxFontScale: 0.8 },
        cta: { x: 0.25, y: 0.72, w: 0.50, h: 0.20, maxFontScale: 1 },
        decoration: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 0.8 },
    },
    'square': {
        background: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 1 },
        logo: { x: 0.30, y: 0.03, w: 0.40, h: 0.08, maxFontScale: 0.9 },
        image: { x: 0.05, y: 0.05, w: 0.90, h: 0.38, maxFontScale: 1 },
        headline: { x: 0.10, y: 0.46, w: 0.80, h: 0.18, maxFontScale: 1 },
        subtext: { x: 0.10, y: 0.65, w: 0.80, h: 0.10, maxFontScale: 0.8 },
        cta: { x: 0.20, y: 0.80, w: 0.60, h: 0.12, maxFontScale: 1 },
        decoration: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 0.9 },
    },
    'portrait': {
        background: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 1 },
        logo: { x: 0.25, y: 0.03, w: 0.50, h: 0.06, maxFontScale: 0.8 },
        image: { x: 0.05, y: 0.10, w: 0.90, h: 0.35, maxFontScale: 1 },
        headline: { x: 0.08, y: 0.48, w: 0.84, h: 0.15, maxFontScale: 0.9 },
        subtext: { x: 0.08, y: 0.64, w: 0.84, h: 0.10, maxFontScale: 0.7 },
        cta: { x: 0.15, y: 0.78, w: 0.70, h: 0.10, maxFontScale: 0.9 },
        decoration: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 0.7 },
    },
    'ultra-tall': {
        background: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 1 },
        logo: { x: 0.10, y: 0.02, w: 0.80, h: 0.06, maxFontScale: 0.6 },
        image: { x: 0.05, y: 0.10, w: 0.90, h: 0.30, maxFontScale: 1 },
        headline: { x: 0.05, y: 0.44, w: 0.90, h: 0.15, maxFontScale: 0.8 },
        subtext: { x: 0.05, y: 0.60, w: 0.90, h: 0.12, maxFontScale: 0.6 },
        cta: { x: 0.10, y: 0.76, w: 0.80, h: 0.08, maxFontScale: 0.8 },
        decoration: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 0.5 },
    },
};

// ── Multi-Master Architecture ──

export type MasterGroup = 'landscape' | 'square' | 'portrait';

export function classifyMasterGroup(w: number, h: number): MasterGroup {
    const ratio = w / h;
    if (ratio >= 0.85) return 'landscape';
    if (ratio >= 0.7) return 'square';
    return 'portrait';
}

export function groupSizesByMaster(
    sizes: Array<{ w: number; h: number; id: string }>
): Record<MasterGroup, Array<{ w: number; h: number; id: string }>> {
    const groups: Record<MasterGroup, typeof sizes> = { landscape: [], square: [], portrait: [] };
    for (const size of sizes) groups[classifyMasterGroup(size.w, size.h)].push(size);
    return groups;
}

export function getMasterGroupDescriptions(): Record<MasterGroup, string> {
    return {
        landscape: `MASTER GROUP: LANDSCAPE (wide banners, leaderboards)\n  Layout: HORIZONTAL. Logo/text LEFT side, CTA RIGHT side.\n  Elements fill width, shorter height. Text must be readable in single lines.\n  Priority: Headline impact, clear CTA button, no vertical stacking.`,
        square: `MASTER GROUP: SQUARE (1:1 social, Facebook/Instagram)\n  Layout: CENTERED. Large image/background behind.\n  Headline CENTER-ALIGNED, CTA at bottom third.\n  Priority: Visual punch, center balance, single-screen impact.`,
        portrait: `MASTER GROUP: PORTRAIT (skyscraper, Stories, 9:16)\n  Layout: VERTICAL STACK. Logo/brand TOP, headline MIDDLE, CTA BOTTOM.\n  All elements CENTER-ALIGNED horizontally. Text stacks vertically.\n  Priority: Clear reading flow top-to-bottom, generous vertical spacing.`,
    };
}

export function getMasterGroupFontBoost(group: MasterGroup): number {
    return ({ landscape: 0.85, square: 1.0, portrait: 1.15 })[group];
}
