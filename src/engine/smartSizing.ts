// ─────────────────────────────────────────────────
// Smart Sizing Engine — Template-Proven Adaptive Layout
// ─────────────────────────────────────────────────
// Converts a master design → optimized layout for any target size.
// Uses the SAME strategy as template drops (applyVariantToCanvas):
// independent X/Y scaling (stretch fill) + geometric mean for fonts.
//
// ★ v3: TEMPLATE-PROVEN STRATEGY
// All elements → independent scaleX/scaleY stretch (fills canvas like painting a wall)
// Fonts/radii → √(scaleX × scaleY) geometric mean (balanced)
// Background → always 100% coverage

import type { DesignElement } from '@/schema/elements.types';
import type { ElementConstraints } from '@/schema/constraints.types';
import { resolveConstraints } from '@/schema/constraints.types';
import { constraintsToAbsolute } from './elementConverters';

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
    // ★ REGRESSION GUARD: Use word boundaries (\b) to prevent false positives.
    // Without \b, /cta/ matches inside "rec[cta]ngle" → misdetects shape as CTA.
    if (name.match(/\b(bg|background)\b/)) return 'background';
    if (name.match(/\b(cta|button|shop|buy|learn|sign up|start|get started)\b/)) return 'cta';
    if (name.match(/\b(logo|brand)\b/)) return 'logo';
    if (name.match(/\b(head|title|headline)\b|main.*text/)) return 'headline';
    if (name.match(/\b(sub|desc|body|caption)\b/)) return 'subtext';
    if (name.match(/\b(hero|photo)\b|banner.*img/)) return 'image';

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

// ── Role bridge: ElementRole → LayoutRole ────────
import type { LayoutRole } from '@/schema/layoutRoles';
import { getAspectCategory } from '@/schema/layoutRoles';
import { computeSmartConstraints, getSmartFontSize } from './smartLayout';

const ELEMENT_TO_LAYOUT_ROLE: Record<ElementRole, LayoutRole> = {
    background: 'background',
    headline: 'headline',
    subtext: 'subline',
    cta: 'cta',
    logo: 'logo',
    image: 'hero',
    decoration: 'accent',
};

function toLayoutRole(elementRole: ElementRole, el: DesignElement): LayoutRole {
    // If element already has a LayoutRole assigned, prefer it
    if (el.role) return el.role;
    return ELEMENT_TO_LAYOUT_ROLE[elementRole] ?? 'accent';
}

// ── Smart Sizing (v4: Semantic Resizing) ─────────
// ★ v4: TWO-STRATEGY APPROACH
// Same-category (e.g. landscape→landscape): v3 stretch fill (works perfectly)
// Cross-category (e.g. square→ultra-wide): role-based repositioning via computeSmartConstraints
// This is the core upgrade of Sprint 3: elements understand their ROLE and get placed
// in semantically correct positions for each aspect ratio category.

const MIN_FONT = 8; // minimum font size in px
const MIN_CTA_HEIGHT = 44; // minimum CTA touch target

/**
 * Apply smart sizing from origin elements → target variant.
 * Returns new array of elements adapted for the target size.
 *
 * ★ v4: SEMANTIC RESIZING
 * - Same category: v3 independent X/Y stretch fill + geometric mean fonts
 * - Cross category: role-based layout repositioning via smartLayout engine
 *   Each element is placed in its semantically correct zone for the target
 *   aspect ratio (headline→center, CTA→right for ultra-wide, etc.)
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

    const originCategory = getAspectCategory(originW, originH);
    const targetCategory = getAspectCategory(targetW, targetH);
    const isCrossCategory = originCategory !== targetCategory;

    console.log(`[smartSizing] ★ v5 Running: ${originW}x${originH} (${originCategory}) → ${targetW}x${targetH} (${targetCategory}), ${originElements.length} elements, cross=${isCrossCategory}`);

    // ★ v3 scales — always computed for same-category path and fallback
    const scaleX = targetW / originW;
    const scaleY = targetH / originH;
    const scaleFontRadius = Math.sqrt(scaleX * scaleY);

    // ── Step 1: Place each element ──
    const placed = originElements.map((el) => {
        const abs = constraintsToAbsolute(el.constraints, originW, originH);
        const role = detectElementRole(el, originW, originH);
        const layoutRole = toLayoutRole(role, el);

        console.log(`[smartSizing]   el="${el.name}" type=${el.type} role=${role}→${layoutRole} cross=${isCrossCategory}`);

        // ── Background: always fill 100% of target canvas ──
        if (role === 'background') {
            const newConstraints: ElementConstraints = {
                horizontal: { anchor: 'left' as const, offset: 0 },
                vertical: { anchor: 'top' as const, offset: 0 },
                size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: targetW, height: targetH },
                rotation: el.constraints.rotation,
            };
            return {
                ...JSON.parse(JSON.stringify(el)),
                constraints: newConstraints,
            } as DesignElement;
        }

        // ── Cross-category: role-based repositioning ──
        if (isCrossCategory) {
            return applyCrossCategoryLayout(el, abs, role, layoutRole, targetW, targetH, scaleFontRadius);
        }

        // ── Same-category: v3 uniform stretch ──
        return applySameCategoryStretch(el, abs, scaleX, scaleY, scaleFontRadius, targetW, targetH);
    });

    // ── Step 2: Collision avoidance — NO TEXT OVERLAP ──
    return avoidOverlaps(placed, targetW, targetH);
}

/**
 * ★ Post-processing: resolve all element positions and fix overlaps.
 * Sorts non-background elements by Y position, then pushes any
 * overlapping elements downward. Guarantees zero text-on-text overlap.
 */
