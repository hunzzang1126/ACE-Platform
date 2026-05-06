// ─────────────────────────────────────────────────
// overlayStyles.ts — Premium Overlay System v713
// ─────────────────────────────────────────────────
// ★ REPLACES the old monotonous black-rect overlay system.
// Instead of slapping a dark rectangle over every image, we now use:
//   - Gradient scrims (brand-colored, NOT black)
//   - Text shadows (no overlay rect at all)
//   - Color tints (brand-aware semi-transparent wash)
//   - Full dim (moody/cinematic only)
//
// The overlay approach is chosen by the AI Creative Director
// via DesignStrategy.overlayApproach.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import type { OverlayApproach } from './designStrategy';
import { hexR, hexG, hexB } from './colorHelpers';

// ── Result types ─────────────────────────────────

/** Text modifier hints to apply to text elements after overlay placement. */
export interface TextModifiers {
    /** Shadow blur radius for text readability over images. 0 = no shadow. */
    shadowBlur: number;
    /** Shadow Y offset. */
    shadowOffsetY: number;
    /** Shadow opacity. */
    shadowOpacity: number;
}

/** Image filter hints to apply to the background image. */
export interface ImageFilterHints {
    brightness: number;   // -0.4 to 0
    blur: number;         // 0 to 1.0 (Fabric scale)
}

export interface OverlayResult {
    /** Overlay elements to insert (may be empty for shadow-only approach). */
    overlayElements: RenderElement[];
    /** Text modifiers to apply to all text elements. */
    textModifiers: TextModifiers;
    /** Image filter hints for the background image. */
    imageFilters: ImageFilterHints;
}

// ── Default modifiers ────────────────────────────

const NO_TEXT_MODIFIERS: TextModifiers = { shadowBlur: 0, shadowOffsetY: 0, shadowOpacity: 0 };
const STRONG_TEXT_SHADOW: TextModifiers = { shadowBlur: 8, shadowOffsetY: 2, shadowOpacity: 0.6 };
const SUBTLE_TEXT_SHADOW: TextModifiers = { shadowBlur: 5, shadowOffsetY: 1, shadowOpacity: 0.35 };
const NO_FILTERS: ImageFilterHints = { brightness: 0, blur: 0 };

// ── Public API ───────────────────────────────────

/**
 * Build overlay result based on the AI-chosen overlay approach.
 * @param approach - The overlay strategy from DesignStrategy
 * @param canvasW/H - Canvas dimensions
 * @param bgColor - Background/brand color for gradient scrims (NOT black!)
 * @param accentColor - Accent color for tints
 * @param aiBrightness - AI-suggested brightness (-0.4 to 0)
 * @param aiBlur - AI-suggested blur (0 to 3, mapped to Fabric 0-1 range)
 */
export function buildOverlayResult(
    approach: OverlayApproach,
    canvasW: number, canvasH: number,
    bgColor: string, accentColor: string,
    aiBrightness: number, aiBlur: number,
): OverlayResult {
    // Convert AI blur (0-3 px conceptual) → Fabric range (0-1)
    const fabricBlur = Math.min(1, aiBlur * 0.25);

    switch (approach) {
        case 'gradient-scrim': {
            // ★ v718: Gradient uses BRAND COLOR, starts at bottom 50%.
            // Previous version started at 30% with rgba(0,0,0,0) which hexToRgb couldn't parse.
            // Now: fully transparent at scrim top → brand bg at scrim bottom.
            const bgR = hexR(bgColor), bgG = hexG(bgColor), bgB = hexB(bgColor);
            // ★ Use actual bgColor with alpha channel manipulation via r/g/b/a fields.
            // The gradient rect engine handles gradient_start/end for color,
            // so we make start = transparent version of bg, end = opaque bg.
            const scrimStartY = Math.round(canvasH * 0.50); // Start halfway — image stays vivid on top
            return {
                overlayElements: [{
                    name: 'text_overlay',
                    type: 'rect' as any,
                    x: 0, y: scrimStartY,
                    w: canvasW, h: canvasH - scrimStartY,
                    // ★ FIX: Use bgColor for both ends — the gradient effect comes from
                    // the Fabric gradient opacity transition, not CSS rgba().
                    gradient_start_hex: bgColor,
                    gradient_end_hex: bgColor,
                    gradient_angle: 180,
                    r: bgR, g: bgG, b: bgB, a: 0.55,
                }],
                textModifiers: SUBTLE_TEXT_SHADOW,
                imageFilters: { brightness: aiBrightness || -0.1, blur: fabricBlur },
            };
        }

        case 'text-shadow-only':
            // ★ NO overlay rectangle at all. Image stays completely vivid.
            // Text readability comes entirely from strong text shadows.
            return {
                overlayElements: [],
                textModifiers: STRONG_TEXT_SHADOW,
                imageFilters: { brightness: aiBrightness || -0.08, blur: fabricBlur },
            };

        case 'color-tint': {
            // Semi-transparent wash using the ACCENT color (not black).
            // Creates brand cohesion — the image becomes "tinted" with brand color.
            const ar = hexR(accentColor), ag = hexG(accentColor), ab = hexB(accentColor);
            return {
                overlayElements: [{
                    name: 'text_overlay',
                    type: 'rect' as any,
                    x: 0, y: 0, w: canvasW, h: canvasH,
                    r: ar * 0.4, g: ag * 0.4, b: ab * 0.4, a: 0.45,
                }],
                textModifiers: SUBTLE_TEXT_SHADOW,
                imageFilters: { brightness: aiBrightness || -0.15, blur: fabricBlur },
            };
        }

        case 'full-dim':
            // Full canvas darkening — only for moody/cinematic themes.
            // Uses very dark version of bg color, not pure black.
            return {
                overlayElements: [{
                    name: 'text_overlay',
                    type: 'rect' as any,
                    x: 0, y: 0, w: canvasW, h: canvasH,
                    r: 0.02, g: 0.02, b: 0.04, a: 0.50,
                }],
                textModifiers: SUBTLE_TEXT_SHADOW,
                imageFilters: { brightness: aiBrightness || -0.2, blur: fabricBlur },
            };

        case 'none':
        default:
            // No overlay, no shadow — for dark/simple backgrounds.
            return {
                overlayElements: [],
                textModifiers: NO_TEXT_MODIFIERS,
                imageFilters: NO_FILTERS,
            };
    }
}

// ── Legacy compat (used by decorationEngine) ─────

/** @deprecated Use buildOverlayResult instead. */
export function pickOverlayStyle(): 'scrim' { return 'scrim'; }
/** @deprecated Use buildOverlayResult instead. */
export function buildOverlayElements(): RenderElement[] { return []; }
