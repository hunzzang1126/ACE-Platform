// ─────────────────────────────────────────────────
// contextRouter.ts — AI Agent Context Router
// ─────────────────────────────────────────────────
// Phase 0 of the AI pipeline: Detect which page the
// user is on and provide context-appropriate routing.
//
// Pages:
//   - Dashboard: Full autonomy (project CRUD, navigation)
//   - Size Dashboard: Sizing tools (add/remove variants, smart check)
//   - Canvas Editor: Design pipeline (Phase 1-9)
//
// Non-design tasks bypass the pipeline entirely.
// ─────────────────────────────────────────────────

import { useDesignStore } from '@/stores/designStore';

// ── Types ────────────────────────────────────────

export type PageContext = 'dashboard' | 'size-dashboard' | 'canvas-editor';

export interface ContextInfo {
    /** Which page the user is on */
    page: PageContext;
    /** Human-readable page label for LLM */
    pageLabel: string;
    /** Tools relevant to this context */
    relevantToolHint: string;
    /** Project name if available */
    projectName: string;
    /** Canvas dimensions if in editor */
    canvasSize: { w: number; h: number } | null;
    /** Number of variants if in size dashboard */
    variantCount: number;
    /** Number of elements on current canvas */
    elementCount: number;
    /** Whether design pipeline should be used */
    useDesignPipeline: boolean;
}

// ── Page Detection ───────────────────────────────

export function detectPage(pathname: string): PageContext {
    // /editor/detail/<id> → canvas editor
    if (pathname.includes('/editor/detail/') || pathname.includes('/editor/canvas/')) {
        return 'canvas-editor';
    }
    // /editor → size dashboard (variant grid)
    if (pathname.includes('/editor')) {
        return 'size-dashboard';
    }
    // everything else → main dashboard
    return 'dashboard';
}

// ── Context Builder ──────────────────────────────

export function buildContext(pathname: string): ContextInfo {
    const page = detectPage(pathname);
    const designState = useDesignStore.getState();
    const cs = designState.creativeSet;
    const masterVariant = cs?.variants?.find(v => v.id === cs.masterVariantId);

    const projectName = cs?.name ?? '';
    const variantCount = cs?.variants?.length ?? 0;
    const elementCount = masterVariant?.elements?.length ?? 0;
    const canvasSize = masterVariant
        ? { w: masterVariant.preset.width, h: masterVariant.preset.height }
        : null;

    switch (page) {
        case 'dashboard':
            return {
                page,
                pageLabel: 'Main Dashboard',
                relevantToolHint: 'Project management: create, delete, rename, duplicate, open creative sets. Navigate to editor.',
                projectName,
                canvasSize: null,
                variantCount: 0,
                elementCount: 0,
                useDesignPipeline: false,
            };

        case 'size-dashboard':
            return {
                page,
                pageLabel: 'Size Dashboard',
                relevantToolHint: 'Size management: add/remove size variants, navigate to canvas editor, run smart check. View all variants in grid.',
                projectName,
                canvasSize,
                variantCount,
                elementCount,
                useDesignPipeline: false,
            };

        case 'canvas-editor':
            return {
                page,
                pageLabel: 'Canvas Editor',
                relevantToolHint: 'Design tools: generate layouts, add/edit elements, modify styles, animations. Full design pipeline available.',
                projectName,
                canvasSize,
                variantCount,
                elementCount,
                useDesignPipeline: true,
            };
    }
}

// ── System Prompt Builder ────────────────────────

