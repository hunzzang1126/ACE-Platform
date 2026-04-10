// ─────────────────────────────────────────────────
// contextRouter.ts — Shadow Workspace + Context Router
// ─────────────────────────────────────────────────
// v2: Eval-first architecture. Builds a live workspace
// snapshot so the AI "sees" the design state before writing code.
// Single source of system prompt truth.

import { useDesignStore } from '@/stores/designStore';
import type { DesignElement } from '@/schema/elements.types';

// ── Types ────────────────────────────────────────

export type PageContext = 'dashboard' | 'size-dashboard' | 'canvas-editor';

export interface ContextInfo {
    page: PageContext;
    pageLabel: string;
    projectName: string;
    canvasSize: { w: number; h: number } | null;
    variantCount: number;
    elementCount: number;
    useDesignPipeline: boolean;
    /** Live workspace snapshot for shadow workspace */
    snapshot: string;
    /** 1-line memory summary (from Supabase) */
    memory?: string;
}

// ── Page Detection ───────────────────────────────

export function detectPage(pathname: string): PageContext {
    if (pathname.includes('/editor/detail/') || pathname.includes('/editor/canvas/')) {
        return 'canvas-editor';
    }
    if (pathname.includes('/editor')) {
        return 'size-dashboard';
    }
    return 'dashboard';
}

// ── Workspace Snapshot Builder ────────────────────
// This is the "shadow workspace" — the AI sees this before every eval.

function summarizeElement(el: DesignElement, idx: number): string {
    const parts: string[] = [];
    parts.push(`[${idx}]`);
    parts.push(`"${el.name}"`);
    parts.push(el.type);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = el as any;

    if (el.type === 'text') {
        const content = raw.content || '';
        const preview = content.length > 30 ? content.slice(0, 30) + '...' : content;
        parts.push(`"${preview}"`);
        if (raw.fontSize) parts.push(`${raw.fontSize}px`);
        if (raw.fontFamily) parts.push(raw.fontFamily);
        if (raw.fontWeight && raw.fontWeight >= 700) parts.push('bold');
        if (raw.color) parts.push(raw.color);
    } else if (el.type === 'shape') {
        const w = el.constraints?.size?.width || 0;
        const h = el.constraints?.size?.height || 0;
        if (w && h) parts.push(`${w}x${h}`);
        if (raw.fill) parts.push(`fill=${raw.fill}`);
        if (raw.borderRadius) parts.push(`r=${raw.borderRadius}`);
    } else if (el.type === 'image') {
        parts.push(raw.src ? 'has-src' : 'no-src');
    } else if (el.type === 'button') {
        parts.push(`"${raw.label || ''}"`);
        if (raw.backgroundColor) parts.push(`bg=${raw.backgroundColor}`);
    }

    parts.push(`z=${el.zIndex}`);
    if (!el.visible) parts.push('hidden');
    if (el.locked) parts.push('locked');

    return '  ' + parts.join(' ');
}

function buildWorkspaceSnapshot(ctx: ContextInfo): string {
    const lines: string[] = ['WORKSPACE SNAPSHOT:'];

    lines.push(`Page: ${ctx.pageLabel} | Project: "${ctx.projectName || 'Untitled'}"`);

    if (ctx.canvasSize) {
        lines.push(`Canvas: ${ctx.canvasSize.w}x${ctx.canvasSize.h}px`);
    }

    // Build element list from design store
    const ds = useDesignStore.getState();
    const cs = ds.creativeSet;
    const masterV = cs?.variants?.find(v => v.id === cs.masterVariantId);

    if (masterV?.elements?.length) {
        lines.push(`Elements (${masterV.elements.length}):`);
        for (let i = 0; i < masterV.elements.length; i++) {
            lines.push(summarizeElement(masterV.elements[i]!, i));
        }
    } else {
        lines.push('Elements: (empty canvas)');
    }

    if (ctx.variantCount > 1) {
        const variantSizes = cs?.variants?.map(v =>
            `${v.preset.width}x${v.preset.height}`
        ).join(', ') || '';
        lines.push(`Variants: ${ctx.variantCount} (${variantSizes})`);
    }

    return lines.join('\n');
}

