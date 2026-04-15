// ─────────────────────────────────────────────────
// agentGenerateFlow — AI Design Generation Pipeline
// ─────────────────────────────────────────────────
// Phases: Canvas Scan → Brand Cloud → Copywriting →
// Template Selection → Color Palette → BG Image →
// Template Build → Multi-pass Render → Vision QA
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks, FlowEngine } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';

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

    // ── Phase 6: Vision QA (stepper: Finishing) ──
    cb.setPhase?.('reflecting');
    await runVisionQA(engine, canvasW, canvasH, guide, template, rendered, abort, cb);

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

interface BrandScanResult {
    context: string;
    paletteHint: string;
    fontHint: string;
    assetHint: string;
    logoUrl: string | null;
    logoW: number;
    logoH: number;
    visionBlocks: any[];
}

async function scanBrandCloud(prompt: string, cb: AgentFlowCallbacks): Promise<BrandScanResult> {
    cb.addCard('brand-scan', 'Scanning Brand Cloud', 'running');
    const result: BrandScanResult = { context: '', paletteHint: '', fontHint: '', assetHint: '', logoUrl: null, logoW: 0, logoH: 0, visionBlocks: [] };

    try {
        const { useBrandKitStore } = await resilientImport(() => import('@/stores/brandKitStore'));
        const kit = useBrandKitStore.getState().getActiveKit();
        if (!kit) { cb.updateCard('brand-scan', 'done', 'No active brand kit'); return result; }

        result.paletteHint = [`Brand colors: primary=${kit.palette.primary}, secondary=${kit.palette.secondary}`, `accent=${kit.palette.accent}, background=${kit.palette.background}, text=${kit.palette.text}`].join(', ');
        result.fontHint = `Brand fonts: heading="${kit.typography.heading.family}", body="${kit.typography.body.family}", CTA="${kit.typography.cta.family}"`;

        const activeAssets = kit.assets.filter(a => !a.deletedAt);
        const logoAssets = activeAssets.filter(a => a.category === 'logo');
        if (logoAssets.length > 0) {
            const brandNameLower = (kit.guidelines?.name || kit.name || '').toLowerCase();
            const brandTaglineLower = (kit.guidelines?.tagline || '').toLowerCase();
            const pl = prompt.toLowerCase();
            if (pl.includes(brandNameLower) || (brandTaglineLower && pl.includes(brandTaglineLower)) || pl.includes('logo') || pl.includes('brand') || pl.includes('로고') || pl.includes('브랜드')) {
                const logo = logoAssets[0]!;
                result.logoUrl = logo.src; result.logoW = logo.width; result.logoH = logo.height;
            }
        }

        const promptLower = prompt.toLowerCase();
        const matchedAssets = activeAssets.filter(a => a.tags.some(t => promptLower.includes(t.toLowerCase())) || promptLower.includes(a.name.toLowerCase()) || promptLower.includes(a.category));
        if (matchedAssets.length > 0 || logoAssets.length > 0) {
            const allRelevant = [...new Set([...logoAssets, ...matchedAssets])];
            result.assetHint = `Brand assets: ${allRelevant.map(a => `"${a.name}" (${a.category}, ${a.width}x${a.height})`).join(', ')}`;
        }

        const g = kit.guidelines;
        result.context = [`Brand: ${g.name || kit.name}`, g.tagline ? `Tagline: "${g.tagline}"` : '', g.voiceTone ? `Voice: ${g.voiceTone}` : '', g.ctaPhrases.length > 0 ? `CTA phrases: ${g.ctaPhrases.join(', ')}` : '', result.paletteHint, result.fontHint, result.assetHint].filter(Boolean).join('\n');

        try {
            const { buildBrandVisionBlocks } = await resilientImport(() => import('@/services/brandContextBuilder'));
            result.visionBlocks = buildBrandVisionBlocks(kit);
            if (result.visionBlocks.length > 0) cb.narrate(`AI can now visually see ${Math.floor(result.visionBlocks.length / 2)} brand asset(s).`);
        } catch { /* optional */ }

        const logoNote = logoAssets.length > 0 ? ` (${logoAssets.length} logo)` : '';
        const assetNote = matchedAssets.length > 0 ? `${matchedAssets.length} matching asset(s)${logoNote}` : `${activeAssets.length} asset(s)${logoNote}`;
        cb.updateCard('brand-scan', 'done', `${kit.name}: ${assetNote}`, { expandedDetail: result.context });
        cb.narrate(`Brand kit "${kit.name}" loaded — ${assetNote}.`);
    } catch {
        cb.updateCard('brand-scan', 'done', 'Brand Cloud scan skipped');
    }
    return result;
}

