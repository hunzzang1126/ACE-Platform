// ─────────────────────────────────────────────────
// Smart Sizing Engine — AI-Powered Adaptive Layout
// ─────────────────────────────────────────────────
// Converts a master design → optimized layout for any target size.
// Uses aspect ratio classification + element role detection
// to intelligently reposition elements.

import type { DesignElement } from '@/schema/elements.types';
import type { ElementConstraints } from '@/schema/constraints.types';
import { resolveConstraints } from '@/schema/constraints.types';

// ── Aspect Ratio Categories ─────────────────────

export type SizeCategory =
    | 'ultra-wide'    // > 4.0  (728×90, 970×90)
    | 'wide'          // 2.0~4.0 (970×250)
    | 'landscape'     // 1.2~2.0 (300×250)
    | 'square'        // 0.8~1.2 (1080×1080)
    | 'portrait'      // 0.5~0.8 (320×480, 300×600)
    | 'ultra-tall';   // < 0.5   (160×600, 1080×1920)

export type ElementRole =
    | 'background'
    | 'headline'
    | 'subtext'
    | 'cta'
    | 'logo'
    | 'image'
    | 'decoration';

/**
 * Classify a size by its aspect ratio
 */
export function classifyRatio(w: number, h: number): SizeCategory {
    const ratio = w / h;
    if (ratio > 4.0) return 'ultra-wide';
    if (ratio > 2.0) return 'wide';
    if (ratio > 1.2) return 'landscape';
    if (ratio > 0.8) return 'square';
    if (ratio > 0.5) return 'portrait';
    return 'ultra-tall';
}

/**
 * Detect the role of an element based on its properties
 */
export function detectElementRole(
    element: DesignElement,
    masterW: number,
    masterH: number,
): ElementRole {
    const name = element.name.toLowerCase();

    // Name-based detection (highest priority)
    if (name.match(/bg|background/)) return 'background';
    if (name.match(/cta|button|shop|buy|learn|sign|start/)) return 'cta';
    if (name.match(/logo|brand/)) return 'logo';
    if (name.match(/head|title|main.*text/)) return 'headline';
    if (name.match(/sub|desc|body|caption/)) return 'subtext';
    if (name.match(/hero|banner.*img|photo/)) return 'image';

    // Type + size heuristic
    if (element.type === 'shape') {
        const resolved = resolveConstraints(element.constraints, masterW, masterH);
        const coverage = (resolved.width * resolved.height) / (masterW * masterH);
        if (coverage > 0.6) return 'background';
        return 'decoration';
    }
    if (element.type === 'button') return 'cta';
    if (element.type === 'image') return 'image';
    if (element.type === 'text') {
        const fontSize = (element as { fontSize?: number }).fontSize ?? 16;
        if (fontSize >= 24) return 'headline';
        return 'subtext';
    }

    return 'decoration';
}

// ── Layout Zone System ──────────────────────────

/**
 * Each zone defines where an element role should be placed
 * within a specific size category. Values are 0-1 (relative).
 */
export interface LayoutZone {
    x: number;      // left edge (0-1)
    y: number;      // top edge (0-1)
    w: number;      // width (0-1)
    h: number;      // height (0-1)
    maxFontScale: number;  // max font size scaling factor
}

type LayoutMap = Record<ElementRole, LayoutZone>;

