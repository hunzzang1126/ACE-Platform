// ─────────────────────────────────────────────────
// agentFlowHelpers — Brand scan + template selection
// ─────────────────────────────────────────────────
// Extracted from agentGenerateFlow.ts to keep under 400 lines.
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';
import type { AssetSelection } from '@/services/brandAssetSelector';
import { applyHarmonyColors } from './agentColorRecolorHarmony';

// ★ v739: Text layout extracted to agentTextLayout.ts — re-export for backward compat
import { recalcTextHeights, autoCreateSubheadline } from './agentTextLayout';
export { recalcTextHeights, autoCreateSubheadline };
export interface BrandScanResult {
    context: string;
    paletteHint: string;
    fontHint: string;
    assetHint: string;
    logoUrl: string | null;
    logoW: number;
    logoH: number;
    visionBlocks: any[];
    /** ★ v719: Hybrid selector result (Code + AI) */
    selectedAssets: AssetSelection | null;
}

export async function scanBrandCloud(
    prompt: string,
    canvasW: number,
    canvasH: number,
    cb: AgentFlowCallbacks,
    signal?: AbortSignal,
): Promise<BrandScanResult> {
    cb.addCard('brand-scan', 'Scanning Brand Cloud', 'running');
    const result: BrandScanResult = { context: '', paletteHint: '', fontHint: '', assetHint: '', logoUrl: null, logoW: 0, logoH: 0, visionBlocks: [], selectedAssets: null };

    try {
        const { useBrandKitStore } = await resilientImport(() => import('@/stores/brandKitStore'));
        const kit = useBrandKitStore.getState().getActiveKit();
        if (!kit) { cb.updateCard('brand-scan', 'done', 'No active brand kit'); return result; }

        result.paletteHint = [`Brand colors: primary=${kit.palette.primary}, secondary=${kit.palette.secondary}`, `accent=${kit.palette.accent}, background=${kit.palette.background}, text=${kit.palette.text}`].join(', ');
        result.fontHint = `Brand fonts: heading="${kit.typography.heading.family}", body="${kit.typography.body.family}", CTA="${kit.typography.cta.family}"`;

        const activeAssets = kit.assets.filter(a => !a.deletedAt);

        // ★ v719: Hybrid brand asset selection (Code Layer + AI Layer)
        try {
            const { selectBrandAssets } = await resilientImport(() => import('@/services/brandAssetSelector'));
            const selection = await selectBrandAssets(prompt, activeAssets, result.context, canvasW, canvasH, signal);
            result.selectedAssets = selection;

            // Logo decided by selector (replaces legacy keyword matching)
            if (selection.logo) {
                result.logoUrl = selection.logo.src;
                result.logoW = selection.logo.width;
                result.logoH = selection.logo.height;
            }

            // Build UI summary
            const usedParts: string[] = [];
            const skippedParts: string[] = [];
            if (selection.logo) usedParts.push(`Logo: ${selection.logo.name}`);
            if (selection.background) usedParts.push(`BG: ${selection.background.reasoning}`);
            for (const p of selection.productImages) usedParts.push(`Product: ${p.reasoning}`);
            if (selection.needsGeneratedBackground) usedParts.push('BG: AI will generate');
            for (const s of selection.skippedAssets) skippedParts.push(`Skip: ${s.asset.name} (${s.reasoning})`);

            const summary = `${usedParts.length} selected, ${skippedParts.length} skipped`;
            cb.updateCard('brand-scan', 'done', `${kit.name}: ${summary}`, {
                expandedDetail: [...usedParts, ...skippedParts, '', result.context].filter(Boolean).join('\n'),
            });

            // ★ v725: Conversational narration — tell user WHAT was found, not just counts
            const narrateParts: string[] = [];
            if (selection.logo) {
                narrateParts.push(`Found logo "${selection.logo.name}" in Brand Cloud — using it in the design.`);
            }
            if (selection.background) {
                narrateParts.push(`Found background "${selection.background.asset.name}" — applying as canvas background.`);
            }
            for (const p of selection.productImages) {
                narrateParts.push(`Found product image "${p.asset.name}" — placing on canvas.`);
            }
            if (narrateParts.length === 0 && activeAssets.length > 0) {
                narrateParts.push(`Scanned Brand Cloud "${kit.name}" — no matching assets for this design.`);
            }
            if (selection.needsGeneratedBackground && !selection.background) {
                narrateParts.push('No brand background found — AI will generate one.');
            }
            cb.narrate(narrateParts.join('\n'));
        } catch (selErr) {
            console.warn('[BrandScan] Asset selector failed, falling back to legacy:', selErr);
            // Fallback to legacy logo detection
            const logoAssets = activeAssets.filter(a => a.category === 'logo');
            if (logoAssets.length > 0) {
                const logo = logoAssets[0]!;
                result.logoUrl = logo.src; result.logoW = logo.width; result.logoH = logo.height;
            }
            cb.updateCard('brand-scan', 'done', `${kit.name}: ${activeAssets.length} asset(s)`, { expandedDetail: result.context });
            if (logoAssets.length > 0) {
                cb.narrate(`Found logo "${logoAssets[0]!.name}" in Brand Cloud — using it in the design.`);
            } else {
                cb.narrate(`Scanned Brand Cloud "${kit.name}" — ${activeAssets.length} asset(s) found.`);
            }
        }

        try {
            const { buildBrandVisionBlocks } = await resilientImport(() => import('@/services/brandContextBuilder'));
            result.visionBlocks = buildBrandVisionBlocks(kit);
            if (result.visionBlocks.length > 0) cb.narrate(`AI can now visually see ${Math.floor(result.visionBlocks.length / 2)} brand asset(s).`);
        } catch { /* optional */ }
    } catch {
        cb.updateCard('brand-scan', 'done', 'Brand Cloud scan skipped');
    }
    return result;
}

