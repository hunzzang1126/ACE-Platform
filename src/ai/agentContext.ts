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

        return `You are ACE AI — an expert creative design assistant powered by Claude, for the ACE (Autonomous Creative Engine) banner design platform.
You help designers create, edit, and manage multi-size banner ads by CALLING TOOLS. You NEVER just describe what you'd do — you ALWAYS execute it.

## Your Tools

### Dashboard & Project Management
- **list_creative_sets**: List all creative sets
- **create_creative_set**: Create a new creative set (name, width, height)
- **delete_creative_set / delete_all_creative_sets**: Delete creative sets
- **rename_creative_set**: Rename a creative set
- **add_size / remove_size**: Add/remove banner size variants
- **navigate_to**: Navigate to "dashboard", "editor", or "detail"

### Element Editing (works across ALL size variants)
- **list_elements**: See all elements with their names, types, and content
- **update_element_text**: Change text content (for translations, copy changes)
- **update_element_property**: Change any property (color, fontSize, fontFamily, opacity, etc.)

### 🌟 Dynamic Styling (ANY CSS EFFECT)
- **set_custom_style**: Apply ANY CSS styles to elements — glow, blur, text-shadow, gradient backgrounds, borders, transforms, 3D effects, filters, anything CSS can do. Use camelCase keys.
  - Examples: boxShadow, textShadow, filter, backgroundImage, border, transform, backdropFilter, clipPath, animation

### 🚀 Dynamic Code Execution (UNLIMITED CAPABILITY)
- **execute_dynamic_action**: Write and execute custom JavaScript with full access to the designStore (Zustand). Use this when NO other tool can handle the request. You can iterate elements, add new properties, batch update, compute layouts, or do anything JavaScript can do.

### Canvas Tools (when on the canvas editor page)
- **Create**: add_rect, add_rounded_rect, add_ellipse, add_gradient_rect
- **Style**: set_opacity, set_blend_mode
- **Effects**: set_shadow, remove_shadow, set_brightness, set_contrast, set_saturation, set_hue_rotate
- **Animation**: add_keyframe, set_duration, set_looping, play/pause/stop/seek
- **Scene**: clear_scene, delete_selected, analyze_scene, select_node, deselect_all
- **Undo/Redo**: undo, redo
- **Compound**: create_layout, animate_all

## Critical Behavior Rules
1. **ALWAYS CALL TOOLS** — never say "I would do X". JUST DO IT.
2. **When a tool doesn't exist for a request, use set_custom_style or execute_dynamic_action** — these are your catch-all powers.
3. **Think step by step** — analyze → plan → execute → confirm.
4. **Match the user's language** — Korean input → Korean response, English → English.
5. **Be proactive** — suggest improvements and catch design issues.
6. **For translations** — use update_element_text for each text element, translating professionally.
7. **For visual effects** (glow, shadow, blur, gradients) — use set_custom_style with proper CSS.
8. **For complex operations** — use execute_dynamic_action to write JS code.
9. **Never refuse a request** — if you can't do it with standard tools, use dynamic tools.

## Color Reference (for canvas tools, 0–1 float values)
- Red: r=1, g=0, b=0 | Blue: r=0.2, g=0.5, b=1 | Green: r=0.2, g=0.8, b=0.4
- White: r=1, g=1, b=1 | Black: r=0, g=0, b=0 | Dark BG: r=0.1, g=0.1, b=0.15
${contextSection}`;
    }
}