/**
 * Layout zones per category.
 *
 * Ultra-wide (728×90):
 * ┌────────────────────────────────────┐
 * │ LOGO │  HEADLINE  │ CTA           │
 * └────────────────────────────────────┘
 *
 * Square (1080×1080):
 * ┌──────────────┐
 * │    IMAGE     │
 * │  HEADLINE    │
 * │  SUBTEXT     │
 * │    CTA       │
 * └──────────────┘
 *
 * Ultra-tall (160×600):
 * ┌──────┐
 * │ LOGO │
 * │      │
 * │ IMG  │
 * │      │
 * │ HEAD │
 * │ SUB  │
 * │ CTA  │
 * └──────┘
 */
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
    // Social sizes (1:1, 4:5) — everything center-aligned
    'square': {
        background: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 1 },
        logo: { x: 0.30, y: 0.03, w: 0.40, h: 0.08, maxFontScale: 0.9 },
        image: { x: 0.05, y: 0.05, w: 0.90, h: 0.38, maxFontScale: 1 },
        headline: { x: 0.10, y: 0.46, w: 0.80, h: 0.18, maxFontScale: 1 },
        subtext: { x: 0.10, y: 0.65, w: 0.80, h: 0.10, maxFontScale: 0.8 },
        cta: { x: 0.20, y: 0.80, w: 0.60, h: 0.12, maxFontScale: 1 },
        decoration: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 0.9 },
    },
    // Portrait / 4:5 / 9:16 — logo top, content center, CTA bottom
    'portrait': {
        background: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 1 },
        logo: { x: 0.25, y: 0.03, w: 0.50, h: 0.06, maxFontScale: 0.8 },
        image: { x: 0.05, y: 0.10, w: 0.90, h: 0.35, maxFontScale: 1 },
        headline: { x: 0.08, y: 0.48, w: 0.84, h: 0.15, maxFontScale: 0.9 },
        subtext: { x: 0.08, y: 0.64, w: 0.84, h: 0.10, maxFontScale: 0.7 },
        cta: { x: 0.15, y: 0.78, w: 0.70, h: 0.10, maxFontScale: 0.9 },
        decoration: { x: 0, y: 0, w: 1, h: 1, maxFontScale: 0.7 },
    },
    // Ultra-tall (160x600, skyscraper) — vertical stack, center-aligned
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

// ── Proportional Scaling ────────────────────────
// The plug system provides explicit connections between sizes.
// When origin saves, propagate to targets using EXACT proportional scaling:
//   same relative position, same relative size.
// This replaces the old zone-based repositioning system.

const MIN_FONT = 8; // minimum font size in px

/**
 * Apply proportional scaling from origin elements → target variant.
 * Returns new array of elements adapted for the target size.
 *
 * Strategy: Scale all positions and sizes proportionally.
 * If origin has a rect at (30%, 20%) → target gets it at (30%, 20%).
 */
export function smartSizeElements(
    originElements: DesignElement[],
    originW: number,
    originH: number,
    targetW: number,
    targetH: number,
): DesignElement[] {
    // If same size, just deep-clone
    if (originW === targetW && originH === targetH) {
        return JSON.parse(JSON.stringify(originElements));
    }

    const scaleX = targetW / originW;
    const scaleY = targetH / originH;
    // Use the smaller scale for fonts so text doesn't overflow
    const fontScale = Math.min(scaleX, scaleY);
    // Uniform scale for elements that need aspect ratio preservation
    const uniformScale = Math.min(scaleX, scaleY);

    return originElements.map((el) => {
        const resolved = resolveConstraints(el.constraints, originW, originH);
        const role = detectElementRole(el, originW, originH);

        let newX: number, newY: number, newW: number, newH: number;

        if (role === 'background') {
            // ★ BUG 1 FIX: Backgrounds always cover the full target canvas
            newX = 0;
            newY = 0;
            newW = targetW;
            newH = targetH;
        } else if (role === 'image' || role === 'logo') {
            // ★ BUG 1 FIX: Use uniform scale to preserve aspect ratio
            newW = Math.max(4, Math.round(resolved.width * uniformScale));
            newH = Math.max(4, Math.round(resolved.height * uniformScale));
            // Center-align the scaled element relative to its proportional position
            const relCenterX = (resolved.x + resolved.width / 2) / originW;
            const relCenterY = (resolved.y + resolved.height / 2) / originH;
            newX = Math.round(relCenterX * targetW - newW / 2);
            newY = Math.round(relCenterY * targetH - newH / 2);
        } else if (role === 'cta') {
            // ★ BUG 2 FIX: CTA preserves width/height ratio
            newW = Math.max(4, Math.round(resolved.width * uniformScale));
            newH = Math.max(4, Math.round(resolved.height * uniformScale));
            // Position proportionally
            const relCenterX = (resolved.x + resolved.width / 2) / originW;
            const relCenterY = (resolved.y + resolved.height / 2) / originH;
            newX = Math.round(relCenterX * targetW - newW / 2);
            newY = Math.round(relCenterY * targetH - newH / 2);
        } else {
            // Text, decoration, etc. — proportional scaling (original behavior)
            newX = Math.round(resolved.x * scaleX);
            newY = Math.round(resolved.y * scaleY);
            newW = Math.max(4, Math.round(resolved.width * scaleX));
            newH = Math.max(4, Math.round(resolved.height * scaleY));
        }

        // Clamp to canvas bounds
        newX = Math.max(0, Math.min(newX, targetW - Math.min(newW, targetW)));
        newY = Math.max(0, Math.min(newY, targetH - Math.min(newH, targetH)));

        const newConstraints: ElementConstraints = {
            horizontal: { anchor: 'left' as const, offset: newX },
            vertical: { anchor: 'top' as const, offset: newY },
            size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: newW, height: newH },
            rotation: el.constraints.rotation,
        };

        // Scale font proportionally with a floor
        let fontPatch: Partial<DesignElement> = {};
        if ((el.type === 'text' || el.type === 'button') && (el as any).fontSize) {
            fontPatch = {
                fontSize: Math.max(MIN_FONT, Math.round((el as any).fontSize * fontScale)),
            };
        }

        return {
            ...JSON.parse(JSON.stringify(el)),
            constraints: newConstraints,
            ...fontPatch,
        } as DesignElement;
    });
}


