// ─────────────────────────────────────────────────
// ctaStyleBuilder — CTA Button Visual Styles
// ─────────────────────────────────────────────────
// Renders 5 distinct CTA visual styles based on AI DesignStrategy.
// Replaces the single hardcoded pill button in layoutComposer.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import type { CtaStyle } from './designStrategy';
import { hexR, hexG, hexB } from './colorHelpers';

export interface CtaStyleInput {
    /** CTA text content */
    text: string;
    /** Position */
    x: number; y: number; w: number; h: number;
    /** Font properties */
    fontSize: number;
    fontWeight: string;
    fontFamily: string;
    lineHeight: number;
    /** Colors */
    accentColor: string;
    gradientEndColor: string;
    /** Canvas size for proportional scaling */
    canvasMin: number;
}

/**
 * Build CTA elements (button + label) based on the AI-chosen CtaStyle.
 * Returns 0-2 RenderElements.
 */
export function buildCtaElements(style: CtaStyle, input: CtaStyleInput): RenderElement[] {
    switch (style) {
        case 'pill':      return buildPill(input);
        case 'outlined':  return buildOutlined(input);
        case 'solid':     return buildSolid(input);
        case 'text-arrow': return buildTextArrow(input);
        case 'rounded-square': return buildRoundedSquare(input);
        default:          return buildPill(input);
    }
}

// ── Pill (default) — Full gradient, fully rounded ─────────
function buildPill(i: CtaStyleInput): RenderElement[] {
    const radius = Math.round(i.h / 2);
    return [
        {
            name: 'cta_button', type: 'rounded_rect' as any,
            x: i.x, y: i.y, w: i.w, h: i.h,
            gradient_start_hex: i.accentColor,
            gradient_end_hex: i.gradientEndColor,
            gradient_angle: 135,
            radius,
            shadow_blur: Math.round(i.canvasMin * 0.015),
            shadow_offset_x: 0,
            shadow_offset_y: Math.round(i.canvasMin * 0.005),
            shadow_opacity: 0.35,
        },
        ctaLabel(i, '#FFFFFF'),
    ];
}

// ── Outlined — Transparent fill, accent border ────────────
// Uses a thin accent-colored rect behind a smaller transparent rect
// to simulate a border effect (engine has no native stroke support).
function buildOutlined(i: CtaStyleInput): RenderElement[] {
    const radius = Math.round(i.h * 0.35);
    const borderW = Math.max(2, Math.round(i.canvasMin * 0.004));
    const r = Math.round(hexR(i.accentColor) * 255);
    const g = Math.round(hexG(i.accentColor) * 255);
    const b = Math.round(hexB(i.accentColor) * 255);
    return [
        // Outer border rect (accent color, semi-transparent)
        {
            name: 'cta_button', type: 'rounded_rect' as any,
            x: i.x, y: i.y, w: i.w, h: i.h,
            r: r / 255, g: g / 255, b: b / 255, a: 0.85,
            radius,
        },
        // Inner transparent rect (creates the "hollow" effect)
        {
            name: 'cta_button_inner', type: 'rounded_rect' as any,
            x: i.x + borderW, y: i.y + borderW,
            w: i.w - borderW * 2, h: i.h - borderW * 2,
            r: 0, g: 0, b: 0, a: 0.01, // Nearly transparent
            radius: Math.max(0, radius - borderW),
        },
        ctaLabel(i, i.accentColor), // Text in accent color
    ];
}

// ── Solid — Flat accent color, subtle radius ──────────────
function buildSolid(i: CtaStyleInput): RenderElement[] {
    const radius = Math.max(4, Math.round(i.canvasMin * 0.01));
    const r = hexR(i.accentColor);
    const g = hexG(i.accentColor);
    const b = hexB(i.accentColor);
    return [
        {
            name: 'cta_button', type: 'rounded_rect' as any,
            x: i.x, y: i.y, w: i.w, h: i.h,
            r, g, b, a: 1.0,
            radius,
            shadow_blur: Math.round(i.canvasMin * 0.008),
            shadow_offset_x: 0,
            shadow_offset_y: Math.round(i.canvasMin * 0.003),
            shadow_opacity: 0.2,
        },
        ctaLabel(i, '#FFFFFF'),
    ];
}

// ── Text-Arrow — No button background, text + → ──────────
function buildTextArrow(i: CtaStyleInput): RenderElement[] {
    // No cta_button element — just text with an arrow appended
    return [
        {
            name: 'cta_label', type: 'text' as any,
            x: i.x, y: i.y, w: i.w, h: i.h,
            content: `${i.text} \u2192`,
            font_size: i.fontSize,
            font_weight: i.fontWeight,
            font_family: i.fontFamily,
            color_hex: i.accentColor,
            text_align: 'center',
            line_height: i.lineHeight,
            letter_spacing: 1.0, // Wider for elegance
        },
    ];
}

// ── Rounded Square — Professional subtle rounding ─────────
function buildRoundedSquare(i: CtaStyleInput): RenderElement[] {
    const radius = Math.round(i.h * 0.2);
    return [
        {
            name: 'cta_button', type: 'rounded_rect' as any,
            x: i.x, y: i.y, w: i.w, h: i.h,
            gradient_start_hex: i.accentColor,
            gradient_end_hex: i.gradientEndColor,
            gradient_angle: 135,
            radius,
            shadow_blur: Math.round(i.canvasMin * 0.01),
            shadow_offset_x: 0,
            shadow_offset_y: Math.round(i.canvasMin * 0.004),
            shadow_opacity: 0.25,
        },
        ctaLabel(i, '#FFFFFF'),
    ];
}

// ── Shared label helper ───────────────────────────────────
function ctaLabel(i: CtaStyleInput, color: string): RenderElement {
    return {
        name: 'cta_label', type: 'text' as any,
        x: i.x, y: i.y, w: i.w, h: i.h,
        content: i.text,
        font_size: i.fontSize,
        font_weight: i.fontWeight,
        font_family: i.fontFamily,
        color_hex: color,
        text_align: 'center',
        line_height: i.lineHeight,
    };
}
