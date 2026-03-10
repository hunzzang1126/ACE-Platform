// ─────────────────────────────────────────────────
// fabricHelpers — Shared utilities for Fabric.js canvas
// ─────────────────────────────────────────────────
// Pure functions used by both useFabricCanvas and fabricEngineShim.
// No React dependencies.
// ─────────────────────────────────────────────────

import { Textbox, type FabricObject } from 'fabric';
import type { EngineNode } from './canvasTypes';

// ── Unique ID generator ──
let _nextId = 1;
export function nextId(): number { return _nextId++; }

// Random pastel colors for new shapes
const SHAPE_COLORS: string[] = [
    '#547BFF', '#29D2A0', '#F05C99',
    '#FFA600', '#9966E6', '#33BFD9',
    '#F2D933',
];
let colorIdx = 0;
export function nextColor(): string {
    const c = SHAPE_COLORS[colorIdx % SHAPE_COLORS.length]!;
    colorIdx++;
    return c;
}

// ── Hex ↔ RGB helpers ──
export function hexToRgb01(colorStr: string): [number, number, number] {
    if (colorStr.startsWith('rgba') || colorStr.startsWith('rgb')) {
        const m = colorStr.match(/rgba?\((\d+\.?\d*),\s*(\d+\.?\d*),\s*(\d+\.?\d*)/);
        if (m) return [parseFloat(m[1]!) / 255, parseFloat(m[2]!) / 255, parseFloat(m[3]!) / 255];
    }
    const hex = colorStr.replace('#', '');
    if (hex.length === 3) {
        return [
            parseInt(hex.charAt(0) + hex.charAt(0), 16) / 255,
            parseInt(hex.charAt(1) + hex.charAt(1), 16) / 255,
            parseInt(hex.charAt(2) + hex.charAt(2), 16) / 255,
        ];
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return [0.5, 0.5, 0.5];
    return [r, g, b];
}

export function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Check if object is the artboard background ──
export function isArtboard(obj: FabricObject): boolean {
    return (obj as any).__aceArtboard === true;
}

// ── Extract EngineNode from Fabric object ──
export function fabricToEngineNode(obj: FabricObject): EngineNode {
    const id = (obj as any).__aceId ?? 0;
    const objType = obj.type;
    const br = (obj as any).rx ?? 0;

    // ── Extract fill color — handle gradient fills ──
    let fill = '#808080';
    let gradientStart: string | undefined;
    let gradientEnd: string | undefined;
    let gradientAngle: number | undefined;

    if (typeof obj.fill === 'string') {
        fill = obj.fill;
    } else if (obj.fill && typeof obj.fill === 'object') {
        // Fabric Gradient object — extract stop colors
        const gradObj = obj.fill as any;
        if (gradObj.colorStops && gradObj.colorStops.length >= 2) {
            gradientStart = gradObj.colorStops[0].color;
            gradientEnd = gradObj.colorStops[gradObj.colorStops.length - 1].color;
            fill = gradientStart ?? '#808080';
        }
    }

    // Read custom gradient props set by shim's add_gradient_rect
    if ((obj as any).__aceGradientStart) {
        gradientStart = (obj as any).__aceGradientStart;
        gradientEnd = (obj as any).__aceGradientEnd;
        gradientAngle = (obj as any).__aceGradientAngle;
        fill = gradientStart ?? fill;
    }

    const [r, g, b] = hexToRgb01(fill);

    let aceType: EngineNode['type'] = 'rect';
    let name = `Rectangle #${id}`;
    if (objType === 'ellipse') {
        aceType = 'ellipse';
        name = `Ellipse #${id}`;
    } else if (objType === 'textbox' || objType === 'i-text') {
        aceType = 'text';
        name = (obj as any).__aceName || `Text #${id}`;
    } else if (objType === 'image') {
        aceType = 'image';
        name = (obj as any).__aceName || `Image #${id}`;
    } else if (objType === 'path') {
        aceType = 'path';
        name = `Path #${id}`;
    } else if (br > 0) {
        aceType = 'rounded_rect';
        name = `Rounded Rect #${id}`;
    }

    // Prefer custom name if set
    if ((obj as any).__aceName) {
        name = (obj as any).__aceName;
    }

    const node: EngineNode = {
        id,
        type: aceType,
        x: obj.left ?? 0,
        y: obj.top ?? 0,
        w: (obj.width ?? 0) * (obj.scaleX ?? 1),
        h: (obj.height ?? 0) * (obj.scaleY ?? 1),
        opacity: obj.opacity ?? 1,
        z_index: (obj as any).__aceZIndex ?? 0,
        fill_r: r,
        fill_g: g,
        fill_b: b,
        fill_a: 1,
        border_radius: br,
        name,
        gradient_start: gradientStart,
        gradient_end: gradientEnd,
        gradient_angle: gradientAngle,
    };

    // Text-specific properties
    if (aceType === 'text' && obj instanceof Textbox) {
        node.content = obj.text ?? '';
        node.fontSize = obj.fontSize ?? 16;
        node.fontFamily = obj.fontFamily ?? 'Inter';
        node.fontWeight = String(obj.fontWeight ?? '400');
        node.color = typeof obj.fill === 'string' ? obj.fill : '#000000';
        node.textAlign = obj.textAlign ?? 'left';
        node.lineHeight = obj.lineHeight ?? 1.4;
        node.letterSpacing = (obj.charSpacing ?? 0) / 10;
    }

    // Image-specific properties
    if (aceType === 'image') {
        const imgEl = (obj as any)._element;
        if (imgEl?.src) {
            node.src = imgEl.src;
        }
        if (imgEl?.naturalWidth) node.naturalWidth = imgEl.naturalWidth;
        if (imgEl?.naturalHeight) node.naturalHeight = imgEl.naturalHeight;
    }

    return node;
}

// ── Custom properties to include in serialization ──
export const ACE_CUSTOM_PROPS = ['__aceId', '__aceZIndex', '__aceArtboard', '__aceName', '__aceGradientStart', '__aceGradientEnd', '__aceGradientAngle'];

// Patch a Fabric object to include ACE custom props in toObject()
export function patchAceProps(obj: FabricObject): void {
    const original = obj.toObject.bind(obj);
    obj.toObject = function (additionalProps?: string[]) {
        const data = original(additionalProps);
        data.__aceId = (this as any).__aceId;
        data.__aceZIndex = (this as any).__aceZIndex;
        if ((this as any).__aceArtboard) data.__aceArtboard = true;
        if ((this as any).__aceName) data.__aceName = (this as any).__aceName;
        if ((this as any).__aceGradientStart) data.__aceGradientStart = (this as any).__aceGradientStart;
        if ((this as any).__aceGradientEnd) data.__aceGradientEnd = (this as any).__aceGradientEnd;
        if ((this as any).__aceGradientAngle != null) data.__aceGradientAngle = (this as any).__aceGradientAngle;
        return data;
    };
}
