// ─────────────────────────────────────────────────
// executorAgent.ts — Design Executor (Agent 2/3)
// ─────────────────────────────────────────────────
// Receives: DesignPlan from Planner
// Executes: Tool calls via toolRegistry
// Returns: Array of ToolResults
// ─────────────────────────────────────────────────

import { executeTool, executeBatch } from '@/services/toolRegistry';
import type { BatchOperation, BatchResult } from '@/services/toolRegistry';
import type { ToolContext, ToolResult } from '@/services/tools/toolTypes';
import type { DesignPlan, ProgressCallback } from './agentTypes';

// ── Run Executor ──

export async function runExecutor(
    plan: DesignPlan,
    ctx: ToolContext,
    signal: AbortSignal,
    onProgress?: ProgressCallback,
): Promise<ToolResult[]> {
    onProgress?.(`Executing ${plan.elements.length} tools...`, 'executor');

    const results: ToolResult[] = [];

    for (let i = 0; i < plan.elements.length; i++) {
        if (signal.aborted) break;

        const planned = plan.elements[i];
        if (!planned) continue;
        onProgress?.(`[${i + 1}/${plan.elements.length}] ${planned.tool}...`, 'executor');

        const result = await executeTool(planned.tool, planned.params, ctx);
        results.push(result);

        if (!result.success) {
            console.warn(`[Executor] Tool "${planned.tool}" failed: ${result.message}`);
            // Continue executing other elements (don't break pipeline)
        }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    onProgress?.(
        `Executed ${succeeded} tools (${failed} failed)`,
        'executor',
    );

    return results;
}

// ── Batch Executor (Pencil-inspired) ──
// Processes all elements in a plan as a single batch operation.
// This is the preferred execution mode: fewer round-trips, atomic.

export async function runBatchExecutor(
    plan: DesignPlan,
    ctx: ToolContext,
    signal: AbortSignal,
    onProgress?: ProgressCallback,
): Promise<BatchResult> {
    onProgress?.(`Batch executing ${plan.elements.length} design elements...`, 'executor');

    const operations: BatchOperation[] = plan.elements.map(el => ({
        tool: el.tool,
        params: el.params,
        label: el.role ?? el.type ?? el.tool,
    }));

    if (signal.aborted) {
        return {
            success: false, totalOps: 0, succeeded: 0, failed: 0,
            results: [], message: 'Aborted before execution',
        };
    }

    const batchResult = await executeBatch(operations, ctx);

    onProgress?.(
        `Batch complete: ${batchResult.succeeded}/${batchResult.totalOps} succeeded`,
        'executor',
    );

    return batchResult;
}

// ── Apply Critic Fix Patches ──
// When critic identifies issues, it may return fix patches
// that the executor applies.

export async function applyFixPatches(
    fixes: Array<{ tool: string; params: Record<string, unknown> }>,
    ctx: ToolContext,
    signal: AbortSignal,
    onProgress?: ProgressCallback,
): Promise<ToolResult[]> {
    if (fixes.length === 0) return [];

    onProgress?.(`Applying ${fixes.length} fixes...`, 'executor');
    const results: ToolResult[] = [];

    for (const fix of fixes) {
        if (signal.aborted) break;
        const result = await executeTool(fix.tool, fix.params, ctx);
        results.push(result);
    }

    return results;
}
