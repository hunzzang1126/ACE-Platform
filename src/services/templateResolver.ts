// ─────────────────────────────────────────────────
// templateResolver — Supabase-only template element resolver
// ─────────────────────────────────────────────────
// ★ CLOUD-FIRST: Reads templates from templateStore (synced from Supabase).
// No fallback to hardcoded build() functions.
// Used by AI pipeline (agentGenerateFlow) to get element data.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import type { DesignElement, TextElement, ShapeElement, ButtonElement } from '@/schema/elements.types';
import type { BannerVariant } from '@/schema/design.types';
import { constraintsToAbsolute } from '@/engine/constraintUtils';
import { useTemplateStore } from '@/stores/templateStore';

/**
 * Resolve template elements from Supabase-stored data.
 * Reads from templateStore (cloud-synced), converts DesignElement[] → RenderElement[].
 * Scales from template's native size (usually 1080×1080) to target canvas.
 *
 * @throws Error if template not found in store
 */
export function resolveTemplateElements(
    templateId: string,
    canvasW: number,
    canvasH: number,
): RenderElement[] {
    const store = useTemplateStore.getState();

    // ★ ID Resolution: AI selects 'centered-stack' but templateStore
    // stores it as 'ai-centered-stack'. Try all known prefixes.
    const tmpl = store.getById(templateId)
        ?? store.getById(`ai-${templateId}`)
        ?? store.getById(`builtin-${templateId}`);

    if (!tmpl) {
        // Template was deleted from Supabase (admin removed it).
        // Gracefully pick the first available AI template instead of crashing.
        const allTemplates = store.templates ?? [];
        const fallback = allTemplates.find((t: any) => t.id.startsWith('ai-'))
            ?? allTemplates[0];
        if (!fallback) {
            throw new Error(
                `[templateResolver] No templates available in store. ` +
                `Supabase template_overrides table may be empty.`
            );
        }
        console.warn(
            `[templateResolver] "${templateId}" not found — using "${fallback.id}" instead.`
        );
        return resolveTemplateElements(fallback.id, canvasW, canvasH);
    }

    // Parse the stored variant snapshot
    let variant: BannerVariant;
    try {
        variant = JSON.parse(tmpl.variantSnapshot);
    } catch (e) {
        throw new Error(
            `[templateResolver] Failed to parse variantSnapshot for "${templateId}": ${e}`
        );
    }

    const elements = variant.elements ?? [];
    if (elements.length === 0) {
        throw new Error(
            `[templateResolver] Template "${templateId}" has no elements.`
        );
    }

    // Template's native canvas size
    const nativeW = tmpl.width || 1080;
    const nativeH = tmpl.height || 1080;

    console.log(`[templateResolver] "${templateId}" native=${nativeW}x${nativeH} → target=${canvasW}x${canvasH} | scaleX=${(canvasW/nativeW).toFixed(3)} scaleY=${(canvasH/nativeH).toFixed(3)} | elements=${elements.length}`);

    // Convert DesignElement[] → RenderElement[] with scaling
    const result = elements.map(el => designToRender(el, nativeW, nativeH, canvasW, canvasH));
    for (const r of result) {
        if (r.type === 'text') {
            console.log(`[templateResolver]   text "${r.name}" fontSize=${r.font_size} pos=(${r.x},${r.y}) size=${r.w}x${r.h} align=${r.text_align}`);
        }
    }
    return result;
}

/**
 * Get template background color from stored data.
 * Used by buildAndRender for canvas background setup.
 */
export function getTemplateBackground(templateId: string): string | null {
    try {
        const store = useTemplateStore.getState();
        const tmpl = store.getById(templateId)
            ?? store.getById(`ai-${templateId}`)
            ?? store.getById(`builtin-${templateId}`);
        if (!tmpl) return null;
        const variant: BannerVariant = JSON.parse(tmpl.variantSnapshot);
        return variant.backgroundColor || null;
    } catch {
        return null;
    }
}

// ── DesignElement → RenderElement converter ──────

