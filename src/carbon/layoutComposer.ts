// ─────────────────────────────────────────────────
// Carbon Layout Composer — AI Content → Canvas Elements
// ─────────────────────────────────────────────────
// CORE PRINCIPLE: AI decides WHAT → Carbon decides WHERE.
//   - AI provides: headline, subheadline, CTA, tag, background type
//   - Carbon provides: position, size, spacing, typography for each element
//   - Templates are NOT involved. Zero template dependency.
//
// ★ KEY ADAPTATION: Carbon is designed for WEB (1056px viewport).
//   Ad creatives need BIGGER type relative to canvas.
//   We apply an "ad impact multiplier" on top of Carbon's type scale.
//   Web headline: 60px on 1080px page = 5.5% = readable
//   Ad headline: 120px on 1080px canvas = 11% = IMPACTFUL
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import { spacing, resolveTypeStyle, TYPE_SCALE_PX, miniUnit } from './adapter';
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
    typeStyle: string;
    cols: number;
    align: 'center' | 'left' | 'right';
    /** Spacing step between this element and previous (Carbon spacing index 0-12) */
    gapStep: number;
    maxLines?: number;
    fontWeight?: number;
    textAlign?: 'left' | 'center' | 'right';
    /** Ad impact multiplier: scales Carbon font size for ad creative impact */
    adScale: number;
}

interface LayoutRuleSet {
    headline: ElementRule;
    subline: ElementRule;
    cta: ElementRule;
    tag: ElementRule;
    /** Minimum CTA height as fraction of canvasMin */
    ctaHeightFactor: number;
}

// ── Aspect-Category Layout Rules ─────────────────

const SQUARE_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'display03', // Carbon display03: 42→96px across breakpoints
        cols: 14, align: 'center',
        gapStep: 6, maxLines: 3, fontWeight: 700,
        textAlign: 'center', adScale: 1.6,
    },
    subline: {
        typeStyle: 'expressiveHeading05', // 32→60px
        cols: 13, align: 'center',
        gapStep: 5, textAlign: 'center', adScale: 1.3,
    },
    cta: {
        typeStyle: 'heading03',
        cols: 10, align: 'center',
        gapStep: 7, fontWeight: 600,
        textAlign: 'center', adScale: 1.4,
    },
    tag: {
        typeStyle: 'label02',
        cols: 10, align: 'center',
        gapStep: 4, textAlign: 'center', adScale: 1.6,
    },
    ctaHeightFactor: 0.055,
};

const LANDSCAPE_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'expressiveHeading06',
        cols: 14, align: 'center',
        gapStep: 5, maxLines: 2, fontWeight: 700,
        textAlign: 'center', adScale: 1.5,
    },
    subline: {
        typeStyle: 'expressiveHeading04',
        cols: 12, align: 'center',
        gapStep: 4, textAlign: 'center', adScale: 1.3,
    },
    cta: {
        typeStyle: 'productiveHeading03',
        cols: 8, align: 'center',
        gapStep: 5, fontWeight: 600,
        textAlign: 'center', adScale: 1.3,
    },
    tag: {
        typeStyle: 'label02',
        cols: 10, align: 'center',
        gapStep: 3, textAlign: 'center', adScale: 1.4,
    },
    ctaHeightFactor: 0.07,
};

const PORTRAIT_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'display01',
        cols: 14, align: 'center',
        gapStep: 6, maxLines: 4, fontWeight: 700,
        textAlign: 'center', adScale: 1.5,
    },
    subline: {
        typeStyle: 'expressiveHeading04',
        cols: 13, align: 'center',
        gapStep: 5, textAlign: 'center', adScale: 1.3,
    },
    cta: {
        typeStyle: 'productiveHeading03',
        cols: 12, align: 'center',
        gapStep: 7, fontWeight: 600,
        textAlign: 'center', adScale: 1.3,
    },
    tag: {
        typeStyle: 'label02',
        cols: 12, align: 'center',
        gapStep: 4, textAlign: 'center', adScale: 1.5,
    },
    ctaHeightFactor: 0.06,
};

const ULTRA_WIDE_RULES: LayoutRuleSet = {
    headline: {
        typeStyle: 'expressiveHeading05',
        cols: 6, align: 'left',
        gapStep: 3, maxLines: 1, fontWeight: 700,
        textAlign: 'left', adScale: 1.4,
    },
    subline: {
        typeStyle: 'expressiveHeading03',
        cols: 5, align: 'center',
        gapStep: 3, textAlign: 'center', adScale: 1.2,
    },
    cta: {
        typeStyle: 'productiveHeading02',
        cols: 3, align: 'right',
        gapStep: 3, fontWeight: 600,
        textAlign: 'center', adScale: 1.3,
    },
    tag: {
        typeStyle: 'label01',
        cols: 3, align: 'left',
        gapStep: 2, textAlign: 'left', adScale: 1.3,
    },
    ctaHeightFactor: 0.35,
};

const RULES_MAP: Record<AspectCategory, LayoutRuleSet> = {
    'square': SQUARE_RULES,
    'landscape': LANDSCAPE_RULES,
    'portrait': PORTRAIT_RULES,
    'ultra-wide': ULTRA_WIDE_RULES,
};

