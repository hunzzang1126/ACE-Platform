// ─────────────────────────────────────────────────
// plannerAgent.ts — Design Planner (Agent 1/3)
// ─────────────────────────────────────────────────
// Receives: user prompt + scene graph + brand kit context
// Returns: DesignPlan (list of elements + tool calls)
// Does NOT execute tools — only plans.
// ─────────────────────────────────────────────────

import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';
import { buildBrandContextForPlanner } from '@/services/brandContextBuilder';
import { classifyRatio, LAYOUT_ZONES, classifyMasterGroup, getMasterGroupDescriptions } from '@/engine/smartSizing';
import { getToolSchemasByCategory } from '@/services/toolRegistry';
import { buildBannerStyleGuide } from '@/services/bannerDesignGuide';
import { buildTokenPromptForAI } from '@/services/designTokens';
import type { BrandKit } from '@/stores/brandKitStore';
import type { SceneGraph } from '@/services/sceneGraphBuilder';
import type { DesignPlan, PlannedElement, ProgressCallback } from './agentTypes';

// ── System Prompt ──

function buildPlannerSystemPrompt(
    canvasW: number, canvasH: number,
    brandKit: BrandKit | null,
    sceneGraph: SceneGraph | null,
): string {
    const ratio = classifyRatio(canvasW, canvasH);
    const zones = LAYOUT_ZONES[ratio];
    const groupType = classifyMasterGroup(canvasW, canvasH);
    const groupDesc = getMasterGroupDescriptions()[groupType];

    // Available tools — planner needs ALL categories for iterative refinement
    // (not just create — modify/structure tools are essential for "vibe designing")
    const createSchemas = getToolSchemasByCategory('create');
    const modifySchemas = getToolSchemasByCategory('modify');
    const structureSchemas = getToolSchemasByCategory('structure');
    const analyzeSchemas = getToolSchemasByCategory('analyze');

    const createToolList = createSchemas.map(t => `  - ${t.name}: ${t.description}`).join('\n');
    const modifyToolList = modifySchemas.map(t => `  - ${t.name}: ${t.description}`).join('\n');
    const structureToolList = structureSchemas.map(t => `  - ${t.name}: ${t.description}`).join('\n');
    const analyzeToolList = analyzeSchemas.map(t => `  - ${t.name}: ${t.description}`).join('\n');

    const brandContext = brandKit
        ? buildBrandContextForPlanner(brandKit) + '\n' + buildTokenPromptForAI(brandKit)
        : '';

    // Detect refinement mode: existing elements = iterative design session
    const isRefinement = sceneGraph && sceneGraph.elements.length > 0;

    const existingElements = isRefinement
        ? `\nEXISTING ELEMENTS ON CANVAS (${sceneGraph.elements.length} elements):\n${sceneGraph.elements.map(e => {
            const details = [
                `"${e.name}" (${e.type})`,
                `at (${e.bounds.x},${e.bounds.y}) ${e.bounds.w}x${e.bounds.h}`,
                e.style.fill ? `fill:${e.style.fill}` : '',
                e.style.fontSize ? `font:${e.style.fontSize}px` : '',
            ].filter(Boolean).join(' ');
            return `  - ${details}`;
        }).join('\n')}`
        : '';

    const refinementInstructions = isRefinement
        ? `
REFINEMENT MODE — You are iterating on an existing design.
- PREFER modify tools (setFill, setFont, setText, moveNode, resizeNode) over creating new elements
- Only add NEW elements if the user explicitly asks for them
- Keep the overall composition intact unless the user asks for a new layout
- When the user says "make it bolder" → increase font weight/size on existing text
- When "change to dark mode" → update background fill + adjust text colors for contrast
- When "more minimal" → remove/hide elements, increase whitespace, simplify
- When "add a CTA" → create a new button element, position it in the CTA zone
- ALWAYS explain what you changed and why in the "reasoning" field
`
        : '';

    // Banner Design Intelligence (Pencil-inspired style guide)
    const designGuide = buildBannerStyleGuide(canvasW, canvasH);

    return `You are a world-class banner ad art director. You create designs that rival Apple, Nike, and premium agency work.

${designGuide}

CANVAS: ${canvasW}x${canvasH}px (${ratio} ratio, ${groupDesc})

LAYOUT ZONES (${ratio}):
  Headline: x(${zones.headline.x}%-${zones.headline.x + zones.headline.w}%), y(${zones.headline.y}%-${zones.headline.y + zones.headline.h}%)
  Image: x(${zones.image.x}%-${zones.image.x + zones.image.w}%), y(${zones.image.y}%-${zones.image.y + zones.image.h}%)
  CTA: x(${zones.cta.x}%-${zones.cta.x + zones.cta.w}%), y(${zones.cta.y}%-${zones.cta.y + zones.cta.h}%)

AVAILABLE TOOLS:

CREATE (add new elements):
${createToolList}

MODIFY (change existing elements):
${modifyToolList}

STRUCTURE (organize/delete):
${structureToolList}

ANALYZE (inspect design):
${analyzeToolList}
${brandContext}
${existingElements}
${refinementInstructions}

INSTRUCTIONS:
- Follow the BANNER DESIGN INTELLIGENCE rules above precisely
- Plan a PREMIUM banner layout that would stop someone scrolling
- For each element, specify the EXACT tool name and parameters
- All coordinates must be in PIXELS (not percentages)
- Ensure no overlaps between elements
- Respect safe margins from the banner profile
- Use brand colors if brand kit is provided
- Place logo if available in brand kit
- Use brand CTA phrases if available
- Apply RULE OF THIRDS for element placement
- Create clear visual hierarchy: headline draws eye first, then visual, then CTA

Return your response as JSON ONLY:
{
  "description": "<1-sentence summary of the design>",
  "elements": [
    {
      "role": "background | headline | subheadline | cta | logo | product | decoration",
      "type": "shape | text | button | brand_asset",
      "tool": "<tool name from available tools>",
      "params": { <exact params for the tool> },
      "reasoning": "<why this element and these values>"
    }
  ],
  "colorPalette": ["#hex1", "#hex2", ...],
  "fontChoices": { "heading": "FontName", "body": "FontName", "cta": "FontName" }
}`;
}

// ── Run Planner ──

export async function runPlanner(
    userPrompt: string,
    canvasW: number,
    canvasH: number,
    brandKit: BrandKit | null,
    sceneGraph: SceneGraph | null,
    signal: AbortSignal,
    onProgress?: ProgressCallback,
): Promise<DesignPlan> {
    const start = Date.now();
    onProgress?.('Planning design layout...', 'planner');

    const systemPrompt = buildPlannerSystemPrompt(canvasW, canvasH, brandKit, sceneGraph);

    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
            { role: 'user', content: `Design request: "${userPrompt}"\n\nReturn the design plan as JSON.` },
        ],
    };

    const data = await callAnthropicApi(body, signal) as {
        content: Array<{ type: string; text?: string }>;
    };

    const rawText = data.content.find(c => c.type === 'text')?.text ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Planner did not return valid JSON');
    }

    const plan = JSON.parse(jsonMatch[0]) as DesignPlan;

    // Validate plan has elements
    if (!plan.elements || plan.elements.length === 0) {
        throw new Error('Planner returned empty design plan');
    }

    const duration = Date.now() - start;
    onProgress?.(`Plan ready: ${plan.elements.length} elements (${duration}ms)`, 'planner');

    return plan;
}
