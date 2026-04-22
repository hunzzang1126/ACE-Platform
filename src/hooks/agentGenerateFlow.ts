// ─────────────────────────────────────────────────
// agentGenerateFlow — AI Design Generation Pipeline
// ─────────────────────────────────────────────────
// Phases: Canvas Scan → Brand Cloud → Copywriting →
// Template Selection → Color Palette → BG Image →
// Template Build → Multi-pass Render → Vision QA
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks, FlowEngine } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';
import { renderElement, buildElementDetail } from './agentFlowRender';
import { scanBrandCloud, selectTemplate, recalcTextHeights, autoCreateSubheadline } from './agentFlowHelpers';
import { hexLuminance, averageLuminance } from './contrastHelpers';

/** Execute the full design generation pipeline */
export async function executeGenerateFlow(
    prompt: string,
    engine: FlowEngine,
    cb: AgentFlowCallbacks,
): Promise<string> {
    // ── Phase 1: Canvas scan (stepper: Analyzing) ──
    cb.setPhase?.('thinking');
    cb.narrate('Starting design generation. Reading current canvas state...');
    cb.addCard('context', 'Reading canvas context', 'running');
    let elementCount = 0;
    try { const nodes = JSON.parse(engine.get_all_nodes()); elementCount = Array.isArray(nodes) ? nodes.length : 0; } catch { /* ok */ }
    cb.updateCard('context', 'done', `${elementCount} elements found`);
    await pause(400);

    let canvasW = 300, canvasH = 250;
    try { const dims = engine.get_canvas_size?.(); if (dims) { canvasW = dims.width ?? 300; canvasH = dims.height ?? 250; } } catch { /* ok */ }

    // ── Phase 1.5: Brand Cloud Scan ──
    const brand = await scanBrandCloud(prompt, cb);
    await pause(300);

    // ── Phase 2: AI Copywriting (stepper: Planning) ──
    cb.setPhase?.('planning');
    cb.narrate("I'll generate the ad copy tailored for your prompt.");
    cb.addCard('content', 'Generating creative copy', 'running');
    await pause(400);

    const abort = new AbortController();
    const { callTemplateContent } = await resilientImport(() => import('@/services/autoDesignService'));
    const { loadUserPrefs } = await resilientImport(() => import('@/stores/userPrefs'));
    const preferredLang = loadUserPrefs().preferredLanguage;
    const contentPrompt = brand.context ? `${prompt}\n\n[BRAND CONTEXT]\n${brand.context}` : prompt;
    const content = await callTemplateContent(contentPrompt, canvasW, canvasH, 'AI Pipeline', abort.signal, preferredLang);

    cb.updateCard('content', 'done', 'Copy generated', {
        expandedDetail: [`Headline: "${content.headline}"`, `Subheadline: "${content.subheadline}"`, `CTA: "${content.cta}"`, content.tag ? `Tag: "${content.tag}"` : ''].filter(Boolean).join('\n'),
    });
    cb.narrate(`Copy ready: "${content.headline}"`);
    await pause(400);

    // ── Phase 3: Template Selection ──
    const template = await selectTemplate(prompt, canvasW, canvasH, brand.visionBlocks, abort, cb);
    await pause(400);

    // ── Phase 4: Color Palette ──
    cb.narrate(`Selecting colors for the "${template.name}" layout...`);
    cb.addCard('palette', 'Determining color palette', 'running');

    const { generateColorPalette } = await resilientImport(() => import('@/services/designStyleGuides'));
    const colorPrompt = brand.paletteHint ? `${prompt}\n\n[BRAND PALETTE]\n${brand.paletteHint}\nPrefer these brand colors when they fit the mood.` : prompt;
    const { palette: guide, reasoning: colorReasoning, needsBackgroundImage, backgroundImagePrompt } = await generateColorPalette(colorPrompt, abort.signal);

    cb.updateCard('palette', 'done', guide.name, {
        reasoning: colorReasoning,
        expandedDetail: [`Background: ${guide.colors.gradientStart} -> ${guide.colors.gradientEnd}`, `Accent: ${guide.colors.accent}`, `Text: ${guide.colors.foreground}`, `Font: ${guide.typography.primaryFont} / ${guide.typography.secondaryFont}`, needsBackgroundImage ? 'Background Image: YES' : 'Background Image: NO'].join('\n'),
    });
    cb.narrate(colorReasoning || `Color palette: ${guide.name}`);
    await pause(400);

    // ── Phase 4.5: Background Image ──
    const bgResult = await generateBgImage(needsBackgroundImage, backgroundImagePrompt, prompt, canvasW, canvasH, guide, abort, cb);
    await pause(300);

    // ── Phase 5: Template Build (stepper: Executing) ──
    cb.setPhase?.('executing');
    const rendered = await buildAndRender(template, guide, content, canvasW, canvasH, bgResult, brand.logoUrl, brand.logoW, brand.logoH, engine, abort, cb);

    // ── Phase 6: Finalize (stepper: Finishing) ──
    // ★ Vision QA removed — deterministic quality (recolor + contrast + layout validation)
    // is more reliable and costs ZERO tokens vs. expensive post-hoc AI healing.
    cb.setPhase?.('reflecting');
    cb.addCard('finalize', 'Finalizing design', 'running');
    try { engine.reorder_by_z_index?.(); } catch { /* ok */ }
    try { engine.render_all?.(); } catch { /* ok */ }
    cb.updateCard('finalize', 'done', `${rendered} elements · Design complete`);
    cb.narrate(`Design finalized with ${rendered} elements. Style: ${guide.name}, Layout: ${template.name}.`);

    // ── Phase 7: Save to AI Memory ──
    // Records this design in Supabase ai_memory for cross-session learning
    try {
        const { addDesignEntry, extractFacts, saveAiMemory } = await import('@/services/aiMemoryService');
        await addDesignEntry({
            prompt,
            bgPrompt: backgroundImagePrompt || undefined,
            style: guide.name,
            colorGuide: `${guide.colors.gradientStart} → ${guide.colors.gradientEnd}`,
        });
        // Also extract any user preferences from the prompt
        const facts = extractFacts(prompt, '');
        if (Object.keys(facts).length > 0) await saveAiMemory(facts);
        console.info('[AiMemory] Design entry saved to Supabase');
    } catch (err) {
        console.warn('[AiMemory] Failed to save design entry:', err);
    }

    return `Design generated with ${rendered} elements.`;
}

