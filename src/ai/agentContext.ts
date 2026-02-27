// ─────────────────────────────────────────────────
// AI Agent Context — Scene RAG + Spatial Reasoning
// ─────────────────────────────────────────────────
// Provides the AI with deep understanding of the canvas state,
// spatial relationships, and design intent.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

/**
 * Chat message with tool execution history.
 */
export interface AgentMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    /** AI phases visible in live progress */
    phases?: AgentPhase[];
    /** Tool calls executed during this message */
    toolCalls?: ToolCallRecord[];
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

/**
 * Scene node info extracted from engine.
 */
export interface SceneNodeInfo {
    id: number;
    type: 'rect' | 'rounded_rect' | 'ellipse' | 'gradient_rect' | 'unknown';
    x: number;
    y: number;
    width: number;
    height: number;
    color: string; // hex
    opacity: number;
    zIndex: number;
    label: string; // e.g. "Blue Rectangle #3"
    effects: {
        hasShadow: boolean;
        brightness: number;
        contrast: number;
        saturation: number;
        hueRotate: number;
        blendMode: string;
    };
    animations: string[]; // e.g. ["x: 0s→2s", "opacity: fade"]
}

/**
 * Spatial relationship between two nodes.
 */
interface SpatialRelation {
    nodeA: number;
    nodeB: number;
    relation: 'overlapping' | 'adjacent' | 'aligned_h' | 'aligned_v' | 'contains' | 'above' | 'below' | 'left_of' | 'right_of';
    distance?: number;
}

/**
 * AI Agent Context Manager — conversation history, scene RAG, spatial reasoning.
 */
export class AgentContext {
    private history: AgentMessage[] = [];
    private maxHistory = 50;

    // ── Conversation History ─────────────────────────

    addMessage(msg: AgentMessage): void {
        this.history.push(msg);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
    }

    getHistory(): AgentMessage[] {
        return [...this.history];
    }

    getRecentMessages(count = 10): AgentMessage[] {
        return this.history.slice(-count);
    }

    clear(): void {
        this.history = [];
    }

    // ── Scene Serialization ──────────────────────────

    /**
     * Extract all scene nodes from the engine into structured data.
     */
    static extractSceneNodes(engine: Engine): SceneNodeInfo[] {
        const nodes: SceneNodeInfo[] = [];
        try {
            const count = engine.node_count() as number;
            // The engine doesn't expose individual node getters directly,
            // so we use the selection/hit-test info plus known state.
            // For now, we track created nodes via the agent's own records.
            // This is a simplified version — full implementation would add
            // a `get_scene_json()` WASM method.
            void count;
        } catch {
            // Engine might not support full introspection yet
        }
        return nodes;
    }

