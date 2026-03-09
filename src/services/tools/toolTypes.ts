// ─────────────────────────────────────────────────
// toolTypes.ts — Shared Tool Interface Contract
// ─────────────────────────────────────────────────
// All AI tools implement this interface.
// The ToolContext provides access to stores and engine.
// ─────────────────────────────────────────────────

import type { BrandKit } from '@/stores/brandKitStore';

// ── Tool Categories ──

export type ToolCategory =
    | 'read'       // querying design state
    | 'create'     // adding new elements
    | 'modify'     // changing existing elements
    | 'structure'  // delete, rename, group, reorder
    | 'analyze'    // token analysis, brand compliance
    | 'sizing'     // smart sizing operations
    | 'export'     // export to PNG/SVG/HTML5
    | 'generate';  // AI image generation

// ── Tool Interface ──

export interface AceTool {
    /** Unique tool name (used in Claude tool_use) */
    name: string;
    /** Category for grouping */
    category: ToolCategory;
    /** Human-readable description for AI */
    description: string;
    /** JSON Schema for tool input parameters */
    inputSchema: Record<string, unknown>;
    /** Execute the tool with given params and context */
    execute: (params: Record<string, unknown>, ctx: ToolContext) => ToolResult | Promise<ToolResult>;
}

// ── Tool Context ──
// Passed to every tool.execute() call. Provides access to
// stores and engine without tools needing direct imports.

export interface ToolContext {
    /** Active creative set ID */
    activeCreativeSetId: string | null;
    /** Active variant ID (the one currently being edited) */
    activeVariantId: string | null;
    /** Canvas dimensions */
    canvasW: number;
    canvasH: number;
    /** Brand kit (if active) */
    brandKit: BrandKit | null;
    /** Design store actions (injected from useDesignStore.getState()) */
    designActions: DesignActions;
    /** Editor store actions (injected from useEditorStore.getState()) */
    editorActions: EditorActions;
}

// ── Store Action Interfaces ──
// Only the methods tools need — keeps tools decoupled from store internals.

export interface DesignActions {
    addElementToMaster: (element: unknown) => void;
    updateMasterElement: (elementId: string, patch: Record<string, unknown>) => void;
    removeElementFromMaster: (elementId: string) => void;
    addVariant: (preset: unknown) => void;
    removeVariant: (variantId: string) => void;
    /** Get the active creative set */
    getCreativeSet: () => unknown | null;
}

export interface EditorActions {
    setSelectedElementId: (id: string | null) => void;
    getSelectedElementId: () => string | null;
}

// ── Tool Result ──

export interface ToolResult {
    success: boolean;
    message: string;
    /** Optional return data (tool-specific) */
    data?: unknown;
    /** Human-readable side effects for logging/UI */
    sideEffects?: string[];
}

// ── Claude Tool Schema (for API) ──

export interface ClaudeToolSchema {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
}

/** Convert an AceTool to Claude-compatible schema */
export function toClaudeSchema(tool: AceTool): ClaudeToolSchema {
    return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
    };
}
