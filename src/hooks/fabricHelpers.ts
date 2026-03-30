// ─────────────────────────────────────────────────
// fabricHelpers — Shared utilities for Fabric.js canvas
// ─────────────────────────────────────────────────
// Pure functions used by both useFabricCanvas and fabricEngineShim.
// No React dependencies.
// ─────────────────────────────────────────────────

import { Textbox, Shadow, type FabricObject } from 'fabric';
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
    // ★ REGRESSION GUARD: protect against non-string values (e.g. numeric 0.9 from corrupted gradient data)
    if (typeof colorStr !== 'string') return [0.5, 0.5, 0.5];
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
    return (obj as any).__glidArtboard === true;
}

// ── Extract EngineNode from Fabric object ──
export function fabricToEngineNode(obj: FabricObject): EngineNode {
    const id = (obj as any).__glidId ?? 0;
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
    if ((obj as any).__glidGradientStart) {
        gradientStart = (obj as any).__glidGradientStart;
        gradientEnd = (obj as any).__glidGradientEnd;
        gradientAngle = (obj as any).__glidGradientAngle;
        fill = gradientStart ?? fill;
    }

    const [r, g, b] = hexToRgb01(fill);

    // ★ REGRESSION GUARD: Fabric.js resize uses scaleX/scaleY to visually enlarge
    // objects, but keeps original property values (fontSize, rx, charSpacing, etc.).
    // We must normalize: compute scaled dimensions at scale=1.
    const scaleX = obj.scaleX ?? 1;
    const scaleY = obj.scaleY ?? 1;

    let aceType: EngineNode['type'] = 'rect';
    let name = `Rectangle #${id}`;
    if (objType === 'ellipse') {
        aceType = 'ellipse';
        name = `Ellipse #${id}`;
    } else if (objType === 'textbox' || objType === 'i-text') {
        aceType = 'text';
        name = (obj as any).__glidName || `Text #${id}`;
    } else if (objType === 'image') {
        aceType = 'image';
        name = (obj as any).__glidName || `Image #${id}`;
    } else if (objType === 'path') {
        aceType = 'path';
        name = `Path #${id}`;
    } else if (br > 0) {
        aceType = 'rounded_rect';
        name = `Rounded Rect #${id}`;
    }

    // Prefer custom name if set
    if ((obj as any).__glidName) {
        name = (obj as any).__glidName;
    }

    // ★ Scale-aware borderRadius: Fabric's rx is in original coordinate space.
    // When object is scaled, visual border radius = rx * min(scaleX, scaleY).
    const effectiveBorderRadius = br * Math.min(scaleX, scaleY);

    const node: EngineNode = {
        id,
        type: aceType,
        x: obj.left ?? 0,
        y: obj.top ?? 0,
        w: (obj.width ?? 0) * scaleX,
        h: (obj.height ?? 0) * scaleY,
        opacity: obj.opacity ?? 1,
        z_index: (obj as any).__glidZIndex ?? 0,
        fill_r: r,
        fill_g: g,
        fill_b: b,
        fill_a: 1,
        border_radius: effectiveBorderRadius,
        name,
        gradient_start: gradientStart,
        gradient_end: gradientEnd,
        gradient_angle: gradientAngle,
        angle: obj.angle ?? 0,
    };

    // Text-specific properties
    // ★ REGRESSION GUARD: fontSize must include scaleY to preserve visual size
    // after save/restore cycle. Fabric resize changes scaleY, not fontSize.
    // Same applies to charSpacing (must scale with scaleX).
    if (aceType === 'text' && obj instanceof Textbox) {
        node.content = obj.text ?? '';
        node.fontSize = Math.round((obj.fontSize ?? 16) * scaleY);
        node.fontFamily = obj.fontFamily ?? 'Inter';
        node.fontWeight = String(obj.fontWeight ?? '400');
        node.color = (obj as any).__glidOriginalFill || (typeof obj.fill === 'string' && obj.fill !== 'transparent' ? obj.fill : '#000000');
        node.textAlign = obj.textAlign ?? 'left';
        node.lineHeight = obj.lineHeight ?? 1.4;
        node.letterSpacing = Math.round(((obj.charSpacing ?? 0) / 10) * scaleX * 10) / 10;
        // ★ REGRESSION GUARD: Preserve fontStyle — Fabric stores 'italic' or 'normal'.
        node.fontStyle = (obj.fontStyle as string) || 'normal';
    }

    // Image-specific properties
    if (aceType === 'image') {
        // ★ DATA INTEGRITY: Prefer __glidPersistSrc (set during restore) over _element.src.
        // _element.src is a transient blob: URL that dies when the session ends.
        // __glidPersistSrc holds the stable idb:// or data: URL that survives persist cycles.
        const persistSrc = (obj as any).__glidPersistSrc;
        const imgEl = (obj as any)._element;
        if (persistSrc) {
            node.src = persistSrc;
        } else if (imgEl?.src) {
            node.src = imgEl.src;
        }
        // ★ REGRESSION GUARD: SVGs without explicit width/height attributes report
        // naturalWidth/naturalHeight=0 from the HTMLImageElement on subsequent loads.
        // Use Fabric object's stored .width/.height as authoritative source, since
        // Fabric correctly reads the SVG viewBox dimensions on initial load.
        // Always prefer the non-zero value to avoid clipping on restore.
        const fabricW = (obj as any).width ?? 0;
        const fabricH = (obj as any).height ?? 0;
        const htmlNatW = imgEl?.naturalWidth ?? 0;
        const htmlNatH = imgEl?.naturalHeight ?? 0;
        node.naturalWidth = htmlNatW > 0 ? htmlNatW : (fabricW > 0 ? fabricW : undefined);
        node.naturalHeight = htmlNatH > 0 ? htmlNatH : (fabricH > 0 ? fabricH : undefined);

        // ★ REGRESSION GUARD: Detect objectFit from scale ratio.
        // Fabric stores images as width/height (natural size) + scaleX/scaleY.
        // When user resizes a background to fill the artboard, scaleX ≠ scaleY * (natW/natH)
        // meaning the image is STRETCHED (not cropped). CSS objectFit must be 'fill' to match.
        // When scaleX/scaleY maintain the aspect ratio → 'cover' (default CSS crop behavior).
        const effectiveNatW = node.naturalWidth ?? 0;
        const effectiveNatH = node.naturalHeight ?? 0;
        if (effectiveNatW > 0 && effectiveNatH > 0) {
            const sx = obj.scaleX ?? 1;
            const sy = obj.scaleY ?? 1;
            // Check if scale ratio matches natural aspect ratio (within 1% tolerance)
            const expectedScaleRatio = effectiveNatW / effectiveNatH;
            const actualScaleRatio = sx / sy;
            const isStretched = Math.abs(actualScaleRatio - expectedScaleRatio) / expectedScaleRatio > 0.02;
            node.objectFit = isStretched ? 'fill' : 'cover';
        } else {
            // No natural dimensions — assume cover (standard behavior)
            node.objectFit = 'cover';
        }
    }

    // Shadow / glow effect
    if (obj.shadow && obj.shadow instanceof Shadow) {
        const s = obj.shadow;
        node.shadow_offsetX = s.offsetX ?? 0;
        node.shadow_offsetY = s.offsetY ?? 0;
        node.shadow_blur = s.blur ?? 0;
        node.shadow_color = s.color ?? 'rgba(0,0,0,0.5)';
    }

    // Text effect (Canva-style: outline, neon, glitch, etc.)
    if ((obj as any).__glidTextEffectType && (obj as any).__glidTextEffectType !== 'none') {
        node.textEffect_type = (obj as any).__glidTextEffectType;
        node.textEffect_intensity = (obj as any).__glidTextEffectIntensity ?? 50;
        node.textEffect_color = (obj as any).__glidTextEffectColor ?? '#ffffff';
    }

    // Visibility and lock state
    node.visible = obj.visible !== false;
    node.locked = !!(obj as any).lockMovementX;

    return node;
}

