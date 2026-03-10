// ─────────────────────────────────────────────────
// toolRegistry.ts — Unified Tool Registry
// ─────────────────────────────────────────────────
// Single entry point for all AI tools.
// Provides: tool schema generation for Claude API,
// tool execution by name, and tool lookup.
// ─────────────────────────────────────────────────

import type { AceTool, ToolContext, ToolResult, ClaudeToolSchema } from './tools/toolTypes';
import { toClaudeSchema } from './tools/toolTypes';
import { readTools } from './tools/readTools';
import { createTools } from './tools/createTools';
import { modifyTools } from './tools/modifyTools';
import { structureTools } from './tools/structureTools';
import { analyzeTools } from './tools/analyzeTools';
import { sizingTools } from './tools/sizingTools';
import { exportTools } from './tools/exportTools';

// ── All Tools ──

export const ALL_TOOLS: AceTool[] = [
    ...readTools,       // 5: getPageTree, getNode, findNodes, getSelection, getCanvasBounds
    ...createTools,     // 6: createShape, createText, createImage, createImageFromBrandKit, createButton, duplicateNode
    ...modifyTools,     // 8: setFill, setFont, setText, moveNode, resizeNode, setOpacity, setVisible, setZIndex
    ...structureTools,  // 4: deleteNode, renameNode, setRole, setLocked
    ...analyzeTools,    // 4: analyzeColors, analyzeTypography, analyzeSpacing, analyzeBrandCompliance
    ...sizingTools,     // 4: getVariantList, addVariant, removeVariant, getAvailablePresets
    ...exportTools,     // 2: listExportableVariants, getExportSummary
];

// ── Schema Generation (for Claude API) ──

/** Get all tool schemas for Claude tool_use */
export function getToolSchemas(): ClaudeToolSchema[] {
    return ALL_TOOLS.map(toClaudeSchema);
}

/** Get schemas for a specific category */
export function getToolSchemasByCategory(category: AceTool['category']): ClaudeToolSchema[] {
    return ALL_TOOLS
        .filter(t => t.category === category)
        .map(toClaudeSchema);
}

// ── Tool Execution ──

/** Find a tool by name */
export function findTool(name: string): AceTool | undefined {
    return ALL_TOOLS.find(t => t.name === name);
}

/** Execute a tool by name with given params and context */
export async function executeTool(
    name: string,
    params: Record<string, unknown>,
    ctx: ToolContext,
): Promise<ToolResult> {
    const tool = findTool(name);
    if (!tool) {
        return { success: false, message: `Unknown tool: "${name}". Available: ${ALL_TOOLS.map(t => t.name).join(', ')}` };
    }

    try {
        const result = tool.execute(params, ctx);
        // Handle both sync and async tools
        return result instanceof Promise ? await result : result;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Tool "${name}" failed: ${msg}` };
    }
}

// ── Batch Execution (Pencil-inspired) ──

export interface BatchOperation {
    tool: string;
    params: Record<string, unknown>;
    label?: string; // optional human-readable label (e.g., "background", "headline")
}

export interface BatchResult {
    success: boolean;
    totalOps: number;
    succeeded: number;
    failed: number;
    results: Array<ToolResult & { tool: string; label?: string }>;
    message: string;
}

/** Max operations per batch (Pencil uses 25) */
const MAX_BATCH_OPS = 25;

/**
 * Execute multiple tool operations atomically.
 * Pencil.dev's `batch_design` does up to 25 insert/update/delete/copy
 * operations in a single call. We mirror this: the AI plans all operations
 * in one JSON block, and we execute them sequentially in one batch.
 *
 * @param operations - Array of {tool, params} objects (max 25)
 * @param ctx - Tool context (store references, canvas state)
 * @returns Aggregated batch result with per-operation details
 */
export async function executeBatch(
    operations: BatchOperation[],
    ctx: ToolContext,
): Promise<BatchResult> {
    const ops = operations.slice(0, MAX_BATCH_OPS);
    const results: BatchResult['results'] = [];

    for (const op of ops) {
        const result = await executeTool(op.tool, op.params, ctx);
        results.push({ ...result, tool: op.tool, label: op.label });
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const failedDetails = results
        .filter(r => !r.success)
        .map(r => `${r.label ?? r.tool}: ${r.message}`)
        .join('; ');

    return {
        success: failed === 0,
        totalOps: ops.length,
        succeeded,
        failed,
        results,
        message: failed === 0
            ? `All ${succeeded} operations completed successfully.`
            : `${succeeded}/${ops.length} succeeded. Failures: ${failedDetails}`,
    };
}

// ── Info ──

/** Get tool count summary */
export function getToolSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const tool of ALL_TOOLS) {
        summary[tool.category] = (summary[tool.category] ?? 0) + 1;
    }
    summary.total = ALL_TOOLS.length;
    return summary;
}
