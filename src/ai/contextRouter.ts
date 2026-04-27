// ─────────────────────────────────────────────────
// contextRouter.ts — Shadow Workspace + Context Router
// ─────────────────────────────────────────────────
// v2: Eval-first architecture. Builds a live workspace
// snapshot so the AI "sees" the design state before writing code.
// Single source of system prompt truth.

import { useDesignStore } from '@/stores/designStore';
import type { DesignElement } from '@/schema/elements.types';

// ── Language Helpers ─────────────────────────────

const LANG_NAMES: Record<string, string> = {
    ko: 'Korean', ja: 'Japanese', zh: 'Chinese', es: 'Spanish',
    fr: 'French', de: 'German', pt: 'Portuguese', it: 'Italian', th: 'Thai',
};

function getUserLanguage(): string {
    try {
        const stored = localStorage.getItem('ace-user-prefs');
        if (stored) {
            const prefs = JSON.parse(stored);
            // userPrefs store stores per-userId, find latest
            const firstKey = Object.keys(prefs.state?.language ?? {})[0];
            if (firstKey) return prefs.state.language[firstKey] || 'en';
            // fallback: check flat language field
            if (prefs.state?.language && typeof prefs.state.language === 'string') return prefs.state.language;
        }
    } catch { /* ok */ }
    return 'en';
}

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
    /** User's selected UI language (e.g. 'ko', 'en', 'ja') */
    language?: string;
    /** Base64 canvas screenshot for vision context (canvas-editor only) */
    canvasScreenshot?: string;
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

    // ★ Common header: 2 lines. Same for all pages.
    // Language: UI pref takes priority, but also auto-detect input language
    const langInstr = ctx.language && ctx.language !== 'en'
        ? ` Respond in ${LANG_NAMES[ctx.language] || ctx.language}. If the user writes in a different language, respond in that language instead.`
        : ' If the user writes in a non-English language, respond in that language.';
    const header = `You are Glid, ACE creative platform AI. Be concise. Explain before executing.${langInstr}`;

    // ★ CRITICAL FIX: Inject smart context (memory, actions, brand, fonts)
    // This was built but NEVER wired into the actual prompt — now it is.
    let smartSection = '';
    try {
        const { buildSmartContext, contextToPromptSection } = require('./smartContextBuilder');
        const pageName = ctx.page === 'canvas-editor' ? 'editor'
            : ctx.page === 'size-dashboard' ? 'size-dashboard' : 'dashboard';
        const smartCtx = buildSmartContext(pageName, useDesignStore.getState().creativeSet);
        smartSection = contextToPromptSection(smartCtx);
    } catch { /* non-critical — fall back to basic context */ }

    switch (ctx.page) {
        case 'dashboard':
            return `${header}
${snapshot}
Tools: execute_dynamic_action (JS eval on stores)
Dashboard has NO canvas. You CANNOT design here.
Workflow: 1) create_creative_set → 2) navigate_to editor → 3) THEN design.
For project CRUD: use execute_dynamic_action with useProjectStore/useDesignStore.
${smartSection}`;

        case 'size-dashboard':
            return `${header}
${snapshot}
Tools: update_element_text, update_element_property, execute_dynamic_action, analyze_scene, undo_ai_action
CRITICAL: You are on the SIZE DASHBOARD. Work with EXISTING elements ONLY.
- To change text: update_element_text(element_name, new_text) — applies to ALL variants
- To change style: update_element_property(element_name, property, value) — applies to ALL variants
- NEVER create new elements. If user asks to add elements, tell them to open the canvas editor.
For localization: use execute_dynamic_action with setLocaleData.
For variants: useDesignStore.getState().addVariant({ width, height, label })
${smartSection}`;

        case 'canvas-editor': {
            const empty = ctx.elementCount === 0;
            // ★ Planning instruction: AI explains plan before executing tools
            let planningLine = '';
            try {
                const { PLANNING_INSTRUCTION } = require('./plannerPhase');
                planningLine = `\n${PLANNING_INSTRUCTION}`;
            } catch { /* non-critical */ }
            return `${header}
${snapshot}
Tools: generate_full_design, replace_background_image, generate_image, add_text, add_button, execute_dynamic_action, analyze_scene, undo_ai_action
${empty ? '★ Canvas empty → Use generate_full_design for ANY new design request. It creates the COMPLETE ad (layout + text + CTA + image). NEVER use generate_image alone for new designs.' : 'For modifications → execute_dynamic_action. For redesign → generate_full_design.'}
For background → replace_background_image. Use analyze_scene to read store API.
Write real marketing copy. No placeholder text.${planningLine}
${smartSection}`;
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

    // ★ P1-7: Canvas screenshot for vision context (synchronous — captureCanvas uses toDataURL)
    let canvasScreenshot: string | undefined;
    if (page === 'canvas-editor' && elementCount > 0 && typeof document !== 'undefined') {
        try {
            // captureCanvas is synchronous (DOM toDataURL). Import at top would break tests
            // that run without DOM, so we guard with typeof document check.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { captureCanvas } = require('@/services/visionService') as { captureCanvas: (opts?: any) => string | null };
            // 384px max, JPEG 50% — keeps vision tokens low (~60 tokens)\n            const base64 = captureCanvas({ maxDimension: 384, format: 'image/jpeg', quality: 0.5 });
            if (base64 && base64.length > 100) {
                canvasScreenshot = base64;
                console.info(`[Context] Canvas screenshot captured: ${Math.round(base64.length / 1024)}KB`);
            }
        } catch { /* Canvas capture failed — non-critical, continue without */ }
    }

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
        language: getUserLanguage(),
        canvasScreenshot,
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