// ── Store API Reference ──────────────────────────
// ★ NOT in system prompt. Injected via analyze_scene tool result only.
// AI learns it once per conversation, not every turn.

export const STORE_API_REFERENCE = `STORE API (use via execute_dynamic_action):
const ds = designStore;                     // current state
const cs = ds.creativeSet;                  // active creative set
cs.variants[i].elements                     // element array per variant

Element: { id, name, type, constraints, opacity, visible, locked, zIndex, animation?, shadow?, role? }
  text: + content, fontFamily, fontSize, fontWeight, fontStyle, color, textAlign, lineHeight, letterSpacing
  shape: + fill, shapeType, strokeWidth, borderRadius, gradientStart/End/Angle
  image: + src, fit, naturalWidth/Height
  button: + label, backgroundColor, borderRadius, color

Mutation patterns:
  useDesignStore.setState(state => { /* mutate state.creativeSet directly (immer) */ });
  useDesignStore.getState().updateMasterElement(elementId, { color: '#ff0000' });
  useDesignStore.getState().addElementToMaster(newElement);
  useDesignStore.getState().removeElementFromMaster(elementId);
  useProjectStore.getState().createCreativeSet('Name');
  useProjectStore.getState().deleteCreativeSet(id);
  useProjectStore.getState().renameCreativeSet(id, 'New Name');

Element constraints shape:
  constraints: { horizontal: { anchor, offset }, vertical: { anchor, offset }, size: { widthMode, heightMode, width, height }, rotation }
  anchors: 'left'|'center'|'right'|'stretch' (horizontal), 'top'|'center'|'bottom' (vertical)`;

// ── System Prompt Builder ────────────────────────
// ★ Cursor-level: ~300-400 tokens. Rules only. No API references.

export function buildContextSystemPrompt(ctx: ContextInfo): string {
    const snapshot = buildWorkspaceSnapshot(ctx);
    const mem = ctx.memory ? `\nUser prefs: ${ctx.memory}` : '';

    // ★ Common header: 2 lines. Same for all pages.
    const header = `You are Glid, ACE creative platform AI. Be concise. Explain before executing.`;

    switch (ctx.page) {
        case 'dashboard':
            return `${header}
${snapshot}
Tools: execute_dynamic_action (JS eval on stores)
Dashboard has NO canvas. You CANNOT design here.
Workflow: 1) create_creative_set → 2) navigate_to editor → 3) THEN design.
For project CRUD: use execute_dynamic_action with useProjectStore/useDesignStore.${mem}`;

        case 'size-dashboard':
            return `${header}
${snapshot}
Tools: update_element_text, update_element_property, execute_dynamic_action, analyze_scene
CRITICAL: You are on the SIZE DASHBOARD. Work with EXISTING elements ONLY.
- To change text: update_element_text(element_name, new_text) — applies to ALL variants
- To change style: update_element_property(element_name, property, value) — applies to ALL variants
- NEVER create new elements. If user asks to add elements, tell them to open the canvas editor.
For localization: use execute_dynamic_action with setLocaleData.
For variants: useDesignStore.getState().addVariant({ width, height, label })${mem}`;

        case 'canvas-editor': {
            const empty = ctx.elementCount === 0;
            return `${header}
${snapshot}
Tools: generate_full_design, replace_background_image, generate_image, add_text, add_button, execute_dynamic_action, analyze_scene
${empty ? 'Canvas empty → generate_full_design for new designs.' : 'For modifications → execute_dynamic_action. For redesign → generate_full_design.'}
For background → replace_background_image. Use analyze_scene to read store API.
Write real marketing copy. No placeholder text.${mem}`;
        }
    }
}

// ── Context Builder ──────────────────────────────

export function buildContext(pathname: string, memory?: string): ContextInfo {
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

    const pageLabels: Record<PageContext, string> = {
        'dashboard': 'Main Dashboard',
        'size-dashboard': 'Size Dashboard',
        'canvas-editor': 'Canvas Editor',
    };

    return {
        page,
        pageLabel: pageLabels[page],
        projectName,
        canvasSize,
        variantCount,
        elementCount,
        useDesignPipeline: page === 'canvas-editor',
        snapshot: '', // populated via buildWorkspaceSnapshot() during prompt build
        memory,
    };
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
