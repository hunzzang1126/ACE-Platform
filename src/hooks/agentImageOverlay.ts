// ─────────────────────────────────────────────────
// agentImageOverlay — BG Image element processing
// ─────────────────────────────────────────────────
// ★ v750: Extracted from agentFlowHelpers.ts.
// When a BG image is present, this module:
//  1. Strips ALL rects covering >50% canvas (not just named ones)
//  2. Sets text color from harmony engine (tinted, not binary)
//  3. Applies strong drop shadow for readability on busy images
//  4. Recolors CTA buttons with harmony accent
// ─────────────────────────────────────────────────

import type { HarmonyPalette } from '@/services/colorHarmony';
import { isCtaOrButton, isCtaLabel } from '@/utils/nameRoleMatch';

/**
 * Strip template rectangles that would cover the BG image.
 * ★ v750: Uses AREA-based detection instead of name matching.
 * Any non-text element covering >50% of canvas area is removed.
 * CTA/button rects are preserved (they're small overlays).
 */
export function stripCoveringRects(
    elements: any[],
    canvasW: number,
    canvasH: number,
): any[] {
    const canvasArea = canvasW * canvasH;
    const areaThreshold = 0.50; // 50% of canvas

    return elements.filter(el => {
        if (el.type === 'text') return true;
        const name = (el.name ?? '').toLowerCase();
        // Preserve CTA/button shapes (but NOT 'rectangle' which contains 'cta'!)
        const isCta = isCtaOrButton(name) || isCtaLabel(name);
        if (isCta) return true;

        const elArea = (el.w ?? 0) * (el.h ?? 0);
        if (elArea > canvasArea * areaThreshold) {
            console.log(`[ImageOverlay] Stripped "${el.name}" (${el.w}x${el.h} = ${Math.round(elArea / canvasArea * 100)}% of canvas)`);
            return false;
        }
        return true;
    });
}

/**
 * Apply text styling optimized for readability over BG images.
 * ★ v750: Uses harmony-derived headline color (tinted, not binary white).
 * Applies aggressive drop shadow to ensure readability on busy images.
 *
 * Shadow strategy: Large blur (24px) + strong opacity (0.9) + double offset
 * creates a "glow" effect that works on any image without cheap overlays.
 */
export function styleTextForImage(
    elements: any[],
    harmony: HarmonyPalette,
    guide: any,
): void {
    for (const el of elements) {
        if (el.type !== 'text') continue;

        // ★ v750: Use harmony headline color (tinted white/dark, not binary)
        // This is WCAG-checked against the actual background colors
        const role = inferRole(el);
        if (role === 'headline') {
            el.color_hex = harmony.headline;
        } else if (role === 'subheadline') {
            el.color_hex = harmony.subheadline;
        } else if (role === 'cta') {
            el.color_hex = harmony.accentForeground;
        } else {
            el.color_hex = harmony.body ?? harmony.headline;
        }

        // ★ v750: Aggressive drop shadow for busy image readability
        // blur=24, opacity=0.9 creates readable text without cheap overlays
        el.shadow_blur = 24;
        el.shadow_offset_x = 0;
        el.shadow_offset_y = 3;
        el.shadow_opacity = 0.9;
    }
}

/** Recolor CTA/button shapes with harmony accent */
export function recolorCtaShapes(
    elements: any[],
    harmony: HarmonyPalette,
): void {
    for (const el of elements) {
        if (el.type === 'text') continue;
        const name = (el.name ?? '').toLowerCase();
        if (isCtaOrButton(name)) {
            const c = harmony.accent.replace('#', '');
            el.r = parseInt(c.slice(0, 2), 16) / 255;
            el.g = parseInt(c.slice(2, 4), 16) / 255;
            el.b = parseInt(c.slice(4, 6), 16) / 255;
        }
    }
}

/** Infer element role from name */
function inferRole(el: any): 'headline' | 'subheadline' | 'cta' | 'body' {
    const name = (el.name ?? '').toLowerCase();
    if (name.includes('headline') && !name.includes('sub')) return 'headline';
    if (name.includes('sub') || name.includes('body') || name.includes('description')) return 'subheadline';
    if (isCtaLabel(name) || name.includes('button')) return 'cta';
    // Font size heuristic
    if ((el.font_size ?? 0) > 40) return 'headline';
    if ((el.font_size ?? 0) > 20) return 'subheadline';
    return 'body';
}
