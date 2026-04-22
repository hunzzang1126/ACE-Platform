// ─────────────────────────────────────────────────
// Carbon Layout Composer — AI Content → Canvas Elements
// ─────────────────────────────────────────────────
// CORE PRINCIPLE: AI decides WHAT → Carbon decides WHERE.
//   - AI provides: headline, subheadline, CTA, tag, background type
//   - Carbon provides: position, size, spacing, typography for each element
//   - Templates are NOT involved. Zero template dependency.
//
// Carbon tokens used:
//   spacing() — element margins/padding (8px grid snapped)
//   resolveTypeStyle() — font size/weight/lineHeight per breakpoint
//   columns() — element widths from 16-column grid
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import { spacing, resolveTypeStyle, scaledFontSize, TYPE_SCALE_PX } from './adapter';
import { columns, centeredX, getMargin } from './gridSystem';
import { getAspectCategory } from '@/schema/layoutRoles';
import type { AspectCategory } from '@/schema/layoutRoles';

// ── Public Types ─────────────────────────────────

export interface DesignContent {
    headline: string;
    subheadline?: string;
    cta?: string;
    tag?: string;
}

export interface DesignPalette {
    gradientStart: string;
    gradientEnd: string;
    accent: string;
    foreground: string;
    background: string;
    typography: { primaryFont: string; secondaryFont: string };
}

// ── Layout Rule Per Aspect Category ──────────────

interface ElementRule {
    /** Type style from Carbon (e.g. 'display01', 'expressiveHeading04') */
    typeStyle: string;
    /** Number of grid columns for width (out of 16) */
    cols: number;
    /** Horizontal alignment */
    align: 'center' | 'left' | 'right';
    /** Spacing step for top margin (index into Carbon spacing scale) */
    topSpacingStep: number;
    /** Max lines before text truncation */
    maxLines?: number;
    /** Override font weight (else uses Carbon style default) */
    fontWeight?: number;
    /** Text alignment */
    textAlign?: 'left' | 'center' | 'right';
}

interface LayoutRuleSet {
    headline: ElementRule;
    subline: ElementRule;
    cta: ElementRule;
    tag: ElementRule;
}

// ── Aspect-Category Layout Rules ─────────────────
// These define WHERE each element goes, using Carbon tokens.
// All spacing values reference the Carbon spacing scale.
// All widths reference the 16-column grid.
// All typography references Carbon type styles.

const SQUARE_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'display01',
        cols: 14, align: 'center',
        topSpacingStep: 8, // spacing08 = 40px base
        maxLines: 3, fontWeight: 600,
        textAlign: 'center',
    },
    subline: {
        typeStyle: 'expressiveHeading04',
        cols: 12, align: 'center',
        topSpacingStep: 5, // spacing05 = 16px base
        textAlign: 'center',
    },
    cta: {
        typeStyle: 'heading03',
        cols: 8, align: 'center',
        topSpacingStep: 7, // spacing07 = 32px base
        fontWeight: 600,
        textAlign: 'center',
    },
    tag: {
        typeStyle: 'label02',
        cols: 10, align: 'center',
        topSpacingStep: 6,
        textAlign: 'center',
    },
};

const LANDSCAPE_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'expressiveHeading05',
        cols: 14, align: 'center',
        topSpacingStep: 7,
        maxLines: 2, fontWeight: 600,
        textAlign: 'center',
    },
    subline: {
        typeStyle: 'expressiveHeading03',
        cols: 12, align: 'center',
        topSpacingStep: 4,
        textAlign: 'center',
    },
    cta: {
        typeStyle: 'productiveHeading03',
        cols: 8, align: 'center',
        topSpacingStep: 6,
        fontWeight: 600,
        textAlign: 'center',
    },
    tag: {
        typeStyle: 'label02',
        cols: 10, align: 'center',
        topSpacingStep: 5,
        textAlign: 'center',
    },
};

const PORTRAIT_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'expressiveHeading05',
        cols: 14, align: 'center',
        topSpacingStep: 8,
        maxLines: 4, fontWeight: 600,
        textAlign: 'center',
    },
    subline: {
        typeStyle: 'expressiveHeading03',
        cols: 13, align: 'center',
        topSpacingStep: 5,
        textAlign: 'center',
    },
    cta: {
        typeStyle: 'productiveHeading03',
        cols: 12, align: 'center',
        topSpacingStep: 7,
        fontWeight: 600,
        textAlign: 'center',
    },
    tag: {
        typeStyle: 'label02',
        cols: 12, align: 'center',
        topSpacingStep: 5,
        textAlign: 'center',
    },
};

