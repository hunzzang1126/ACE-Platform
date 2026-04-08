// ─────────────────────────────────────────────────
// constraintUtils — Constraint conversion, color, font weight
// ─────────────────────────────────────────────────
// ★ SINGLE SOURCE OF TRUTH for constraint ↔ absolute conversion
// (See quality-standards.md § G)

import type { ElementConstraints } from '@/schema/constraints.types';
import type { ElementAnimation } from '@/schema/elements.types';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';

// ── Gradient Cache ──

interface CachedGradient { startHex: string; endHex: string; angle: number; }
const gradientCache = new Map<string, CachedGradient>();

export function cacheGradientData(elementName: string, startHex: string, endHex: string, angle: number): void {
    gradientCache.set(elementName, { startHex, endHex, angle });
}
export function clearGradientCache(): void { gradientCache.clear(); }
export function getGradientCache(key: string): CachedGradient | undefined { return gradientCache.get(key); }

// ── Constraint Converters ──

export function absoluteToConstraints(
    x: number, y: number, w: number, h: number, canvasW: number, canvasH: number,
    angle: number = 0,
): ElementConstraints {
    const centerX = x + w / 2, relCenterX = centerX / canvasW;
    const centerY = y + h / 2, relCenterY = centerY / canvasH;
    // ★ REGRESSION GUARD: Threshold raised to 0.98 (see elementConverters.ts history)
    const coversWidth = w >= canvasW * 0.98, coversHeight = h >= canvasH * 0.98;

    let horizontal: ElementConstraints['horizontal'];
    if (coversWidth) { horizontal = { anchor: 'center', offset: Math.round(centerX - canvasW / 2) }; }
    else if (relCenterX > 0.35 && relCenterX < 0.65) { horizontal = { anchor: 'center', offset: Math.round(centerX - canvasW / 2) }; }
    else if (relCenterX <= 0.35) { horizontal = { anchor: 'left', offset: Math.round(x) }; }
    else { horizontal = { anchor: 'right', offset: Math.round(canvasW - x - w) }; }

    let vertical: ElementConstraints['vertical'];
    if (coversHeight) { vertical = { anchor: 'center', offset: Math.round(centerY - canvasH / 2) }; }
    else if (relCenterY > 0.35 && relCenterY < 0.65) { vertical = { anchor: 'center', offset: Math.round(centerY - canvasH / 2) }; }
    else if (relCenterY <= 0.35) { vertical = { anchor: 'top', offset: Math.round(y) }; }
    else { vertical = { anchor: 'bottom', offset: Math.round(canvasH - y - h) }; }

    let size: ElementConstraints['size'];
    if (coversWidth && coversHeight) { size = { widthMode: 'relative', heightMode: 'relative', width: w / canvasW, height: h / canvasH }; }
    else if (coversWidth) { size = { widthMode: 'relative', heightMode: 'fixed', width: w / canvasW, height: Math.round(h) }; }
    else if (coversHeight) { size = { widthMode: 'fixed', heightMode: 'relative', width: Math.round(w), height: h / canvasH }; }
    else { size = { widthMode: 'fixed', heightMode: 'fixed', width: Math.round(w), height: Math.round(h) }; }

    // ★ Cache original absolute position for perfect roundtrip on same-size canvas.
    return {
        horizontal, vertical, size, rotation: angle,
        _absOrigin: { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), cw: canvasW, ch: canvasH },
    };
}

