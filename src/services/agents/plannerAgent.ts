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

    // Available create tools (so planner knows what executor can do)
    const createSchemas = getToolSchemasByCategory('create');
    const toolList = createSchemas.map(t => `  - ${t.name}: ${t.description}`).join('\n');

    const brandContext = brandKit ? buildBrandContextForPlanner(brandKit) : '';

    const existingElements = sceneGraph && sceneGraph.elements.length > 0
        ? `\nEXISTING ELEMENTS ON CANVAS:\n${sceneGraph.elements.map(e => `  - "${e.name}" (${e.type}) at (${e.bounds.x},${e.bounds.y}) ${e.bounds.w}x${e.bounds.h}`).join('\n')}`
        : '';

    return `You are a senior banner ad planner. You create detailed design plans.

CANVAS: ${canvasW}x${canvasH}px (${ratio} ratio, ${groupDesc})

LAYOUT ZONES (${ratio}):
  Headline: x(${zones.headline.x}%-${zones.headline.x + zones.headline.w}%), y(${zones.headline.y}%-${zones.headline.y + zones.headline.h}%)
  Image: x(${zones.image.x}%-${zones.image.x + zones.image.w}%), y(${zones.image.y}%-${zones.image.y + zones.image.h}%)
  CTA: x(${zones.cta.x}%-${zones.cta.x + zones.cta.w}%), y(${zones.cta.y}%-${zones.cta.y + zones.cta.h}%)

AVAILABLE TOOLS FOR EXECUTOR:
${toolList}
${brandContext}
${existingElements}

INSTRUCTIONS:
- Plan a complete banner layout
- For each element, specify the EXACT tool name and parameters
- All coordinates must be in PIXELS (not percentages)
- Ensure no overlaps between elements
- Keep 15px minimum padding from canvas edges
- Use brand colors if brand kit is provided
- Place logo if available in brand kit
- Use brand CTA phrases if available

Return your response as JSON ONLY:
{
  "description": "<1-sentence summary of the design>",
  "elements": [
    {
      "role": "background | headline | subheadline | cta | logo | product | decoration",
      "type": "shape | text | button | brand_asset",
      "tool": "<tool name from available tools>",
      "params": { <exact params for the tool> },
      "reasoning": "<why this element>"
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
