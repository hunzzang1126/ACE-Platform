// ─────────────────────────────────────────────────
// Dashboard Command Executor — Router
// ─────────────────────────────────────────────────
// Thin routing layer: delegates tool calls to focused executors
// designStore is the source of truth; projectStore is synced as index
// ─────────────────────────────────────────────────

import { executeProjectTool } from './executors/projectExecutor';
import { executeDesignTool } from './executors/designExecutor';

export interface DashboardExecResult {
    success: boolean;
    message: string;
    data?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NavigateFn = (path: string) => void;

/**
 * Execute a dashboard tool call.
 * Routes to the appropriate executor module.
 */
export function executeDashboardTool(
    toolName: string,
    params: Record<string, unknown>,
    navigate?: NavigateFn,
): DashboardExecResult {
    try {
        // Try project tools first (CRUD, navigation)
        const projectResult = executeProjectTool(toolName, params, navigate);
        if (projectResult) return projectResult;

        // Try design tools (elements, animation, styling)
        const designResult = executeDesignTool(toolName, params);
        if (designResult) return designResult;

        // Unknown tool
        return { success: false, message: `Unknown dashboard tool: ${toolName}` };
    } catch (err) {
        return { success: false, message: `Error executing ${toolName}: ${err}` };
    }
}
