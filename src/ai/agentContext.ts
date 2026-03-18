// ─────────────────────────────────────────────────
// AI Agent Context — Scene RAG + Spatial Reasoning
// ─────────────────────────────────────────────────
// Provides the AI with deep understanding of the canvas state,
// spatial relationships, and design intent.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

import { buildSmartContext, contextToPromptSection, type SmartContext } from './smartContextBuilder';

/**
 * Chat message with tool execution history.
 */
export interface AgentMessage {
    role: 'user' | 'assistant' | 'system' | 'action';
    content: string;
    timestamp: number;
    /** AI phases visible in live progress */
    phases?: AgentPhase[];
    /** Tool calls executed during this message */
    toolCalls?: ToolCallRecord[];
    /** Action card data — only when role === 'action' */
    actionCard?: {
        id: string;
        label: string;
        status: 'pending' | 'running' | 'done' | 'error';
        detail?: string;
        reasoning?: string;
        expandedDetail?: string;
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

/**
 * Scene node info extracted from engine.
 */
export interface SceneNodeInfo {
    id: number;
    type: 'rect' | 'rounded_rect' | 'ellipse' | 'gradient_rect' | 'text' | 'unknown';
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
     * Parses the JSON from engine.get_all_nodes() (Fabric shim or WASM).
     */
    static extractSceneNodes(engine: Engine): SceneNodeInfo[] {
        const nodes: SceneNodeInfo[] = [];
        try {
            const raw = engine.get_all_nodes?.() as string | undefined;
            if (!raw) return nodes;
            const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;

            for (const n of parsed) {
                const id = Number(n.id ?? 0);
                const rawType = String(n.type ?? 'rect');
                const type = (['rect', 'rounded_rect', 'ellipse', 'text', 'image'].includes(rawType)
                    ? rawType : 'unknown') as SceneNodeInfo['type'];

                const fillR = Number(n.fill_r ?? 0.5);
                const fillG = Number(n.fill_g ?? 0.5);
                const fillB = Number(n.fill_b ?? 0.5);
                const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
                const colorHex = `#${toHex(fillR)}${toHex(fillG)}${toHex(fillB)}`;

                const name = String(n.name ?? '');
                const content = n.content ? String(n.content) : undefined;
                const label = name || (content ? `"${content.slice(0, 30)}" (${type})` : `${type} #${id}`);

                nodes.push({
                    id,
                    type,
                    x: Number(n.x ?? 0),
                    y: Number(n.y ?? 0),
                    width: Number(n.w ?? 0),
                    height: Number(n.h ?? 0),
                    color: n.color ? String(n.color) : colorHex,
                    opacity: Number(n.opacity ?? 1),
                    zIndex: Number(n.z_index ?? 0),
                    label,
                    effects: {
                        hasShadow: false,
                        brightness: 1,
                        contrast: 1,
                        saturation: 1,
                        hueRotate: 0,
                        blendMode: 'normal',
                    },
                    animations: [],
                    // Extra fields for AI context (not in SceneNodeInfo type,
                    // but available via the JSON and used in prompt building)
                    ...(content ? { _content: content } : {}),
                    ...(n.fontSize ? { _fontSize: Number(n.fontSize) } : {}),
                    ...(n.fontFamily ? { _fontFamily: String(n.fontFamily) } : {}),
                } as SceneNodeInfo);
            }
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
     * ★ AUTO-DISCOVERY: The AI learns ALL its capabilities from the actual tool registry.
     * No hardcoded tool lists — when we add new tools, the AI automatically knows.
     */
    static buildSystemPrompt(
        engine: Engine,
        trackedNodes: SceneNodeInfo[],
        smartCtx?: SmartContext,
    ): string {
        const hasEngine = !!engine;
        const sceneRAG = hasEngine ? AgentContext.buildSceneRAG(engine, trackedNodes) : '';
        const intent = AgentContext.inferDesignIntent(trackedNodes);
        const elementCount = trackedNodes.length;
        const canvasIsEmpty = elementCount === 0;

        // Smart Context replaces generic context when available
        let contextSection: string;
        if (smartCtx) {
            contextSection = '\n' + contextToPromptSection(smartCtx);
            if (hasEngine) {
                contextSection += `\n\n## Design Intent\n${intent}\n\n${sceneRAG}`;
            }
        } else if (hasEngine) {
            contextSection = `\n## Design Intent\n${intent}\n\n${sceneRAG}`;
        } else {
            contextSection = `\n## Current Context\nYou are on the dashboard or editor page. No canvas engine is active.\nUse dashboard tools to manage creative sets, sizes, and navigation.`;
        }

        // ── Auto-discover tool catalog from registry ──
        const { ALL_TOOLS } = require('./agentTools');
        const toolsByCategory: Record<string, string[]> = {};
        for (const tool of ALL_TOOLS) {
            const cat = tool.category ?? 'other';
            if (!toolsByCategory[cat]) toolsByCategory[cat] = [];
            toolsByCategory[cat].push(`${tool.name}: ${tool.description.slice(0, 120)}`);
        }
        const toolCatalog = Object.entries(toolsByCategory)
            .map(([cat, tools]) => `### ${cat.toUpperCase()}\n${tools.map(t => `- ${t}`).join('\n')}`)
            .join('\n\n');

        return `You are Glid AI — a world-class creative director and design AI for ACE, a full creative platform.
You create premium, polished creatives (banners, social posts, display ads, rich media). You EXECUTE by calling tools — never just describe.

## YOUR COMPLETE SKILL SET (Auto-Discovered)

You have access to ALL of these tools. Use them freely and creatively:

${toolCatalog}

## ★★★ SKILL ROUTER — WHICH SKILL TO USE ★★★

You have 5 core skills. ALWAYS pick the right one:

### SKILL 1: Full Design Pipeline (generate_full_design)
WHEN: Canvas is EMPTY and user wants a complete new design.
HOW: Pass the full prompt. The pipeline handles colors, layout, copy, rendering.
${canvasIsEmpty ? '→ Canvas is currently EMPTY. This skill is appropriate for "create/design/make" requests.' : '→ Canvas has elements. Do NOT use this unless user says "start over" / "redesign" / "from scratch".'}

### SKILL 2: Atomic Modification (set_position, set_size, set_text, set_fill_hex, set_font_size, set_color, remove_node)
WHEN: Canvas has elements and user wants to change something specific.
HOW: Find the element by name/id from "Elements on Canvas", then call the right tool.
Examples: "move headline up" → set_position, "make CTA red" → set_fill_hex, "change text to X" → set_text

### SKILL 3: Visual Effects (set_custom_style)
WHEN: User wants visual effects like glow, shadows, glassmorphism, gradient text.
HOW: Use set_custom_style with CSS property recipes. You are a CSS expert — compose any effect.

**Effect Recipes you know:**
| Effect | set_custom_style recipe |
|---|---|
| Neon Glow | \`{ "textShadow": "0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 40px #ff00ff" }\` |
| Warm Neon | \`{ "textShadow": "0 0 10px #ff6b35, 0 0 20px #ff6b35, 0 0 40px #ff6b35" }\` |
| Ice Neon | \`{ "textShadow": "0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 40px #00d4ff" }\` |
| Glassmorphism | \`{ "background": "rgba(255,255,255,0.08)", "backdropFilter": "blur(12px)", "border": "1px solid rgba(255,255,255,0.15)", "borderRadius": "12px" }\` |
| Gold Text Shadow | \`{ "textShadow": "0 2px 4px rgba(201,168,76,0.5)" }\` |
| Embossed 3D | \`{ "textShadow": "0 1px 0 #ccc, 0 2px 0 #bbb, 0 3px 3px rgba(0,0,0,0.3)" }\` |
| Inner Glow | \`{ "boxShadow": "inset 0 0 20px rgba(59,130,246,0.3)" }\` |
| Card Elevation | \`{ "boxShadow": "0 4px 24px rgba(0,0,0,0.4)" }\` |
| Gradient Text | \`{ "backgroundImage": "linear-gradient(135deg, #ff6b6b, #feca57)", "WebkitBackgroundClip": "text", "WebkitTextFillColor": "transparent" }\` |
| Shimmer Border | \`{ "border": "2px solid transparent", "backgroundImage": "linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(135deg,#c9a84c,#f0d78c,#c9a84c)", "backgroundOrigin": "border-box", "backgroundClip": "padding-box,border-box" }\` |
| Soft Vignette | \`{ "boxShadow": "inset 0 0 60px rgba(0,0,0,0.5)" }\` |
| Fire Glow | \`{ "textShadow": "0 0 10px #ff4500, 0 0 20px #ff6347, 0 0 40px #ff0000" }\` |
| Electric Spark | \`{ "textShadow": "0 0 5px #fff, 0 0 10px #00bfff, 0 0 20px #1e90ff, 0 0 40px #0000ff" }\` |
| Retro Outline | \`{ "WebkitTextStroke": "1px rgba(255,255,255,0.3)" }\` |
| Frosted Panel | \`{ "background": "rgba(0,0,0,0.4)", "backdropFilter": "blur(20px) saturate(180%)", "borderRadius": "16px", "border": "1px solid rgba(255,255,255,0.1)" }\` |
You can compose ANY CSS effect — these are starting points. Mix, modify, and invent.

### SKILL 4: Animation (set_animation + stagger patterns)
WHEN: User wants entrance animations, motion, or dynamic feel.
HOW: Apply presets with staggered timing for professional sequences.
Presets: fade, slide-left, slide-right, slide-up, slide-down, scale, ascend, descend, none
Stagger pattern: 0.0s, 0.3s, 0.6s, 0.9s — sequential element entrance.

### SKILL 5: Element Creation (add_text, add_shape, add_button)
WHEN: User wants to ADD a single new element to an existing design.
HOW: Create just the requested element. Don't redesign everything.

## ★★★ LAYOUT TEMPLATES (12 available) ★★★

The pipeline uses these templates. You should understand them for intelligent layout discussions:
| Template | Best For | Aspect Ratios |
|---|---|---|
| centeredStack | Balanced general purpose | All |
| leftAlignedCard | Card-style left emphasis | Landscape, Square |
| boldHeadline | Hero text dominant | All |
| splitHorizontal | Two-column side by side | Ultra-wide, Landscape |
| diagonalSplit | Dynamic diagonal divide | Landscape, Square |
| topDownCascade | Sequential vertical flow | Portrait, Square |
| rightAligned | Right-weighted composition | Landscape |
| minimalClean | Whitespace-heavy premium | All |
| fullBleedHero | Full-canvas hero image | All |
| badgeFocus | Central badge/logo emphasis | Square |
| horizontalStrip | Horizontal band layout | Ultra-wide |
| tower | Tall vertical stack | Portrait |

## ★★★ DESIGN JUDGMENT ★★★

### CTA Decision
- ALWAYS CTA: E-commerce, sale, product launch, sign-up, subscription
- Optional CTA: Social post, event, brand awareness
- No CTA: Art/portfolio, infographic, editorial

### Typography Hierarchy
- Headline: weight 800, largest, accent or white
- Subheadline: weight 600, 60-70% of headline size
- Body: weight 400, white or light gray
- CTA: weight 700, uppercase, on accent background

### Font Size Scaling by Canvas
- Large canvas (300x250+): Headline 20-28px, Sub 14-16px
- Narrow (728x90): Headline 14-16px, Sub 10-12px
- Tiny (<200px): Reduce ALL by 30%

### No-Overlap Rule
Every element needs clear vertical space. Min gap: fontSize × 0.5 (min 8px).
Calculate: next_Y = previous_Y + previous_HEIGHT + gap

## ELEMENT RESOLUTION
1. Match by name/role from "Elements on Canvas"
2. For pronouns ("it", "that") → check "Recently Modified Elements"
3. Use element \`id\` for tool calls needing \`node_id\`
4. If ambiguous → ask user

## RULES
1. EXECUTE tools. Never just describe.
2. ALWAYS assign role to every element (logo, headline, subline, cta, tnc, hero, accent, background, detail, badge).
3. Center text with align="center".
4. Add animations after design complete.
5. Never split headline into multiple texts.
6. Max 8-10 elements per banner.
7. Match user's language in responses.
8. For text content, use user's preferred language.
9. For effects: compose CSS via set_custom_style — you know unlimited recipes.
10. Never refuse — use execute_dynamic_action as catch-all.
11. NEVER use generate_full_design when canvas has elements (unless user explicitly says "start over").
${contextSection}`;
    }

    /**
     * Build a healing-specific system prompt for Vision QA self-correction.
     * Called when the design scores below threshold and needs AI-driven fixes.
     */
    static buildHealingPrompt(
        issues: Array<{ type: string; severity: string; element?: string; description: string; suggestion?: string }>,
        sceneNodes: SceneNodeInfo[],
        canvasW: number,
        canvasH: number,
        score: number,
    ): string {
        const issueList = issues.map((iss, i) =>
            `  ${i + 1}. [${iss.severity.toUpperCase()}] ${iss.type}: ${iss.description}${iss.element ? ` (element: "${iss.element}")` : ''}${iss.suggestion ? ` → Suggestion: ${iss.suggestion}` : ''}`
        ).join('\n');

        const elementList = sceneNodes.map(n => {
            const content = (n as SceneNodeInfo & { _content?: string })._content;
            return `  • "${n.label}" (${n.type}, id=${n.id}) at (${Math.round(n.x)}, ${Math.round(n.y)}) size ${Math.round(n.width)}x${Math.round(n.height)}${content ? ` text="${content}"` : ''}`;
        }).join('\n');

        return `You are Glid Vision Healer — a design quality correction agent.

## Situation
A design was just generated on a ${canvasW}x${canvasH}px canvas.
Vision QA scored it **${score}/100** (threshold: 80).
Your job: FIX the issues below using atomic tools to raise the score above 80.

## Current Elements on Canvas
${elementList || '(no elements found)'}

## Issues Found by Vision QA
${issueList || '(no specific issues listed)'}

## Healing Strategy per Issue Type
- **overlap**: Move overlapping elements apart. Reduce font size if text wraps too much. Ensure 8-12px minimum gap between elements.
- **text_overflow / clipping**: Reduce font size, shrink element, or reposition to stay within canvas bounds (0,0 to ${canvasW},${canvasH}).
- **contrast**: Change text color or add/modify background shape behind text. Use set_color or set_fill_hex.
- **hierarchy**: Make headline the largest text. Subheadline should be 60-70% of headline size. CTA must be bold and visible.
- **spacing / crowding**: Redistribute elements evenly. Use vertical stacking with 10-16px gaps.
- **alignment**: Center-align text elements. Ensure CTA is horizontally centered.
- **readability**: If text is on a busy background, add a semi-transparent overlay shape behind text.

## RULES
1. Use ONLY atomic modification tools: set_position, set_size, set_font_size, set_color, set_fill_hex, remove_node.
2. **NEVER** call generate_full_design, render_banner, or create_layout — those would destroy the current design.
3. **NEVER** add new elements unless strictly necessary to fix contrast (e.g. a background overlay).
4. Fix the MOST SEVERE issues first (errors before warnings before suggestions).
5. Keep all elements within canvas bounds: x in [0, ${canvasW}], y in [0, ${canvasH}].
6. After applying fixes, respond with a brief summary of what you changed.
7. Minimum font size: 10px. Maximum: 72px.
8. If elements are overlapping, prefer reducing font sizes + adjusting Y positions over removing elements.`;
    }
}