// ── Main API ─────────────────────────────────────

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
    const isUltraWide = category === 'ultra-wide';

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

    const textColor = hasBgImage ? '#FFFFFF' : palette.foreground;

    // ── Build content block (measure all heights first) ──
    // We build all text elements first, then CENTER the block vertically.
    const contentBlock: { element: RenderElement; gapBefore: number }[] = [];

    // Tag
    if (content.tag) {
        const el = buildTextElement('tag_text', content.tag, rules.tag,
            canvasW, canvasH, canvasMin, textColor, palette);
        contentBlock.push({ element: el, gapBefore: 0 });
    }

    // Headline
    const headlineEl = buildTextElement('headline', content.headline, rules.headline,
        canvasW, canvasH, canvasMin, textColor, palette);
    contentBlock.push({
        element: headlineEl,
        gapBefore: contentBlock.length > 0 ? spacing(rules.tag.gapStep, canvasMin) : 0,
    });

    // Subheadline
    if (content.subheadline) {
        const subEl = buildTextElement('subheadline', content.subheadline, rules.subline,
            canvasW, canvasH, canvasMin, textColor, palette);
        contentBlock.push({ element: subEl, gapBefore: spacing(rules.subline.gapStep, canvasMin) });
    }

    // ── Calculate total content height ──
    let totalContentH = 0;
    for (const item of contentBlock) {
        totalContentH += item.gapBefore + (item.element.h ?? 0);
    }

    // ── CTA dimensions (calculated early for vertical layout) ──
    let ctaH = 0;
    let ctaGap = 0;
    if (content.cta) {
        const ctaType = resolveTypeStyle(rules.cta.typeStyle, canvasMin);
        const ctaFontSize = Math.max(10, Math.round(ctaType.fontSize * rules.cta.adScale));
        ctaH = Math.max(
            Math.round(canvasMin * rules.ctaHeightFactor),
            Math.round(ctaFontSize * 2.5),
        );
        ctaGap = spacing(rules.cta.gapStep, canvasMin);
        totalContentH += ctaGap + ctaH;
    }

    // ── Vertical centering ──
    // Place content block in the vertical center of the canvas.
    // For ultra-wide: use horizontal layout instead.
    let startY: number;
    if (isUltraWide) {
        startY = Math.round((canvasH - totalContentH) / 2);
    } else {
        // Center with slight upward bias (golden ratio ~38% from top)
        const goldenTop = Math.round(canvasH * 0.38 - totalContentH / 2);
        const minTop = spacing(5, canvasMin); // minimum top margin
        startY = Math.max(minTop, goldenTop);
    }

    // ── If content overflows canvas, compress everything to fit ──
    let compressionRatio = 1;
    if (totalContentH > canvasH * 0.92) {
        compressionRatio = (canvasH * 0.88) / totalContentH;
        totalContentH = Math.round(totalContentH * compressionRatio);
        for (const item of contentBlock) {
            item.element.h = Math.round((item.element.h ?? 0) * compressionRatio);
            item.element.font_size = Math.max(8, Math.round((item.element.font_size ?? 16) * compressionRatio));
            item.gapBefore = Math.round(item.gapBefore * compressionRatio);
        }
        ctaH = Math.round(ctaH * compressionRatio);
        ctaGap = Math.round(ctaGap * compressionRatio);
        startY = Math.max(spacing(3, canvasMin), Math.round((canvasH - totalContentH) / 2));
    }

    // ── Place content elements ──
    let cursorY = startY;
    for (const item of contentBlock) {
        cursorY += item.gapBefore;
        item.element.y = cursorY;
        elements.push(item.element);
        cursorY += item.element.h ?? 0;
    }

    // ── CTA Button (optional) ──
    if (content.cta) {
        const ctaRule = rules.cta;
        const ctaType = resolveTypeStyle(ctaRule.typeStyle, canvasMin);
        const ctaFontSize = Math.max(10, Math.round(ctaType.fontSize * ctaRule.adScale));
        const ctaW = columns(ctaRule.cols, canvasW);
        const ctaRadius = Math.round(ctaH / 2);

        let ctaX: number;
        if (ctaRule.align === 'center') ctaX = centeredX(ctaRule.cols, canvasW);
        else if (ctaRule.align === 'right') ctaX = canvasW - ctaW - getMargin(canvasW);
        else ctaX = getMargin(canvasW);

        let ctaY = cursorY + ctaGap;
        // Safety clamp
        ctaY = Math.min(ctaY, canvasH - ctaH);
        ctaY = Math.max(ctaY, 0);

        elements.push({
            name: 'cta_button',
            type: 'rounded_rect' as any,
            x: ctaX, y: ctaY, w: ctaW, h: ctaH,
            r: hexR(palette.accent), g: hexG(palette.accent), b: hexB(palette.accent), a: 1,
            radius: ctaRadius,
        });

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

    // ★ Ad Impact Scaling: Carbon web font × adScale = ad-ready font size
    const fontSize = Math.max(10, Math.round(typeStyle.fontSize * rule.adScale));
    const w = columns(rule.cols, canvasW);
    const lineHeight = typeStyle.lineHeight;

    // Estimate height
    const charsPerLine = Math.max(1, Math.floor(w / (fontSize * 0.55)));
    const lines = Math.min(rule.maxLines ?? 10, Math.max(1, Math.ceil(content.length / charsPerLine)));
    const h = Math.round(fontSize * lineHeight * lines + 8);

    let x: number;
    if (rule.align === 'center') x = centeredX(rule.cols, canvasW);
    else if (rule.align === 'right') x = canvasW - w - getMargin(canvasW);
    else x = getMargin(canvasW);

    return {
        name,
        type: 'text' as any,
        x, y: 0,
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
