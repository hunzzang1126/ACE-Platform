// ─────────────────────────────────────────────────
// executorHelpers — Shared types and helpers for command executors
// ─────────────────────────────────────────────────

import type { SceneNodeInfo } from './agentContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Engine = any;

export interface ExecutionResult {
    success: boolean;
    message: string;
    nodeId?: number;
    data?: unknown;
}

/** Color helper: HSL hue (0-360) → RGB (0-1) */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [r + m, g + m, b + m];
}

/** Parse #rrggbb or #rgb → [r, g, b] in 0-1 */
export function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
        return [
            parseInt(clean[0]! + clean[0]!, 16) / 255,
            parseInt(clean[1]! + clean[1]!, 16) / 255,
            parseInt(clean[2]! + clean[2]!, 16) / 255,
        ];
    }
    if (clean.length === 6) {
        return [
            parseInt(clean.slice(0, 2), 16) / 255,
            parseInt(clean.slice(2, 4), 16) / 255,
            parseInt(clean.slice(4, 6), 16) / 255,
        ];
    }
    return [0, 0, 0];
}

export function rgbToHex(r: number, g: number, b: number): string {
    const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${to(r)}${to(g)}${to(b)}`;
}

export function makeNodeInfo(
    id: number, type: SceneNodeInfo['type'],
    x: number, y: number, w: number, h: number,
    color: string, opacity: number,
): SceneNodeInfo {
    const colorNames: Record<string, string> = {
        '#ff0000': 'Red', '#0033ff': 'Blue', '#00cc66': 'Green',
        '#ffee00': 'Yellow', '#9933ee': 'Purple', '#00ccff': 'Cyan',
        '#ff8800': 'Orange', '#ff6699': 'Pink', '#ffffff': 'White',
        '#000000': 'Black',
    };
    const typeName = type === 'rounded_rect' ? 'Rounded Rect'
        : type === 'gradient_rect' ? 'Gradient Rect'
            : type.charAt(0).toUpperCase() + type.slice(1);
    const colorName = colorNames[color.toLowerCase()] ?? color;
    const label = `${colorName} ${typeName} #${id}`;

    return {
        id, type, x, y, width: w, height: h,
        color, opacity, zIndex: 0,
        label,
        effects: { hasShadow: false, brightness: 1, contrast: 1, saturation: 1, hueRotate: 0, blendMode: 'normal' },
        animations: [],
    };
}

export function getLayoutColor(scheme: string, i: number, total: number): [number, number, number] {
    switch (scheme) {
        case 'rainbow':
            return hslToRgb((i / total) * 360, 0.8, 0.55);
        case 'monochrome':
            return hslToRgb(210, 0.7, 0.3 + (i / total) * 0.5);
        case 'gradient': {
            const t = i / Math.max(total - 1, 1);
            return [0.2 + t * 0.8, 0.4 * (1 - t), 0.9 * (1 - t)];
        }
        default:
            return [Math.random(), Math.random(), Math.random()];
    }
}
