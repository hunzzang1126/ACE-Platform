// ─────────────────────────────────────────────────
// agentPipeline.ts — Planner → Executor → Critic
// ─────────────────────────────────────────────────
// Orchestrates the 3-agent design pipeline:
//
//  1. Planner: user prompt → DesignPlan
//  2. Executor: DesignPlan → tool calls on canvas
//  3. Critic (dual-layer):
//     a. Structural: math-based (overlap, spacing, clipping)
//     b. Visual (NEW): screenshot → Claude Vision → quality check
//     c. Combined score = structural * 0.4 + visual * 0.6
//  4. If score < 82: apply fixes → re-critique (max 2 rounds)
//
// The Vision QA Loop gives the AI "eyes" — it can now SEE
// the canvas and self-correct visual issues that math can't detect.
// ─────────────────────────────────────────────────

import { runPlanner } from './plannerAgent';
import { runExecutor, applyFixPatches } from './executorAgent';
import { runStructuralCritic, runVisionCritic } from './criticAgent';
import { buildSceneGraph } from '@/services/sceneGraphBuilder';
import { captureCanvas } from '@/services/visionService';
import type { ToolContext } from '@/services/tools/toolTypes';
import type { BrandKit } from '@/stores/brandKitStore';
import type { SceneGraph } from '@/services/sceneGraphBuilder';
import type { BannerVariant, CreativeSet } from '@/schema/design.types';
import type { PipelineResult, DesignPlan, AgentStep, ProgressCallback, CriticResult } from './agentTypes';

const MAX_CRITIC_ROUNDS = 2;
const PASS_SCORE = 82;

/**
 * Enable Vision QA in the critic loop.
 * When true, captures a canvas screenshot after each round and sends
 * it to Claude Vision for visual quality analysis.
 *
 * The combined score blends structural (40%) + visual (60%),
 * because visual issues (contrast, balance, readability) are
 * more impactful to end-user perception than pure geometry.
 *
 * Set to false to skip Vision API calls (saves cost, faster).
 */
const VISION_QA_ENABLED = true;

/** Weight for structural score in combined scoring */
const STRUCTURAL_WEIGHT = 0.4;
/** Weight for visual score in combined scoring */
const VISUAL_WEIGHT = 0.6;

// ── Get Current Scene Graph ──

function getCurrentSceneGraph(ctx: ToolContext): SceneGraph | null {
    const cs = ctx.designActions.getCreativeSet() as CreativeSet | null;
    if (!cs || !ctx.activeVariantId) return null;
    const variant = cs.variants.find(v => v.id === ctx.activeVariantId);
    if (!variant) return null;
    return buildSceneGraph(variant as BannerVariant);
}

// ── Main Pipeline ──

