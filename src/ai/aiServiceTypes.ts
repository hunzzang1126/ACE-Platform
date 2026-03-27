// ─────────────────────────────────────────────────
// aiServiceTypes — Config, types, and helpers
// ─────────────────────────────────────────────────

import type { ExecutionResult } from './commandExecutor';

// ── Config ──

export interface AiConfig {
    endpoint: string;
    model: string;
    maxToolRounds: number;
}

const DEFAULT_CONFIG: AiConfig = {
    endpoint: 'https://openrouter.ai/api',
    model: 'anthropic/claude-sonnet-4',
    maxToolRounds: 2,
};

export function loadConfig(): AiConfig {
    try {
        const stored = localStorage.getItem('ace-ai-config');
        if (stored) { const parsed = JSON.parse(stored); delete parsed.maxToolRounds; return { ...DEFAULT_CONFIG, ...parsed }; }
    } catch { /* */ }
    return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AiConfig): void {
    const { maxToolRounds: _, ...rest } = config;
    localStorage.setItem('ace-ai-config', JSON.stringify(rest));
}

// ── Live Progress Callbacks ──

export interface LiveProgress {
    onCanvasScan: (summary: string) => void;
    onThinking: (content: string) => void;
    onPlan: (steps: string[]) => void;
    onStepStart: (stepIndex: number, toolName: string, params: Record<string, unknown>) => void;
    onStepComplete: (stepIndex: number, result: ExecutionResult) => void;
    onReflection: (content: string) => void;
    onToken: (token: string) => void;
    onComplete: (message: import('./agentContext').AgentMessage) => void;
    onError: (error: string) => void;
}

export type ToolExecutorOverride = (toolName: string, params: Record<string, unknown>) => ExecutionResult | null;

// ── Claude API Types ──

export interface ClaudeContentBlock {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string;
    is_error?: boolean;
}

export interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string | ClaudeContentBlock[];
}

export interface ClaudeResponse {
    id: string;
    type: string;
    role: string;
    content: ClaudeContentBlock[];
    model: string;
    stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
    usage: { input_tokens: number; output_tokens: number };
}

// ── Helpers ──

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function nextFrame(): Promise<void> {
    return new Promise(resolve => { requestAnimationFrame(() => setTimeout(resolve, 16)); });
}

export function humanizeToolStep(name: string, params: Record<string, unknown>): string {
    switch (name) {
        case 'execute_dynamic_action': return (params.description as string) || 'Executing custom action...';
        case 'generate_full_design': return `Creating design: "${(params.prompt as string)?.slice(0, 50) || 'new design'}"`;
        case 'replace_background_image': return `Generating background: "${(params.prompt as string)?.slice(0, 50) || 'new image'}"`;
        case 'generate_image': return `Generating image: "${(params.prompt as string)?.slice(0, 50) || 'new image'}"`;
        case 'add_text': return `Adding text: "${(params.content as string)?.slice(0, 30) || 'text'}"`;
        case 'add_button': return `Adding button: "${(params.text as string) || 'Shop Now'}"`;
        case 'analyze_scene': return 'Reading canvas state...';
        default: return name.replace(/_/g, ' ');
    }
}