// ── Custom properties to include in serialization ──
export const GLID_CUSTOM_PROPS = ['__glidId', '__glidZIndex', '__glidArtboard', '__glidName', '__glidGradientStart', '__glidGradientEnd', '__glidGradientAngle', '__glidCustomStyles', '__glidTextEffectType', '__glidTextEffectIntensity', '__glidTextEffectColor', '__glidOriginalFill', '__glidPersistSrc'];

// Patch a Fabric object to include Glid custom props in toObject()
export function patchAceProps(obj: FabricObject): void {
    const original = obj.toObject.bind(obj);
    obj.toObject = function (additionalProps?: string[]) {
        const data = original(additionalProps);
        data.__glidId = (this as any).__glidId;
        data.__glidZIndex = (this as any).__glidZIndex;
        if ((this as any).__glidArtboard) data.__glidArtboard = true;
        if ((this as any).__glidName) data.__glidName = (this as any).__glidName;
        if ((this as any).__glidGradientStart) data.__glidGradientStart = (this as any).__glidGradientStart;
        if ((this as any).__glidGradientEnd) data.__glidGradientEnd = (this as any).__glidGradientEnd;
        if ((this as any).__glidGradientAngle != null) data.__glidGradientAngle = (this as any).__glidGradientAngle;
        if ((this as any).__glidCustomStyles) data.__glidCustomStyles = (this as any).__glidCustomStyles;
        if ((this as any).__glidTextEffectType) data.__glidTextEffectType = (this as any).__glidTextEffectType;
        if ((this as any).__glidTextEffectIntensity != null) data.__glidTextEffectIntensity = (this as any).__glidTextEffectIntensity;
        if ((this as any).__glidTextEffectColor) data.__glidTextEffectColor = (this as any).__glidTextEffectColor;
        if ((this as any).__glidOriginalFill) data.__glidOriginalFill = (this as any).__glidOriginalFill;
        return data;
    };
}