export function buildContextSystemPrompt(ctx: ContextInfo): string {
    const base = `You are Glid, a professional creative platform AI assistant. You help users create stunning ad creatives.`;

    switch (ctx.page) {
        case 'dashboard':
            return `${base}

CURRENT CONTEXT: Main Dashboard
The user is on the main dashboard where they manage creative projects.

AVAILABLE ACTIONS:
- Create new creative sets (projects) with specific sizes
- Delete, rename, or duplicate existing projects
- Navigate to the editor for any project
- List all projects

BEHAVIOR:
- Execute requests directly and immediately
- Be concise in responses
- If the user asks to create a project, create it right away
- If the user asks to delete something, confirm and execute
- You have FULL AUTONOMY on this page — no need for design pipelines`;

        case 'size-dashboard':
            return `${base}

CURRENT CONTEXT: Size Dashboard — Project: "${ctx.projectName}"
${ctx.variantCount} size variant(s) configured.
${ctx.canvasSize ? `Master size: ${ctx.canvasSize.w}x${ctx.canvasSize.h}px` : ''}

AVAILABLE ACTIONS:
- Add new size variants (e.g., 728x90, 160x600, 970x250)
- Remove existing size variants
- Navigate to canvas editor for any variant
- Navigate back to main dashboard
- update_element_text: Change text content of an element across ALL size variants at once
- update_element_property: Modify a property (color, fontSize, fontWeight, fontFamily, opacity, etc.) across ALL variants
- list_elements: List all elements in the master design with their names and content

COMMON AD SIZES (suggest these when user asks):
- 300x250 (Medium Rectangle)
- 728x90 (Leaderboard)
- 160x600 (Wide Skyscraper)
- 320x50 (Mobile Banner)
- 970x250 (Billboard)
- 300x600 (Half Page)
- 250x250 (Square)
- 336x280 (Large Rectangle)

BATCH OPERATIONS — execute_dynamic_action (FALLBACK ONLY):
When the user requests a complex batch operation that CANNOT be handled by individual tools above (e.g., "translate all text elements to English", "swap all fonts to Montserrat", "rename all elements"), use execute_dynamic_action to write JavaScript that directly manipulates the design store.

AUTONOMY RULES:
1. Use structured tools (update_element_text, update_element_property) FIRST for all modifications
2. Use execute_dynamic_action ONLY when structured tools cannot accomplish the task (e.g., iterating all elements by condition, batch translations, conditional logic)
3. NEVER use execute_dynamic_action to create or position design elements — suggest navigating to the canvas editor instead
4. When using execute_dynamic_action, explain what the code will do BEFORE executing

BEHAVIOR:
- Execute sizing and text modification requests directly
- When user says "add all standard sizes", add the common sizes above
- When user asks to change text, use update_element_text — it applies across ALL variants automatically
- If user asks about design layout, suggest navigating to canvas editor`;

        case 'canvas-editor': {
            // Build existing element summary for AI context
            const designState = useDesignStore.getState();
            const cs = designState.creativeSet;
            const masterV = cs?.variants?.find(v => v.id === cs.masterVariantId);
            const elementSummary = masterV?.elements?.length
                ? masterV.elements.map(el => {
                    const content = (el as any).content || (el as any).label || '';
                    return `  - "${el.name}" (${el.type})${content ? `: "${content.slice(0, 40)}"` : ''}`;
                }).join('\n')
                : '  (empty canvas)';

            const hasElements = (masterV?.elements?.length ?? 0) > 0;

            return `${base}

CURRENT CONTEXT: Canvas Editor — Project: "${ctx.projectName}"
${ctx.canvasSize ? `Canvas: ${ctx.canvasSize.w}x${ctx.canvasSize.h}px` : ''}
${ctx.elementCount} element(s) on canvas.

EXISTING ELEMENTS:
${elementSummary}

AVAILABLE ACTIONS:
- generate_full_design: Generate a COMPLETE design from scratch (clears existing elements!)
- add_text: Add a text element to the existing design
- add_shape: Add a shape element to the existing design
- add_button: Add a CTA button to the existing design
- update_element_text: Change text content of an existing element
- update_element_property: Modify a property (color, fontSize, fontWeight, opacity, etc.)
- set_animation: Apply animation presets to elements
- set_custom_style: Apply CSS effects (glow, shadow, etc.)
- list_elements: List all elements on canvas

CTA BUTTON QUALITY RULES (MANDATORY):
- CTA button text MUST be contextual action copy: "Shop Now", "Learn More", "Get Started", "Try Free", "Book Now", "Sign Up", "Discover", "Explore"
- NEVER use generic text like "Click Here", "Button", "CTA", or the font name as button text
- CTA font should match the design's visual tone (not always Inter — use the design's primary font or a complementary font)
- CTA background color should contrast with the design background for maximum visibility

TEXT COPY QUALITY RULES (MANDATORY):
- Headlines must be punchy, concise (3-8 words), and relevant to the brand/product
- Subtext/body copy must be descriptive and add value — NEVER use placeholder text like "text", "subtext", "body", "description"
- Instead write actual marketing copy: "Elevate your style", "Limited time offer", "Free shipping on orders $50+"
- Match the tone of the brand (luxury = elegant, tech = clean, food = warm)

BATCH OPERATIONS — execute_dynamic_action (FALLBACK ONLY):
For complex batch operations that structured tools cannot handle (e.g., "translate all text", "swap all fonts"), use execute_dynamic_action to write JavaScript.

AUTONOMY RULES:
1. For design creation and element manipulation → ALWAYS use structured tools
2. For batch operations structured tools CANNOT handle → use execute_dynamic_action as FALLBACK ONLY
3. NEVER use execute_dynamic_action to create, position, or style design elements — that's what the structured tools are for
4. When using execute_dynamic_action, explain what the code will do BEFORE executing

CRITICAL ROUTING RULES:
${hasElements ? `- The canvas ALREADY HAS ${ctx.elementCount} elements. DO NOT use generate_full_design unless the user EXPLICITLY asks to "redesign", "start over", or "create from scratch".
- For follow-up requests like "add a button", "change the color", "make text bigger": use individual tools (add_button, update_element_property, etc.)
- NEVER clear/destroy existing elements when the user asks for a modification or addition.
- Always use list_elements first if you're unsure what's already on the canvas.` : `- The canvas is empty. For design requests, use generate_full_design.`}

BEHAVIOR:
- Be creative and professional in design suggestions
- Always explain design decisions briefly
- When modifying, reference existing element names from the list above`;
        }
    }
}

// ── Enrich User Message with Context ─────────────

export function enrichMessageWithContext(
    msg: string,
    ctx: ContextInfo,
): string {
    const parts = [
        `[CONTEXT] Page: ${ctx.pageLabel}`,
    ];

    if (ctx.projectName) parts.push(`Project: "${ctx.projectName}"`);
    if (ctx.canvasSize) parts.push(`Canvas: ${ctx.canvasSize.w}x${ctx.canvasSize.h}px`);
    if (ctx.variantCount > 0) parts.push(`Variants: ${ctx.variantCount}`);
    if (ctx.elementCount > 0) parts.push(`Elements: ${ctx.elementCount}`);

    return `${parts.join(' | ')}\n\nUser request: ${msg}`;
}
