// ─────────────────────────────────────────────────
// Command Executor v2 — Slim Router (7 tools only)
// ─────────────────────────────────────────────────
// Routes only the 7 essential tools:
//   generate_image, replace_background_image, generate_full_design,
//   fill_to_page, add_text, add_button, execute_dynamic_action, analyze_scene
// All other operations go through execute_dynamic_action (eval).

import type { SceneNodeInfo } from './agentContext';
import type { Engine, ExecutionResult } from './executorHelpers';
import { generateImage } from '@/services/imageGenClient';
import type { ImageGenResult } from '@/services/imageGenClient';
import { analyzeScene } from './executorCompound';
import { executeDesignCommand } from './executors/designExecutor';

// Re-export types for consumers
export type { ExecutionResult } from './executorHelpers';

/**
 * Apply a property change to a Fabric canvas node via the engine shim.
 * Returns true if the engine method existed and was called.
 */
function applyPropertyToEngine(engine: Engine, nodeId: number, property: string, rawValue: string): boolean {
    const numVal = Number(rawValue);
    switch (property) {
        // ── Color ──
        case 'color':
        case 'fill':
        case 'backgroundColor':
            if (engine.set_fill_hex) { engine.set_fill_hex(nodeId, rawValue); return true; }
            return false;

        // ── Typography ──
        case 'fontSize':
            if (engine.set_font_size) { engine.set_font_size(nodeId, numVal); return true; }
            return false;
        case 'fontFamily':
            if (engine.set_font_family) { engine.set_font_family(nodeId, rawValue); return true; }
            return false;
        case 'fontWeight':
            if (engine.set_font_weight) { engine.set_font_weight(nodeId, numVal); return true; }
            return false;

        // ── Transform ──
        case 'x':
            if (engine.set_position) { engine.set_position(nodeId, numVal, -1); return true; }
            return false;
        case 'y':
            if (engine.set_position) { engine.set_position(nodeId, -1, numVal); return true; }
            return false;
        case 'width':
        case 'w':
            if (engine.set_size) { engine.set_size(nodeId, numVal, -1); return true; }
            return false;
        case 'height':
        case 'h':
            if (engine.set_size) { engine.set_size(nodeId, -1, numVal); return true; }
            return false;
        case 'angle':
        case 'rotation':
            if (engine.set_angle) { engine.set_angle(nodeId, numVal); return true; }
            return false;

        // ── Visual ──
        case 'opacity':
            if (engine.set_opacity) { engine.set_opacity(nodeId, numVal); return true; }
            return false;

        default:
            console.log(`[applyPropertyToEngine] No engine handler for "${property}" — store-only update`);
            return false;
    }
}

/**
 * Execute a single tool call.
 * Only handles the 7 essential tools — everything else is eval.
 */