async function selectTemplate(prompt: string, canvasW: number, canvasH: number, brandVisionBlocks: any[], abort: AbortController, cb: AgentFlowCallbacks) {
    cb.narrate(`Analyzing layout templates for ${canvasW}x${canvasH}...`);
    cb.addCard('structure', 'AI selecting layout template', 'running');

    let template: import('@/services/designTemplates').DesignTemplate | null = null;
    try {
        const { renderTemplateGrid, buildTemplateSelectionPrompt, getTemplateById } = await resilientImport(() => import('@/services/templatePreviewRenderer'));
        const { callWithRole } = await resilientImport(() => import('@/services/openRouterClient'));

        const gridBase64 = renderTemplateGrid(canvasW, canvasH).split(',')[1] ?? '';
        const aiResponse = await callWithRole('planner', {
            messages: [{ role: 'user', content: [{ type: 'text', text: `${buildTemplateSelectionPrompt(canvasW, canvasH)}\n\nUser's design request: "${prompt}"` }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: gridBase64 } }, ...brandVisionBlocks] }],
            max_tokens: 200,
        }, abort.signal) as { content?: Array<{ type: string; text?: string }> };

        const aiText = aiResponse?.content?.find(b => b.type === 'text')?.text ?? '';
        const jsonMatch = aiText.match(/\{[^}]+\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const selectedId = parsed.templateId || parsed.template_id;
            const reason = parsed.reason || '';
            if (selectedId) {
                template = getTemplateById(selectedId) ?? null;
                if (template) {
                    cb.updateCard('structure', 'done', `${template.name} (AI selected)`, { reasoning: reason || `AI selected "${template.name}" based on visual analysis`, expandedDetail: `Template: ${template.name}\nID: ${template.id}\nReason: ${reason}\nMethod: AI Vision-based selection` });
                    cb.narrate(`AI chose "${template.name}" — ${reason}`);
                }
            }
        }
    } catch (err) { console.warn('[UnifiedAgent] AI template selection failed, falling back:', err); }

    if (!template) {
        const { selectTemplate: selTpl } = await resilientImport(() => import('@/services/designTemplates'));
        template = selTpl(canvasW, canvasH);
        if (!template) throw new Error('No compatible template found');
        cb.updateCard('structure', 'done', template.name, { reasoning: `Fallback: "${template.name}" — ${template.description}`, expandedDetail: `Template: ${template.name}\nDescription: ${template.description}\nAspect Ratios: ${template.aspectRatios.join(', ')}\nMethod: Rotation fallback` });
    }
    return template;
}

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

    if (bgResult.hasImage && bgResult.url) allElements = allElements.filter(el => el.name !== 'background');
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

function renderElement(engine: FlowEngine, el: any, canvasW: number, cacheGradientData: (key: string, start: string, end: string, angle: number) => void, guide?: any): number | null {
    const hexToRgb = (hx: string): [number, number, number] => {
        const c = hx.replace('#', '');
        return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255];
    };

    if (el.type === 'text') {
        const [tr, tg, tb] = el.color_hex ? hexToRgb(el.color_hex) : [1, 1, 1];
        const fontFamily = el.font_family || guide?.typography?.primaryFont || 'Inter';
        const fullFont = `${fontFamily}, system-ui, sans-serif`;
        return engine.add_text(el.x ?? 0, el.y ?? 0, el.content || 'Text', el.font_size ?? 18, fullFont, el.font_weight ?? '700', tr, tg, tb, 1.0, (el.w && el.w > 0) ? el.w : canvasW * 0.85, el.text_align ?? 'center', el.name, el.line_height, el.letter_spacing);
    } else if (el.gradient_start_hex && el.gradient_end_hex) {
        const nodeId = engine.add_gradient_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 100, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135, el.radius ?? 0, el.name);
        cacheGradientData(el.name ?? '', el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135);
        if (nodeId != null) cacheGradientData(`engine-${nodeId}`, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135);
        return nodeId;
    } else if (el.type === 'rounded_rect') {
        return engine.add_rounded_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, el.a ?? 1, el.radius ?? 8, el.name);
    } else if (el.type === 'ellipse') {
        return engine.add_ellipse?.((el.x ?? 0) + (el.w ?? 50) / 2, (el.y ?? 0) + (el.h ?? 50) / 2, (el.w ?? 50) / 2, (el.h ?? 50) / 2, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, el.a ?? 1) ?? null;
    } else {
        return engine.add_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, el.a ?? 1, el.name);
    }
}

function buildElementDetail(el: any): string {
    if (el.type === 'text') return `"${(el.content ?? '').slice(0, 25)}" ${el.font_size}px at (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)})`;
    if (el.gradient_start_hex) return `${el.gradient_start_hex} -> ${el.gradient_end_hex} ${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`;
    return `${el.type ?? 'rect'} at (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)}) ${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`;
}

async function runVisionQA(engine: FlowEngine, canvasW: number, canvasH: number, guide: any, template: any, rendered: number, abort: AbortController, cb: AgentFlowCallbacks) {
    cb.narrate('Reviewing and optimizing design quality...');
    cb.addCard('vision', 'Optimizing layout', 'running');
    try {
        const { runVisionHealingLoop } = await resilientImport(() => import('@/services/autoDesignLoop'));
        const loopResult = await runVisionHealingLoop(engine, canvasW, canvasH, abort.signal, (msg: string) => cb.updateCard('vision', 'running', msg));
        const fixNote = loopResult.fixesApplied > 0 ? ` · ${loopResult.fixesApplied} fix(es)` : '';
        const methodNote = loopResult.healingMethod === 'patch' ? ' (auto-patched)' : '';
        cb.updateCard('vision', loopResult.finalScore >= 80 ? 'done' : 'error', `Score: ${loopResult.finalScore}/100${fixNote}${methodNote}`);
        cb.narrate(`Design quality review — score ${loopResult.finalScore}/100.${fixNote}\nStyle: ${guide.name}\nLayout: ${template.name}\nElements: ${rendered}\nCanvas: ${canvasW}x${canvasH}px`);
    } catch {
        cb.updateCard('vision', 'done', 'Vision check skipped');
        cb.narrate(`Design placed with ${rendered} elements using ${guide.name}.\nCanvas: ${canvasW}x${canvasH}px`);
    }
}
