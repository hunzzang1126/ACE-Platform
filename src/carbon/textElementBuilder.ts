// ─────────────────────────────────────────────────
// textElementBuilder — Text element construction (extracted from layoutComposer)
// ─────────────────────────────────────────────────
// Handles: font sizing, CJK-aware height estimation, text hierarchy,
// word-aware line estimation, and letter-spacing for ad creatives.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import { resolveTypeStyle } from './adapter';
import { columns, centeredX, getMargin } from './gridSystem';
import { hexR, hexG, hexB } from './colorHelpers';
import type { ElementRule } from './layoutRules';
import type { DesignStrategy } from './designStrategy';
import type { DesignPalette } from './layoutComposer';

export function buildTextElement(
    name: string,
    content: string,
    rule: ElementRule,
    canvasW: number, canvasH: number, canvasMin: number,
    textColor: string,
    palette: DesignPalette,
    strategy: DesignStrategy,
): RenderElement {
    const typeStyle = resolveTypeStyle(rule.typeStyle, canvasMin);

    // ★ Ad Impact Scaling: Carbon web font × adScale = ad-ready font size
    let fontSize = Math.max(10, Math.round(typeStyle.fontSize * rule.adScale));

    // ★ Height-aware typography: clamp font size so text doesn't overflow canvas height.
    const heightBudget: Record<string, number> = {
        headline: 0.25, subheadline: 0.12, tag_text: 0.08, cta_label: 0.10,
    };
    const budget = heightBudget[name] ?? 0.20;
    const maxFontFromHeight = Math.floor(canvasH * budget / typeStyle.lineHeight);
    fontSize = Math.min(fontSize, Math.max(8, maxFontFromHeight));

    const w = columns(rule.cols, canvasW);
    const lineHeight = typeStyle.lineHeight;

    // ★ CJK-aware height estimation
    const chars = content.split('');
    const totalChars = Math.max(1, chars.length);
    // eslint-disable-next-line no-control-regex
    const cjkCount = chars.filter(c => /[\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(c)).length;
    const upperCount = chars.filter(c => c >= 'A' && c <= 'Z').length;
    const cjkRatio = cjkCount / totalChars;
    const uppercaseRatio = upperCount / totalChars;
    const avgCharWidth = cjkRatio * 1.0 + (1 - cjkRatio) * (0.55 + uppercaseRatio * 0.15);
    const charsPerLine = Math.max(1, Math.floor(w / (fontSize * avgCharWidth)));
    // ★ Word-aware line estimation
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
    const cjkPadding = cjkRatio > 0.2 ? fontSize * 0.15 : 0;
    const h = Math.round(fontSize * lineHeight * lines + fontSize * 0.3 + cjkPadding);

    let x: number;
    if (rule.align === 'center') x = centeredX(rule.cols, canvasW);
    else if (rule.align === 'right') x = canvasW - w - getMargin(canvasW);
    else x = getMargin(canvasW);

    // ★ v713: Apply text hierarchy from DesignStrategy
    let finalColor = textColor;
    if (name === 'subheadline' && strategy.textHierarchy.subheadlineOpacity < 1) {
        const opacity = strategy.textHierarchy.subheadlineOpacity;
        const r = Math.round(hexR(textColor) * 255);
        const g = Math.round(hexG(textColor) * 255);
        const b = Math.round(hexB(textColor) * 255);
        finalColor = `rgba(${r},${g},${b},${opacity})`;
    }

    // ★ v713: Headline gets tighter letter-spacing for impact
    const letterSpacing = name === 'headline'
        ? (typeStyle.letterSpacing ?? -0.5)
        : (name === 'subheadline' ? 0.2 : typeStyle.letterSpacing);

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
        color_hex: finalColor,
        text_align: rule.textAlign ?? 'center',
        line_height: lineHeight,
        letter_spacing: letterSpacing,
    };
}
