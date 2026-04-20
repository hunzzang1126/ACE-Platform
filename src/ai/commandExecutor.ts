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

                // ★ Try engine first (visual update on canvas editor)
                let engineUpdated = 0;
                if (engine?.get_all_nodes && engine?.set_text_content) {
                    try {
                        const nodes = JSON.parse(engine.get_all_nodes() ?? '[]');
                        const nodeNames = nodes.map((n: any) => `"${n.name}" (type=${n.type}, id=${n.id})`);
                        console.log(`[update_element_text] Looking for "${elementName}" among ${nodes.length} nodes: ${nodeNames.join(', ')}`);
                        for (const node of nodes) {
                            const nodeName = (node.name ?? '').toLowerCase();
                            if (nodeName.includes(elementName) && (node.type === 'text' || node.content !== undefined)) {
                                console.log(`[update_element_text] ✓ Match: "${node.name}" (id=${node.id}) → "${newText.slice(0, 30)}"`);
                                engine.set_text_content(node.id, newText);
                                engineUpdated++;
                            }
                        }
                        if (engineUpdated === 0) {
                            console.warn(`[update_element_text] ✗ No match for "${elementName}". Available: ${nodeNames.join(', ')}`);
                        }
                    } catch (e) { console.warn('[update_element_text] Engine update failed:', e); }
                }

                // ★ Also update store (for persistence + size dashboard sync)
                const storeResult = await executeDesignCommand('update_element_text', params);
                if (engineUpdated > 0) {
                    return { success: true, message: `Updated text to "${newText}" on ${engineUpdated} element(s) matching "${params.element_name}" (canvas + store).` };
                }
                // Fallback: if no engine, store-only result
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
                                if (property === 'color' && engine.set_fill_hex) { engine.set_fill_hex(node.id, rawValue); engineUpdated++; }
                                else if (property === 'fontSize' && engine.set_font_size) { engine.set_font_size(node.id, Number(rawValue)); engineUpdated++; }
                                else if (property === 'opacity' && engine.set_opacity) { engine.set_opacity(node.id, Number(rawValue)); engineUpdated++; }
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
