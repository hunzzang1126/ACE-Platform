// ─────────────────────────────────────────────────
// modelRouter.ts — Model Selection & Routing
// ─────────────────────────────────────────────────
// Maps ACE use cases to optimal OpenRouter models.
// Single config point for all model decisions.
// ─────────────────────────────────────────────────

export type AceModelRole =
    | 'planner'       // Design planning (complex reasoning)
    | 'executor'      // Tool execution (fast, cheap)
    | 'critic'        // Design review (vision + analysis)
    | 'vision'        // Screenshot analysis
    | 'design'        // General design generation (legacy)
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
        name: 'Nano Banana 2 (Imagen 3)',
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
