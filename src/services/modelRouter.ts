// ─────────────────────────────────────────────────
// modelRouter.ts — Model Selection & Routing
// ─────────────────────────────────────────────────
// Maps ACE use cases to optimal OpenRouter models.
// Single config point for all model decisions.
//
// Model lineup:
//   Advanced: Claude Opus 4 (complex reasoning, planning)
//   Standard: Claude Sonnet 4 (design, general)
//   Fast:     Claude 3.5 Haiku (quick execution, low cost)
//   Vision is built into all Claude models — no separate role needed.
// ─────────────────────────────────────────────────

export type AceModelRole =
    | 'planner'       // Design planning (complex reasoning) — Opus 4
    | 'executor'      // Tool execution (fast, cheap) — Haiku 3.5
    | 'critic'        // Design review (vision + analysis) — Sonnet 4
    | 'vision'        // Screenshot analysis (internal, not in selector) — Sonnet 4
    | 'design'        // General design generation — Sonnet 4
    | 'image_fast'    // Image gen — speed/cost priority
    | 'image_quality' // Image gen — quality priority
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
        id: 'anthropic/claude-opus-4',
        name: 'Claude Opus 4',
        maxTokens: 4096,
        supportsVision: true,
        supportsTools: true,
        costPer1MInput: 15.00,
        costPer1MOutput: 75.00,
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
        // Internal only — not exposed in model selector
        // Vision capability is built into all Claude models
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
        id: 'black-forest-labs/flux-1-schnell',
        name: 'Flux Schnell',
        maxTokens: 0,
        supportsVision: false,
        supportsTools: false,
        costPer1MInput: 0,
        costPer1MOutput: 0,
    },
    image_quality: {
        id: 'google/imagen-3',
        name: 'Imagen 3',
        maxTokens: 0,
        supportsVision: false,
        supportsTools: false,
        costPer1MInput: 0,
        costPer1MOutput: 0,
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
