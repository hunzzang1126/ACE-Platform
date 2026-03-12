// ─────────────────────────────────────────────────
// renderElementScaler.ts — Scale RenderElement[] between sizes
// ─────────────────────────────────────────────────
// Lightweight proportional scaling for RenderElement[] arrays.
// Used by the AI pipeline Phase 8 (Smart Sizing) to adapt
// a master design to all variant sizes.
//
// Different from smartSizing.ts which operates on DesignElement[].
// This works directly on the pipeline's RenderElement[] format.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignService';

// ── Types ────────────────────────────────────────

export interface ScaleOptions {
    /** Minimum font size in px. Default: 8 */
    minFontSize?: number;
    /** Maximum font size in px. Default: 80 */
    maxFontSize?: number;
}

// ── Core Scaler ──────────────────────────────────

/**
 * Scale RenderElement[] proportionally from master size to target size.
 * Handles position, dimensions, font size, radius, and gradient.
 * Does NOT validate layout — call validateLayout() after.
 *
 * @returns Deep-cloned array with all positions/sizes scaled
 */
export function scaleRenderElements(
    masterElements: RenderElement[],
    masterW: number,
    masterH: number,
    targetW: number,
    targetH: number,
    options: ScaleOptions = {},
): RenderElement[] {
    const { minFontSize = 8, maxFontSize = 80 } = options;

    // Same size — just deep clone
    if (masterW === targetW && masterH === targetH) {
        return masterElements.map(e => ({ ...e }));
    }

    const scaleX = targetW / masterW;
    const scaleY = targetH / masterH;
    const scaleFont = Math.min(scaleX, scaleY); // Font scales by smaller dimension

    return masterElements.map(el => {
        const scaled: RenderElement = { ...el };

        // ── Background: always full canvas
        if (el.name === 'background') {
            scaled.x = 0;
            scaled.y = 0;
            scaled.w = targetW;
            scaled.h = targetH;
            return scaled;
        }

        // ── Position: proportional
        scaled.x = Math.round(el.x * scaleX);
        scaled.y = Math.round(el.y * scaleY);

        // ── Dimensions: proportional
        scaled.w = Math.round(el.w * scaleX);
        scaled.h = Math.round(el.h * scaleY);

        // ── Font size: scale by smaller dimension + clamp
        if (el.font_size != null) {
            scaled.font_size = Math.max(
                minFontSize,
                Math.min(maxFontSize, Math.round(el.font_size * scaleFont)),
            );
        }

        // ── Radius: scale proportionally
        if (el.radius != null) {
            scaled.radius = Math.max(2, Math.round(el.radius * scaleFont));
        }

        // ── Letter spacing: scale
        if (el.letter_spacing != null) {
            scaled.letter_spacing = Math.round(el.letter_spacing * scaleFont * 10) / 10;
        }

        // ── Shadow: scale offsets and blur
        if (el.shadow_blur != null) {
            scaled.shadow_blur = Math.round(el.shadow_blur * scaleFont);
            if (el.shadow_offset_x != null) scaled.shadow_offset_x = Math.round(el.shadow_offset_x * scaleFont);
            if (el.shadow_offset_y != null) scaled.shadow_offset_y = Math.round(el.shadow_offset_y * scaleFont);
        }

        return scaled;
    });
}
