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
import { hexR, hexG, hexB, hexLuminance, darkenHex, lightenHex } from './colorHelpers';
import { getLayoutRules } from './layoutRules';
import type { ElementRule, LayoutVariant } from './layoutRules';
import { buildDecorations } from './decorationEngine';
import { pickOverlayStyle, buildOverlayElements } from './overlayStyles';

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


export interface BuildResult {
    elements: RenderElement[];
    variant: LayoutVariant;
}

export function buildDesignElements(
    content: DesignContent,
    palette: DesignPalette,
    canvasW: number,
    canvasH: number,
    hasBgImage: boolean,
    layoutVariant?: LayoutVariant,
): BuildResult {
    const category = getAspectCategory(canvasW, canvasH);
    const { rules, variant } = getLayoutRules(category, layoutVariant);
    const canvasMin = Math.min(canvasW, canvasH);
    const elements: RenderElement[] = [];
    const isUltraWide = category === 'ultra-wide';

    // ── Background (AI-decided) ──
    // ★ Visual Impact Guard: detect flat/boring gradients and fix them.
    if (!hasBgImage) {
        let gStart = palette.gradientStart;
        let gEnd = palette.gradientEnd;

        // If gradient colors are too similar or both very light → boring flat bg.
        // Fix: darken the start to create visible depth.
        const startLum = hexLuminance(gStart);
        const endLum = hexLuminance(gEnd);
        const lumDiff = Math.abs(startLum - endLum);

        if (lumDiff < 0.08) {
            // Colors are nearly identical → force a meaningful gradient
            if (startLum > 0.7) {
                // Both light → darken start significantly for depth
                gStart = darkenHex(gStart, 0.65);
            } else {
                // Both dark → lighten end for contrast
                gEnd = lightenHex(gEnd, 0.3);
            }
        }

        elements.push({
            name: 'background',
            type: 'rect' as any,
            x: 0, y: 0, w: canvasW, h: canvasH,
            gradient_start_hex: gStart,
            gradient_end_hex: gEnd,
            gradient_angle: 135,
        });
    }

    // ★ Text color with contrast guarantee
    let textColor: string;
    if (hasBgImage) {
        textColor = '#FFFFFF';
    } else {
        // Check if foreground actually contrasts against the gradient
        const bgLum = hexLuminance(palette.gradientStart);
        const fgLum = hexLuminance(palette.foreground);
        const contrast = Math.abs(bgLum - fgLum);
        if (contrast < 0.3) {
            // Poor contrast → force high-contrast text
            textColor = bgLum > 0.5 ? '#1A1A2E' : '#FFFFFF';
        } else {
            textColor = palette.foreground;
        }
    }

    // ── Build content block (measure all heights first) ──
    // We build all text elements first, then CENTER the block vertically.
    const contentBlock: { element: RenderElement; gapBefore: number }[] = [];

    // ── Content ordering (controlled by layout variant) ──
    const order = rules.contentOrder ?? 'standard';

    const addTag = () => {
        if (!content.tag) return;
        const el = buildTextElement('tag_text', content.tag, rules.tag,
            canvasW, canvasH, canvasMin, textColor, palette);
        contentBlock.push({ element: el, gapBefore: contentBlock.length > 0 ? spacing(rules.tag.gapStep, canvasMin) : 0 });
    };
    const addHeadline = () => {
        const headlineEl = buildTextElement('headline', content.headline, rules.headline,
            canvasW, canvasH, canvasMin, textColor, palette);
        contentBlock.push({
            element: headlineEl,
            gapBefore: contentBlock.length > 0 ? spacing(rules.tag.gapStep, canvasMin) : 0,
        });
    };
    const addSubheadline = () => {
        if (!content.subheadline) return;
        const subEl = buildTextElement('subheadline', content.subheadline, rules.subline,
            canvasW, canvasH, canvasMin, textColor, palette);
        contentBlock.push({ element: subEl, gapBefore: spacing(rules.subline.gapStep, canvasMin) });
    };

    // Execute in order
    if (order === 'headline-first') { addHeadline(); addTag(); addSubheadline(); }
    else if (order === 'tag-last') { addHeadline(); addSubheadline(); addTag(); }
    else { addTag(); addHeadline(); addSubheadline(); }

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

    // ── Vertical positioning (controlled by verticalBias) ──
    const bias = rules.verticalBias ?? 'center';
    let startY: number;
    if (isUltraWide) {
        startY = Math.round((canvasH - totalContentH) / 2);
    } else if (bias === 'top') {
        // Top-heavy: content starts at ~15% from top
        const topTarget = Math.round(canvasH * 0.12);
        startY = Math.max(spacing(3, canvasMin), topTarget);
    } else if (bias === 'bottom') {
        // Bottom-stack: content ends at ~85% from top
        const bottomTarget = Math.round(canvasH * 0.85 - totalContentH);
        startY = Math.max(spacing(3, canvasMin), bottomTarget);
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

    // ── Place content elements (with overlap guard) ──
    let cursorY = startY;
    for (const item of contentBlock) {
        cursorY += item.gapBefore;
        item.element.y = cursorY;
        elements.push(item.element);
        cursorY += item.element.h ?? 0;
    }

    // ★ OVERLAP GUARD: If content elements overlap, shift them apart.
    // This catches cases where height estimation underestimates actual rendered height.
    for (let i = 1; i < elements.length; i++) {
        const prev = elements[i - 1]!;
        const curr = elements[i]!;
        // Only check text elements (skip background, overlays)
        if (!prev.content && !prev.name?.includes('text') && prev.name !== 'headline' && prev.name !== 'subheadline' && prev.name !== 'tag_text') continue;
        if (!curr.content && !curr.name?.includes('text') && curr.name !== 'headline' && curr.name !== 'subheadline' && curr.name !== 'tag_text') continue;
        const prevBottom = (prev.y ?? 0) + (prev.h ?? 0);
        const currTop = curr.y ?? 0;
        if (currTop < prevBottom) {
            const shift = prevBottom - currTop + Math.round(canvasMin * 0.01); // 1% min gap
            curr.y = (curr.y ?? 0) + shift;
            // Cascade shift to all subsequent elements
            for (let j = i + 1; j < elements.length; j++) {
                elements[j]!.y = (elements[j]!.y ?? 0) + shift;
            }
        }
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

        // ★ Premium CTA: gradient button with shadow for visual impact
        elements.push({
            name: 'cta_button',
            type: 'rounded_rect' as any,
            x: ctaX, y: ctaY, w: ctaW, h: ctaH,
            gradient_start_hex: palette.accent,
            gradient_end_hex: palette.gradientEnd,
            gradient_angle: 135,
            radius: ctaRadius,
            shadow_blur: Math.round(canvasMin * 0.015),
            shadow_offset_x: 0,
            shadow_offset_y: Math.round(canvasMin * 0.005),
            shadow_opacity: 0.35,
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

    // ── Text-on-image overlay (P0-4: readability guarantee) ──
    // ★ v710: Variant-aware overlay system — prevents every design looking the same.
    // Each layout variant gets a distinct overlay style for visual diversity.
    if (hasBgImage) {
        const textEls = elements.filter(el => el.type === 'text' || el.name === 'cta_button');
        if (textEls.length > 0) {
            const padding = Math.round(canvasMin * 0.04);
            const contentTop = Math.min(...textEls.map(el => (el.y ?? 0))) - padding;
            const contentBot = Math.max(...textEls.map(el => (el.y ?? 0) + (el.h ?? 0))) + padding;
            const contentLeft = Math.min(...textEls.map(el => (el.x ?? 0))) - padding;
            const contentRight = Math.max(...textEls.map(el => (el.x ?? 0) + (el.w ?? 0))) + padding;

            const oX = Math.max(0, contentLeft);
            const oY = Math.max(0, contentTop);
            const oW = Math.min(canvasW, contentRight) - oX;
            const oH = Math.min(canvasH, contentBot) - oY;

            const overlayStyle = pickOverlayStyle(variant);
            const overlayEls = buildOverlayElements(overlayStyle, oX, oY, oW, oH, canvasW, canvasH, canvasMin, palette.accent);
            elements.splice(0, 0, ...overlayEls);
        }
    }

    // ── Decoration elements (accent lines, borders, dots) ──
    const decos = buildDecorations(variant, elements, palette.accent, canvasW, canvasH);
    elements.push(...decos);

    return { elements, variant };
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
    let fontSize = Math.max(10, Math.round(typeStyle.fontSize * rule.adScale));

    // ★ Height-aware typography: clamp font size so text doesn't overflow canvas height.
    // Budget = fraction of canvasH this element may occupy (single line max).
    // Hierarchy preserved: headline gets largest budget → largest font.
    const heightBudget: Record<string, number> = {
        headline: 0.25, subheadline: 0.12, tag_text: 0.08, cta_label: 0.10,
    };
    const budget = heightBudget[name] ?? 0.20;
    const maxFontFromHeight = Math.floor(canvasH * budget / typeStyle.lineHeight);
    fontSize = Math.min(fontSize, Math.max(8, maxFontFromHeight));

    const w = columns(rule.cols, canvasW);
    const lineHeight = typeStyle.lineHeight;

    // ★ CJK-aware height estimation
    // Korean/Chinese/Japanese characters are FULL-WIDTH (~1.0em per char)
    // Latin uppercase ~0.7em, lowercase ~0.55em
    // Without this, Korean headlines like "Galaxy의 새로운 차원" get height underestimated by 50%+,
    // causing all subsequent elements to overlap.
    const chars = content.split('');
    const totalChars = Math.max(1, chars.length);
    // eslint-disable-next-line no-control-regex
    const cjkCount = chars.filter(c => /[\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(c)).length;
    const upperCount = chars.filter(c => c >= 'A' && c <= 'Z').length;
    const cjkRatio = cjkCount / totalChars;
    const uppercaseRatio = upperCount / totalChars;
    // Weighted average: CJK=1.0em, Latin upper=0.70em, Latin lower=0.55em
    const avgCharWidth = cjkRatio * 1.0 + (1 - cjkRatio) * (0.55 + uppercaseRatio * 0.15);
    const charsPerLine = Math.max(1, Math.floor(w / (fontSize * avgCharWidth)));
    // ★ Word-aware line estimation: split by words, not just char count
    const words = content.split(/\s+/);
    let estimatedLines = 1, lineCharCount = 0;
    for (const word of words) {
        if (lineCharCount + word.length > charsPerLine && lineCharCount > 0) {
            estimatedLines++;
            lineCharCount = word.length;
        } else {
            lineCharCount += (lineCharCount > 0 ? 1 : 0) + word.length;
        }
    }
    const lines = Math.min(rule.maxLines ?? 10, estimatedLines);
    // ★ Extra padding for CJK (descenders/ascenders are taller)
    const cjkPadding = cjkRatio > 0.2 ? fontSize * 0.15 : 0;
    const h = Math.round(fontSize * lineHeight * lines + fontSize * 0.3 + cjkPadding);

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