// ─── Helpers ──────────────────────────────────────

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

// ★ scanBrandCloud, selectTemplate → extracted to agentFlowHelpers.ts


async function generateBgImage(
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
            cb.updateCard('bg-image', 'done', bgResult.isFallback ? 'Gradient fallback' : `Image generated (${needsRealism ? 'hyper-realistic' : 'standard'})`, { expandedDetail: bgResult.isFallback ? 'API not available — using gradient fallback.' : `Generated ${canvasW}x${canvasH} background via ${bgResult.model}` });
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

async function buildAndRender(
    template: import('@/services/designTemplates').DesignTemplate,
    guide: any, content: any, canvasW: number, canvasH: number,
    bgResult: { hasImage: boolean; url: string | null },
    brandLogoUrl: string | null, brandLogoW: number, brandLogoH: number,
    engine: FlowEngine, abort: AbortController, cb: AgentFlowCallbacks,
): Promise<number> {
    cb.narrate(`Building the layout: ${template.name}...`);
    cb.addCard('build', 'Combining layout', 'running');

    const { validateLayout } = await resilientImport(() => import('@/engine/layoutValidator'));

    // ★ CLOUD-FIRST: Read template elements from Supabase (via templateStore)
    // resolveTemplateElements() handles: snapshot parsing, DesignElement → RenderElement
    // conversion, and proportional scaling from template native size to actual canvas.
    const { resolveTemplateElements } = await resilientImport(() => import('@/services/templateResolver'));
    let allElements = resolveTemplateElements(template.id, canvasW, canvasH);

    // ★ RECOLOR: Replace template's original colors with AI-generated palette.
    // Background is decided FIRST (Phase 4) — now all elements harmonize with it.
    const { recolorTemplateElements } = await resilientImport(() => import('./agentColorRecolor'));
    allElements = recolorTemplateElements(allElements, guide);

    // ★ CONTENT SUBSTITUTION: Replace template placeholder text with AI-generated copy.
    // Strategy: try name-based mapping first, then fall back to font-size heuristic.
    let headlineMapped = false;
    let subheadlineMapped = false;
    let ctaMapped = false;
    let tagMapped = false;
    const mappedElements = new Set<any>(); // Track Pass 1 mapped elements for Pass 2 exclusion

    // Pass 1: Name-based mapping (exact keyword match)
    for (const el of allElements) {
        if (el.type !== 'text' && !el.content) continue;
        const name = (el.name ?? '').toLowerCase();
        if (!headlineMapped && name.includes('headline') && !name.includes('sub')) {
            if (content.headline) { el.content = content.headline; headlineMapped = true; mappedElements.add(el); }
        } else if (!subheadlineMapped && (name.includes('subheadline') || name.includes('sub_headline') || name.includes('body'))) {
            if (content.subheadline) { el.content = content.subheadline; subheadlineMapped = true; mappedElements.add(el); }
        } else if (!ctaMapped && name.includes('cta') && name.includes('label')) {
            if (content.cta) { el.content = content.cta; ctaMapped = true; mappedElements.add(el); }
        } else if (!tagMapped && name.includes('tag')) {
            if (content.tag) { el.content = content.tag; tagMapped = true; mappedElements.add(el); }
        }
    }

    // Pass 2: Font-size heuristic — if name-based mapping missed the headline/subheadline,
    // sort text elements by font_size descending and assign by role (largest = headline).
    // ★ Exclude elements already mapped in Pass 1 to prevent overwriting.
    if (!headlineMapped || !subheadlineMapped) {
        const textEls = allElements
            .filter(el => el.type === 'text'
                && !['cta_label', 'cta_button'].includes(el.name ?? '')
                && !mappedElements.has(el))
            .sort((a, b) => (b.font_size ?? 0) - (a.font_size ?? 0));

        if (!headlineMapped && textEls[0] && content.headline) {
            textEls[0].content = content.headline;
            headlineMapped = true;
            console.log(`[Pipeline] Heuristic headline: "${textEls[0].name}" (font_size=${textEls[0].font_size})`);
        }
        if (!subheadlineMapped && textEls[1] && content.subheadline) {
            textEls[1].content = content.subheadline;
            subheadlineMapped = true;
            console.log(`[Pipeline] Heuristic subheadline: "${textEls[1].name}" (font_size=${textEls[1].font_size})`);
        }
        if (!tagMapped && textEls.length >= 3 && content.tag) {
            const tagEl = textEls[textEls.length - 1]; // smallest text
            tagEl!.content = content.tag;
            tagMapped = true;
        }
    }

    // ★ Recalculate text heights after content substitution (template heights are stale)
    recalcTextHeights(allElements, canvasH);

    // ★ AUTO-CREATE SUBHEADLINE (extracted to helper)
    if (content.subheadline && !subheadlineMapped) {
        autoCreateSubheadline(allElements, content, canvasW, canvasH);
    }

    // ★ PHOTO CONTRAST: When a background image exists, ensure all text is readable.
    // Force white text + drop shadow for photo backgrounds (zero tokens, max impact).
    if (bgResult.hasImage && bgResult.url) {
        // ★ Force white text for readability on photo backgrounds.
        // No shadow applied — user can add via Effects panel if needed.
        for (const el of allElements) {
            if (el.type === 'text') {
                el.color_hex = '#FFFFFF';
            }
        }
        // ★ Remove ALL structural overlay rects — photo replaces the entire background layer.
        // These rects (accent_zone, accent_glow, text_overlay, etc.) were designed for
        // gradient backgrounds to add depth. On a photo they just cover the image.
        const STRUCTURAL_RECT_NAMES = new Set([
            'background', 'accent_zone', 'accent_glow', 'text_overlay',
            'accent_diagonal', 'bottom_border', 'bottom_accent',
        ]);
        allElements = allElements.filter(el => {
            if (el.type === 'text') return true; // always keep text
            if (STRUCTURAL_RECT_NAMES.has(el.name ?? '')) {
                console.log(`[Pipeline] Removing structural rect "${el.name}" (photo bg replaces it)`);
                return false;
            }
            return true;
        });
    } else {
        // ★ NO BACKGROUND IMAGE — ensure background shape exists + text contrast
        const hasBg = allElements.some(el => el.name === 'background');
        if (!hasBg) {
            // Create background element from palette (gradient or solid)
            allElements.unshift({
                name: 'background',
                type: 'rect' as any,
                x: 0, y: 0, w: canvasW, h: canvasH,
                gradient_start_hex: guide.colors.gradientStart,
                gradient_end_hex: guide.colors.gradientEnd,
                gradient_angle: 135,
            });
            console.log(`[Pipeline] Auto-created background: ${guide.colors.gradientStart} → ${guide.colors.gradientEnd}`);
        }

        // ★ CONTRAST CHECK: ensure text is readable against background
        const bgEl = allElements.find(el => el.name === 'background');
        const bgLum = bgEl
            ? averageLuminance(bgEl.gradient_start_hex ?? '#000000', bgEl.gradient_end_hex ?? bgEl.gradient_start_hex ?? '#000000')
            : 0.5;

        for (const el of allElements) {
            if (el.type !== 'text') continue;
            const textLum = hexLuminance(el.color_hex ?? '#FFFFFF');
            const contrast = Math.abs(bgLum - textLum);

            // If contrast is too low (< 0.3), flip text to opposite
            if (contrast < 0.3) {
                el.color_hex = bgLum > 0.5 ? '#1A1A2E' : '#FFFFFF';
            }
        }
    }

    // ★ SKIP CTA: If AI decided no CTA is needed, remove CTA elements entirely.
    // This prevents orphan CTA buttons/labels on non-commercial designs.
    if (!content.cta) {
        allElements = allElements.filter(el => {
            const name = (el.name ?? '').toLowerCase();
            if (name.includes('cta') || (name.includes('button') && el.type !== 'text')) {
                console.log(`[Pipeline] Skipping CTA element (not needed): ${el.name}`);
                return false;
            }
            return true;
        });
    }

    allElements = allElements.filter(el => { if (el.type === 'text' && (!el.content || el.content.trim() === '')) { console.log(`[Pipeline] Removing empty text: ${el.name}`); return false; } return true; });

    const validation = validateLayout(allElements, canvasW, canvasH);
    allElements = validation.elements;

    const validationNote = validation.isClean ? 'Layout validated — no issues' : `Layout validated — ${validation.fixes.length} auto-fix(es)`;
    cb.updateCard('build', 'done', `${allElements.length} elements · ${validationNote}`, {
        expandedDetail: allElements.map(el => `"${el.name}" — ${el.gradient_start_hex ? 'gradient' : el.type ?? 'rect'} at (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)}) ${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`).join('\n'),
    });
    await pause(400);

    // ── Multi-pass render ──
    const structureNames = new Set(['background', 'text_overlay', 'accent_zone', 'accent_glow', 'accent_line', 'accent_diagonal', 'accent_divider', 'tag_underline', 'tag_line']);
    const contentNames = new Set(['headline', 'subheadline', 'body_text', 'tag_text']);
    const actionNames = new Set(['cta_button', 'cta_label']);
    const layers = [
        { name: 'Structure', elements: allElements.filter(el => structureNames.has(el.name ?? '')) },
        { name: 'Content', elements: allElements.filter(el => contentNames.has(el.name ?? '')) },
        { name: 'Action', elements: allElements.filter(el => actionNames.has(el.name ?? '')) },
        { name: 'Polish', elements: allElements.filter(el => !structureNames.has(el.name ?? '') && !contentNames.has(el.name ?? '') && !actionNames.has(el.name ?? '')) },
    ];

    cb.narrate("Now I'll render each element onto the canvas.");
    await pause(500);

    const { clearGradientCache, cacheGradientData } = await resilientImport(() => import('@/engine/elementConverters'));
    clearGradientCache();
    try { engine.clear_scene?.(); } catch { /* ok */ }

    if (bgResult.hasImage && bgResult.url) {
        try {
            await engine.add_image(0, 0, bgResult.url, canvasW, canvasH, 'ai_background');
            cb.narrate('Background image placed on canvas.');
            // ★ Register AI image in Upload Library for persistence + reuse
            try {
                const { saveToUploadLibrary } = await resilientImport(() => import('@/stores/uploadStore'));
                await saveToUploadLibrary(bgResult.url, `AI: ${content?.headline?.slice(0, 40) ?? 'Background'}`, canvasW, canvasH, 'ai');
            } catch (libErr) { console.warn('[UnifiedAgent] Upload library save failed:', libErr); }
        } catch (err) { console.warn('[UnifiedAgent] Failed to place bg image:', err); }
    }

    let rendered = 0;
    for (const layer of layers) {
        if (layer.elements.length === 0) continue;
        await pause(300);
        for (const el of layer.elements) {
            const elCardId = `design-${rendered}`;
            cb.addCard(elCardId, `Design: ${el.name || (el.type ?? 'rect')}`, 'running');
            cb.moveCursor(el.x ?? 0, el.y ?? 0, el.name);
            await pause(150);
            try {
                const nodeId = renderElement(engine, el, canvasW, cacheGradientData, guide);
                if (nodeId != null && el.shadow_blur && el.shadow_blur > 0) {
                    try { engine.set_shadow?.(nodeId, el.shadow_offset_x ?? 2, el.shadow_offset_y ?? 4, el.shadow_blur, 0, 0, 0, el.shadow_opacity ?? 0.25); } catch { /* ok */ }
                }
                cb.updateCard(elCardId, 'done', buildElementDetail(el));
                rendered++;
            } catch (err) { console.warn('[UnifiedAgent] Failed to render:', el.name, err); cb.updateCard(elCardId, 'error', `Failed: ${el.name}`); }
        }
    }
    cb.hideCursor();

    // ── Brand Logo ──
    if (brandLogoUrl) {
        try {
            const maxLogoSize = Math.round(Math.min(canvasW, canvasH) * 0.15);
            const logoAspect = brandLogoW > 0 && brandLogoH > 0 ? brandLogoW / brandLogoH : 1;
            const [logoPlaceW, logoPlaceH] = logoAspect >= 1 ? [maxLogoSize, Math.round(maxLogoSize / logoAspect)] : [Math.round(maxLogoSize * logoAspect), maxLogoSize];
            const logoPad = Math.round(Math.min(canvasW, canvasH) * 0.04);
            await engine.add_image(canvasW - logoPlaceW - logoPad, canvasH - logoPlaceH - logoPad, brandLogoUrl, logoPlaceW, logoPlaceH, 'brand_logo');
            cb.narrate('Brand logo placed on canvas.');
        } catch (err) { console.warn('[UnifiedAgent] Failed to place logo:', err); }
    }

    try { engine.reorder_by_z_index?.(); } catch { /* ok */ }
    try { engine.render_all?.(); } catch { /* ok */ }

    return rendered;
}

// ★ renderElement, buildElementDetail, runVisionQA → extracted to agentFlowRender.ts
// ★ hexLuminance, averageLuminance → extracted to contrastHelpers.ts

