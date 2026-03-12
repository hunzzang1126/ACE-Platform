// ─────────────────────────────────────────────────
// aiStructureService.ts — AI Layout Structure Decision
// ─────────────────────────────────────────────────
// Phase 3 of the new pipeline: Content → Structure → Color
//
// AI receives:
//   - User prompt (mood, brand, intent)
//   - Canvas dimensions (aspect ratio)
//   - Generated content (headline, subheadline, cta lengths)
//
// AI returns:
//   - LayoutSpec: layout type, alignment, zones, font sizes, mood
//
// The LayoutSpec drives Phase 5 (Combine + Validate)
// where AI generates the actual RenderElement[] array.
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import { classifyRatio } from '@/engine/smartSizing';
import type { GeneratedContent } from '@/services/designTemplates';

// ── Types ────────────────────────────────────────

export type LayoutType =
    | 'centered-stack'
    | 'left-aligned'
    | 'right-aligned'
    | 'split-horizontal'
    | 'bold-headline'
    | 'minimal-clean'
    | 'full-bleed-hero'
    | 'badge-focus'
    | 'diagonal-split'
    | 'top-down-cascade'
    | 'horizontal-strip'
    | 'tower';

export type Alignment = 'left' | 'center' | 'right';
export type AccentStrategy = 'top-bar' | 'side-bar' | 'diagonal' | 'circle' | 'overlay' | 'bottom-line' | 'none';
export type SpacingMode = 'tight' | 'balanced' | 'generous';

export interface LayoutSpec {
    /** Which layout pattern to use */
    layoutType: LayoutType;
    /** Text alignment direction */
    alignment: Alignment;
    /** Headline zone (% of canvas) */
    headlineZone: { xPct: number; yPct: number; wPct: number; hPct: number };
    /** CTA zone (% of canvas) */
    ctaZone: { xPct: number; yPct: number; wPct: number; hPct: number };
    /** Recommended headline font size (px) — calculated from content length */
    headlineFontSize: number;
    /** Recommended subheadline font size (px) */
    subheadlineFontSize: number;
    /** Accent decoration strategy */
    accentStrategy: AccentStrategy;
    /** Spacing density */
    spacing: SpacingMode;
    /** Design mood for color palette */
    mood: string;
    /** AI's reasoning for this choice */
    reasoning: string;
}

// ── Content-Aware Font Size Calculation ──────────

/**
 * Calculate optimal headline font size based on actual text length and canvas.
 * Short text → big font. Long text → smaller font.
 */
function calculateContentAwareFontSize(
    text: string,
    canvasW: number,
    canvasH: number,
    availableWidthPct: number,
): { headlineFs: number; subheadlineFs: number } {
    const availableW = canvasW * availableWidthPct;

    // ★ FIX: Split by line breaks — use LONGEST line, not total char count.
    // "CANADA vs USA\nEPIC SHOWDOWN" → longest=13, not total=27
    const lines = text.split(/\n/);
    const longestLine = Math.max(...lines.map(l => l.trim().length));
    const charsPerLine = Math.max(8, longestLine);

    // Approximate: each character is ~0.55x the font size in width
    // We want the headline to fit in 1-2 lines max
    const maxFontForWidth = Math.round((availableW / (charsPerLine * 0.55)));

    // Also constrain by canvas height (headline shouldn't be > 25% of canvas height)
    const maxFontForHeight = Math.round(canvasH * 0.25);

    // ★ FIX: Canvas-based minimum floor (8% of smallest dimension)
    // 300x250 → min 20px, 728x90 → min 7px, 160x600 → min 13px
    // Hard cap at 80px — for large canvases the min floor shouldn't exceed max
    const minFontForCanvas = Math.min(80, Math.round(Math.min(canvasW, canvasH) * 0.08));
    const headlineFs = Math.max(minFontForCanvas, Math.min(maxFontForWidth, maxFontForHeight, 80));

    // ★ FIX: Subheadline ratio 0.42 → 0.52 (Figma/BannerFlow use 0.5-0.6x)
    const subheadlineFs = Math.max(11, Math.round(headlineFs * 0.52));

    return { headlineFs, subheadlineFs };
}

// ── Synchronous Layout Spec Generator ────────────
// Fast deterministic version (no API call). Used as fallback
// and for instant preview.