const ULTRA_WIDE_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'expressiveHeading04',
        cols: 6, align: 'left',
        topSpacingStep: 5,
        maxLines: 1, fontWeight: 600,
        textAlign: 'left',
    },
    subline: {
        typeStyle: 'expressiveHeading03',
        cols: 5, align: 'center',
        topSpacingStep: 3,
        textAlign: 'center',
    },
    cta: {
        typeStyle: 'productiveHeading02',
        cols: 3, align: 'right',
        topSpacingStep: 5,
        fontWeight: 600,
        textAlign: 'center',
    },
    tag: {
        typeStyle: 'label01',
        cols: 3, align: 'left',
        topSpacingStep: 3,
        textAlign: 'left',
    },
};

const RULES_MAP: Record<AspectCategory, LayoutRuleSet> = {
    'square': SQUARE_RULES,
    'landscape': LANDSCAPE_RULES,
    'portrait': PORTRAIT_RULES,
    'ultra-wide': ULTRA_WIDE_RULES,
};

// ── Main API ─────────────────────────────────────

/**
 * Build design elements from AI-generated content using Carbon layout rules.
 * NO template dependency. Carbon tokens determine all positions and sizes.
 *
 * @param content - AI-generated text content
 * @param palette - AI-generated color palette
 * @param canvasW - canvas width
 * @param canvasH - canvas height
 * @param hasBgImage - whether AI generated a background image
 * @returns RenderElement[] ready for canvas rendering
 */
export function buildDesignElements(
    content: DesignContent,
    palette: DesignPalette,
    canvasW: number,
    canvasH: number,
    hasBgImage: boolean,
): RenderElement[] {
    const category = getAspectCategory(canvasW, canvasH);
    const rules = RULES_MAP[category];
    const canvasMin = Math.min(canvasW, canvasH);
    const elements: RenderElement[] = [];

    // ── Background (AI-decided) ──
    if (!hasBgImage) {
        elements.push({
            name: 'background',
            type: 'rect' as any,
            x: 0, y: 0, w: canvasW, h: canvasH,
            gradient_start_hex: palette.gradientStart,
            gradient_end_hex: palette.gradientEnd,
            gradient_angle: 135,
        });
    }

    // ── Vertical flow cursor ──
    // Elements are placed top-to-bottom with Carbon spacing between them.
    let cursorY = spacing(rules.headline.topSpacingStep, canvasMin);

    // Determine text color based on background
    const textColor = hasBgImage ? '#FFFFFF' : palette.foreground;
    const isUltraWide = category === 'ultra-wide';

    // ── Tag (above headline if present) ──
    if (content.tag) {
        const el = buildTextElement('tag_text', content.tag, rules.tag,
            canvasW, canvasH, canvasMin, textColor, palette);
        el.y = cursorY;
        elements.push(el);
        cursorY += el.h + spacing(rules.tag.topSpacingStep, canvasMin);
    }

    // ── Headline (always present) ──
    const headlineEl = buildTextElement('headline', content.headline, rules.headline,
        canvasW, canvasH, canvasMin, textColor, palette);

    if (isUltraWide) {
        // Ultra-wide: headline on left side, vertically centered
        headlineEl.y = Math.round((canvasH - headlineEl.h) / 2);
    } else {
        headlineEl.y = cursorY;
    }
    elements.push(headlineEl);
    cursorY = headlineEl.y + headlineEl.h;

    // ── Subheadline (optional) ──
    if (content.subheadline) {
        cursorY += spacing(rules.subline.topSpacingStep, canvasMin);
        const subEl = buildTextElement('subheadline', content.subheadline, rules.subline,
            canvasW, canvasH, canvasMin, textColor, palette);

        if (isUltraWide) {
            subEl.y = Math.round((canvasH - subEl.h) / 2);
        } else {
            subEl.y = cursorY;
        }
        elements.push(subEl);
        cursorY = subEl.y + subEl.h;
    }

    // ── CTA Button (optional) ──
    if (content.cta) {
        const ctaRule = rules.cta;
        const ctaType = resolveTypeStyle(ctaRule.typeStyle, canvasMin);
        const ctaFontSize = Math.max(8, Math.round(ctaType.fontSize));
        const ctaW = columns(ctaRule.cols, canvasW);
        const ctaH = Math.max(32, Math.round(ctaFontSize * 2.5));
        const ctaRadius = Math.round(ctaH / 2); // pill shape

        let ctaX: number;
        if (ctaRule.align === 'center') ctaX = centeredX(ctaRule.cols, canvasW);
        else if (ctaRule.align === 'right') ctaX = canvasW - ctaW - getMargin(canvasW);
        else ctaX = getMargin(canvasW);

        let ctaY: number;
        if (isUltraWide) {
            ctaY = Math.round((canvasH - ctaH) / 2);
        } else {
            // CTA anchored to bottom area
            const bottomMargin = spacing(7, canvasMin);
            ctaY = canvasH - ctaH - bottomMargin;
            // But don't overlap with content above
            const minCtaY = cursorY + spacing(ctaRule.topSpacingStep, canvasMin);
            ctaY = Math.max(ctaY, minCtaY);
        }
        // ★ Safety clamp: CTA must not exceed canvas bounds
        ctaY = Math.min(ctaY, canvasH - ctaH);

        // CTA button shape
        elements.push({
            name: 'cta_button',
            type: 'rounded_rect' as any,
            x: ctaX, y: ctaY, w: ctaW, h: ctaH,
            r: hexR(palette.accent), g: hexG(palette.accent), b: hexB(palette.accent), a: 1,
            radius: ctaRadius,
        });

        // CTA label
        elements.push({
            name: 'cta_label',
            type: 'text' as any,
            x: ctaX, y: ctaY,
            w: ctaW, h: ctaH,
            content: content.cta,
            font_size: ctaFontSize,
            font_weight: String(ctaRule.fontWeight ?? 600),
            font_family: palette.typography.primaryFont,
            color_hex: '#FFFFFF',
            text_align: 'center',
            line_height: ctaType.lineHeight,
        });
    }

    return elements;
}

