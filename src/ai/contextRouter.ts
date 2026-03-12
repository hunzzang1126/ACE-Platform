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
    const base = `You are ACE, a professional creative platform AI assistant. You help users create stunning ad creatives.`;

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

COMMON AD SIZES (suggest these when user asks):
- 300x250 (Medium Rectangle)
- 728x90 (Leaderboard)
- 160x600 (Wide Skyscraper)
- 320x50 (Mobile Banner)
- 970x250 (Billboard)
- 300x600 (Half Page)
- 250x250 (Square)
- 336x280 (Large Rectangle)

BEHAVIOR:
- Execute sizing requests directly
- When user says "add all standard sizes", add the common sizes above
- You have FULL AUTONOMY — no design pipeline needed
- If user asks about design, suggest navigating to canvas editor`;

        case 'canvas-editor':
            return `${base}

CURRENT CONTEXT: Canvas Editor — Project: "${ctx.projectName}"
${ctx.canvasSize ? `Canvas: ${ctx.canvasSize.w}x${ctx.canvasSize.h}px` : ''}
${ctx.elementCount} element(s) on canvas.

AVAILABLE ACTIONS:
- Generate full designs (triggers structured design pipeline)
- Add individual elements (text, shapes, buttons)
- Modify element properties (color, font, position)
- Apply animations
- Execute custom styling

BEHAVIOR:
- For "design" or "create" requests → use generate_full_design tool
- For specific edits → use individual tools (add_text, update_element_property)
- Be creative and professional in design suggestions
- Always explain design decisions briefly`;
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
