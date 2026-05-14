// ─────────────────────────────────────────────────
// agentFlowImageHelpers — BG Image + Composition Helpers
// ─────────────────────────────────────────────────
// ★ v737: Extracted from agentGenerateFlow.ts to stay under 400L.
// Contains: generateBgImage, selectCompositionAwareTemplate
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';

export async function generateBgImage(
    needsBackgroundImage: boolean, backgroundImagePrompt: string | undefined, prompt: string,
    canvasW: number, canvasH: number, guide: any, abort: AbortController, cb: AgentFlowCallbacks,
): Promise<{ hasImage: boolean; url: string | null }> {
    if (!needsBackgroundImage || !backgroundImagePrompt) return { hasImage: false, url: null };

    cb.narrate('This design needs a background image. Generating...');
    cb.addCard('bg-image', 'Generating background image', 'running', { reasoning: backgroundImagePrompt });

    try {
        const { generateBackgroundImage } = await resilientImport(() => import('@/services/imageGenClient'));
        const promptLow = (backgroundImagePrompt + ' ' + prompt).toLowerCase();
        const needsRealism = /(?:person|people|woman|man|girl|boy|model|portrait|photo|face|human|doctor|dentist|nurse|chef|athlete|worker|teacher|musician|artist|therapist|pharmacist|engineer|lawyer|pilot|soldier|barista|waiter|stylist|trainer|coach|의사|치과|간호사|요리사|선수|교사|운동|여자|남자|사람|사진|모델|얼굴|product|bottle|package|food|drink|car|building|hotel|resort)/.test(promptLow);
        const enhancedBgPrompt = needsRealism ? `${backgroundImagePrompt}. Hyper-realistic, professional photography, 8K resolution, cinematic lighting, shallow depth of field, shot on Sony A7R IV.` : backgroundImagePrompt;

        const bgResult = await generateBackgroundImage(enhancedBgPrompt, canvasW, canvasH, [guide.colors.accent, guide.colors.background, guide.colors.gradientEnd], abort.signal);
        if (bgResult.success && bgResult.imageUrl) {
            cb.updateCard('bg-image', 'done', bgResult.isFallback ? 'Gradient fallback' : `Image generated (${needsRealism ? 'hyper-realistic' : 'standard'})`, { expandedDetail: bgResult.isFallback ? `Fallback: ${bgResult.message}` : `Generated ${canvasW}x${canvasH} background via ${bgResult.model}` });
            return { hasImage: true, url: bgResult.imageUrl };
        } else {
            cb.updateCard('bg-image', 'error', bgResult.message || 'Generation failed');
        }
    } catch (err) {
        console.warn('[UnifiedAgent] Background image generation failed:', err);
        cb.updateCard('bg-image', 'error', 'Generation failed — using gradient');
    }
    return { hasImage: false, url: null };
}

/** ★ v737: Select template whose text avoids the image subject */
export async function selectCompositionAwareTemplate(
    prompt: string, canvasW: number, canvasH: number,
    abort: AbortController, cb: AgentFlowCallbacks,
    aiTemplateId: string | null | undefined,
    composition: import('@/services/imageComposition').ImageComposition,
    selectTmpl: typeof import('./agentFlowHelpers').selectTemplate,
    resolveElements: typeof import('@/services/templateResolver').resolveTemplateElements,
    brief?: import('@/services/designBrief').DesignBrief,
): Promise<{ id: string; name: string; description: string }> {
    const { useTemplateStore } = await resilientImport(() => import('@/stores/templateStore'));
    const { analyzeTemplateTextZone, scoreTemplateComposition } = await resilientImport(() => import('@/services/imageComposition'));
    const allTemplates = useTemplateStore.getState().templates ?? [];
    if (allTemplates.length <= 1) return selectTmpl(prompt, canvasW, canvasH, [], abort, cb, aiTemplateId, brief);

    // Score all templates by composition compatibility
    let bestTmpl = allTemplates[0]!;
    let bestScore = -1;
    for (const t of allTemplates) {
        try {
            const els = resolveElements(t.id, canvasW, canvasH);
            const textZone = analyzeTemplateTextZone(els, canvasW);
            const score = scoreTemplateComposition(textZone, composition);
            if (score > bestScore) { bestScore = score; bestTmpl = t; }
        } catch { /* skip broken templates */ }
    }

    const template = { id: bestTmpl.id, name: bestTmpl.name, description: bestTmpl.description ?? '' };
    cb.addCard('structure', 'Selecting layout template', 'done');
    cb.updateCard('structure', 'done', template.name, {
        reasoning: `Composition-aware: subject ${composition.subjectZone} → text safe zone ${composition.safeTextZone} (score: ${bestScore})`,
        expandedDetail: `Template: ${template.name}\nSubject: ${composition.subjectZone}\nText zone: ${composition.safeTextZone}\nScore: ${bestScore}/10`,
    });
    cb.narrate(`Template "${template.name}" selected (text avoids ${composition.subjectZone} subject)`);
    return template;
}
