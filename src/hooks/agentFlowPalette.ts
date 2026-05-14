// ─────────────────────────────────────────────────
// agentFlowPalette — Phase 3: Palette + Image Decision
// ─────────────────────────────────────────────────
// ★ v745: Extracted from agentGenerateFlow.ts to stay under 350 lines.
// Orchestrates: template catalog → AI palette → font codification
//               → image decision → UI narration.
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks } from './agentFlowTypes';
import type { DesignBrief } from '@/services/designBrief';
import type { DesignStyleGuide, DesignStrategy } from '@/services/designStrategy';
import type { BrandScanResult } from './agentFlowHelpers';
import { resilientImport } from '@/utils/resilientImport';

export interface PaletteResult {
    guide: DesignStyleGuide;
    designStrategy: DesignStrategy;
    aiTemplateId: string | null;
    backgroundImagePrompt: string;
    finalNeedsImage: boolean;
}

/**
 * Phase 3: Determine color palette, design strategy, font pair, and image decision.
 * Uses brief metadata to skip redundant AI analysis.
 */
export async function runPalettePhase(
    prompt: string,
    brief: DesignBrief,
    brand: BrandScanResult,
    signal: AbortSignal,
    cb: AgentFlowCallbacks,
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
    const colorPrompt = brand.paletteHint
        ? `${prompt}\n\n[BRAND PALETTE — Reference Only]\n${brand.paletteHint}\nUse brand colors as a STARTING POINT, but if the user's prompt explicitly requests a different color (e.g., "blue CTA", "make it green", "파란색"), the user's color ALWAYS wins.`
        : prompt;

    // ★ v744: Pipe brief metadata → palette
    const briefHint = { mood: brief.mood, industry: brief.industry, slots: brief.slots, textDensity: brief.textDensity };
    const { palette: guide, reasoning: colorReasoning, needsBackgroundImage: aiNeedsImage, backgroundImagePrompt, designStrategy, templateId: aiTemplateId } =
        await generateColorPalette(colorPrompt, signal, templateCatalog, briefHint);

    // ★ Code-first image decision: deterministic for 80% of cases, AI only for ambiguous
    const { decideBackgroundImage } = await resilientImport(() => import('@/services/backgroundImageDecider'));
    const codeDecision = decideBackgroundImage(prompt);
    const finalNeedsImage = codeDecision.confidence === 'high' ? codeDecision.needsImage : aiNeedsImage;
    const imageSource = codeDecision.confidence === 'high' ? `Code: ${codeDecision.reason}` : `AI: ${aiNeedsImage ? 'yes' : 'no'}`;
    console.log(`[Pipeline] Image decision: ${finalNeedsImage} (${imageSource})`);

    cb.updateCard('palette', 'done', guide.name, {
        reasoning: colorReasoning,
        expandedDetail: [
            `Background: ${guide.colors.gradientStart} -> ${guide.colors.gradientEnd}`,
            `Accent: ${guide.colors.accent}`,
            `Text: ${guide.colors.foreground}`,
            `Font: ${guide.typography.primaryFont} / ${guide.typography.secondaryFont}`,
            `Overlay: ${designStrategy.overlayApproach} | CTA: ${designStrategy.ctaStyle}`,
            `Template: ${aiTemplateId ?? 'auto'}`,
            finalNeedsImage ? `Background Image: YES (${imageSource})` : `Background Image: NO (${imageSource})`,
        ].join('\n'),
    });
    cb.narrate(colorReasoning || `Color palette: ${guide.name}`);

    return { guide, designStrategy, aiTemplateId, backgroundImagePrompt, finalNeedsImage };
}