export async function selectTemplate(
    prompt: string, canvasW: number, canvasH: number,
    _brandVisionBlocks: any[], _abort: AbortController,
    cb: AgentFlowCallbacks, aiTemplateId?: string | null,
    brief?: import('@/services/designBrief').DesignBrief,
) {
    cb.narrate(`Selecting layout template for ${canvasW}×${canvasH}...`);
    cb.addCard('structure', 'Selecting layout template', 'running');

    const { useTemplateStore } = await resilientImport(() => import('@/stores/templateStore'));
    const allTemplates = useTemplateStore.getState().templates ?? [];

    if (allTemplates.length === 0) throw new Error('No templates available in store');

    // ★ v734: AI-selected template takes priority
    if (aiTemplateId) {
        const aiPicked = allTemplates.find(t => t.id === aiTemplateId);
        if (aiPicked) {
            const template = { id: aiPicked.id, name: aiPicked.name, description: aiPicked.description ?? '' };
            cb.updateCard('structure', 'done', template.name, {
                reasoning: 'AI Creative Director selected this template',
                expandedDetail: `Template: ${template.name}\nID: ${template.id}\nSelected by AI based on prompt analysis`,
            });
            cb.narrate(`AI selected template "${template.name}"`);
            return template;
        }
        console.warn(`[selectTemplate] AI-chosen template "${aiTemplateId}" not found in store, falling back to keyword match`);
    }

    // ★ v745: Slot-aware + mood/industry + keyword matching
    const promptLower = prompt.toLowerCase();
    const promptWords = promptLower.split(/\s+/);
    const slotCount = brief?.slots.length ?? 4;

    let bestTemplate = allTemplates[0]!;
    let bestScore = 0;

    for (const tmpl of allTemplates) {
        const nameWords = (tmpl.name || '').toLowerCase().split(/[\s\-_]+/);
        const descWords = (tmpl.description || '').toLowerCase().split(/[\s\-_]+/);
        const allWords = [...nameWords, ...descWords];
        let score = 0;

        // Keyword matching
        for (const word of allWords) {
            if (word.length < 3) continue;
            if (promptLower.includes(word)) score += 2;
            if (promptWords.some(pw => pw.includes(word) || word.includes(pw))) score += 1;
        }
        const tags = (tmpl as any).tags ?? [];
        for (const tag of tags) { if (promptLower.includes(tag.toLowerCase())) score += 3; }

        // ★ v745: Mood/Industry tag matching
        if (brief) {
            for (const tag of tags) {
                const tl = tag.toLowerCase();
                if (tl === brief.mood) score += 5;
                if (tl === brief.industry) score += 5;
            }
        }

        // ★ v745: Text density matching
        const tmplDesc = (tmpl.description || '').toLowerCase();
        if (brief?.textDensity === 'minimal' && tmplDesc.includes('minimal')) score += 4;
        if (brief?.textDensity === 'dense' && tmplDesc.includes('detail')) score += 4;

        // ★ v745: Penalize slot-count mismatch
        const tmplElementCount = (tmpl as any).elements?.length ?? 0;
        if (slotCount <= 2 && tmplElementCount > 8) score -= 3;
        if (slotCount >= 4 && tmplElementCount < 4) score -= 3;

        if (score > bestScore) { bestScore = score; bestTemplate = tmpl; }
    }

    const template = { id: bestTemplate.id, name: bestTemplate.name, description: bestTemplate.description ?? '' };
    const method = bestScore > 0 ? `Matched (score: ${bestScore}, slots: ${slotCount})` : 'Default template (no match)';
    cb.updateCard('structure', 'done', template.name, {
        reasoning: method,
        expandedDetail: `Template: ${template.name}\nID: ${template.id}\n${method}`,
    });
    cb.narrate(`Selected "${template.name}" — ${method}`);
    return template;
}

