// ─────────────────────────────────────────────────
// agentGenerateFlow — AI Design Generation Pipeline
// ─────────────────────────────────────────────────
// Phases: Canvas Scan → Brand Cloud → Copywriting →
// Color Palette → BG Image → Carbon Layout → Render
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks, FlowEngine } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';
import { renderElement, buildElementDetail } from './agentFlowRender';
import { scanBrandCloud, recalcTextHeights, autoCreateSubheadline } from './agentFlowHelpers';
import { hexLuminance, averageLuminance } from './contrastHelpers';
import { generateBgImage, selectCompositionAwareTemplate } from './agentFlowImageHelpers';
import { runPalettePhase } from './agentFlowPalette';

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
    try {
        const dims = engine.get_canvas_size?.();
        if (dims) { canvasW = dims.width ?? 300; canvasH = dims.height ?? 250; }
    } catch { /* ok */ }

    // ★ Also read from designStore as fallback — engine may report stale size
    try {
        const { useDesignStore } = await resilientImport(() => import('@/stores/designStore'));
        const cs = useDesignStore.getState().creativeSet;
        const master = cs?.variants.find(v => v.id === cs?.masterVariantId);
        if (master?.preset) {
            const storeW = master.preset.width;
            const storeH = master.preset.height;
            // Prefer store dimensions if engine returned default (300x250)
            if (canvasW === 300 && canvasH === 250 && storeW > 0 && storeH > 0) {
                console.warn(`[Pipeline] Engine returned default 300x250, using store: ${storeW}x${storeH}`);
                canvasW = storeW;
                canvasH = storeH;
            }
        }
    } catch { /* ok */ }

    console.log(`[Pipeline] Canvas size: ${canvasW}x${canvasH}`);

    const abort = new AbortController();

    // ── Phase 1.5: Brand Cloud Scan (★ v719: now includes hybrid asset selection) ──
    const brand = await scanBrandCloud(prompt, canvasW, canvasH, cb, abort.signal);
    await pause(300);

    // ── Phase 2: AI Design Brief (stepper: Planning) ──
    // ★ v743: Content-First — one call generates content + structure decisions
    cb.setPhase?.('planning');
    cb.narrate("Analyzing your brief and generating ad copy...");
    cb.addCard('content', 'Generating design brief', 'running');
    await pause(400);

    const { generateDesignBrief } = await resilientImport(() => import('@/services/designBrief'));
    const { loadUserPrefs } = await resilientImport(() => import('@/stores/userPrefs'));
    const preferredLang = loadUserPrefs().preferredLanguage;
    const contentPrompt = brand.context ? `${prompt}\n\n[BRAND CONTEXT]\n${brand.context}` : prompt;
    const brief = await generateDesignBrief(contentPrompt, canvasW, canvasH, preferredLang, abort.signal, brand.context || undefined);

    // ★ brief.slots tells downstream what elements to CREATE
    const content = { headline: brief.headline, subheadline: brief.subheadline, cta: brief.cta, tag: brief.tag };

    cb.updateCard('content', 'done', `Copy generated · ${brief.slots.length} slots`, {
        expandedDetail: [
            `Headline: "${brief.headline}"`,
            brief.subheadline ? `Subheadline: "${brief.subheadline}"` : 'Subheadline: (not needed)',
            brief.cta ? `CTA: "${brief.cta}"` : 'CTA: (not needed)',
            brief.tag ? `Tag: "${brief.tag}"` : '',
            `Slots: [${brief.slots.join(', ')}]`,
            `Mood: ${brief.mood} · Industry: ${brief.industry}`,
            brief.reasoning ? `Reasoning: ${brief.reasoning}` : '',
        ].filter(Boolean).join('\n'),
    });
    cb.narrate(`Copy ready: "${brief.headline}" — ${brief.slots.length} content slots`);
    await pause(400);

    // ── Phase 3: Color Palette + Template Selection ──
    const { guide, designStrategy, aiTemplateId, backgroundImagePrompt, finalNeedsImage } =
        await runPalettePhase(prompt, brief, brand, abort.signal, cb);
    await pause(400);

    // ── Phase 4: Background Image FIRST (★ v737: image before template) ──
    // Must know where the subject is BEFORE picking a template layout.
    let bgResult: { hasImage: boolean; url: string | null };
    if (brand.selectedAssets?.background) {
        bgResult = { hasImage: true, url: brand.selectedAssets.background.asset.src };
        cb.narrate(`Using brand background: ${brand.selectedAssets.background.reasoning}`);
        cb.addCard('bg-image', 'Brand background', 'done', {
            expandedDetail: `Brand asset: "${brand.selectedAssets.background.asset.name}"\n${brand.selectedAssets.background.reasoning}`,
        });
    } else {
        bgResult = await generateBgImage(finalNeedsImage, backgroundImagePrompt, prompt, canvasW, canvasH, guide, abort, cb);
    }
    await pause(300);

    // ── Phase 4.5: Analyze image composition (★ v737: subject avoidance) ──
    let imageComposition: import('@/services/imageComposition').ImageComposition | null = null;
    if (bgResult.hasImage) {
        try {
            const { analyzeImageComposition } = await resilientImport(() => import('@/services/imageComposition'));
            imageComposition = analyzeImageComposition(backgroundImagePrompt ?? '', prompt);
            cb.narrate(`Image composition: subject ${imageComposition.subjectZone}, safe text zone: ${imageComposition.safeTextZone}`);
        } catch { /* best-effort */ }
    }

    // ── Phase 5: Template Layout + Render (stepper: Executing) ──
    cb.setPhase?.('executing');
    const rendered = await buildAndRender(prompt, guide, content, canvasW, canvasH, bgResult, brand.logoUrl, brand.logoW, brand.logoH, engine, abort, cb, designStrategy, aiTemplateId, brand.selectedAssets, imageComposition, brief);

    // ── Phase 6: Finalize (stepper: Finishing) ──
    // ★ Vision QA removed — deterministic quality (recolor + contrast + layout validation)
    // is more reliable and costs ZERO tokens vs. expensive post-hoc AI healing.
    cb.setPhase?.('reflecting');
    cb.addCard('finalize', 'Finalizing design', 'running');
    try { engine.reorder_by_z_index?.(); } catch { /* ok */ }
    try { engine.render_all?.(); } catch { /* ok */ }
    cb.updateCard('finalize', 'done', `${rendered} elements · Design complete`);
    cb.narrate(`Design finalized with ${rendered} elements. Style: ${guide.name}, Layout: Carbon Design System.`);

    // ── Phase 6.5: Vision QA — REMOVED (v706) ──
    // Rationale: Vision QA was producing false positives because:
    //   1. It renders via resolveConstraints() → Canvas2D (different from actual Fabric.js canvas)
    //   2. Text positioning differs → AI sees "clipping" that doesn't exist on real canvas
    //   3. Costs tokens on EVERY generation with zero corrective action
    //   4. We already have deterministic layoutValidator.ts that catches real issues
    // If re-enabled in future: must use the SAME renderer as the actual canvas.

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