function avoidOverlaps(elements: DesignElement[], canvasW: number, canvasH: number): DesignElement[] {
    // Separate backgrounds from content
    const backgrounds: DesignElement[] = [];
    const content: DesignElement[] = [];
    for (const el of elements) {
        const resolved = constraintsToAbsolute(el.constraints, canvasW, canvasH);
        const coversPct = (resolved.w * resolved.h) / (canvasW * canvasH);
        if (el.type === 'shape' && coversPct > 0.5) {
            backgrounds.push(el);
        } else {
            content.push(el);
        }
    }

    if (content.length <= 1) return elements;

    // Resolve positions and sort top-to-bottom
    const withPos = content.map(el => ({
        el,
        pos: constraintsToAbsolute(el.constraints, canvasW, canvasH),
    }));
    withPos.sort((a, b) => a.pos.y - b.pos.y);

    // ★ Push overlapping items down
    const PADDING = 4;
    for (let i = 1; i < withPos.length; i++) {
        const prev = withPos[i - 1]!;
        const curr = withPos[i]!;
        const prevBottom = prev.pos.y + prev.pos.h;
        if (curr.pos.y < prevBottom + PADDING) {
            const newY = prevBottom + PADDING;
            // Update constraint to fixed top offset
            curr.el = { ...curr.el };
            curr.el.constraints = {
                ...curr.el.constraints,
                vertical: { anchor: 'top' as const, offset: Math.round(newY) },
            };
            // Update pos for next iteration
            curr.pos = { ...curr.pos, y: newY };
            console.log(`[smartSizing] ★ OVERLAP FIX: "${curr.el.name}" shifted to y=${Math.round(newY)}`);
        }
    }

    // ★ Clamp: if any element goes below canvas, scale everything down
    const lastItem = withPos[withPos.length - 1]!;
    const lastBottom = lastItem.pos.y + lastItem.pos.h;
    if (lastBottom > canvasH) {
        // Calculate how much we need to compress
        const totalContentHeight = lastBottom - withPos[0]!.pos.y;
        const availableHeight = canvasH - PADDING * 2;
        if (totalContentHeight > 0 && availableHeight > 0) {
            const compress = Math.min(1, availableHeight / totalContentHeight);
            const startY = PADDING;
            let currentY = startY;
            for (const item of withPos) {
                const newH = Math.max(8, Math.round(item.pos.h * compress));
                item.el = { ...item.el };
                item.el.constraints = {
                    ...item.el.constraints,
                    vertical: { anchor: 'top' as const, offset: Math.round(currentY) },
                    size: { ...item.el.constraints.size, height: newH },
                };
                // Scale font if needed
                if ((item.el.type === 'text' || item.el.type === 'button') && compress < 0.9) {
                    const fontSize = (item.el as { fontSize?: number }).fontSize;
                    if (fontSize) {
                        (item.el as any).fontSize = Math.max(MIN_FONT, Math.round(fontSize * compress));
                    }
                }
                currentY += newH + PADDING;
                console.log(`[smartSizing] ★ COMPRESS: "${item.el.name}" y=${Math.round(currentY - newH - PADDING)} h=${newH}`);
            }
        }
    }

    return [...backgrounds, ...withPos.map(p => p.el)];
}

/**
 * Cross-category path: uses computeSmartConstraints for role-based placement.
 */