// ── Multi-Master Architecture (P3) ──────────────────────
//
// Instead of scaling ONE master to all sizes (causes squishing),
// we group all sizes into 3 master families and generate AI layouts
// tailored to each family's aspect ratio profile.
//
// Landscape family: ultra-wide + wide + landscape
// Square family:    square + mild portrait
// Portrait family:  portrait + ultra-tall
//
// ────────────────────────────────────────────────────────

export type MasterGroup = 'landscape' | 'square' | 'portrait';

/**
 * Classify a size into one of 3 master groups.
 * Used to determine which master design to clone from.
 */
export function classifyMasterGroup(w: number, h: number): MasterGroup {
    const ratio = w / h;
    if (ratio >= 0.85) return 'landscape'; // wide and ultra-wide
    if (ratio >= 0.7) return 'square';     // square-ish (1:1, 4:5)
    return 'portrait';                      // tall (9:16, skyscraper)
}

/**
 * Group a list of target sizes into master groups.
 * Returns map of group → target sizes that belong to it.
 */
export function groupSizesByMaster(
    sizes: Array<{ w: number; h: number; id: string }>
): Record<MasterGroup, Array<{ w: number; h: number; id: string }>> {
    const groups: Record<MasterGroup, typeof sizes> = {
        landscape: [],
        square: [],
        portrait: [],
    };
    for (const size of sizes) {
        const group = classifyMasterGroup(size.w, size.h);
        groups[group].push(size);
    }
    return groups;
}

/**
 * Per-group layout description for Auto-Design system prompt.
 * The AI gets this BEFORE generating so it understands the typical layout.
 */
export function getMasterGroupDescriptions(): Record<MasterGroup, string> {
    return {
        landscape: `MASTER GROUP: LANDSCAPE (wide banners, leaderboards)
  Layout: HORIZONTAL. Logo/text LEFT side, CTA RIGHT side.
  Elements fill width, shorter height. Text must be readable in single lines.
  Priority: Headline impact, clear CTA button, no vertical stacking.`,

        square: `MASTER GROUP: SQUARE (1:1 social, Facebook/Instagram)
  Layout: CENTERED. Large image/background behind.
  Headline CENTER-ALIGNED, CTA at bottom third.
  Priority: Visual punch, center balance, single-screen impact.`,

        portrait: `MASTER GROUP: PORTRAIT (skyscraper, Stories, 9:16)
  Layout: VERTICAL STACK. Logo/brand TOP, headline MIDDLE, CTA BOTTOM.
  All elements CENTER-ALIGNED horizontally. Text stacks vertically.
  Priority: Clear reading flow top-to-bottom, generous vertical spacing.`,
    };
}

/**
 * Get font size boost factor for a master group.
 * Landscape groups get smaller fonts (less height), portrait gets bigger.
 */
export function getMasterGroupFontBoost(group: MasterGroup): number {
    const boosts: Record<MasterGroup, number> = {
        landscape: 0.85,  // compressed height → smaller fonts
        square: 1.0,       // balanced
        portrait: 1.15,    // tall canvas → more room for large type
    };
    return boosts[group];
}