export function generateLayoutSpecSync(
    prompt: string,
    content: GeneratedContent,
    canvasW: number,
    canvasH: number,
): LayoutSpec {
    const ratio = classifyRatio(canvasW, canvasH);
    const headlineLen = content.headline.length;

    // Choose layout based on ratio + content length
    let layoutType: LayoutType;
    let alignment: Alignment;
    let accentStrategy: AccentStrategy;
    let spacing: SpacingMode;

    // Aspect ratio determines primary layout
    switch (ratio) {
        case 'ultra-wide':
        case 'wide':
            layoutType = 'horizontal-strip';
            alignment = 'left';
            accentStrategy = 'top-bar';
            spacing = 'tight';
            break;
        case 'landscape':
            if (headlineLen <= 15) {
                layoutType = 'bold-headline';
                alignment = 'left';
                accentStrategy = 'none';
                spacing = 'balanced';
            } else {
                layoutType = 'left-aligned';
                alignment = 'left';
                accentStrategy = 'top-bar';
                spacing = 'balanced';
            }
            break;
        case 'square':
            if (headlineLen <= 10) {
                layoutType = 'badge-focus';
                alignment = 'center';
                accentStrategy = 'circle';
                spacing = 'balanced';
            } else {
                layoutType = 'centered-stack';
                alignment = 'center';
                accentStrategy = 'bottom-line';
                spacing = 'balanced';
            }
            break;
        case 'portrait':
        case 'ultra-tall':
            layoutType = 'tower';
            alignment = 'center';
            accentStrategy = 'top-bar';
            spacing = 'generous';
            break;
        default:
            layoutType = 'centered-stack';
            alignment = 'center';
            accentStrategy = 'bottom-line';
            spacing = 'balanced';
    }

    // Mood detection from prompt keywords
    const lower = prompt.toLowerCase();
    let mood = 'professional';
    if (/luxury|premium|elegance|gold|exclusive/i.test(lower)) mood = 'luxury';
    else if (/sport|nike|energy|bold|power|fitness/i.test(lower)) mood = 'energetic';
    else if (/tech|saas|data|ai|digital|cloud/i.test(lower)) mood = 'tech';
    else if (/sale|discount|offer|%|deal|save/i.test(lower)) mood = 'promotional';
    else if (/clean|minimal|simple|apple/i.test(lower)) mood = 'minimal';
    else if (/fun|creative|art|colorful|playful/i.test(lower)) mood = 'creative';

    // Content-aware font sizes
    const availableWidthPct = alignment === 'center' ? 0.84 : 0.75;
    const { headlineFs, subheadlineFs } = calculateContentAwareFontSize(
        content.headline, canvasW, canvasH, availableWidthPct,
    );

    // Zones based on layout type
    const headlineZone = getHeadlineZone(layoutType, ratio);
    const ctaZone = getCtaZone(layoutType, ratio);

    return {
        layoutType,
        alignment,
        headlineZone,
        ctaZone,
        headlineFontSize: headlineFs,
        subheadlineFontSize: subheadlineFs,
        accentStrategy,
        spacing,
        mood,
        reasoning: `${layoutType} layout (${ratio} canvas, ${headlineLen}-char headline, ${mood} mood)`,
    };
}

// ── Zone Helpers ─────────────────────────────────

function getHeadlineZone(layout: LayoutType, _ratio: string): LayoutSpec['headlineZone'] {
    switch (layout) {
        case 'centered-stack':
        case 'badge-focus':
            return { xPct: 0.08, yPct: 0.2, wPct: 0.84, hPct: 0.3 };
        case 'left-aligned':
        case 'bold-headline':
        case 'top-down-cascade':
            return { xPct: 0.08, yPct: 0.2, wPct: 0.7, hPct: 0.3 };
        case 'diagonal-split':
            // ★ Unique: text in left 60%, accent on right
            return { xPct: 0.08, yPct: 0.18, wPct: 0.55, hPct: 0.35 };
        case 'right-aligned':
            return { xPct: 0.08, yPct: 0.2, wPct: 0.84, hPct: 0.3 };
        case 'split-horizontal':
            return { xPct: 0.45, yPct: 0.2, wPct: 0.48, hPct: 0.3 };
        case 'horizontal-strip':
            return { xPct: 0.03, yPct: 0.15, wPct: 0.55, hPct: 0.7 };
        case 'full-bleed-hero':
            return { xPct: 0.07, yPct: 0.5, wPct: 0.86, hPct: 0.25 };
        case 'minimal-clean':
            return { xPct: 0.12, yPct: 0.3, wPct: 0.76, hPct: 0.25 };
        case 'tower':
            return { xPct: 0.1, yPct: 0.15, wPct: 0.8, hPct: 0.35 };
        default:
            return { xPct: 0.08, yPct: 0.2, wPct: 0.84, hPct: 0.3 };
    }
}

