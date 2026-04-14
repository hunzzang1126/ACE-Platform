// ─────────────────────────────────────────────────
// aiSuggestions — Context-aware AI quick action suggestions
// ─────────────────────────────────────────────────
// Returns dynamic suggestions based on canvas state.
// Pure function — no React dependencies.
// ─────────────────────────────────────────────────

export interface AiSuggestion {
    id: string;
    labelKey: string;   // i18n key
    hintKey: string;    // i18n key
    prompt: string;     // Pre-filled prompt text
    action?: 'send' | 'focus' | 'scan' | 'export';
}

export interface CanvasContext {
    /** Current page: dashboard, editor (size grid), detail (canvas) */
    page: 'dashboard' | 'editor' | 'detail';
    /** Number of elements on canvas */
    elementCount: number;
    /** Number of selected elements */
    selectionCount: number;
    /** Types of selected elements */
    selectedTypes: string[];
    /** Whether design has text elements */
    hasText: boolean;
    /** Whether design has images */
    hasImages: boolean;
}

// ── Dashboard suggestions ──
const DASHBOARD_SUGGESTIONS: AiSuggestion[] = [
    { id: 'create-ad', labelKey: 'ai.sugCreateAd', hintKey: 'ai.sugCreateAdHint', prompt: 'Create a summer sale ad for an e-commerce brand', action: 'focus' },
    { id: 'create-social', labelKey: 'ai.sugCreateSocial', hintKey: 'ai.sugCreateSocialHint', prompt: 'Design an Instagram post for a product launch', action: 'focus' },
    { id: 'scan-design', labelKey: 'ai.scanDesign', hintKey: 'ai.scanHint', prompt: '', action: 'scan' },
];

// ── Empty canvas suggestions ──
const EMPTY_CANVAS: AiSuggestion[] = [
    { id: 'gen-hero', labelKey: 'ai.sugGenHero', hintKey: 'ai.sugGenHeroHint', prompt: 'Create a bold hero banner with a gradient background', action: 'send' },
    { id: 'gen-product', labelKey: 'ai.sugGenProduct', hintKey: 'ai.sugGenProductHint', prompt: 'Design a product showcase ad', action: 'focus' },
    { id: 'gen-minimal', labelKey: 'ai.sugGenMinimal', hintKey: 'ai.sugGenMinimalHint', prompt: 'Create a clean minimal ad with large typography', action: 'focus' },
];

// ── Has elements, nothing selected ──
const CANVAS_IDLE: AiSuggestion[] = [
    { id: 'quality-check', labelKey: 'ai.sugQualityCheck', hintKey: 'ai.sugQualityCheckHint', prompt: 'Run a quality check on the current canvas', action: 'send' },
    { id: 'add-element', labelKey: 'ai.sugAddElement', hintKey: 'ai.sugAddElementHint', prompt: 'Add a call-to-action button', action: 'focus' },
    { id: 'change-style', labelKey: 'ai.sugChangeStyle', hintKey: 'ai.sugChangeStyleHint', prompt: 'Change the overall style to modern corporate', action: 'focus' },
];

// ── Text element selected ──
const TEXT_SELECTED: AiSuggestion[] = [
    { id: 'rewrite', labelKey: 'ai.sugRewrite', hintKey: 'ai.sugRewriteHint', prompt: 'Rewrite this headline to be more compelling', action: 'focus' },
    { id: 'text-style', labelKey: 'ai.sugTextStyle', hintKey: 'ai.sugTextStyleHint', prompt: 'Make this text bolder and more impactful', action: 'focus' },
    { id: 'text-color', labelKey: 'ai.sugTextColor', hintKey: 'ai.sugTextColorHint', prompt: 'Change the text color to match the background', action: 'send' },
];

// ── Shape/Image selected ──
const ELEMENT_SELECTED: AiSuggestion[] = [
    { id: 'change-color', labelKey: 'ai.sugChangeColor', hintKey: 'ai.sugChangeColorHint', prompt: 'Change the color of the selected element', action: 'focus' },
    { id: 'add-anim', labelKey: 'ai.sugAddAnim', hintKey: 'ai.sugAddAnimHint', prompt: 'Add a fade-in animation to this element', action: 'send' },
    { id: 'duplicate-style', labelKey: 'ai.sugDuplicate', hintKey: 'ai.sugDuplicateHint', prompt: 'Duplicate this element and arrange them in a row', action: 'focus' },
];

// ── Multi-select ──
const MULTI_SELECTED: AiSuggestion[] = [
    { id: 'align-all', labelKey: 'ai.sugAlignAll', hintKey: 'ai.sugAlignAllHint', prompt: 'Align these elements neatly', action: 'send' },
    { id: 'group-style', labelKey: 'ai.sugGroupStyle', hintKey: 'ai.sugGroupStyleHint', prompt: 'Apply a consistent style to these elements', action: 'focus' },
];

/**
 * Returns context-aware AI suggestions based on the current canvas state.
 * Always returns 2-3 suggestions.
 */
export function getAiSuggestions(ctx: CanvasContext): AiSuggestion[] {
    // Dashboard
    if (ctx.page === 'dashboard' || ctx.page === 'editor') {
        return DASHBOARD_SUGGESTIONS;
    }

    // Multi-select
    if (ctx.selectionCount > 1) return MULTI_SELECTED;

    // Single element selected
    if (ctx.selectionCount === 1) {
        return ctx.selectedTypes.includes('text') ? TEXT_SELECTED : ELEMENT_SELECTED;
    }

    // Canvas with elements (nothing selected)
    if (ctx.elementCount > 0) return CANVAS_IDLE;

    // Empty canvas
    return EMPTY_CANVAS;
}