// ── Internal Helpers ─────────────────────────────

function buildTextElement(
    name: string,
    content: string,
    rule: ElementRule,
    canvasW: number, canvasH: number, canvasMin: number,
    textColor: string,
    palette: DesignPalette,
): RenderElement {
    const typeStyle = resolveTypeStyle(rule.typeStyle, canvasMin);
    const fontSize = Math.max(8, Math.round(typeStyle.fontSize));
    const w = columns(rule.cols, canvasW);
    const lineHeight = typeStyle.lineHeight;

    // Estimate height from content length + font size
    const charsPerLine = Math.max(1, Math.floor(w / (fontSize * 0.55)));
    const lines = Math.min(rule.maxLines ?? 10, Math.max(1, Math.ceil(content.length / charsPerLine)));
    const h = Math.round(fontSize * lineHeight * lines + 8);

    // X position based on alignment
    let x: number;
    if (rule.align === 'center') x = centeredX(rule.cols, canvasW);
    else if (rule.align === 'right') x = canvasW - w - getMargin(canvasW);
    else x = getMargin(canvasW);

    return {
        name,
        type: 'text' as any,
        x, y: 0, // Y is set by the caller (vertical flow)
        w, h,
        content,
        font_size: fontSize,
        font_weight: String(rule.fontWeight ?? typeStyle.fontWeight),
        font_family: name === 'headline'
            ? palette.typography.primaryFont
            : palette.typography.secondaryFont,
        color_hex: textColor,
        text_align: rule.textAlign ?? 'center',
        line_height: lineHeight,
        letter_spacing: typeStyle.letterSpacing,
    };
}

// ── Color Helpers ────────────────────────────────

function hexR(hex: string): number {
    return parseInt(hex.replace('#', '').substring(0, 2), 16) / 255;
}
function hexG(hex: string): number {
    return parseInt(hex.replace('#', '').substring(2, 4), 16) / 255;
}
function hexB(hex: string): number {
    return parseInt(hex.replace('#', '').substring(4, 6), 16) / 255;
}
