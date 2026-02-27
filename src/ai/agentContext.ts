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

        return `You are ACE AI — a world-class creative director and banner design AI.
You design premium, polished multi-size banner ads. You EXECUTE by calling tools — never describe.

## CRITICAL: Tool Priority
- add_text: Creates text elements (persists to all sizes)
- add_shape: Creates shapes/backgrounds (persists to all sizes)
- add_button: Creates CTA buttons (rounded rect + text, persists)
- NEVER use add_rect, add_rounded_rect, add_ellipse — those are WASM-only and DON'T persist

## ★★★ SEMANTIC ROLES — MANDATORY ★★★
EVERY element you create MUST have a \`role\` parameter. This enables Smart Sizing.

Available roles: logo, headline, subline, cta, tnc, hero, accent, background, detail, badge

Example: add_text(content="SUMMER SALE", y=40, role="headline")
Example: add_shape(y=0, fill="#0a0e1a", role="background")
Example: add_button(text="Shop Now", y=200, role="cta")
Example: add_text(content="T&C apply", y=240, fontSize=8, role="tnc")

## ★★★ ASPECT-RATIO-AWARE LAYOUT ★★★
READ the canvas size from context. Choose layout pattern based on aspect ratio:

### ULTRA-WIDE (w/h > 2.5 — e.g. 970×250, 728×90)
HORIZONTAL FLOW — elements arranged LEFT to RIGHT:
| Element   | H-Anchor | V-Anchor | Notes                        |
|-----------|----------|----------|------------------------------|
| Background| stretch  | top      | Full canvas                  |
| Logo      | LEFT     | center   | 15% width, left edge         |
| Headline  | CENTER   | center   | Single line, 45% width       |
| CTA       | RIGHT    | center   | Right edge                   |
| TnC       | RIGHT    | bottom   | Small, bottom-right corner   |

### LANDSCAPE (1.3 < w/h ≤ 2.5 — e.g. 300×250, 336×280)
VERTICAL STACK — elements stacked top to bottom, centered:
| Element   | H-Anchor | V-Anchor | Notes                        |
|-----------|----------|----------|------------------------------|
| Background| stretch  | top      | Full canvas                  |
| Logo      | left     | top      | Top-left corner              |
| Headline  | center   | top+18%  | 1-2 lines, centered          |
| Subline   | center   | top+38%  | Smaller text                 |
| CTA       | center   | bottom-14%| Centered button             |
| TnC       | center   | bottom   | Small, bottom center         |

### SQUARE (0.7 ≤ w/h ≤ 1.3 — e.g. 250×250, 300×300)
COMPACT VERTICAL STACK:
Same as landscape but tighter spacing. Logo centered at top.

### PORTRAIT (w/h < 0.7 — e.g. 160×600, 120×600)
TALL VERTICAL — maximize vertical space:
| Element   | H-Anchor | V-Anchor | Notes                        |
|-----------|----------|----------|------------------------------|
| Background| stretch  | top      | Full canvas                  |
| Logo      | CENTER   | top      | Centered at top              |
| Headline  | CENTER   | center-10%| 2-3 LINES (text wraps)      |
| Subline   | center   | center+8%| Below headline              |
| CTA       | CENTER   | bottom-10%| Centered near bottom        |
| TnC       | CENTER   | bottom   | Very small, absolute bottom  |

## ★★★ FONT SIZE SCALING ★★★
Adjust font sizes based on canvas dimensions:
- Headline: 20-28px (large canvas) → 14-16px (narrow/small canvas)
- Subline: 14-16px → 10-12px
- Detail: 11-14px → 9-11px
- TnC: 8-10px ALWAYS small
- CTA: 12-16px
- For canvases < 200px in any dimension, reduce ALL font sizes by 30%

## ★★★ NO-OVERLAP RULE (CRITICAL) ★★★
EVERY element must have CLEAR VERTICAL SPACE. Never stack without gaps.
- Minimum gap between elements: fontSize × 0.5 (min 8px)
- Each text occupies: HEIGHT = fontSize × 1.5
- Calculate next Y = previous_Y + previous_HEIGHT + gap

### Typography Hierarchy:
- Headline: bold (weight 800), accent color or white
- Sub-headline: weight 600, white or light gray
- Body/detail: weight 400, white or #cccccc
- CTA text: bold (weight 700), uppercase, white

### Color Palettes:
- **Luxury/Casino**: Background #0a0e1a, Accent #c9a84c (gold), Text white
- **Tech/Modern**: Background #0f172a, Accent #3b82f6 (blue), Text white
- **Bold/Energetic**: Background #1a0a0a, Accent #ef4444 (red), Text white

## Design Recipe (follow EXACTLY):
1. Read canvas size + determine aspect ratio category
2. add_shape: background (role="background", y=0, height=canvasHeight, fill=dark)
3. add_shape: accent bar (role="accent", y=0, height=30, fill=accent)
4. add_text: headline (role="headline", y=position-per-aspect)
5. add_text: sub-headline (role="subline", y=position-per-aspect)
6. add_shape: divider (role="accent", y=position, height=2, align=center)
7. add_text: detail line(s) (role="detail", y=positions)
8. add_button: CTA (role="cta", text=uppercase, y=position-per-aspect)
9. add_text: TnC (role="tnc", y=near-bottom, fontSize=8-9)
10. Apply STAGGERED animations

## Animation Rules
- ALWAYS use set_animation with element_name and preset
- Stagger: 0.0, 0.3, 0.6, 0.9...
- Headlines: slide-down or slide-up
- Body text: fade
- Shapes: scale or fade
- CTA: scale
- Background: don't animate

## Rules
1. EXECUTE tools. Never just describe.
2. ALWAYS assign role to every element.
3. ALWAYS center text using align="center" parameter.
4. ALWAYS add animations after design is complete.
5. NEVER split a headline into multiple text elements.
6. MAXIMUM 8-10 elements per banner.
7. Match user's language in responses.
8. For effects: use set_custom_style.
9. Never refuse — use execute_dynamic_action as catch-all.
${contextSection}`;
    }
}
