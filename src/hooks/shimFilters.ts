// ─────────────────────────────────────────────────
// shimFilters — Fabric.js CSS-like filter implementations
// ─────────────────────────────────────────────────
// Implements the empty stubs from fabricEngineShim.ts
// using Fabric.js's built-in filter system.
// ★ v713: Previously these were all `() => {}` stubs.
// ─────────────────────────────────────────────────

import {
    Canvas, type FabricObject,
    filters,
} from 'fabric';
import type { ShimContext } from './shimTypes';

type FindById = (id: number) => FabricObject | undefined;

/**
 * Apply or update a single filter on a Fabric Image object.
 * Replaces any existing filter of the same type.
 */
function applyImageFilter(
    obj: FabricObject,
    FilterClass: new (opts: any) => any,
    opts: Record<string, number>,
    fc: Canvas,
): void {
    if (!obj || obj.type !== 'image') return;
    const existing = ((obj as any).filters || []) as any[];
    const filtered = existing.filter((f: any) => !(f instanceof FilterClass));
    // Only add if value is non-zero (remove filter if zero)
    const hasNonZero = Object.values(opts).some(v => Math.abs(v) > 0.001);
    if (hasNonZero) {
        filtered.push(new FilterClass(opts));
    }
    (obj as any).filters = filtered;
    (obj as any).applyFilters();
    fc.renderAll();
}

/**
 * Create filter method implementations for the engine shim.
 * These replace the empty stubs in fabricEngineShim.ts.
 */
export function createFilterMethods(ctx: ShimContext) {
    const { fc, findById } = ctx;

    return {
        /** CSS filter: brightness(). Value: -1.0 to 1.0 (0 = no change). */
        set_brightness: (id: number, value: number) => {
            const obj = findById(id);
            if (obj) applyImageFilter(obj, filters.Brightness, { brightness: value }, fc);
        },

        /** CSS filter: contrast(). Value: -1.0 to 1.0 (0 = no change). */
        set_contrast: (id: number, value: number) => {
            const obj = findById(id);
            if (obj) applyImageFilter(obj, filters.Contrast, { contrast: value }, fc);
        },

        /** CSS filter: saturate(). Value: -1.0 to 1.0 (0 = no change). */
        set_saturation: (id: number, value: number) => {
            const obj = findById(id);
            if (obj) applyImageFilter(obj, filters.Saturation, { saturation: value }, fc);
        },

        /** CSS filter: hue-rotate(). Value: -1.0 to 1.0 (rotation in radians fraction). */
        set_hue_rotate: (id: number, value: number) => {
            const obj = findById(id);
            if (obj) applyImageFilter(obj, filters.HueRotation, { rotation: value }, fc);
        },

        /** CSS filter: blur(). Value: 0-1.0 (Fabric uses 0-1 range). */
        set_blur: (id: number, value: number) => {
            const obj = findById(id);
            if (obj) applyImageFilter(obj, filters.Blur, { blur: value }, fc);
        },

        /** CSS mix-blend-mode equivalent. Uses Canvas2D globalCompositeOperation. */
        set_blend_mode: (id: number, mode: string) => {
            const obj = findById(id);
            if (!obj) return;
            const validModes = [
                'source-over', 'multiply', 'screen', 'overlay',
                'darken', 'lighten', 'color-dodge', 'color-burn',
                'hard-light', 'soft-light', 'difference', 'exclusion',
            ];
            if (validModes.includes(mode)) {
                (obj as any).globalCompositeOperation = mode;
                fc.renderAll();
            }
        },
    };
}