function designToRender(
    el: DesignElement,
    nativeW: number,
    nativeH: number,
    targetW: number,
    targetH: number,
): RenderElement {
    // Get absolute position at native size, then scale to target
    const abs = constraintsToAbsolute(el.constraints, nativeW, nativeH);
    const scaleX = targetW / nativeW;
    const scaleY = targetH / nativeH;

    const x = Math.round(abs.x * scaleX);
    const y = Math.round(abs.y * scaleY);
    const w = Math.round(abs.w * scaleX);
    const h = Math.round(abs.h * scaleY);

    const base: RenderElement = { type: 'rect', x, y, w, h, name: el.name };

    switch (el.type) {
        case 'text':
            return textToRender(el, x, y, w, h, scaleX, scaleY);
        case 'shape':
            return shapeToRender(el, x, y, w, h);
        case 'button':
            return buttonToRender(el, x, y, w, h, scaleX, scaleY);
        default:
            return base;
    }
}

function textToRender(
    el: TextElement, x: number, y: number, w: number, h: number,
    scaleX: number, scaleY: number,
): RenderElement {
    const scale = Math.min(scaleX, scaleY);
    return {
        type: 'text',
        x, y, w, h,
        name: el.name,
        content: el.content,
        font_size: Math.max(8, Math.round(el.fontSize * scale)),
        font_weight: String(el.fontWeight),
        font_family: el.fontFamily,
        color_hex: el.color,
        text_align: el.textAlign,
        letter_spacing: el.letterSpacing,
        line_height: el.lineHeight,
        a: el.opacity,
    };
}

function shapeToRender(
    el: ShapeElement, x: number, y: number, w: number, h: number,
): RenderElement {
    // Gradient shape
    if (el.gradientStart && el.gradientEnd) {
        return {
            type: 'rect',
            x, y, w, h,
            name: el.name,
            gradient_start_hex: el.gradientStart,
            gradient_end_hex: el.gradientEnd,
            gradient_angle: el.gradientAngle ?? 135,
            radius: el.borderRadius ?? 0,
            a: el.opacity,
        };
    }

    // Ellipse
    if (el.shapeType === 'ellipse') {
        const [r, g, b, a] = hexToFloats(el.fill);
        return { type: 'ellipse', x, y, w, h, name: el.name, r, g, b, a: a * el.opacity };
    }

    // Rounded rect
    if (el.borderRadius && el.borderRadius > 0) {
        const [r, g, b, a] = hexToFloats(el.fill);
        return {
            type: 'rounded_rect',
            x, y, w, h,
            name: el.name,
            r, g, b, a: a * el.opacity,
            radius: el.borderRadius,
        };
    }

    // Plain rect
    const [r, g, b, a] = hexToFloats(el.fill);
    return { type: 'rect', x, y, w, h, name: el.name, r, g, b, a: a * el.opacity };
}

function buttonToRender(
    el: ButtonElement, x: number, y: number, w: number, h: number,
    scaleX: number, scaleY: number,
): RenderElement {
    const [r, g, b] = hexToFloats(el.backgroundColor);
    const scale = Math.min(scaleX, scaleY);
    return {
        type: 'rounded_rect',
        x, y, w, h,
        name: el.name,
        r, g, b, a: el.opacity,
        radius: el.borderRadius ?? 6,
        content: el.label,
        font_size: Math.max(8, Math.round(el.fontSize * scale)),
        font_weight: String(el.fontWeight),
        color_hex: el.color,
        text_align: 'center',
    };
}

function hexToFloats(hex: string): [number, number, number, number] {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
        const m = hex.match(/rgba?\((\d+\.?\d*),\s*(\d+\.?\d*),\s*(\d+\.?\d*)(?:,\s*(\d+\.?\d*))?\)/);
        if (m) return [parseFloat(m[1]!) / 255, parseFloat(m[2]!) / 255, parseFloat(m[3]!) / 255, m[4] !== undefined ? parseFloat(m[4]!) : 1.0];
    }
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return [0, 0, 0, 1.0];
    return [r, g, b, 1.0];
}