function getCtaZone(layout: LayoutType, _ratio: string): LayoutSpec['ctaZone'] {
    switch (layout) {
        case 'centered-stack':
        case 'badge-focus':
        case 'minimal-clean':
            return { xPct: 0.25, yPct: 0.78, wPct: 0.5, hPct: 0.12 };
        case 'left-aligned':
        case 'bold-headline':
        case 'top-down-cascade':
            return { xPct: 0.08, yPct: 0.78, wPct: 0.4, hPct: 0.12 };
        case 'diagonal-split':
            // ★ Unique: CTA in left 55%, avoid accent area on right
            return { xPct: 0.08, yPct: 0.78, wPct: 0.45, hPct: 0.12 };
        case 'right-aligned':
            return { xPct: 0.52, yPct: 0.78, wPct: 0.4, hPct: 0.12 };
        case 'split-horizontal':
            return { xPct: 0.45, yPct: 0.75, wPct: 0.35, hPct: 0.12 };
        case 'horizontal-strip':
            return { xPct: 0.78, yPct: 0.2, wPct: 0.18, hPct: 0.6 };
        case 'full-bleed-hero':
            return { xPct: 0.07, yPct: 0.85, wPct: 0.35, hPct: 0.1 };
        case 'tower':
            return { xPct: 0.1, yPct: 0.82, wPct: 0.8, hPct: 0.08 };
        default:
            return { xPct: 0.25, yPct: 0.78, wPct: 0.5, hPct: 0.12 };
    }
}

// ── AI-Powered Layout Spec Generator ─────────────
// Async version: calls Claude to make creative decisions.
// Falls back to sync version on error.

export async function generateLayoutSpec(
    prompt: string,
    content: GeneratedContent,
    canvasW: number,
    canvasH: number,
    signal: AbortSignal,
): Promise<LayoutSpec> {
    const ratio = classifyRatio(canvasW, canvasH);

    try {
        const body = {
            model: DEFAULT_CLAUDE_MODEL,
            max_tokens: 512,
            temperature: 0.7, // Higher temp for variety
            system: `You are a creative director choosing layout structures for ad creatives.
Given a user prompt, canvas size, and the actual headline/subheadline text, choose the BEST layout.

Available layouts: centered-stack, left-aligned, right-aligned, split-horizontal, bold-headline, minimal-clean, full-bleed-hero, badge-focus, diagonal-split, top-down-cascade, horizontal-strip, tower

Rules:
- Short headlines (< 10 chars) → bold-headline or badge-focus (use big fonts!)
- Long headlines (> 30 chars) → left-aligned or centered-stack (smaller fonts, multi-line)
- Ultra-wide canvases → horizontal-strip
- Tall/portrait canvases → tower or top-down-cascade
- "luxury" prompts → minimal-clean or right-aligned
- "sale/discount" prompts → badge-focus or bold-headline
- "sport/energy" prompts → bold-headline or diagonal-split
- ALWAYS choose a DIFFERENT layout from the last few — variety is key!

Return ONLY the JSON object.`,
            messages: [{
                role: 'user' as const,
                content: `Canvas: ${canvasW}x${canvasH}px (${ratio})
Prompt: "${prompt}"
Headline: "${content.headline}" (${content.headline.length} chars)
Subheadline: "${content.subheadline}" (${content.subheadline.length} chars)
CTA: "${content.cta}"

Return JSON:
{
  "layoutType": "<one from the list>",
  "alignment": "left|center|right",
  "accentStrategy": "top-bar|side-bar|diagonal|circle|overlay|bottom-line|none",
  "spacing": "tight|balanced|generous",
  "mood": "<1 word: luxury, energetic, tech, promotional, minimal, creative, professional>",
  "reasoning": "<1 sentence>"
}`,
            }],
        };

        const data = await callAnthropicApi(body, signal) as {
            content: Array<{ type: string; text?: string }>;
        };

        const textBlock = data.content.find(c => c.type === 'text');
        if (!textBlock?.text) throw new Error('No structure response');

        let raw = textBlock.text.trim();
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }

        const parsed = JSON.parse(raw) as {
            layoutType: LayoutType;
            alignment: Alignment;
            accentStrategy: AccentStrategy;
            spacing: SpacingMode;
            mood: string;
            reasoning: string;
        };

        // Content-aware font sizes
        const availableWidthPct = parsed.alignment === 'center' ? 0.84 : 0.75;
        const { headlineFs, subheadlineFs } = calculateContentAwareFontSize(
            content.headline, canvasW, canvasH, availableWidthPct,
        );

        const spec: LayoutSpec = {
            layoutType: parsed.layoutType || 'centered-stack',
            alignment: parsed.alignment || 'center',
            headlineZone: getHeadlineZone(parsed.layoutType || 'centered-stack', ratio),
            ctaZone: getCtaZone(parsed.layoutType || 'centered-stack', ratio),
            headlineFontSize: headlineFs,
            subheadlineFontSize: subheadlineFs,
            accentStrategy: parsed.accentStrategy || 'none',
            spacing: parsed.spacing || 'balanced',
            mood: parsed.mood || 'professional',
            reasoning: parsed.reasoning || '',
        };

        console.log(`[StructureService] AI chose: ${spec.layoutType} (${spec.alignment}), mood=${spec.mood}, headlineFs=${spec.headlineFontSize}px, reason="${spec.reasoning}"`);
        return spec;
    } catch (err) {
        console.warn('[StructureService] AI failed, using sync fallback:', err);
        return generateLayoutSpecSync(prompt, content, canvasW, canvasH);
    }
}
