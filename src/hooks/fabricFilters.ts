// ─────────────────────────────────────────────────
// fabricFilters — Fabric.js filter & blend mode helpers
// ─────────────────────────────────────────────────
// Extracted from useFabricCanvas to keep file size manageable.
// Applies CSS-filter-like adjustments to Fabric image objects.
// ─────────────────────────────────────────────────

import { filters as FabricFilters, type Canvas, type FabricObject } from 'fabric';

// ── Custom metadata keys stored on Fabric objects ──
const FILTER_META = '__glidFilters' as const;
const BLEND_META = '__glidBlendMode' as const;

interface GlidFilterState {
    brightness: number;  // 0~2 (1 = normal)
    contrast: number;    // 0~2 (1 = normal)
    saturation: number;  // -1~1 (0 = normal)
    hueRotation: number; // 0~360 degrees
}

const DEFAULT_FILTERS: GlidFilterState = {
    brightness: 1,
    contrast: 1,
    saturation: 0,
    hueRotation: 0,
};

/** Get the current filter state from a Fabric object */
export function getFilterState(obj: FabricObject): GlidFilterState {
    return (obj as any)[FILTER_META] ?? { ...DEFAULT_FILTERS };
}

/** Get the current blend mode from a Fabric object */
export function getBlendMode(obj: FabricObject): string {
    return (obj as any)[BLEND_META] ?? 'normal';
}

// ── Blend Mode ──

const BLEND_MAP: Record<string, GlobalCompositeOperation> = {
    normal: 'source-over',
    multiply: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
    color_dodge: 'color-dodge',
    color_burn: 'color-burn',
    hard_light: 'hard-light',
    soft_light: 'soft-light',
    difference: 'difference',
    exclusion: 'exclusion',
};

export function applyBlendMode(
    obj: FabricObject,
    mode: string,
    canvas: Canvas | null,
): void {
    const gco = BLEND_MAP[mode] ?? 'source-over';
    obj.set({ globalCompositeOperation: gco } as any);
    (obj as any)[BLEND_META] = mode;
    canvas?.renderAll();
}

// ── Image Filters ──

/**
 * Apply a single filter property change to a Fabric image object.
 * Rebuilds the Fabric filter array from the stored GlidFilterState.
 */
function applyFilters(obj: FabricObject, canvas: Canvas | null): void {
    const state: GlidFilterState = (obj as any)[FILTER_META] ?? { ...DEFAULT_FILTERS };
    const isImage = obj.type === 'image';
    if (!isImage) return;

    const img = obj as any; // FabricImage
    const newFilters: InstanceType<typeof FabricFilters.BaseFilter>[] = [];

    // Brightness: Fabric uses -1 to 1 range (0 = normal)
    if (state.brightness !== 1) {
        newFilters.push(new FabricFilters.Brightness({ brightness: state.brightness - 1 }));
    }

    // Contrast: Fabric uses -1 to 1 range (0 = normal)
    if (state.contrast !== 1) {
        newFilters.push(new FabricFilters.Contrast({ contrast: state.contrast - 1 }));
    }

    // Saturation: Fabric uses -1 to 1 range (0 = normal)
    if (state.saturation !== 0) {
        newFilters.push(new FabricFilters.Saturation({ saturation: state.saturation }));
    }

    // Hue Rotation: Fabric uses degrees (0~360)
    if (state.hueRotation !== 0) {
        newFilters.push(new FabricFilters.HueRotation({ rotation: state.hueRotation / 360 }));
    }

    img.filters = newFilters;
    img.applyFilters();
    canvas?.renderAll();
}

export function setBrightness(
    obj: FabricObject,
    value: number,     // 0~2 (1.0 = normal, UI sends v/100)
    canvas: Canvas | null,
): void {
    const state = getFilterState(obj);
    state.brightness = value;
    (obj as any)[FILTER_META] = state;
    applyFilters(obj, canvas);
}

export function setContrast(
    obj: FabricObject,
    value: number,
    canvas: Canvas | null,
): void {
    const state = getFilterState(obj);
    state.contrast = value;
    (obj as any)[FILTER_META] = state;
    applyFilters(obj, canvas);
}

export function setSaturation(
    obj: FabricObject,
    value: number,     // 0~2 (1 = normal)
    canvas: Canvas | null,
): void {
    const state = getFilterState(obj);
    state.saturation = value - 1; // convert 0~2 → -1~1
    (obj as any)[FILTER_META] = state;
    applyFilters(obj, canvas);
}

export function setHueRotate(
    obj: FabricObject,
    degrees: number,   // 0~360
    canvas: Canvas | null,
): void {
    const state = getFilterState(obj);
    state.hueRotation = degrees;
    (obj as any)[FILTER_META] = state;
    applyFilters(obj, canvas);
}

// ── Serialization helpers (for save/restore) ──

import type { ImageFilter } from '@/schema/elements.types';

/** Convert stored GlidFilterState → ImageFilter[] for element persistence */
export function filterStateToSchema(obj: FabricObject): ImageFilter[] {
    const state = getFilterState(obj);
    const result: ImageFilter[] = [];
    if (state.brightness !== 1) result.push({ type: 'brightness', value: state.brightness });
    if (state.contrast !== 1) result.push({ type: 'contrast', value: state.contrast });
    if (state.saturation !== 0) result.push({ type: 'saturate', value: state.saturation + 1 }); // back to 0~2
    if (state.hueRotation !== 0) result.push({ type: 'hueRotate', value: state.hueRotation });
    return result;
}

/** Restore ImageFilter[] from element schema → apply to Fabric object */
export function restoreFiltersFromSchema(
    obj: FabricObject,
    schemaFilters: ImageFilter[] | undefined,
    canvas: Canvas | null,
): void {
    if (!schemaFilters?.length) return;
    const state: GlidFilterState = { ...DEFAULT_FILTERS };
    for (const f of schemaFilters) {
        switch (f.type) {
            case 'brightness': state.brightness = f.value; break;
            case 'contrast': state.contrast = f.value; break;
            case 'saturate': state.saturation = f.value - 1; break; // 0~2 → -1~1
            case 'hueRotate': state.hueRotation = f.value; break;
        }
    }
    (obj as any)[FILTER_META] = state;
    applyFilters(obj, canvas);
}

/** Restore blend mode from element schema */
export function restoreBlendMode(
    obj: FabricObject,
    blendMode: string | undefined,
    canvas: Canvas | null,
): void {
    if (!blendMode || blendMode === 'normal') return;
    applyBlendMode(obj, blendMode, canvas);
}
