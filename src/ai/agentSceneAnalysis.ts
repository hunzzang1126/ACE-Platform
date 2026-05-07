// ─────────────────────────────────────────────────
// agentSceneAnalysis — Scene extraction, spatial reasoning, prompt building
// ─────────────────────────────────────────────────

import type { SceneNodeInfo } from './agentContext';
import { ALL_TOOLS } from './agentTools';
import { skillsToPromptSection } from './skillRegistry';
import { contextToPromptSection, type SmartContext } from './smartContextBuilder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

interface SpatialRelation {
    nodeA: number; nodeB: number;
    relation: 'overlapping' | 'adjacent' | 'aligned_h' | 'aligned_v' | 'contains' | 'above' | 'below' | 'left_of' | 'right_of';
    distance?: number;
}

// ── Scene Node Extraction ──

export function extractSceneNodes(engine: Engine): SceneNodeInfo[] {
    const nodes: SceneNodeInfo[] = [];
    try {
        const raw = engine.get_all_nodes?.() as string | undefined;
        if (!raw) return nodes;
        const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
        for (const n of parsed) {
            const id = Number(n.id ?? 0);
            const rawType = String(n.type ?? 'rect');
            const type = (['rect', 'rounded_rect', 'ellipse', 'text', 'image'].includes(rawType) ? rawType : 'unknown') as SceneNodeInfo['type'];
            const fillR = Number(n.fill_r ?? 0.5), fillG = Number(n.fill_g ?? 0.5), fillB = Number(n.fill_b ?? 0.5);
            const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
            const colorHex = `#${toHex(fillR)}${toHex(fillG)}${toHex(fillB)}`;
            const name = String(n.name ?? '');
            const content = n.content ? String(n.content) : undefined;
            const label = name || (content ? `"${content.slice(0, 30)}" (${type})` : `${type} #${id}`);
            nodes.push({
                id, type, x: Number(n.x ?? 0), y: Number(n.y ?? 0), width: Number(n.w ?? 0), height: Number(n.h ?? 0),
                color: n.color ? String(n.color) : colorHex, opacity: Number(n.opacity ?? 1), zIndex: Number(n.z_index ?? 0), label,
                effects: { hasShadow: false, brightness: 1, contrast: 1, saturation: 1, hueRotate: 0, blendMode: 'normal' }, animations: [],
                ...(content ? { _content: content } : {}),
                ...(n.fontSize ? { _fontSize: Number(n.fontSize) } : {}),
                ...(n.fontFamily ? { _fontFamily: String(n.fontFamily) } : {}),
            } as SceneNodeInfo);
        }
    } catch { /* */ }
    return nodes;
}

// ── Scene RAG ──

export function buildSceneRAG(engine: Engine, trackedNodes: SceneNodeInfo[]): string {
    const lines: string[] = [];
    lines.push(`## Current Canvas State`);
    lines.push(`- Total elements: ${engine.node_count?.() ?? 0}`);
    lines.push(`- Animation playing: ${engine.anim_playing?.() ? 'yes' : 'no'}`);
    lines.push(`- Animation time: ${(engine.anim_time?.() ?? 0).toFixed(2)}s / ${(engine.anim_duration?.() ?? 0).toFixed(2)}s`);
    try { const selJson = engine.get_selection?.(); if (selJson) { const sel = JSON.parse(selJson) as number[]; lines.push(`- Selected nodes: ${sel.length > 0 ? sel.join(', ') : 'none'}`); } } catch { /* */ }
    if (trackedNodes.length > 0) {
        lines.push('', '### Elements on Canvas');
        for (const node of trackedNodes) {
            lines.push(`  - **${node.label}** (id=${node.id}): ${node.type} at (${node.x}, ${node.y}), size ${node.width}×${node.height}, color ${node.color}, opacity ${node.opacity}`);
            if (node.effects.hasShadow) lines.push(`    - Shadow applied`);
            if (node.effects.brightness !== 1.0) lines.push(`    - Brightness: ${node.effects.brightness}`);
            if (node.animations.length > 0) lines.push(`    - Animations: ${node.animations.join(', ')}`);
        }
        const relations = detectSpatialRelations(trackedNodes);
        if (relations.length > 0) {
            lines.push('', '### Spatial Relationships');
            for (const rel of relations) {
                const a = trackedNodes.find(n => n.id === rel.nodeA), b = trackedNodes.find(n => n.id === rel.nodeB);
                if (a && b) lines.push(`  - ${a.label} is ${rel.relation.replace('_', ' ')} ${b.label}`);
            }
        }
    }
    return lines.join('\n');
}

