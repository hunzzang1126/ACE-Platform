// ─────────────────────────────────────────────────
// AI Agent Context — Conversation history + types
// ─────────────────────────────────────────────────
// Scene analysis, spatial reasoning, prompts → agentSceneAnalysis.ts
// ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

import { type SmartContext } from './smartContextBuilder';

// Re-export scene analysis functions for backward compatibility
export {
    extractSceneNodes, buildSceneRAG, detectSpatialRelations,
    resolveMention, inferDesignIntent, buildSystemPrompt, buildHealingPrompt,
} from './agentSceneAnalysis';

export interface AgentMessage {
    role: 'user' | 'assistant' | 'system' | 'action' | 'thinking' | 'image_gallery';
    content: string;
    timestamp: number;
    phases?: AgentPhase[];
    toolCalls?: ToolCallRecord[];
    actionCard?: {
        id: string; label: string;
        status: 'pending' | 'running' | 'done' | 'error';
        detail?: string; reasoning?: string; expandedDetail?: string;
    };
    imageGallery?: {
        images: Array<{ id: string; url: string; prompt: string }>;
        canvasW: number; canvasH: number;
    };
}

export interface AgentPhase {
    type: 'thinking' | 'planning' | 'executing' | 'reflecting';
    content: string;
    timestamp: number;
}

export interface ToolCallRecord {
    name: string;
    input: Record<string, unknown>;
    result: { success: boolean; message: string; nodeId?: number };
    durationMs: number;
}

export interface SceneNodeInfo {
    id: number;
    type: 'rect' | 'rounded_rect' | 'ellipse' | 'gradient_rect' | 'text' | 'unknown';
    x: number; y: number; width: number; height: number;
    color: string; opacity: number; zIndex: number; label: string;
    effects: { hasShadow: boolean; brightness: number; contrast: number; saturation: number; hueRotate: number; blendMode: string };
    animations: string[];
}

/**
 * AI Agent Context Manager — conversation history.
 * Scene extraction + prompt building delegated to agentSceneAnalysis.ts.
 */
export class AgentContext {
    private history: AgentMessage[] = [];
    private maxHistory = 50;

    addMessage(msg: AgentMessage): void {
        this.history.push(msg);
        if (this.history.length > this.maxHistory) this.history = this.history.slice(-this.maxHistory);
    }

    getHistory(): AgentMessage[] { return [...this.history]; }
    getRecentMessages(count = 10): AgentMessage[] { return this.history.slice(-count); }
    clear(): void { this.history = []; }

    // ── Static wrappers for backward compat ──
    static extractSceneNodes(engine: Engine): SceneNodeInfo[] {
        const { extractSceneNodes } = require('./agentSceneAnalysis');
        return extractSceneNodes(engine);
    }
    static buildSceneRAG(engine: Engine, trackedNodes: SceneNodeInfo[]): string {
        const { buildSceneRAG } = require('./agentSceneAnalysis');
        return buildSceneRAG(engine, trackedNodes);
    }
    static detectSpatialRelations(nodes: SceneNodeInfo[]) {
        const { detectSpatialRelations } = require('./agentSceneAnalysis');
        return detectSpatialRelations(nodes);
    }
    static resolveMention(mention: string, nodes: SceneNodeInfo[]): number | null {
        const { resolveMention } = require('./agentSceneAnalysis');
        return resolveMention(mention, nodes);
    }
    static inferDesignIntent(nodes: SceneNodeInfo[]): string {
        const { inferDesignIntent } = require('./agentSceneAnalysis');
        return inferDesignIntent(nodes);
    }
    static buildSystemPrompt(engine: Engine, trackedNodes: SceneNodeInfo[], smartCtx?: SmartContext): string {
        const { buildSystemPrompt } = require('./agentSceneAnalysis');
        return buildSystemPrompt(engine, trackedNodes, smartCtx);
    }
    static buildHealingPrompt(
        issues: Array<{ type: string; severity: string; element?: string; description: string; suggestion?: string }>,
        sceneNodes: SceneNodeInfo[], canvasW: number, canvasH: number, score: number,
    ): string {
        const { buildHealingPrompt } = require('./agentSceneAnalysis');
        return buildHealingPrompt(issues, sceneNodes, canvasW, canvasH, score);
    }
}