    /**
     * Build a natural language description of the canvas state (Scene RAG).
     * This is injected into the system prompt so the AI "sees" the canvas.
     */
    static buildSceneRAG(engine: Engine, trackedNodes: SceneNodeInfo[]): string {
        const lines: string[] = [];
        const nodeCount = engine.node_count?.() ?? 0;

        lines.push(`## Current Canvas State`);
        lines.push(`- Total elements: ${nodeCount}`);
        lines.push(`- Animation playing: ${engine.anim_playing?.() ? 'yes' : 'no'}`);
        lines.push(`- Animation time: ${(engine.anim_time?.() ?? 0).toFixed(2)}s / ${(engine.anim_duration?.() ?? 0).toFixed(2)}s`);

        // Selection info
        try {
            const selJson = engine.get_selection?.();
            if (selJson) {
                const sel = JSON.parse(selJson) as number[];
                lines.push(`- Selected nodes: ${sel.length > 0 ? sel.join(', ') : 'none'}`);
            }
        } catch { /* */ }

        // Tracked nodes
        if (trackedNodes.length > 0) {
            lines.push('');
            lines.push('### Elements on Canvas');
            for (const node of trackedNodes) {
                const desc = `  - **${node.label}** (id=${node.id}): ${node.type} at (${node.x}, ${node.y}), size ${node.width}×${node.height}, color ${node.color}, opacity ${node.opacity}`;
                lines.push(desc);
                if (node.effects.hasShadow) lines.push(`    - Shadow applied`);
                if (node.effects.brightness !== 1.0) lines.push(`    - Brightness: ${node.effects.brightness}`);
                if (node.animations.length > 0) lines.push(`    - Animations: ${node.animations.join(', ')}`);
            }

            // Spatial relationships
            const relations = AgentContext.detectSpatialRelations(trackedNodes);
            if (relations.length > 0) {
                lines.push('');
                lines.push('### Spatial Relationships');
                for (const rel of relations) {
                    const a = trackedNodes.find(n => n.id === rel.nodeA);
                    const b = trackedNodes.find(n => n.id === rel.nodeB);
                    if (a && b) {
                        lines.push(`  - ${a.label} is ${rel.relation.replace('_', ' ')} ${b.label}`);
                    }
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Detect spatial relationships between nodes.
     */
    static detectSpatialRelations(nodes: SceneNodeInfo[]): SpatialRelation[] {
        const relations: SpatialRelation[] = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i]!;
                const b = nodes[j]!;

                // Overlap check
                const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
                const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
                if (overlapX && overlapY) {
                    relations.push({ nodeA: a.id, nodeB: b.id, relation: 'overlapping' });
                    continue;
                }

                // Horizontal alignment (centers within 5px)
                const aCenterY = a.y + a.height / 2;
                const bCenterY = b.y + b.height / 2;
                if (Math.abs(aCenterY - bCenterY) < 5) {
                    relations.push({ nodeA: a.id, nodeB: b.id, relation: 'aligned_h' });
                }

                // Vertical alignment
                const aCenterX = a.x + a.width / 2;
                const bCenterX = b.x + b.width / 2;
                if (Math.abs(aCenterX - bCenterX) < 5) {
                    relations.push({ nodeA: a.id, nodeB: b.id, relation: 'aligned_v' });
                }

                // Relative position
                if (a.y + a.height < b.y) {
                    relations.push({ nodeA: a.id, nodeB: b.id, relation: 'above', distance: b.y - (a.y + a.height) });
                } else if (b.y + b.height < a.y) {
                    relations.push({ nodeA: a.id, nodeB: b.id, relation: 'below', distance: a.y - (b.y + b.height) });
                }

                if (a.x + a.width < b.x) {
                    relations.push({ nodeA: a.id, nodeB: b.id, relation: 'left_of', distance: b.x - (a.x + a.width) });
                } else if (b.x + b.width < a.x) {
                    relations.push({ nodeA: a.id, nodeB: b.id, relation: 'right_of', distance: a.x - (b.x + b.width) });
                }
            }
        }
        return relations;
    }

    /**
     * Resolve @mention references to node IDs.
     * e.g. "@blue-rect" → node_id 3
     */
    static resolveMention(mention: string, nodes: SceneNodeInfo[]): number | null {
        const clean = mention.replace('@', '').toLowerCase().trim();

        // Try exact label match
        const exact = nodes.find(n => n.label.toLowerCase() === clean);
        if (exact) return exact.id;

        // Try partial match
        const partial = nodes.find(n =>
            n.label.toLowerCase().includes(clean) ||
            clean.includes(n.type)
        );
        if (partial) return partial.id;

        // Try by ID
        const idMatch = clean.match(/\d+/);
        if (idMatch) {
            const id = parseInt(idMatch[0]);
            if (nodes.some(n => n.id === id)) return id;
        }

        return null;
    }

    /**
     * Infer design intent / pattern from the scene.
     */
    static inferDesignIntent(nodes: SceneNodeInfo[]): string {
        if (nodes.length === 0) return 'Empty canvas — ready for new design.';
        if (nodes.length === 1) return 'Single element on canvas.';

        // Check for grid pattern
        const xPositions = [...new Set(nodes.map(n => Math.round(n.x / 10) * 10))];
        const yPositions = [...new Set(nodes.map(n => Math.round(n.y / 10) * 10))];
        if (xPositions.length > 2 && yPositions.length > 2) {
            return `Grid-like layout detected (${xPositions.length} columns × ${yPositions.length} rows).`;
        }

        // Check for horizontal row
        const sameY = nodes.every(n => Math.abs(n.y - nodes[0]!.y) < 10);
        if (sameY && nodes.length > 2) {
            return `Horizontal row of ${nodes.length} elements.`;
        }

        // Check for vertical column
        const sameX = nodes.every(n => Math.abs(n.x - nodes[0]!.x) < 10);
        if (sameX && nodes.length > 2) {
            return `Vertical column of ${nodes.length} elements.`;
        }

        return `Freeform layout with ${nodes.length} elements.`;
    }

    // ── System Prompt ────────────────────────────────

    /**
     * Build the full system prompt with scene context.
     */
    static buildSystemPrompt(engine: Engine, trackedNodes: SceneNodeInfo[]): string {
        const hasEngine = !!engine;
        const sceneRAG = hasEngine ? AgentContext.buildSceneRAG(engine, trackedNodes) : '';
        const intent = AgentContext.inferDesignIntent(trackedNodes);

        // Dynamic context section based on available engine
        const contextSection = hasEngine
            ? `\n## Design Intent\n${intent}\n\n${sceneRAG}`
            : `\n## Current Context\nYou are on the dashboard or editor page. No canvas engine is active.\nUse dashboard tools to manage creative sets, sizes, and navigation.`;

        return `You are ACE AI — an expert creative design assistant for the ACE banner design platform.
You create, edit, and manage multi-size banner ads by CALLING TOOLS. Never just describe — ALWAYS execute.

## CRITICAL: Tool Priority
- To ADD text: ALWAYS use add_text (NOT any WASM engine tool)
- To ADD shapes/backgrounds: ALWAYS use add_shape (NOT add_rect, add_rounded_rect, add_ellipse)
- add_text and add_shape save to the design store and persist across ALL sizes
- NEVER use add_rect, add_rounded_rect, add_ellipse, add_gradient_rect for design — those are WASM-only and don't persist
- To change background color: use add_shape with full canvas dimensions (300x250 etc.) at position 0,0

## Rules
1. ALWAYS CALL TOOLS. Never just describe — EXECUTE.
2. For effects (glow, blur, gradients): use set_custom_style.
3. Match user's language — Korean→Korean, English→English.
4. For translations: use update_element_text for each text element.
5. Never refuse — use execute_dynamic_action as catch-all.
6. Be concise. Focus on executing.

## Color Reference (hex for add_text/add_shape)
Gold: #c9a84c | Dark Navy: #0a0e1a | White: #ffffff | Black: #000000
${contextSection}`;
    }
}