// ── Spatial Relations ──

export function detectSpatialRelations(nodes: SceneNodeInfo[]): SpatialRelation[] {
    const relations: SpatialRelation[] = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i]!, b = nodes[j]!;
            const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
            const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
            if (overlapX && overlapY) { relations.push({ nodeA: a.id, nodeB: b.id, relation: 'overlapping' }); continue; }
            if (Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) < 5) relations.push({ nodeA: a.id, nodeB: b.id, relation: 'aligned_h' });
            if (Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) < 5) relations.push({ nodeA: a.id, nodeB: b.id, relation: 'aligned_v' });
            if (a.y + a.height < b.y) relations.push({ nodeA: a.id, nodeB: b.id, relation: 'above', distance: b.y - (a.y + a.height) });
            else if (b.y + b.height < a.y) relations.push({ nodeA: a.id, nodeB: b.id, relation: 'below', distance: a.y - (b.y + b.height) });
            if (a.x + a.width < b.x) relations.push({ nodeA: a.id, nodeB: b.id, relation: 'left_of', distance: b.x - (a.x + a.width) });
            else if (b.x + b.width < a.x) relations.push({ nodeA: a.id, nodeB: b.id, relation: 'right_of', distance: a.x - (b.x + b.width) });
        }
    }
    return relations;
}

// ── Mention Resolution ──

export function resolveMention(mention: string, nodes: SceneNodeInfo[]): number | null {
    const clean = mention.replace('@', '').toLowerCase().trim();
    const exact = nodes.find(n => n.label.toLowerCase() === clean);
    if (exact) return exact.id;
    const partial = nodes.find(n => n.label.toLowerCase().includes(clean) || clean.includes(n.type));
    if (partial) return partial.id;
    const idMatch = clean.match(/\d+/);
    if (idMatch) { const id = parseInt(idMatch[0]); if (nodes.some(n => n.id === id)) return id; }
    return null;
}

// ── Design Intent ──

export function inferDesignIntent(nodes: SceneNodeInfo[]): string {
    if (nodes.length === 0) return 'Empty canvas — ready for new design.';
    if (nodes.length === 1) return 'Single element on canvas.';
    const xPositions = [...new Set(nodes.map(n => Math.round(n.x / 10) * 10))];
    const yPositions = [...new Set(nodes.map(n => Math.round(n.y / 10) * 10))];
    if (xPositions.length > 2 && yPositions.length > 2) return `Grid-like layout detected (${xPositions.length} columns × ${yPositions.length} rows).`;
    if (nodes.every(n => Math.abs(n.y - nodes[0]!.y) < 10) && nodes.length > 2) return `Horizontal row of ${nodes.length} elements.`;
    if (nodes.every(n => Math.abs(n.x - nodes[0]!.x) < 10) && nodes.length > 2) return `Vertical column of ${nodes.length} elements.`;
    return `Freeform layout with ${nodes.length} elements.`;
}

// ── System Prompt ──