export async function executeToolCall(
    engine: Engine,
    toolName: string,
    params: Record<string, unknown>,
    trackedNodes: SceneNodeInfo[],
): Promise<ExecutionResult> {
    // Helper
    const str = (key: string, fallback = ''): string => {
        const v = params[key];
        return typeof v === 'string' ? v : fallback;
    };
    const num = (key: string, fallback = 0): number => {
        const v = params[key];
        if (v === undefined || v === null) return fallback;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };

    try {
        switch (toolName) {

            // ── Image Generation ─────────────────────
            case 'generate_image': {
                const prompt = str('prompt', 'abstract background');
                const style = str('style', 'photography') as 'realistic' | 'illustration' | 'abstract' | 'minimal' | 'photography';
                const canvasW = engine?.canvas_width?.() ?? 300;
                const canvasH = engine?.canvas_height?.() ?? 250;
                let result: ImageGenResult;
                try {
                    result = await generateImage({
                        prompt: `${prompt}. No text, no logos, no watermarks. Professional quality.`,
                        width: canvasW,
                        height: canvasH,
                        model: 'flux',
                        style,
                        negativePrompt: 'text, logos, watermark, low quality, blurry',
                    });
                } catch (err) {
                    return { success: false, message: `Image generation failed: ${err}` };
                }
                if (!result.success) {
                    return { success: false, message: result.message };
                }

                // ★ Auto-place on canvas (fill to page as background)
                let nodeId: number | undefined;
                if (engine?.add_image) {
                    try {
                        nodeId = await engine.add_image(0, 0, result.imageUrl, canvasW, canvasH, 'ai_generated');
                        if (engine.send_to_back) engine.send_to_back(nodeId);
                    } catch { /* placement failed — still return URL */ }
                }

                // ★ Register in upload library
                try {
                    const { saveToUploadLibrary } = await import('@/stores/uploadStore');
                    await saveToUploadLibrary(result.imageUrl, `AI Image`, canvasW, canvasH, 'ai');
                } catch { /* upload library registration failed — non-critical */ }

                return {
                    success: true,
                    message: `Image generated and placed on canvas (${canvasW}x${canvasH}) via ${result.model}`,
                    data: { image_url: result.imageUrl, nodeId },
                };
            }

            // ── Replace Background ───────────────────
            case 'replace_background_image': {
                if (!engine?.add_image) return { success: false, message: 'Canvas engine not available' };
                const prompt = str('prompt');
                if (!prompt) return { success: false, message: 'No prompt provided' };
                const style = str('style', 'photography') as 'realistic' | 'illustration' | 'abstract' | 'minimal' | 'photography';
                const canvasW = engine.canvas_width?.() ?? 300;
                const canvasH = engine.canvas_height?.() ?? 250;

                // Delete existing background
                try {
                    const allNodes = JSON.parse(engine.get_all_nodes?.() ?? '[]');
                    for (const node of allNodes) {
                        const name = (node.name ?? node.label ?? '').toLowerCase();
                        if (name.includes('background') || name.includes('bg')) {
                            try { engine.delete_node?.(node.id); } catch { /* ok */ }
                        }
                    }
                } catch { /* no existing bg */ }

                // Generate new
                try {
                    const genResult = await generateImage({
                        prompt: `${prompt}. Background for premium ad. No text, no logos. Cinematic lighting.`,
                        width: canvasW,
                        height: canvasH,
                        model: 'imagen',
                        style,
                        negativePrompt: 'text, logos, watermark, low quality, blurry',
                    });
                    if (!genResult.success || !genResult.imageUrl) {
                        return { success: false, message: `Image generation failed: ${genResult.message}` };
                    }
                    const nodeId = await engine.add_image(0, 0, genResult.imageUrl, canvasW, canvasH, 'ai_background');
                    if (engine.send_to_back) engine.send_to_back(nodeId);
                    return { success: true, message: `Background replaced (${canvasW}x${canvasH})`, nodeId };
                } catch (err) {
                    return { success: false, message: `Background replacement failed: ${err}` };
                }
            }

            // ── Fill to Page ─────────────────────────
            case 'fill_to_page': {
                const nodeId = params.node_id != null ? num('node_id') : undefined;
                if (!engine?.fill_to_page) {
                    return { success: false, message: 'fill_to_page not available' };
                }
                engine.fill_to_page(nodeId);
                const canvasW = engine.canvas_width?.() ?? 300;
                const canvasH = engine.canvas_height?.() ?? 250;
                return { success: true, message: `Image filled to page (${canvasW}x${canvasH})`, nodeId };
            }

            // ── Full Design Pipeline ─────────────────
            case 'generate_full_design': {
                // Intercepted by useUnifiedAgent at a higher level
                return { success: false, message: 'generate_full_design is handled by the agent orchestrator.' };
            }

            // ── Analyze Scene ─────────────────────────
            case 'analyze_scene': {
                const result = analyzeScene(trackedNodes);
                return { success: true, message: result };
            }

            // ── Update Element Text (engine + store) ─────
            case 'update_element_text': {
                const elementName = (params.element_name as string || '').toLowerCase();
                const newText = params.new_text as string;
                if (!elementName || newText === undefined) return { success: false, message: 'element_name and new_text are required.' };

                // ★ DIAGNOSTIC: Log engine state
                console.log(`[update_element_text] ▶ element="${elementName}" newText="${newText.slice(0, 40)}"`);
                console.log(`[update_element_text] engine exists: ${!!engine}, get_all_nodes: ${!!engine?.get_all_nodes}, set_text_content: ${!!engine?.set_text_content}`);

                // ★ Read canvas text BEFORE store update (to know old content)
                let canvasTextBefore: { id: number; name: string; content: string; fontSize: number }[] = [];
                if (engine?.get_all_nodes) {
                    try {
                        const raw = engine.get_all_nodes() ?? '[]';
                        const nodes = JSON.parse(raw);
                        console.log(`[update_element_text] Canvas has ${nodes.length} total nodes`);
                        canvasTextBefore = nodes
                            .filter((n: any) => n.type === 'text' || n.content !== undefined)
                            .map((n: any) => ({ id: n.id, name: n.name ?? '', content: (n.content ?? '').trim(), fontSize: n.fontSize ?? 0 }));
                        console.log(`[update_element_text] ${canvasTextBefore.length} text nodes: ${canvasTextBefore.map(n => `"${n.name}"(id=${n.id})`).join(', ')}`);
                    } catch (e) { console.error('[update_element_text] get_all_nodes FAILED:', e); }
                } else {
                    console.warn('[update_element_text] ⚠ NO ENGINE — canvas update impossible!');
                }

                // ★ Update store (all variants)
                const storeResult = await executeDesignCommand('update_element_text', params);

                // ★ Visual update on canvas
                let engineUpdated = 0;
                if (engine?.set_text_content && canvasTextBefore.length > 0) {
                    // Pass 1: name-based matching (fast path)
                    for (const node of canvasTextBefore) {
                        if (node.name.toLowerCase().includes(elementName)) {
                            console.log(`[update_element_text] ✓ Name match: "${node.name}" (id=${node.id})`);
                            engine.set_text_content(node.id, newText);
                            engineUpdated++;
                        }
                    }

                    // Pass 2: store→canvas content sync (robust fallback)
                    // Find which store element was updated, then match to canvas by OLD content
                    if (engineUpdated === 0) {
                        console.warn(`[update_element_text] ✗ Name match failed. Using store→canvas sync...`);
                        try {
                            const { useDesignStore } = await import('@/stores/designStore');
                            const cs = useDesignStore.getState().creativeSet;
                            if (cs) {
                                const master = cs.variants.find(v => v.id === cs.masterVariantId);
                                if (master) {
                                    // Find the store element that was just updated
                                    const updatedStoreEls = master.elements.filter((e: any) =>
                                        e.name.toLowerCase().includes(elementName) &&
                                        (e.type === 'text' || e.type === 'button') &&
                                        ((e as any).content === newText || (e as any).label === newText)
                                    );
                                    for (const storeEl of updatedStoreEls) {
                                        // Find canvas node: same name OR only text node with non-matching content
                                        let matched = canvasTextBefore.find(cn =>
                                            cn.name.toLowerCase() === storeEl.name.toLowerCase() && cn.content !== newText.trim()
                                        );
                                        // Broader: any canvas node whose name partially matches
                                        if (!matched) {
                                            matched = canvasTextBefore.find(cn => {
                                                const cnLow = cn.name.toLowerCase();
                                                const seLow = storeEl.name.toLowerCase();
                                                return (cnLow.includes(seLow) || seLow.includes(cnLow)) && cn.content !== newText.trim();
                                            });
                                        }
                                        // Last resort: match by font size similarity (±30%)
                                        if (!matched && (storeEl as any).fontSize) {
                                            const seFontSize = (storeEl as any).fontSize;
                                            matched = canvasTextBefore.find(cn =>
                                                cn.content !== newText.trim() &&
                                                cn.fontSize > 0 &&
                                                Math.abs(cn.fontSize - seFontSize) / seFontSize < 0.3
                                            );
                                        }
                                        if (matched) {
                                            console.log(`[update_element_text] ✓ Store→Canvas sync: store="${storeEl.name}" → canvas="${matched.name}" (id=${matched.id})`);
                                            engine.set_text_content(matched.id, newText);
                                            engineUpdated++;
                                            // Remove from candidates so we don't double-match
                                            canvasTextBefore = canvasTextBefore.filter(cn => cn.id !== matched!.id);
                                        }
                                    }
                                }
                            }
                        } catch (e) { console.warn('[update_element_text] Store→Canvas sync failed:', e); }
                    }

                    if (engineUpdated === 0) {
                        const available = canvasTextBefore.map(n => `"${n.name}" (id=${n.id})`).join(', ');
                        console.warn(`[update_element_text] ✗ No match at all for "${elementName}". Canvas nodes: ${available}`);
                    }
                }

                if (engineUpdated > 0) {
                    return { success: true, message: `Updated text to "${newText}" on ${engineUpdated} element(s) matching "${params.element_name}" (canvas + store).` };
                }
                return storeResult ?? { success: false, message: `No element matching "${params.element_name}" found.` };
            }

            // ── Update Element Property (engine + store) ──
            case 'update_element_property': {
                const elementName = (params.element_name as string || '').toLowerCase();
                const property = params.property as string;
                const rawValue = params.value as string;
                if (!elementName || !property) return { success: false, message: 'element_name and property are required.' };

                // ★ Try engine first (visual update)
                let engineUpdated = 0;
                if (engine?.get_all_nodes) {
                    try {
                        const nodes = JSON.parse(engine.get_all_nodes() ?? '[]');
                        for (const node of nodes) {
                            if ((node.name ?? '').toLowerCase().includes(elementName)) {
                                const updated = applyPropertyToEngine(engine, node.id, property, rawValue);
                                if (updated) engineUpdated++;
                            }
                        }
                    } catch (e) { console.warn('[update_element_property] Engine update failed:', e); }
                }

                // ★ Also update store
                const storeResult = await executeDesignCommand('update_element_property', params);
                if (engineUpdated > 0) {
                    return { success: true, message: `Set "${property}" = "${rawValue}" on ${engineUpdated} element(s) matching "${params.element_name}" (canvas + store).` };
                }
                return storeResult ?? { success: false, message: `No element matching "${params.element_name}" found.` };
            }

            // ── Design Store Commands ────────────────
            // add_text, add_button, execute_dynamic_action
            // + any remaining store-based commands
            default: {
                const designResult = await executeDesignCommand(toolName, params);
                if (designResult !== null) return designResult;
                return { success: false, message: `Unknown tool: "${toolName}". Use execute_dynamic_action for custom operations.` };
            }
        }
    } catch (err) {
        return { success: false, message: `Error executing ${toolName}: ${err}` };
    }
}
