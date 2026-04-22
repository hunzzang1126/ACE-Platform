// ─────────────────────────────────────────────────
// Carbon Adapter — Bridge between Carbon tokens and ACE canvas
// ─────────────────────────────────────────────────
// Carbon outputs rem strings ("1rem", "2rem"). ACE canvas needs absolute px.
// This adapter converts Carbon tokens → canvas-relative pixel values.
//
// Carbon packages used:
//   @carbon/layout  — spacing, miniUnit, breakpoints, containers
//   @carbon/type    — type scale, type styles (40+ styles with breakpoints)
//   @carbon/motion  — duration, easing curves
//   @carbon/colors  — 120+ curated color values
// ─────────────────────────────────────────────────

import {
    miniUnit,
    baseFontSize,
    spacing as carbonSpacingTokens,
    breakpoints as carbonBreakpoints,
} from '@carbon/layout';

import {
    scale as typeScale,
    fontWeights,
} from '@carbon/type';

import * as typeStyles from '@carbon/type';

import {
    easings as carbonEasings,
} from '@carbon/motion';

// ── Re-export raw Carbon values for direct access ──
export { miniUnit, baseFontSize, typeScale, fontWeights, carbonEasings };

// ── Rem → Px conversion ──────────────────────────

/** Parse a Carbon rem string to px number. e.g. "2rem" → 32 */
export function remToPx(remStr: string | number): number {
    if (typeof remStr === 'number') return remStr;
    const match = remStr.match(/^([\d.]+)rem$/);
    if (!match) return parseFloat(remStr) || 0;
    return parseFloat(match[1]!) * baseFontSize;
}

// ── Spacing ──────────────────────────────────────

/** Carbon spacing scale in px: [2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160] */
export const SPACING_PX = carbonSpacingTokens.map(remToPx);

/**
 * Get spacing value scaled to canvas size.
 * Carbon's spacing is designed for ~1440px screens.
 * We scale proportionally to the canvas's smaller dimension.
 *
 * @param step - spacing index (0-12, where 0=2px, 4=16px, 6=32px)
 * @param canvasMin - Math.min(canvasW, canvasH)
 * @returns px value snapped to Carbon miniUnit (8px grid)
 */
export function spacing(step: number, canvasMin: number): number {
    const idx = Math.max(0, Math.min(step, SPACING_PX.length - 1));
    const basePx = SPACING_PX[idx]!;
    // Scale: at 300px → 1x, proportional to canvas vs reference (1056px = Carbon lg)
    const scale = Math.max(0.3, canvasMin / 1056);
    const scaled = basePx * scale;
    // Snap to miniUnit grid (8px)
    return Math.max(miniUnit, Math.round(scaled / miniUnit) * miniUnit);
}

// ── Typography ───────────────────────────────────

/** Carbon's 23-step type scale in px: [12,14,16,18,20,24,28,32,36,42,48,54,...] */
export const TYPE_SCALE_PX = typeScale;

/**
 * A resolved type style — all values in px numbers, ready for canvas rendering.
 */
export interface ResolvedTypeStyle {
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
}

/**
 * Carbon breakpoint → canvas size mapping.
 * Carbon breakpoints: sm(320), md(672), lg(1056), xlg(1312), max(1584)
 * We map canvas smaller dimension to the closest breakpoint.
 */
type CarbonBreakpoint = 'sm' | 'md' | 'lg' | 'xlg' | 'max';

const BREAKPOINT_WIDTHS: Record<CarbonBreakpoint, number> = {
    sm: 320, md: 672, lg: 1056, xlg: 1312, max: 1584,
};

function canvasToBreakpoint(canvasMin: number): CarbonBreakpoint {
    if (canvasMin >= 1312) return 'max';
    if (canvasMin >= 1056) return 'xlg';
    if (canvasMin >= 672) return 'lg';
    if (canvasMin >= 320) return 'md';
    return 'sm';
}

/**
 * Resolve a Carbon type style for a given canvas size.
 * Applies the correct breakpoint overrides automatically.
 *
 * @param styleName - Carbon style name (e.g. 'display01', 'expressiveHeading04')
 * @param canvasMin - Math.min(canvasW, canvasH)
 * @returns Resolved style with px values
 */
export function resolveTypeStyle(
    styleName: string,
    canvasMin: number,
): ResolvedTypeStyle {
    const style = (typeStyles as Record<string, any>)[styleName];
    if (!style) {
        console.warn(`[Carbon] Unknown type style: "${styleName}"`);
        return { fontSize: 16, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0 };
    }

    // Start with base values
    let fontSize = remToPx(style.fontSize);
    let fontWeight = style.fontWeight ?? fontWeights.regular;
    let lineHeight = style.lineHeight ?? 1.5;
    let letterSpacing = remToPx(style.letterSpacing ?? 0);

    // Apply breakpoint overrides (Carbon's fluid type system)
    if (style.breakpoints) {
        const bp = canvasToBreakpoint(canvasMin);
        const bpOrder: CarbonBreakpoint[] = ['sm', 'md', 'lg', 'xlg', 'max'];
        const targetIdx = bpOrder.indexOf(bp);

        // Apply all breakpoint overrides up to and including current breakpoint
        for (let i = 0; i <= targetIdx; i++) {
            const override = style.breakpoints[bpOrder[i]!];
            if (override) {
                if (override.fontSize) fontSize = remToPx(override.fontSize);
                if (override.fontWeight !== undefined) fontWeight = override.fontWeight;
                if (override.lineHeight !== undefined) lineHeight = override.lineHeight;
                if (override.letterSpacing !== undefined) letterSpacing = remToPx(override.letterSpacing);
            }
        }
    }

    return { fontSize, fontWeight, lineHeight, letterSpacing };
}

/**
 * Get a font size from the type scale, proportionally scaled to canvas.
 * @param scaleIndex - index into TYPE_SCALE_PX (0=12px, 9=42px, 14=76px)
 * @param canvasMin - canvas smaller dimension
 */
export function scaledFontSize(scaleIndex: number, canvasMin: number): number {
    const idx = Math.max(0, Math.min(scaleIndex, TYPE_SCALE_PX.length - 1));
    const basePx = TYPE_SCALE_PX[idx]!;
    // Scale relative to Carbon's md breakpoint (672px)
    const scale = Math.max(0.4, Math.pow(canvasMin / 672, 0.65));
    return Math.max(8, Math.round(basePx * scale));
}

// ── Motion ───────────────────────────────────────

/** Carbon motion durations in ms */
export const DURATION = {
    fast01: 70,
    fast02: 110,
    moderate01: 150,
    moderate02: 240,
    slow01: 400,
    slow02: 700,
} as const;

/** Carbon easing curves for canvas animation */
export const EASING = {
    standard: carbonEasings.standard.expressive,
    entrance: carbonEasings.entrance.expressive,
    exit: carbonEasings.exit.expressive,
} as const;

// ── Breakpoints ──────────────────────────────────

export { BREAKPOINT_WIDTHS, canvasToBreakpoint };
export type { CarbonBreakpoint };
