// ─────────────────────────────────────────────────
// agentFlowStoreSync — Sync AI-rendered elements to designStore
// ─────────────────────────────────────────────────
// After the AI pipeline renders elements directly to the canvas engine,
// this module persists them in the Zustand designStore. Without this,
// any store-based operation (add_button, add_text) would trigger a
// store→canvas re-sync that wipes the engine-only elements.
// ─────────────────────────────────────────────────

import { useDesignStore } from '@/stores/designStore';
import { absoluteToConstraints } from '@/engine/constraintUtils';
import { v4 as uuid } from 'uuid';
import type { RenderElement } from '@/services/autoDesignTypes';

/**
 * Convert a RenderElement (absolute coords) to a designStore element
 * and push it into ALL variants of the current creativeSet.
 */
export function syncElementsToStore(
    elements: RenderElement[],
    canvasW: number,
    canvasH: number,
    palette: { gradientStart: string; gradientEnd: string; typography: { primaryFont: string; secondaryFont: string } },
): void {
    const store = useDesignStore.getState();
    if (!store.creativeSet) {
        console.warn('[StoreSync] No creativeSet — cannot persist elements.');
        return;
    }

    const storeElements = elements.map((el) => {
        const x = el.x ?? 0, y = el.y ?? 0;
        const w = el.w ?? canvasW, h = el.h ?? canvasH;
        const constraints = absoluteToConstraints(x, y, w, h, canvasW, canvasH);
        const base = {
            id: uuid(),
            name: el.name ?? 'element',
            visible: true,
            locked: false,
            opacity: 1,
            constraints,
        };

        if (el.type === 'text') {
            return {
                ...base,
                type: 'text' as const,
                content: el.content ?? '',
                fontFamily: el.font_family ?? palette.typography.primaryFont,
                fontSize: el.font_size ?? 16,
                fontWeight: Number(el.font_weight) || 700,
                fontStyle: 'normal' as const,
                color: el.color_hex ?? '#FFFFFF',
                textAlign: (el.text_align ?? 'center') as 'left' | 'center' | 'right',
                lineHeight: el.line_height ?? 1.2,
                letterSpacing: el.letter_spacing ?? 0,
                autoShrink: false,
                zIndex: 0,
            };
        }

        // ★ Image elements (AI background, scanned images)
        if (el.type === 'image' || (el as any).src) {
            const isBg = el.name?.includes('background');
            return {
                ...base,
                type: 'image' as const,
                src: (el as any).src ?? '',
                naturalWidth: el.w ?? canvasW,
                naturalHeight: el.h ?? canvasH,
                // ★ Background images MUST use 'fill' (independent scaleX/scaleY)
                // to exactly match canvas dimensions. 'cover' uses uniform scaling
                // which shrinks the image when aspect ratios don't match.
                fit: (isBg ? 'fill' : 'cover') as 'fill' | 'cover',
                role: isBg ? 'background' : 'decoration',
                zIndex: 0,
            };
        }

        // Shape / rect / gradient
        const isGradient = !!(el.gradient_start_hex && el.gradient_end_hex);

        // ★ FIX: Convert float RGB (0-1 range) to hex.
        // CTA buttons from Carbon use { r: 0.39, g: 0.40, b: 0.95 } — NOT gradient_start_hex.
        // Without this, ALL non-gradient shapes get fill='#333333' and CTA turns black.
        let shapeFill = '#333333';
        if (isGradient) {
            shapeFill = el.gradient_start_hex!;
        } else if (el.r !== undefined && el.g !== undefined && el.b !== undefined) {
            const toHex = (f: number) => Math.round(Math.min(1, Math.max(0, f)) * 255).toString(16).padStart(2, '0');
            shapeFill = `#${toHex(el.r)}${toHex(el.g)}${toHex(el.b)}`;
        }

        return {
            ...base,
            type: 'shape' as const,
            shapeType: 'rectangle' as const,
            fill: shapeFill,
            ...(isGradient ? {
                gradientStart: el.gradient_start_hex,
                gradientEnd: el.gradient_end_hex,
                gradientAngle: el.gradient_angle ?? 135,
            } : {}),
            strokeWidth: 0,
            borderRadius: el.radius ?? 0,
            opacity: el.a ?? 1,
            zIndex: 0,
        };
    });

    // Assign z-indices (order in array = render order)
    storeElements.forEach((el, i) => { el.zIndex = i; });

    useDesignStore.setState((state) => {
        if (!state.creativeSet) return;
        for (const variant of state.creativeSet.variants) {
            // Clear any existing elements (the pipeline always starts fresh via clear_scene)
            variant.elements = storeElements.map(el => ({
                ...el,
                id: uuid(), // unique ID per variant
            })) as any;
        }
    });

    console.log(`[StoreSync] ✓ Persisted ${storeElements.length} elements to designStore (${store.creativeSet.variants.length} variants)`);
}
