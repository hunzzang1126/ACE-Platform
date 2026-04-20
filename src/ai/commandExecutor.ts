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