export function constraintsToAbsolute(
    constraints: ElementConstraints, canvasW: number, canvasH: number,
): { x: number; y: number; w: number; h: number } {
    // ★ Fast path: if cached origin matches this canvas size, return exact values.
    // This eliminates Math.round drift from anchor conversions on same-size canvas.
    const origin = constraints._absOrigin;
    if (origin && origin.cw === canvasW && origin.ch === canvasH) {
        return { x: origin.x, y: origin.y, w: origin.w, h: origin.h };
    }

    let w = constraints.size.widthMode === 'relative' ? canvasW * constraints.size.width : constraints.size.width;
    let h = constraints.size.heightMode === 'relative' ? canvasH * constraints.size.height : constraints.size.height;
    let x: number;
    switch (constraints.horizontal.anchor) {
        case 'left': x = constraints.horizontal.offset ?? 0; break;
        case 'center': x = canvasW / 2 + (constraints.horizontal.offset ?? 0) - w / 2; break;
        case 'right': x = canvasW - w - (constraints.horizontal.offset ?? 0); break;
        case 'stretch': x = constraints.horizontal.marginLeft ?? 0; w = canvasW - (constraints.horizontal.marginLeft ?? 0) - (constraints.horizontal.marginRight ?? 0); break;
        default: x = 0;
    }
    let y: number;
    switch (constraints.vertical.anchor) {
        case 'top': y = constraints.vertical.offset ?? 0; break;
        case 'center': y = canvasH / 2 + (constraints.vertical.offset ?? 0) - h / 2; break;
        case 'bottom': y = canvasH - h - (constraints.vertical.offset ?? 0); break;
        case 'stretch': y = constraints.vertical.marginTop ?? 0; h = canvasH - (constraints.vertical.marginTop ?? 0) - (constraints.vertical.marginBottom ?? 0); break;
        default: y = 0;
    }
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

// ── Color Converters ──

export function rgbFloatToHex(r: number, g: number, b: number): string {
    const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgbFloat(hex: string): [number, number, number, number] {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
        const m = hex.match(/rgba?\((\d+\.?\d*),\s*(\d+\.?\d*),\s*(\d+\.?\d*)(?:,\s*(\d+\.?\d*))?\)/);
        if (m) return [parseFloat(m[1]!) / 255, parseFloat(m[2]!) / 255, parseFloat(m[3]!) / 255, m[4] !== undefined ? parseFloat(m[4]!) : 1.0];
    }
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255, g = parseInt(clean.substring(2, 4), 16) / 255, b = parseInt(clean.substring(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return [0, 0, 0, 1.0];
    return [r, g, b, 1.0];
}

// ── Font Weight ──

export function resolveFontWeight(fw: string | number | undefined | null): number {
    if (fw === null || fw === undefined) return 400;
    if (typeof fw === 'number') return fw;
    const n = parseInt(fw, 10);
    if (!isNaN(n)) return n;
    const kw = fw.toLowerCase().trim();
    if (kw === 'bold') return 700; if (kw === 'bolder') return 800; if (kw === 'lighter' || kw === 'light') return 300;
    if (kw === 'semibold' || kw === 'semi-bold' || kw === 'medium') return 600;
    if (kw === 'thin' || kw === 'hairline') return 100;
    if (kw === 'extrabold' || kw === 'extra-bold') return 800;
    if (kw === 'black' || kw === 'heavy') return 900;
    return 400;
}

export function nodeTypeToShapeType(type: string): 'rectangle' | 'ellipse' { return type === 'ellipse' ? 'ellipse' : 'rectangle'; }

export function getAnimationForElement(elementId: string): ElementAnimation | undefined {
    const presets = useAnimPresetStore.getState().presets;
    const config = presets[elementId]
        || (elementId.startsWith('engine-') ? presets[elementId.slice(7)] : undefined)
        || (!elementId.startsWith('engine-') ? presets[`engine-${elementId}`] : undefined);
    if (!config) return undefined;
    const hasIn = config.anim !== 'none';
    const hasOut = (config.animOut ?? 'none') !== 'none';
    const hasCustomTiming = config.startTime !== 0 || (config.endTime > 0 && config.endTime !== -1);
    // Only skip if truly nothing is configured
    if (!hasIn && !hasOut && !hasCustomTiming) return undefined;
    const result: ElementAnimation = {
        preset: config.anim,
        duration: config.animDuration,
        startTime: config.startTime,
        ...(config.endTime > 0 ? { endTime: config.endTime } : {}),
    };
    if (hasOut) {
        result.outPreset = config.animOut;
        result.outDuration = config.animOutDuration;
    }
    return result;
}
