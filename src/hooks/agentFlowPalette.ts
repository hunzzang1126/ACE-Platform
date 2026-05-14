// ─────────────────────────────────────────────────
// agentFlowPalette — Phase 4: Palette (Image-Color-Aware)
// ─────────────────────────────────────────────────
// ★ v747: Image-First pipeline.
// If imageColors are provided (from generated BG image),
// uses extracted colors to override AI palette decisions.
// If no image → falls back to pure AI palette.
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks } from './agentFlowTypes';
import type { DesignBrief } from '@/services/designBrief';
import type { DesignStyleGuide, DesignStrategy } from '@/services/designStrategy';
import type { BrandScanResult } from './agentFlowHelpers';
import type { ExtractedColors } from '@/services/imageColorExtractor';
import { resilientImport } from '@/utils/resilientImport';

export interface PaletteResult {
    guide: DesignStyleGuide;
    designStrategy: DesignStrategy;
    aiTemplateId: string | null;
    /** ★ v747: Still returned for fallback image generation when image wasn't generated first */
    backgroundImagePrompt: string;
    needsBackgroundImage: boolean;
}

/**
 * Phase 4: Determine color palette, design strategy, font pair.
 * ★ v747: If imageColors provided, merges extracted colors into palette.
 */
export async function runPalettePhase(
    prompt: string,
    brief: DesignBrief,
    brand: BrandScanResult,
    signal: AbortSignal,
    cb: AgentFlowCallbacks,
    imageColors?: ExtractedColors,
): Promise<PaletteResult> {
    cb.narrate('Determining the perfect color palette and selecting template...');
    cb.addCard('palette', 'Determining color palette', 'running');

    // ★ Build template catalog from Supabase store for AI selection
    let templateCatalog: Array<{ id: string; name: string; description: string; tags: string[]; category: string }> = [];
    try {
        const { useTemplateStore } = await resilientImport(() => import('@/stores/templateStore'));
        const allTemplates = useTemplateStore.getState().templates ?? [];
        templateCatalog = allTemplates.map(t => ({
            id: t.id, name: t.name, description: t.description,
            tags: t.tags ?? [], category: t.category ?? 'display',
        }));
        console.log(`[Pipeline] Template catalog: ${templateCatalog.length} templates available for AI selection`);
    } catch { /* fallback: empty catalog → keyword matching will handle */ }

    const { generateColorPalette } = await resilientImport(() => import('@/services/designStyleGuides'));

    // ★ v747: If we have image colors, inject them as strong hint
    let colorPrompt = brand.paletteHint
        ? `${prompt}\n\n[BRAND PALETTE — Reference Only]\n${brand.paletteHint}\nUse brand colors as a STARTING POINT, but if the user's prompt explicitly requests a different color (e.g., "blue CTA", "make it green", "파란색"), the user's color ALWAYS wins.`
        : prompt;

    if (imageColors) {
        colorPrompt += `\n\n[IMAGE COLORS — Extracted from generated background image]\nDominant: ${imageColors.dominant}\nPalette: ${imageColors.palette.join(', ')}\nWarmth: ${imageColors.warmth}\nLuminance: ${imageColors.avgLuminance.toFixed(2)}\n★ IMPORTANT: Base your color palette on these ACTUAL image colors. Text must be readable over the image.`;
    }

    const briefHint = { mood: brief.mood, industry: brief.industry, slots: brief.slots, textDensity: brief.textDensity };
    const { palette: guide, reasoning: colorReasoning, needsBackgroundImage, backgroundImagePrompt, designStrategy, templateId: aiTemplateId } =
        await generateColorPalette(colorPrompt, signal, templateCatalog, briefHint);

    // ★ v747: Override palette with image-extracted colors when available
    if (imageColors) {
        guide.colors.gradientStart = imageColors.palette[0] ?? guide.colors.gradientStart;
        guide.colors.gradientEnd = imageColors.palette[1] ?? guide.colors.gradientEnd;
        guide.colors.background = imageColors.dominant;
        guide.colors.foreground = imageColors.suggestedText;
        // Accent: use AI accent if it contrasts well with image, otherwise use extracted
        const { hexToHSL } = await resilientImport(() => import('@/services/colorHarmony'));
        const accentHSL = hexToHSL(guide.colors.accent);
        const domHSL = hexToHSL(imageColors.dominant);
        const hueDiff = Math.abs(accentHSL.h - domHSL.h);
        const contrastOk = Math.min(hueDiff, 360 - hueDiff) > 40;
        if (!contrastOk) {
            guide.colors.accent = imageColors.suggestedAccent;
            console.log(`[Pipeline] AI accent too similar to image → using extracted accent: ${imageColors.suggestedAccent}`);
        }
        console.log(`[Pipeline] Image-First palette override: bg=${imageColors.dominant} text=${imageColors.suggestedText}`);
    }

    cb.updateCard('palette', 'done', guide.name, {
        reasoning: colorReasoning,
        expandedDetail: [
            imageColors ? `★ Image-First: Colors extracted from generated background` : 'AI-generated palette',
            `Background: ${guide.colors.gradientStart} -> ${guide.colors.gradientEnd}`,
            `Accent: ${guide.colors.accent}`,
            `Text: ${guide.colors.foreground}`,
            `Font: ${guide.typography.primaryFont} / ${guide.typography.secondaryFont}`,
            `Overlay: ${designStrategy.overlayApproach} | CTA: ${designStrategy.ctaStyle}`,
            `Template: ${aiTemplateId ?? 'auto'}`,
        ].join('\n'),
    });
    cb.narrate(imageColors
        ? `Color palette derived from generated image: ${guide.name}`
        : (colorReasoning || `Color palette: ${guide.name}`));

    return { guide, designStrategy, aiTemplateId, backgroundImagePrompt: backgroundImagePrompt ?? '', needsBackgroundImage };
}