// ★ scanBrandCloud, selectTemplate → agentFlowHelpers.ts
// ★ generateBgImage, selectCompositionAwareTemplate → agentFlowImageHelpers.ts

async function buildAndRender(
    prompt: string,
    guide: any, content: any, canvasW: number, canvasH: number,
    bgResult: { hasImage: boolean; url: string | null },
    brandLogoUrl: string | null, brandLogoW: number, brandLogoH: number,
    engine: FlowEngine, abort: AbortController, cb: AgentFlowCallbacks,
    designStrategy?: any,
    aiTemplateId?: string | null,
    selectedAssets?: import('@/services/brandAssetSelector').AssetSelection | null,
    imageComposition?: import('@/services/imageComposition').ImageComposition | null,
    brief?: import('@/services/designBrief').DesignBrief,
): Promise<number> {
    cb.narrate('Building the layout from template...');
    cb.addCard('build', 'Template layout engine', 'running');

    const { validateLayout } = await resilientImport(() => import('@/engine/layoutValidator'));

    // ── Template-based layout (Supabase cloud templates) ──
    const { selectTemplate: selectTmpl, processTemplateElements } = await resilientImport(() => import('./agentFlowHelpers'));
    const { resolveTemplateElements } = await resilientImport(() => import('@/services/templateResolver'));

    // ★ v737: Composition-aware template selection
    // If we have image composition info, score templates and pick best match
    let tmpl: { id: string; name: string; description: string };
    if (imageComposition && imageComposition.safeTextZone !== 'any' && imageComposition.confidence !== 'low') {
        tmpl = await selectCompositionAwareTemplate(
            prompt, canvasW, canvasH, abort, cb, aiTemplateId,
            imageComposition, selectTmpl, resolveTemplateElements,
        );
    } else {
        tmpl = await selectTmpl(prompt ?? '', canvasW, canvasH, [], abort, cb, aiTemplateId);
    }
    const rawElements: any[] = resolveTemplateElements(tmpl.id, canvasW, canvasH);

    // ★ v743: Process with brief-aware assembly — only creates slots that brief says are needed
    let allElements = await processTemplateElements(rawElements, content, guide, canvasW, canvasH, bgResult, designStrategy, brief);

    console.log(`[Pipeline/Template] Built ${allElements.length} elements from template "${tmpl.name}"`);
    cb.narrate(`Layout: Template "${tmpl.name}"`);

    allElements = allElements.filter(el => { if (el.type === 'text' && (!el.content || el.content.trim() === '')) { console.log(`[Pipeline] Removing empty text: ${el.name}`); return false; } return true; });

    const validation = validateLayout(allElements, canvasW, canvasH);
    allElements = validation.elements;

    // ★ v735: Design polish — contrast, overflow, CTA sizing auto-fix
    try {
        const { polishDesign } = await resilientImport(() => import('@/services/designPolish'));
        const bgColor = guide.colors.gradientStart ?? guide.colors.background ?? '#0B0F1A';
        const polish = polishDesign(allElements, canvasW, canvasH, bgColor);
        allElements = polish.elements;
        if (polish.fixes.length > 0) cb.narrate(`Auto-fixed ${polish.fixes.length} design issue(s)`);
    } catch { /* polish is best-effort */ }

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
            // ★ Place image then force-stretch to exact canvas dimensions.
            // We can't rely on 'fit' parameter alone because Fabric's natural
            // dimensions may differ from expected (e.g., retina scaling, SVG viewBox).
            const bgNodeId = await engine.add_image(0, 0, bgResult.url, canvasW, canvasH, 'ai_background');
            if (bgNodeId != null) {
                // Force exact canvas fill regardless of natural image dimensions
                try { engine.set_position?.(bgNodeId, 0, 0); } catch { /* ok */ }
                try { engine.set_size?.(bgNodeId, canvasW, canvasH); } catch { /* ok */ }
                try { engine.send_to_back?.(bgNodeId); } catch { /* ok */ }
                console.log(`[Pipeline] BG image ${bgNodeId} forced to ${canvasW}x${canvasH}`);
            }
            cb.narrate('Background image placed on canvas.');
            // ★ v713: Apply image filters from DesignStrategy (brightness, blur)
            const imgFilters = (allElements as any).__imageFilters;
            if (bgNodeId != null && imgFilters) {
                if (imgFilters.brightness && Math.abs(imgFilters.brightness) > 0.01) {
                    try { engine.set_brightness?.(bgNodeId, imgFilters.brightness); } catch { /* ok */ }
                }
                if (imgFilters.blur && imgFilters.blur > 0.01) {
                    try { engine.set_blur?.(bgNodeId, imgFilters.blur); } catch { /* ok */ }
                }
                console.log(`[Pipeline] BG image filters: brightness=${imgFilters.brightness}, blur=${imgFilters.blur}`);
            }
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

    // ── Brand Assets (logo + product images) ──
    const { placeBrandAssets } = await resilientImport(() => import('./agentFlowRender'));
    const brandPlaced = await placeBrandAssets(engine, canvasW, canvasH, brandLogoUrl, brandLogoW, brandLogoH, selectedAssets, cb);
    rendered += brandPlaced;

    try { engine.reorder_by_z_index?.(); } catch { /* ok */ }
    try { engine.render_all?.(); } catch { /* ok */ }

    // ★ CRITICAL: Sync rendered elements to designStore.
    // Without this, store-based tools (add_button, add_text) trigger a store→canvas
    // re-sync that wipes elements that only exist on the canvas engine.
    try {
        const { syncElementsToStore } = await resilientImport(() => import('./agentFlowStoreSync'));

        // ★ Include background image in sync — it's added separately (line 258-268)
        // and not in allElements, so store sync would miss it → canvas wipes it.
        const elementsToSync = [...allElements];
        if (bgResult.hasImage && bgResult.url) {
            elementsToSync.unshift({
                name: 'ai_background',
                type: 'image' as any,
                x: 0, y: 0, w: canvasW, h: canvasH,
                src: bgResult.url,
            });
        }

        syncElementsToStore(elementsToSync, canvasW, canvasH, {
            gradientStart: guide.colors.gradientStart,
            gradientEnd: guide.colors.gradientEnd,
            typography: guide.typography,
        });
    } catch (syncErr) {
        console.warn('[Pipeline] Store sync failed (non-critical):', syncErr);
    }

    // ★ HALLUCINATION GUARD: Verify planned elements actually rendered.
    try {
        const { verifyRender, hallucinationNarration } = await resilientImport(
            () => import('./hallucinationGuard')
        );
        const verification = verifyRender(
            allElements, rendered,
            () => engine.get_all_nodes(),
        );
        console.log(`[Pipeline/HallucinationGuard] ${verification.summary}`);
        if (!verification.passed) {
            cb.narrate(hallucinationNarration(verification));
            cb.addCard('verify-warn', 'Render verification', 'error', {
                expandedDetail: verification.summary,
            });
        }
    } catch { /* guard failure is non-blocking */ }

    return rendered;
}

// ★ renderElement, buildElementDetail, runVisionQA → extracted to agentFlowRender.ts
// ★ hexLuminance, averageLuminance → extracted to contrastHelpers.ts