function applyCrossCategoryLayout(
    el: DesignElement,
    abs: { x: number; y: number; w: number; h: number },
    role: ElementRole,
    layoutRole: LayoutRole,
    targetW: number,
    targetH: number,
    scaleFontRadius: number,
): DesignElement {
    // Use the smart layout engine for positioning
    const baseFontSize = (el as { fontSize?: number }).fontSize;
    const smartConstraints = computeSmartConstraints({
        role: layoutRole,
        canvasW: targetW,
        canvasH: targetH,
        elWidth: abs.w,
        elHeight: abs.h,
        fontSize: baseFontSize,
    });

    // ★ Font size: use smart layout engine's recommended size
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fontPatch: Record<string, unknown> = {};
    if ((el.type === 'text' || el.type === 'button') && baseFontSize) {
        const smartFontSize = getSmartFontSize(layoutRole, targetW, targetH);
        // Use the larger of geometric-mean and smart-font to avoid tiny text
        fontPatch.fontSize = Math.max(MIN_FONT, Math.round(Math.max(smartFontSize, baseFontSize * scaleFontRadius)));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((el as any).borderRadius) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fontPatch.borderRadius = Math.round((el as any).borderRadius * scaleFontRadius);
    }

    // ★ CTA minimum height guarantee (44px touch target)
    if (role === 'cta') {
        const resolvedH = smartConstraints.size.heightMode === 'relative'
            ? targetH * smartConstraints.size.height
            : smartConstraints.size.height;
        if (resolvedH < MIN_CTA_HEIGHT) {
            smartConstraints.size = {
                ...smartConstraints.size,
                heightMode: 'fixed' as const,
                height: MIN_CTA_HEIGHT,
            };
        }
    }

    // ★ Logo: preserve aspect ratio
    if (role === 'logo' && abs.w > 0 && abs.h > 0) {
        const logoAspect = abs.w / abs.h;
        const targetLogoW = smartConstraints.size.widthMode === 'relative'
            ? targetW * smartConstraints.size.width
            : smartConstraints.size.width;
        const targetLogoH = Math.round(targetLogoW / logoAspect);
        smartConstraints.size = {
            widthMode: 'fixed' as const,
            heightMode: 'fixed' as const,
            width: Math.round(targetLogoW),
            height: Math.max(24, targetLogoH), // minimum 24px
        };
    }

    // ★ Image (hero): preserve aspect ratio, use zone dimensions
    if (role === 'image' && abs.w > 0 && abs.h > 0) {
        const imgAspect = abs.w / abs.h;
        const zoneW = smartConstraints.size.widthMode === 'relative'
            ? targetW * smartConstraints.size.width
            : smartConstraints.size.width;
        const zoneH = smartConstraints.size.heightMode === 'relative'
            ? targetH * smartConstraints.size.height
            : smartConstraints.size.height;
        // Fit-contain within zone
        const fitW = Math.min(zoneW, zoneH * imgAspect);
        const fitH = fitW / imgAspect;
        smartConstraints.size = {
            widthMode: 'fixed' as const,
            heightMode: 'fixed' as const,
            width: Math.round(fitW),
            height: Math.round(fitH),
        };
    }

    console.log(`[smartSizing]     → CROSS: ${layoutRole} placed via smartLayout (${targetW}x${targetH})`);

    return {
        ...JSON.parse(JSON.stringify(el)),
        constraints: smartConstraints,
        ...fontPatch,
    } as DesignElement;
}

/**
 * Same-category path: v3 uniform stretch (template-proven).
 */
function applySameCategoryStretch(
    el: DesignElement,
    abs: { x: number; y: number; w: number; h: number },
    scaleX: number,
    scaleY: number,
    scaleFontRadius: number,
    _targetW: number,
    _targetH: number,
): DesignElement {
    const newX = Math.round(abs.x * scaleX);
    const newY = Math.round(abs.y * scaleY);
    const newW = Math.max(4, Math.round(abs.w * scaleX));
    const newH = Math.max(4, Math.round(abs.h * scaleY));

    const newConstraints: ElementConstraints = {
        horizontal: { anchor: 'left' as const, offset: newX },
        vertical: { anchor: 'top' as const, offset: newY },
        size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width: newW, height: newH },
        rotation: el.constraints.rotation,
    };

    // ★ Font + border radius: geometric mean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fontPatch: Record<string, unknown> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((el.type === 'text' || el.type === 'button') && (el as any).fontSize) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fontPatch.fontSize = Math.max(MIN_FONT, Math.round((el as any).fontSize * scaleFontRadius));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((el as any).borderRadius) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fontPatch.borderRadius = Math.round((el as any).borderRadius * scaleFontRadius);
    }

    console.log(`[smartSizing]     → SAME: stretch (${newX},${newY},${newW}x${newH})`);

    return {
        ...JSON.parse(JSON.stringify(el)),
        constraints: newConstraints,
        ...fontPatch,
    } as DesignElement;
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