// ★ v739: recalcTextHeights, estimateTextHeight, autoCreateSubheadline → agentTextLayout.ts


// ★ v745: applyHarmonyColors → agentColorRecolorHarmony.ts


/** Process template elements: BG handling, content injection, font, colors.
 * ★ v743: Content-First — uses brief.slots to decide which text elements to keep.
 * Elements for slots NOT in brief.slots are REMOVED, not filled with placeholders.
 */
export async function processTemplateElements(
    elements: any[], content: any, guide: any,
    canvasW: number, canvasH: number,
    bgResult: { hasImage: boolean; url: string | null },
    designStrategy?: any,
    brief?: import('@/services/designBrief').DesignBrief,
): Promise<any[]> {
    let allElements = [...elements];
    const activeSlots = new Set(brief?.slots ?? ['headline', 'subheadline', 'cta', 'tag']);

    // ★ v737: Analyze background for gradient/solid path (harmony colors)
    const { analyzeBackground, deriveHarmonyPalette } = await resilientImport(() => import('@/services/colorHarmony'));
    const bgAnalysis = analyzeBackground(guide.colors.gradientStart ?? guide.colors.background ?? '#0B0F1A', guide.colors.gradientEnd ?? guide.colors.gradientStart ?? '#0B0F1A');
    const harmony = deriveHarmonyPalette(bgAnalysis, { accent: guide.colors.accent ?? '#3b82f6', foreground: guide.colors.foreground ?? '#FFFFFF', secondary: guide.colors.secondary ?? '#CCCCCC' });

    if (bgResult.hasImage && bgResult.url) {
        // ★ v750: Area-based rect stripping + harmony text colors + strong shadow
        const { stripCoveringRects, styleTextForImage, recolorCtaShapes } = await resilientImport(() => import('./agentImageOverlay'));
        allElements = stripCoveringRects(allElements, canvasW, canvasH);
        styleTextForImage(allElements, harmony, guide);
        recolorCtaShapes(allElements, harmony);
    } else {
        const { recolorTemplateElements } = await resilientImport(() => import('./agentColorRecolor'));
        allElements = recolorTemplateElements(allElements, guide);
        applyHarmonyColors(allElements, harmony);
        if (harmony.needsShadow) {
            for (const el of allElements) {
                if (el.type === 'text') {
                    el.shadow_blur = el.shadow_blur ?? 8;
                    el.shadow_offset_y = el.shadow_offset_y ?? 2;
                    el.shadow_opacity = el.shadow_opacity ?? 0.5;
                }
            }
        }
    }

    // ★ v743: Content-First assembly — slot-based, not name-matching.
    // 1. Classify each text element by role (name or font_size inference)
    // 2. If the role's slot is in brief.slots → inject content
    // 3. If the role's slot is NOT in brief.slots → REMOVE the element
    // 4. No placeholders ever survive.
    const textEls = allElements.filter(el => el.type === 'text');

    // Classify elements into roles
    type Role = 'headline' | 'subheadline' | 'cta' | 'tag' | 'unknown';
    const roleMap = new Map<any, Role>();

    for (const el of textEls) {
        const name = (el.name ?? '').toLowerCase();
        if (name.includes('headline') && !name.includes('sub')) roleMap.set(el, 'headline');
        else if (name.includes('sub') || name.includes('body') || name.includes('description') || name.includes('detail') || name.includes('tagline')) roleMap.set(el, 'subheadline');
        else if (/\bcta\b/.test(name) || /\blabel\b/.test(name) || name.includes('button')) roleMap.set(el, 'cta');
        else if (name.includes('tag') || name.includes('badge') || name.includes('date')) roleMap.set(el, 'tag');
        else roleMap.set(el, 'unknown');
    }

    // Font-size inference for unknowns
    const unknowns = textEls.filter(el => roleMap.get(el) === 'unknown');
    if (unknowns.length > 0) {
        const sorted = [...unknowns].sort((a, b) => (b.font_size ?? 0) - (a.font_size ?? 0));
        const unfilledRoles: Role[] = (['headline', 'subheadline', 'tag', 'cta'] as Role[])
            .filter(r => !textEls.some(el => roleMap.get(el) === r));
        for (const el of sorted) {
            const role = unfilledRoles.shift();
            if (role) {
                roleMap.set(el, role);
                console.log(`[Pipeline] Role-inferred: "${el.name}" → ${role} (font=${el.font_size})`);
            }
        }
    }

    // Inject content OR remove element based on brief.slots
    const contentByRole: Record<string, string> = {
        headline: content.headline ?? '',
        subheadline: content.subheadline ?? '',
        cta: content.cta ?? '',
        tag: content.tag ?? '',
    };

    const toRemove = new Set<any>();
    for (const el of textEls) {
        const role = roleMap.get(el) ?? 'unknown';
        if (role === 'unknown') {
            // Unknown element with no role assignment → remove
            console.log(`[Pipeline] Removing unclassified text: "${el.name}"`);
            toRemove.add(el);
            continue;
        }
        if (!activeSlots.has(role) || !contentByRole[role]) {
            // Slot not needed → remove element entirely (no placeholder!)
            console.log(`[Pipeline] Removing unused slot "${role}": "${el.name}"`);
            toRemove.add(el);
            continue;
        }
        // Slot is active → inject content
        el.content = contentByRole[role];
    }
    // Also remove shape elements tied to removed roles (CTA button bg, tag bg)
    for (const el of allElements) {
        if (el.type === 'text') continue;
        const name = (el.name ?? '').toLowerCase();
        if ((/\bcta\b/.test(name) || name.includes('button')) && !activeSlots.has('cta')) {
            console.log(`[Pipeline] Removing CTA shape: "${el.name}"`);
            toRemove.add(el);
        }
        if ((name.includes('tag') || name.includes('badge')) && !activeSlots.has('tag')) {
            console.log(`[Pipeline] Removing tag shape: "${el.name}"`);
            toRemove.add(el);
        }
    }
    allElements = allElements.filter(el => !toRemove.has(el));

    // ★ v736: Preserve template fonts — they ARE the design
    for (const el of allElements) {
        if (el.type !== 'text') continue;
        const role = roleMap.get(el);
        if (!el.font_family) {
            if (role === 'headline') el.font_family = guide.typography.primaryFont;
            else el.font_family = guide.typography.secondaryFont;
        }
        if (role === 'headline') {
            el.letter_spacing = el.letter_spacing ?? -0.5;
            el.line_height = el.line_height ?? 1.1;
            el.font_weight = el.font_weight ?? '800';
            // ★ v745: HeadlineLines-aware font sizing
            // Multi-line headlines need smaller font to avoid overflow
            if (brief && brief.headlineLines > 1 && el.font_size) {
                const lineScale = brief.headlineLines === 2 ? 0.85 : brief.headlineLines >= 3 ? 0.7 : 1;
                el.font_size = Math.round(el.font_size * lineScale);
            }
        } else if (role === 'subheadline') {
            el.letter_spacing = el.letter_spacing ?? 0;
            el.line_height = el.line_height ?? 1.35;
            el.font_weight = el.font_weight ?? '400';
        } else if (role === 'tag') {
            el.letter_spacing = el.letter_spacing ?? 2;
            el.font_weight = el.font_weight ?? '600';
        }
    }

    // ★ v745: Apply textHierarchy opacity from designStrategy
    if (designStrategy?.textHierarchy) {
        const th = designStrategy.textHierarchy;
        for (const el of allElements) {
            if (el.type !== 'text') continue;
            const role = roleMap.get(el);
            if (role === 'headline') el.opacity = el.opacity ?? th.headlineOpacity;
            else if (role === 'subheadline') el.opacity = el.opacity ?? th.subheadlineOpacity;
        }
    }

    // Auto-create subheadline if brief says we need one but template doesn't have it
    if (activeSlots.has('subheadline') && content.subheadline) {
        const hasSub = allElements.some((el: any) =>
            el.type === 'text' && roleMap.get(el) === 'subheadline'
        );
        if (!hasSub) autoCreateSubheadline(allElements, content, canvasW, canvasH);
    }

    recalcTextHeights(allElements, canvasH);

    return allElements;
}
