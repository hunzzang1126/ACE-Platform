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