export async function runAgentPipeline(
    userPrompt: string,
    ctx: ToolContext,
    brandKit: BrandKit | null,
    signal: AbortSignal,
    onProgress?: ProgressCallback,
): Promise<PipelineResult> {
    const pipelineStart = Date.now();
    const steps: AgentStep[] = [];
    let plan: DesignPlan | null = null;

    try {
        // ═══════════════════════════════════════
        // STEP 1: PLANNER
        // ═══════════════════════════════════════
        const planStart = Date.now();
        const existingGraph = getCurrentSceneGraph(ctx);

        plan = await runPlanner(
            userPrompt,
            ctx.canvasW, ctx.canvasH,
            brandKit,
            existingGraph,
            signal,
            onProgress,
        );

        steps.push({
            agent: 'planner',
            action: `Planned ${plan.elements.length} elements`,
            output: { elementCount: plan.elements.length, description: plan.description },
            duration: Date.now() - planStart,
            timestamp: new Date().toISOString(),
        });

        // ═══════════════════════════════════════
        // STEP 2: EXECUTOR
        // ═══════════════════════════════════════
        const execStart = Date.now();

        const toolResults = await runExecutor(plan, ctx, signal, onProgress);

        const succeeded = toolResults.filter(r => r.success).length;
        steps.push({
            agent: 'executor',
            action: `Executed ${succeeded}/${plan.elements.length} tools`,
            output: { succeeded, failed: plan.elements.length - succeeded },
            duration: Date.now() - execStart,
            timestamp: new Date().toISOString(),
        });

        // ═══════════════════════════════════════
        // STEP 3: DUAL-LAYER CRITIC (with fix loop)
        //   3a. Structural — math-based geometry checks
        //   3b. Visual — screenshot → Claude Vision
        //   3c. Combined score = structural * 0.4 + visual * 0.6
        // ═══════════════════════════════════════
        let criticResult: CriticResult | null = null;
        let iterationCount = 0;

        for (let round = 0; round < MAX_CRITIC_ROUNDS; round++) {
            if (signal.aborted) break;
            iterationCount++;

            const criticStart = Date.now();
            const sceneGraph = getCurrentSceneGraph(ctx);
            if (!sceneGraph) break;

            // ── 3a. Structural Critic (instant, no API) ──
            onProgress?.(`Structural check (round ${round + 1})...`, 'critic');
            const structuralResult = runStructuralCritic(sceneGraph, brandKit);

            // ── 3b. Visual Critic (screenshot → Vision API) ──
            let visualScore: number | null = null;
            if (VISION_QA_ENABLED && !signal.aborted) {
                onProgress?.('Capturing canvas for visual analysis...', 'critic');

                const screenshot = captureCanvas();
                if (screenshot) {
                    onProgress?.('Analyzing design with AI Vision...', 'critic');
                    try {
                        const visionResult = await runVisionCritic(
                            screenshot, sceneGraph, brandKit, signal, onProgress,
                        );
                        visualScore = visionResult.score;

                        // Merge vision issues into structural issues
                        // (deduplication by checking for similar descriptions)
                        const existingDescs = new Set(
                            structuralResult.issues.map(i => i.description.toLowerCase()),
                        );
                        for (const issue of visionResult.issues) {
                            if (!existingDescs.has(issue.description.toLowerCase())) {
                                structuralResult.issues.push(issue);
                            }
                        }
                    } catch (err) {
                        console.warn('[Pipeline] Vision critic failed, using structural only:', err);
                    }
                }
            }

            // ── 3c. Combined Score ──
            const combinedScore = visualScore !== null
                ? Math.round(structuralResult.score * STRUCTURAL_WEIGHT + visualScore * VISUAL_WEIGHT)
                : structuralResult.score;

            criticResult = {
                ...structuralResult,
                score: combinedScore,
                pass: combinedScore >= PASS_SCORE,
            };

            const scoreBreakdown = visualScore !== null
                ? `Combined: ${combinedScore}/100 (structural: ${structuralResult.score}, visual: ${visualScore})`
                : `Structural: ${combinedScore}/100`;

            steps.push({
                agent: 'critic',
                action: `${scoreBreakdown}, ${criticResult.issues.length} issues`,
                output: {
                    score: criticResult.score,
                    structuralScore: structuralResult.score,
                    visualScore,
                    pass: criticResult.pass,
                    issueCount: criticResult.issues.length,
                    brandComplianceScore: criticResult.brandComplianceScore,
                },
                duration: Date.now() - criticStart,
                timestamp: new Date().toISOString(),
            });

            if (criticResult.pass) {
                onProgress?.(`Design approved: ${scoreBreakdown}`, 'critic');
                break;
            }

            // ── Apply fix patches from critic ──
            const fixPatches = criticResult.issues
                .filter(i => i.fixTool && i.fixParams)
                .map(i => ({ tool: i.fixTool!, params: i.fixParams! }));

            if (fixPatches.length === 0) break; // no autofix available

            onProgress?.(`Applying ${fixPatches.length} fixes...`, 'executor');
            const fixResults = await applyFixPatches(fixPatches, ctx, signal, onProgress);
            const fixSucceeded = fixResults.filter(r => r.success).length;

            steps.push({
                agent: 'executor',
                action: `Applied ${fixSucceeded} fix patches`,
                duration: 0,
                timestamp: new Date().toISOString(),
            });

            if (fixSucceeded === 0) break; // fixes didn't work, stop
        }

        const totalDuration = Date.now() - pipelineStart;
        onProgress?.(`Pipeline complete in ${totalDuration}ms`, 'pipeline');

        return {
            success: true,
            steps,
            plan,
            toolResults,
            criticResult,
            totalDuration,
            iterationCount,
        };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onProgress?.(`Pipeline failed: ${msg}`, 'pipeline');

        return {
            success: false,
            steps,
            plan,
            toolResults: [],
            criticResult: null,
            totalDuration: Date.now() - pipelineStart,
            iterationCount: 0,
        };
    }
}
