// ─────────────────────────────────────────────────
// aceToolDef — Framework-agnostic tool definitions
// ─────────────────────────────────────────────────
// Inspired by OpenPencil's packages/core/src/tools/schema.ts
//
// Define a tool ONCE → automatically available as:
//   • Claude tool (input_schema format)
//   • OpenAI function (parameters format)
//   • (Future) MCP server tool
//
// Usage:
//   import { defineTool, toClaudeTools } from '@/ai/aceToolDef';
//   const myTool = defineTool({ name: 'my_tool', params: { ... }, execute: () => {} });
//   const claudeTools = toClaudeTools([myTool, ...]);
// ─────────────────────────────────────────────────

// ── Param Schema ─────────────────────────────────

export interface ParamSchema {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    enum?: string[];
    minimum?: number;
    maximum?: number;
    default?: unknown;
    required?: boolean;
    /** For array params: schema of each item */
    items?: ParamSchema & { properties?: Record<string, ParamSchema> };
}

// ── Tool Definition ───────────────────────────────

export interface AceToolDef<P extends Record<string, unknown> = Record<string, unknown>> {
    /** Unique snake_case tool name — also used as function/tool name in API format */
    name: string;
    /** Human-readable description sent to the LLM */
    description: string;
    /** Typed parameter schemas */
    params: Record<string, ParamSchema>;
    /** Category for documentation/filtering */
    category?: 'create' | 'style' | 'effects' | 'animation' | 'scene' | 'selection' | 'undo' | 'compound' | 'dashboard';
    /**
     * Execute function — receives parsed params and engine context.
     * Optional: tools defined purely for schema can omit this.
     */
    execute?: (engine: unknown, params: P) => { success: boolean; message: string; nodeId?: number; data?: unknown };
}

/**
 * Define a framework-agnostic tool.
 * Type inference ensures `params` matches the execute signature.
 */
export function defineTool<P extends Record<string, unknown>>(
    def: AceToolDef<P>,
): AceToolDef<P> {
    return def;
}

// ── Legacy Compatibility ─────────────────────────

/**
 * Legacy ToolDefinition format (agentTools.ts).
 * Has `parameters` (JSON Schema object) instead of `params` (ParamSchema map).
 */
interface LegacyToolDef {
    name: string;
    description: string;
    parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
    category?: string;
}

/** Union type accepted by adapters — supports both old and new tool formats */
type AnyToolDef = AceToolDef | LegacyToolDef;

function isLegacy(t: AnyToolDef): t is LegacyToolDef {
    return 'parameters' in t && !('params' in t);
}

// ── Adapters ────────────────────────────────────────

/**
 * Convert tool definitions to Claude API tool format.
 * Claude uses `input_schema` instead of `parameters`.
 * Accepts both AceToolDef (new) and legacy ToolDefinition (old) formats.
 */
export function toClaudeTools(tools: AnyToolDef[]): Array<{
    name: string;
    description: string;
    input_schema: object;
}> {
    return tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: isLegacy(t) ? t.parameters : buildJsonSchema(t.params),
    }));
}

/**
 * Convert tool definitions to OpenAI function-calling format.
 * Accepts both AceToolDef (new) and legacy ToolDefinition (old) formats.
 */
export function toOpenAiTools(tools: AnyToolDef[]): Array<{
    type: 'function';
    function: { name: string; description: string; parameters: object };
}> {
    return tools.map((t) => ({
        type: 'function' as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: isLegacy(t) ? t.parameters : buildJsonSchema(t.params),
        },
    }));
}

/**
 * Find a tool by name from a registry.
 */
export function findTool(tools: AnyToolDef[], name: string): AnyToolDef | undefined {
    return tools.find((t) => t.name === name);
}

// ── JSON Schema Builder ──────────────────────────

/**
 * Build a JSON Schema `object` from a param map.
 * Used by both Claude and OpenAI adapters.
 */
function buildJsonSchema(params: Record<string, ParamSchema>): object {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, schema] of Object.entries(params)) {
        const prop: Record<string, unknown> = { type: schema.type };
        if (schema.description) prop.description = schema.description;
        if (schema.enum) prop.enum = schema.enum;
        if (schema.minimum !== undefined) prop.minimum = schema.minimum;
        if (schema.maximum !== undefined) prop.maximum = schema.maximum;
        if (schema.default !== undefined) prop.default = schema.default;
        if (schema.items) {
            const itemSchema: Record<string, unknown> = { type: schema.items.type };
            if (schema.items.properties) {
                itemSchema.properties = buildNestedProps(schema.items.properties);
            }
            prop.items = itemSchema;
        }
        properties[key] = prop;

        if (schema.required !== false && schema.default === undefined) {
            // Fields with no default are implicitly required (can override with required: false)
            // We'll be conservative — only mark as required if explicitly set
        }
        if (schema.required === true) {
            required.push(key);
        }
    }

    return {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
    };
}

function buildNestedProps(params: Record<string, ParamSchema>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(params)) {
        const prop: Record<string, unknown> = { type: schema.type };
        if (schema.description) prop.description = schema.description;
        if (schema.enum) prop.enum = schema.enum;
        if (schema.minimum !== undefined) prop.minimum = schema.minimum;
        if (schema.maximum !== undefined) prop.maximum = schema.maximum;
        if (schema.default !== undefined) prop.default = schema.default;
        result[key] = prop;
    }
    return result;
}
