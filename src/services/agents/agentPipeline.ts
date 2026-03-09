// ─────────────────────────────────────────────────
// agentPipeline.ts — Planner → Executor → Critic
// ─────────────────────────────────────────────────
// Orchestrates the 3-agent design pipeline:
//
//  1. Planner: user prompt → DesignPlan
//  2. Executor: DesignPlan → tool calls on canvas
//  3. Critic: scene graph analysis → score + fixes
//  4. If score < 82: apply fixes → re-critique (max 2 rounds)
//
// This replaces the direct callFromScratch approach
// from autoDesignService.ts for new AI-powered designs.
// ─────────────────────────────────────────────────

import { runPlanner } from './plannerAgent';
import { runExecutor, applyFixPatches } from './executorAgent';
import { runStructuralCritic } from './criticAgent';
import { buildSceneGraph } from '@/services/sceneGraphBuilder';
import type { ToolContext } from '@/services/tools/toolTypes';
import type { BrandKit } from '@/stores/brandKitStore';
import type { SceneGraph } from '@/services/sceneGraphBuilder';
import type { BannerVariant, CreativeSet } from '@/schema/design.types';
import type { PipelineResult, DesignPlan, AgentStep, ProgressCallback } from './agentTypes';

const MAX_CRITIC_ROUNDS = 2;
const PASS_SCORE = 82;

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
        // STEP 3: CRITIC (with fix loop)
        // ═══════════════════════════════════════
        let criticResult = null;
        let iterationCount = 0;

        for (let round = 0; round < MAX_CRITIC_ROUNDS; round++) {
            if (signal.aborted) break;
            iterationCount++;

            const criticStart = Date.now();
            const sceneGraph = getCurrentSceneGraph(ctx);
            if (!sceneGraph) break;

            onProgress?.(`Quality check (round ${round + 1})...`, 'critic');
            criticResult = runStructuralCritic(sceneGraph, brandKit);

            steps.push({
                agent: 'critic',
                action: `Score: ${criticResult.score}/100, ${criticResult.issues.length} issues`,
                output: {
                    score: criticResult.score,
                    pass: criticResult.pass,
                    issueCount: criticResult.issues.length,
                    brandComplianceScore: criticResult.brandComplianceScore,
                },
                duration: Date.now() - criticStart,
                timestamp: new Date().toISOString(),
            });

            if (criticResult.pass) {
                onProgress?.(`Design approved: ${criticResult.score}/100`, 'critic');
                break;
            }

            // Apply fix patches from critic
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
