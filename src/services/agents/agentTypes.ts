// ─────────────────────────────────────────────────
// agentTypes.ts — Shared Agent Pipeline Types
// ─────────────────────────────────────────────────

import type { ToolResult } from '@/services/tools/toolTypes';

// ── Agent Messages ──

export interface AgentMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// ── Pipeline Step ──

export interface AgentStep {
    agent: 'planner' | 'executor' | 'critic';
    action: string;
    input?: unknown;
    output?: unknown;
    duration: number;      // ms
    timestamp: string;
}

// ── Design Plan (Planner Output) ──

export interface DesignPlan {
    description: string;
    elements: PlannedElement[];
    colorPalette: string[];
    fontChoices: { heading: string; body: string; cta: string };
}

export interface PlannedElement {
    role: string;          // 'background' | 'headline' | 'subheadline' | 'cta' | 'logo' | 'product' | 'decoration'
    type: string;          // 'shape' | 'text' | 'image' | 'button' | 'brand_asset'
    tool: string;          // tool name to call: 'create_shape', 'create_text', 'create_image_from_brand_kit', etc.
    params: Record<string, unknown>;  // tool params
    reasoning: string;     // why this element was included
}

// ── Critic Result ──

export interface CriticResult {
    score: number;         // 0-100
    pass: boolean;         // score >= 82
    issues: CriticIssue[];
    suggestions: string[];
    brandComplianceScore?: number;
}

export interface CriticIssue {
    type: 'overlap' | 'clipping' | 'contrast' | 'hierarchy' | 'spacing' | 'brand_violation' | 'missing_logo' | 'font_mismatch';
    severity: 'error' | 'warning';
    element?: string;
    description: string;
    fixTool?: string;      // suggested tool to fix
    fixParams?: Record<string, unknown>;
}

// ── Pipeline Result ──

export interface PipelineResult {
    success: boolean;
    steps: AgentStep[];
    plan: DesignPlan | null;
    toolResults: ToolResult[];
    criticResult: CriticResult | null;
    totalDuration: number;
    iterationCount: number;
}

// ── Progress Callback ──

export type ProgressCallback = (message: string, agent?: string) => void;
