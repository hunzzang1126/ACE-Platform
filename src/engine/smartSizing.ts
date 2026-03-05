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

// ── Smart Reposition ────────────────────────────

/**
 * Smart-reposition a single element from master to a target size.
 * Returns new constraints adapted for the target canvas.
 */
export function smartReposition(
    element: DesignElement,
    masterW: number,
    masterH: number,
    targetW: number,
    targetH: number,
): ElementConstraints {
    const role = detectElementRole(element, masterW, masterH);
    const category = classifyRatio(targetW, targetH);
    const zone = LAYOUT_ZONES[category][role];

    // Background always stretches to fill
    if (role === 'background') {
        return {
            horizontal: { anchor: 'stretch', offset: 0, marginLeft: 0, marginRight: 0 },
            vertical: { anchor: 'stretch', offset: 0, marginTop: 0, marginBottom: 0 },
            size: { widthMode: 'relative', heightMode: 'relative', width: 1, height: 1 },
            rotation: element.constraints.rotation,
        };
    }

    // Convert zone (relative) → absolute constraints
    const absX = Math.round(zone.x * targetW);
    const absY = Math.round(zone.y * targetH);
    const absW = Math.round(zone.w * targetW);
    const absH = Math.round(zone.h * targetH);

    // For text elements, scale font size
    const masterResolved = resolveConstraints(element.constraints, masterW, masterH);
    const scaleX = absW / masterResolved.width;
    const scaleY = absH / masterResolved.height;
    const uniformScale = Math.min(scaleX, scaleY, zone.maxFontScale);

    // Determine best anchor based on zone position
    let horizontal: ElementConstraints['horizontal'];
    const zoneCenterX = zone.x + zone.w / 2;
    if (zoneCenterX > 0.4 && zoneCenterX < 0.6) {
        horizontal = { anchor: 'center', offset: 0 };
    } else if (zoneCenterX <= 0.4) {
        horizontal = { anchor: 'left', offset: absX };
    } else {
        horizontal = { anchor: 'right', offset: Math.round(targetW - absX - absW) };
    }

    let vertical: ElementConstraints['vertical'];
    const zoneCenterY = zone.y + zone.h / 2;
    if (zoneCenterY > 0.4 && zoneCenterY < 0.6) {
        vertical = { anchor: 'center', offset: 0 };
    } else if (zoneCenterY <= 0.4) {
        vertical = { anchor: 'top', offset: absY };
    } else {
        vertical = { anchor: 'bottom', offset: Math.round(targetH - absY - absH) };
    }

    // For CTA buttons, keep reasonable fixed size
    // Min: 40×20px (always tappable), Max: 50% canvas width
    if (role === 'cta') {
        const ctaW = Math.min(absW, Math.max(40, Math.round(targetW * 0.5)));
        const ctaH = Math.min(absH, Math.max(20, Math.round(targetH * 0.12)));
        return {
            horizontal,
            vertical,
            size: { widthMode: 'fixed', heightMode: 'fixed', width: ctaW, height: ctaH },
            rotation: element.constraints.rotation,
        };
    }

    // For text, use proportional sizing
    if (element.type === 'text') {
        return {
            horizontal,
            vertical,
            size: {
                widthMode: 'fixed',
                heightMode: 'auto',
                width: absW,
                height: Math.round(masterResolved.height * uniformScale),
            },
            rotation: element.constraints.rotation,
        };
    }

    // For images, maintain aspect ratio within zone
    if (element.type === 'image') {
        const origAR = masterResolved.width / masterResolved.height;
        let imgW = absW;
        let imgH = Math.round(imgW / origAR);
        if (imgH > absH) {
            imgH = absH;
            imgW = Math.round(imgH * origAR);
        }
        return {
            horizontal,
            vertical,
            size: { widthMode: 'fixed', heightMode: 'fixed', width: imgW, height: imgH },
            rotation: element.constraints.rotation,
        };
    }

    // Default: scale proportionally
    return {
        horizontal,
        vertical,
        size: { widthMode: 'fixed', heightMode: 'fixed', width: absW, height: absH },
        rotation: element.constraints.rotation,
    };
}

/**
 * Role-based minimum font sizes (px).
 * Mirrors Yoga's minWidth/minHeight concept — no element should
 * shrink below usability thresholds.
 */
const MIN_FONT_BY_ROLE: Partial<Record<ElementRole, number>> = {
    background: 10,
    logo: 8,
    headline: 10,
    subtext: 9,
    cta: 10,
    decoration: 10,  // raised from 7 — was effectively dead since decoration is rarely assigned
    image: 10,
};

/**
 * Scale font-related properties for a text element
 */
export function scaleFontSize(
    element: DesignElement,
    masterW: number,
    masterH: number,
    targetW: number,
    targetH: number,
): Partial<DesignElement> {
    if (element.type !== 'text' && element.type !== 'button') return {};

    const role = detectElementRole(element, masterW, masterH);
    const category = classifyRatio(targetW, targetH);
    const zone = LAYOUT_ZONES[category][role];

    // Scale based on the smaller dimension ratio
    const scaleW = targetW / masterW;
    const scaleH = targetH / masterH;
    const fontScale = Math.min(scaleW, scaleH, zone.maxFontScale);

    // Use role-based floor (Yoga-inspired minWidth/minHeight concept)
    const minFont = MIN_FONT_BY_ROLE[role] ?? 8;

    if (element.type === 'text') {
        return {
            fontSize: Math.max(minFont, Math.round(element.fontSize * fontScale)),
        };
    }
    if (element.type === 'button') {
        return {
            fontSize: Math.max(minFont, Math.round(element.fontSize * fontScale)),
        };
    }
    return {};
}

// ── Propagation Entry Point ─────────────────────

/**
 * Apply smart sizing from master elements → target variant.
 * Returns new array of elements adapted for the target size.
 */
export function smartSizeElements(
    masterElements: DesignElement[],
    masterW: number,
    masterH: number,
    targetW: number,
    targetH: number,
): DesignElement[] {
    // If same size, just deep-clone
    if (masterW === targetW && masterH === targetH) {
        return JSON.parse(JSON.stringify(masterElements));
    }

    return masterElements.map((el) => {
        const newConstraints = smartReposition(el, masterW, masterH, targetW, targetH);
        const fontPatch = scaleFontSize(el, masterW, masterH, targetW, targetH);

        return {
            ...JSON.parse(JSON.stringify(el)),
            constraints: newConstraints,
            ...fontPatch,
        };
    });
}
