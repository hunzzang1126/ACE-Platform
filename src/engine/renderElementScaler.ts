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

// ── RenderElement → DesignElement converter ──────
// Converts the pipeline's flat RenderElement[] format into the
// designStore's constraint-based DesignElement[] format.
// Used by Phase 8 (Smart Sizing) to store scaled variants.

import type { DesignElement, ShapeElement, TextElement } from '@/schema/elements.types';
import { absoluteToConstraints } from '@/engine/elementConverters';

function rgbFloatToHex(r: number, g: number, b: number): string {
    const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function renderElementsToDesignElements(
    elements: RenderElement[],
    canvasW: number,
    canvasH: number,
): DesignElement[] {
    return elements.map((el, idx) => {
        const constraints = absoluteToConstraints(el.x, el.y, el.w, el.h, canvasW, canvasH);
        const baseName = el.name || `element_${idx}`;

        if (el.type === 'text') {
            return {
                id: `scaled-${baseName}-${idx}`,
                name: baseName,
                type: 'text',
                constraints,
                content: el.content ?? '',
                fontFamily: 'Inter',
                fontSize: el.font_size ?? 16,
                fontWeight: parseInt(el.font_weight ?? '400', 10) || 400,
                fontStyle: 'normal' as const,
                color: el.color_hex ?? '#ffffff',
                textAlign: el.text_align ?? 'left',
                lineHeight: el.line_height ?? 1.4,
                letterSpacing: el.letter_spacing ?? 0,
                autoShrink: true,
                opacity: el.a ?? 1,
                visible: true,
                locked: false,
                zIndex: idx,
            } as TextElement;
        }

        // Shape (rect, rounded_rect, ellipse)
        const fill = el.gradient_start_hex
            ? el.gradient_start_hex
            : rgbFloatToHex(el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5);

        return {
            id: `scaled-${baseName}-${idx}`,
            name: baseName,
            type: 'shape',
            shapeType: el.type === 'ellipse' ? 'ellipse' : 'rectangle',
            constraints,
            fill,
            gradientStart: el.gradient_start_hex,
            gradientEnd: el.gradient_end_hex,
            gradientAngle: el.gradient_angle,
            opacity: el.a ?? 1,
            visible: true,
            locked: false,
            zIndex: idx,
            borderRadius: el.radius ?? 0,
        } as ShapeElement;
    });
}
