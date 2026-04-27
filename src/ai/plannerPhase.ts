// ─────────────────────────────────────────────────
// Planner Phase — Round 1 Plan Extraction & Display
// ─────────────────────────────────────────────────
// Before executing tools, the AI explains its plan in
// natural language. This module extracts structured
// steps from the AI's planning text + tool blocks.
// ─────────────────────────────────────────────────

import type { ClaudeContentBlock } from './aiServiceTypes';

// ── Types ────────────────────────────────────────

export interface PlanStep {
    action: string;     // "Add gradient background"
    tool: string;       // "generate_image"
    detail: string;     // "dark navy to teal gradient"
}

export interface AiPlan {
    steps: PlanStep[];
    rawText: string;
    estimatedTools: number;
}

// ── Tool → Human-readable action mapping ─────────

const TOOL_ACTION_MAP: Record<string, string> = {
    generate_image: 'Generate image',
    replace_background_image: 'Set background image',
    generate_full_design: 'Create full design',
    add_text: 'Add text element',
    add_button: 'Add CTA button',
    add_shape: 'Add shape',
    update_element_text: 'Update text',
    update_element_property: 'Modify element',
    set_custom_style: 'Apply styling',
    set_animation: 'Add animation',
    execute_dynamic_action: 'Execute custom action',
    analyze_scene: 'Analyze canvas',
    fill_to_page: 'Fill to canvas',
};

// ── Plan Extraction ──────────────────────────────

/**
 * Extract a structured plan from Round 1 AI response.
 * Combines the AI's text explanation with the tool blocks
 * it intends to execute.
 */
export function extractPlan(
    textContent: string,
    toolBlocks: ClaudeContentBlock[],
): AiPlan {
    const steps: PlanStep[] = [];

    // Parse tool blocks into structured steps
    for (const tc of toolBlocks) {
        const toolName = tc.name ?? 'unknown';
        const params = (tc.input ?? {}) as Record<string, unknown>;

        const action = TOOL_ACTION_MAP[toolName] ?? toolName.replace(/_/g, ' ');
        const detail = extractToolDetail(toolName, params);

        steps.push({ action, tool: toolName, detail });
    }

    return {
        steps,
        rawText: textContent,
        estimatedTools: toolBlocks.length,
    };
}

/**
 * Extract a short detail string from tool parameters.
 */
function extractToolDetail(toolName: string, params: Record<string, unknown>): string {
    switch (toolName) {
        case 'generate_image':
        case 'replace_background_image':
        case 'generate_full_design':
            return (params.prompt as string)?.slice(0, 60) ?? '';
        case 'add_text':
            return `"${(params.content as string)?.slice(0, 40) ?? ''}"`;
        case 'add_button':
            return `"${(params.text as string) ?? 'Shop Now'}"`;
        case 'update_element_text':
            return `${params.element_name} → "${(params.new_text as string)?.slice(0, 30) ?? ''}"`;
        case 'update_element_property':
            return `${params.element_name}.${params.property} = ${params.value}`;
        case 'execute_dynamic_action':
            return (params.description as string)?.slice(0, 50) ?? 'custom action';
        default:
            return Object.values(params).filter(v => typeof v === 'string').map(v => (v as string).slice(0, 30)).join(', ');
    }
}

/**
 * Format the plan for user-facing display.
 * Returns an array of step descriptions for progress.onPlan().
 */
export function formatPlanForDisplay(plan: AiPlan): string[] {
    return plan.steps.map((step, i) => {
        const prefix = `${i + 1}.`;
        return step.detail
            ? `${prefix} ${step.action}: ${step.detail}`
            : `${prefix} ${step.action}`;
    });
}

/**
 * System prompt addition for planning behavior.
 * Injected only for canvas-editor context.
 */
export const PLANNING_INSTRUCTION = `On your FIRST response, briefly explain your plan (2-3 lines) before using tools. Example: "I'll create a modern tech banner: 1) gradient background 2) headline 3) CTA button." Then proceed with tool calls in the same response.`;