export function buildSystemPrompt(engine: Engine, trackedNodes: SceneNodeInfo[], smartCtx?: SmartContext): string {
    const hasEngine = !!engine;
    const sceneRAG = hasEngine ? buildSceneRAG(engine, trackedNodes) : '';
    const intent = inferDesignIntent(trackedNodes);
    const canvasIsEmpty = trackedNodes.length === 0;

    let contextSection: string;
    if (smartCtx) {
        contextSection = '\n' + contextToPromptSection(smartCtx);
        if (hasEngine) contextSection += `\n\n## Design Intent\n${intent}\n\n${sceneRAG}`;
    } else if (hasEngine) {
        contextSection = `\n## Design Intent\n${intent}\n\n${sceneRAG}`;
    } else {
        contextSection = '\n## Current Context\nYou are on the dashboard or editor page. No canvas engine is active.\nUse dashboard tools to manage creative sets, sizes, and navigation.';
    }

    const toolsByCategory: Record<string, string[]> = {};
    for (const tool of ALL_TOOLS) { const cat = tool.category ?? 'other'; if (!toolsByCategory[cat]) toolsByCategory[cat] = []; toolsByCategory[cat].push(`${tool.name}: ${tool.description.slice(0, 120)}`); }
    const toolCatalog = Object.entries(toolsByCategory).map(([cat, tools]) => `### ${cat.toUpperCase()}\n${tools.map(t => `- ${t}`).join('\n')}`).join('\n\n');

    return `You are Glid AI — creative director for ACE platform. You EXECUTE tools, never just describe.

${canvasIsEmpty ? `> Canvas is EMPTY.
> ★ For ANY "make/create/design an ad" request → ALWAYS use generate_full_design. It creates the COMPLETE design (background + headline + subheadline + CTA + image).
> ★ NEVER use generate_image alone on empty canvas — it only places an image with NO text, NO layout, NO CTA.
> ★ generate_full_design handles EVERYTHING: layout, typography, colors, CTA, and background image (if needed).` : '> Canvas has elements. Modify existing — do NOT use generate_full_design unless user says "start over".'}

## ★ SINGLE-ROUND COMPLETION (ABSOLUTE RULE)
You get EXACTLY ONE tool call round. Batch ALL tools in ONE response.
- New design request → use \`generate_full_design\` **ALONE** (no other tools in the same call)
- ★ generate_full_design creates the ENTIRE design. Do NOT add update_element_text, add_text, or add_button alongside it.
- Background image → \`set_canvas_background\` + \`fill_to_page\` in PARALLEL
- Multiple edits → all \`set_position\`/\`set_size\`/\`set_color\` in PARALLEL
- After ANY image placement → ALWAYS call \`fill_to_page\` (cover fit, aspect ratio preserved)
- NEVER call \`navigate_to\` from editor

## ★ CTA & BUTTON REQUESTS
When user asks for a CTA, button, or "만들어줘" (make it):
- Use \`add_button\` tool — it creates BOTH the background shape AND text label automatically.
- NEVER use execute_dynamic_action for creating buttons — it's error-prone.
- Default: text="Shop Now", bgColor from palette accent, textColor="#ffffff".
- Korean CTAs: "지금 구매", "자세히 보기", "시작하기", "무료 체험"

## ★ FONT CHANGES
When user asks to change fonts or make text prettier:
- Use \`update_element_property\` with property="fontFamily"
- Available Google Fonts:
  Sans: Inter, DM Sans, Space Grotesk, Outfit, Sora, Montserrat, Poppins, Roboto, Oswald, Raleway, Nunito
  Serif: Playfair Display, DM Serif Display, Cormorant Garamond, Libre Baskerville, Lora
  Display: Bebas Neue, Anton
- Apply to headline AND subheadline — use different fonts for each.
- Example: headline → "Playfair Display", subheadline → "DM Sans"
- NEVER return "Inter" for both — that's boring.

## STORE API (for execute_dynamic_action)
\`\`\`js
// Read elements
const cs = useDesignStore.getState().creativeSet;
const els = cs.variants[0].elements;
// Update element property across all variants
useDesignStore.setState(state => {
  for (const v of state.creativeSet.variants) {
    for (const el of v.elements) {
      if (el.name.toLowerCase().includes('headline')) el.fontFamily = 'Playfair Display';
    }
  }
});
\`\`\`

## RULES
1. Execute tools, never just describe. Assign roles to elements (headline, subline, cta, background, etc).
2. Center text with align="center". Max 8-10 elements. Match user's language.
3. No-overlap: min gap = fontSize×0.5 (min 8px). Headline weight 800, sub 600, CTA 700.
4. "bigger"=×1.25, "smaller"=×0.8, "center it"=(canvasW-elemW)/2. Read CURRENT values first.
5. "this"/"selected" = currently selected element. "it"/"that" = recently modified.
${contextSection}`;
}

// ── Healing Prompt ──

export function buildHealingPrompt(
    issues: Array<{ type: string; severity: string; element?: string; description: string; suggestion?: string }>,
    sceneNodes: SceneNodeInfo[], canvasW: number, canvasH: number, score: number,
): string {
    const issueList = issues.map((iss, i) => `  ${i + 1}. [${iss.severity.toUpperCase()}] ${iss.type}: ${iss.description}${iss.element ? ` (element: "${iss.element}")` : ''}${iss.suggestion ? ` → Suggestion: ${iss.suggestion}` : ''}`).join('\n');
    const elementList = sceneNodes.map(n => { const content = (n as SceneNodeInfo & { _content?: string })._content; return `  • "${n.label}" (${n.type}, id=${n.id}) at (${Math.round(n.x)}, ${Math.round(n.y)}) size ${Math.round(n.width)}x${Math.round(n.height)}${content ? ` text="${content}"` : ''}`; }).join('\n');

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
