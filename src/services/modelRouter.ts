// ─────────────────────────────────────────────────
// modelRouter.ts — Model Selection & Routing
// ─────────────────────────────────────────────────
// ★ Image gen: Flux removed from OpenRouter (Apr 2026).
//   Now using Gemini "Nano Banana" image models.
// Maps Glid use cases to optimal OpenRouter models.
// Single config point for all model decisions.
//
// Model lineup (exposed in selector):
//   Default: Claude Sonnet 4 (reliable, cost-effective)
//   Standard: Claude Sonnet 4   (proven, balanced)
//   Fast:     Claude 3.5 Haiku  (quick execution, low cost)
//
// Internal (not in selector):
//   Vision:   uses the selected model (all Claude models have vision built-in)
//   Image:    Nano Banana 2 (fast) / Nano Banana Pro (quality)
// ─────────────────────────────────────────────────

export type AceModelRole =
    | 'planner'       // Design planning (complex reasoning) — Sonnet 4
    | 'executor'      // Tool execution (fast, cheap) — Haiku 3.5
    | 'critic'        // Design review (vision + analysis) — Sonnet 4
    | 'vision'        // Screenshot analysis (internal) — Sonnet 4
    | 'design'        // General design generation — Sonnet 4
    | 'image_fast'    // Image gen — speed/cost priority (internal)
    | 'image_quality' // Image gen — quality priority (internal)
    ;

export interface ModelConfig {
    id: string;            // OpenRouter model ID
    name: string;          // Human-readable name
    maxTokens: number;     // Default max tokens for this role
    supportsVision: boolean;
    supportsTools: boolean;
    costPer1MInput: number;  // USD per 1M input tokens
    costPer1MOutput: number; // USD per 1M output tokens
}

// ── Model Registry ──

const MODEL_CONFIGS: Record<AceModelRole, ModelConfig> = {
    planner: {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        maxTokens: 4096,
        supportsVision: true,
        supportsTools: true,
        costPer1MInput: 3.00,
        costPer1MOutput: 15.00,
    },
    executor: {
        id: 'anthropic/claude-3.5-haiku',
        name: 'Claude Haiku 3.5',
        maxTokens: 2048,
        supportsVision: false,
        supportsTools: true,
        costPer1MInput: 0.80,
        costPer1MOutput: 4.00,
    },
    critic: {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        maxTokens: 2048,
        supportsVision: true,
        supportsTools: false,
        costPer1MInput: 3.00,
        costPer1MOutput: 15.00,
    },
    vision: {
        // Internal — not exposed in model selector
        // Vision is built into all Claude models
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        maxTokens: 1024,
        supportsVision: true,
        supportsTools: false,
        costPer1MInput: 3.00,
        costPer1MOutput: 15.00,
    },
    design: {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        maxTokens: 4096,
        supportsVision: true,
        supportsTools: true,
        costPer1MInput: 3.00,
        costPer1MOutput: 15.00,
    },
    image_fast: {
        // Nano Banana 2 (Gemini 3.1 Flash Image) — fast, cheap
        id: 'google/gemini-3.1-flash-image-preview',
        name: 'Nano Banana 2',
        maxTokens: 0,
        supportsVision: false,
        supportsTools: false,
        costPer1MInput: 0.0000005,
        costPer1MOutput: 0.000003,
    },
    image_quality: {
        // Nano Banana Pro (Gemini 3 Pro Image) — higher quality
        id: 'google/gemini-3-pro-image-preview',
        name: 'Nano Banana Pro',
        maxTokens: 0,
        supportsVision: false,
        supportsTools: false,
        costPer1MInput: 0.000002,
        costPer1MOutput: 0.000012,
    },
};

// ── Public API ──

/** Get the model config for a specific role */
export function getModelForRole(role: AceModelRole): ModelConfig {
    return MODEL_CONFIGS[role];
}

/** Get the OpenRouter model ID for a role */
export function getModelId(role: AceModelRole): string {
    return MODEL_CONFIGS[role].id;
}

/** Get max tokens for a role */
export function getMaxTokens(role: AceModelRole): number {
    return MODEL_CONFIGS[role].maxTokens;
}

/** List all configured models */
export function listModels(): Record<AceModelRole, { id: string; name: string }> {
    const result = {} as Record<AceModelRole, { id: string; name: string }>;
    for (const [role, config] of Object.entries(MODEL_CONFIGS)) {
        result[role as AceModelRole] = { id: config.id, name: config.name };
    }
    return result;
}
