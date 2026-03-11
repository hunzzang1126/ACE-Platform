// ─────────────────────────────────────────────────
// fabricSerializer — Single Source of Truth Serializer
// ─────────────────────────────────────────────────
// Converts between Fabric.js canvas JSON and DesignElement[] for
// backward compatibility with SmartSizing, Preview, and AI consumers.
//
// ★ ARCHITECTURE NOTE:
// Fabric JSON (from fc.toObject()) is THE canonical data format.
// DesignElement[] is a DERIVED VIEW computed from Fabric JSON.
// This module provides the conversion functions.
// ─────────────────────────────────────────────────

import type {
    DesignElement,
    ShapeElement,
    TextElement,
    ImageElement,
    ElementAnimation,
} from '@/schema/elements.types';
import { absoluteToConstraints } from './elementConverters';
import { resolveFontWeight, getAnimationForElement } from './elementConverters';
import { ACE_CUSTOM_PROPS } from '@/hooks/fabricHelpers';

// ── Fabric JSON types (subset we need) ──

interface FabricObjectJSON {
    type: string;            // 'rect', 'textbox', 'image', 'ellipse', 'path', etc.
    left: number;
    top: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    opacity: number;
    fill: string | { colorStops?: Array<{ color: string }> } | null;
    rx?: number;             // border radius
    // Text-specific
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    fontStyle?: string;
    textAlign?: string;
    lineHeight?: number;
    charSpacing?: number;
    // Image-specific
    src?: string;
    // ACE custom props
    __aceId?: number;
    __aceZIndex?: number;
    __aceArtboard?: boolean;
    __aceName?: string;
    __aceGradientStart?: string;
    __aceGradientEnd?: string;
    __aceGradientAngle?: number;
    __aceGuide?: boolean;
    // Misc
    visible?: boolean;
}

interface FabricCanvasJSON {
    version: string;
    objects: FabricObjectJSON[];
}

// ── Public API ──

/**
 * Convert raw Fabric JSON string → DesignElement[] for SmartSizing/Preview/AI.
 * This is a READ-ONLY derived view — never mutate the Fabric JSON through elements.
 */
export function fabricJsonToElements(
    jsonStr: string,
    canvasW: number,
    canvasH: number,
): DesignElement[] {
    let parsed: FabricCanvasJSON;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        console.warn('[fabricSerializer] Failed to parse Fabric JSON');
        return [];
    }

    const elements: DesignElement[] = [];

    for (const obj of parsed.objects) {
        // Skip artboard and guide objects
        if (obj.__aceArtboard || obj.__aceGuide) continue;

        const aceId = obj.__aceId ?? 0;
        const zIndex = obj.__aceZIndex ?? 0;
        const name = obj.__aceName || `Element #${aceId}`;
        const opacity = obj.opacity ?? 1;

        // Compute absolute bounds from Fabric properties
        const x = obj.left ?? 0;
        const y = obj.top ?? 0;
        const w = (obj.width ?? 0) * (obj.scaleX ?? 1);
        const h = (obj.height ?? 0) * (obj.scaleY ?? 1);

        const constraints = absoluteToConstraints(x, y, w, h, canvasW, canvasH);
        const elementId = `engine-${aceId}`;
        const animation = getAnimationForElement(elementId);

        if (obj.type === 'textbox' || obj.type === 'i-text') {
            // ── Text Element ──
            const fillStr = typeof obj.fill === 'string' ? obj.fill : '#000000';
            const textEl: TextElement = {
                id: elementId,
                name,
                type: 'text',
                constraints,
                opacity,
                visible: obj.visible !== false,
                locked: false,
                zIndex,
                content: obj.text ?? '',
                fontFamily: obj.fontFamily ?? 'Inter',
                fontSize: obj.fontSize ?? 16,
                fontWeight: resolveFontWeight(obj.fontWeight),
                fontStyle: (obj.fontStyle === 'italic' ? 'italic' : 'normal'),
                color: fillStr,
                textAlign: (obj.textAlign as TextElement['textAlign']) ?? 'left',
                lineHeight: obj.lineHeight ?? 1.4,
                letterSpacing: (obj.charSpacing ?? 0) / 10,
                autoShrink: false,
                ...(animation ? { animation } : {}),
            };
            elements.push(textEl);

        } else if (obj.type === 'image') {
            // ── Image Element ──
            const imgEl: ImageElement = {
                id: elementId,
                name,
                type: 'image',
                constraints,
                opacity,
                visible: obj.visible !== false,
                locked: false,
                zIndex,
                src: obj.src ?? '',
                fit: 'cover',
                naturalWidth: obj.width,
                naturalHeight: obj.height,
                ...(animation ? { animation } : {}),
            };
            elements.push(imgEl);

        } else {
            // ── Shape Element (rect, ellipse, rounded rect, path) ──
            let fill = '#808080';
            let gradientStart: string | undefined;
            let gradientEnd: string | undefined;
            let gradientAngle: number | undefined;

            if (typeof obj.fill === 'string') {
                fill = obj.fill;
            } else if (obj.fill && typeof obj.fill === 'object') {
                const gradObj = obj.fill as { colorStops?: Array<{ color: string }> };
                if (gradObj.colorStops && gradObj.colorStops.length >= 2) {
                    gradientStart = gradObj.colorStops[0]?.color;
                    gradientEnd = gradObj.colorStops[gradObj.colorStops.length - 1]?.color;
                    fill = gradientStart ?? '#808080';
                }
            }

            // ACE custom gradient props (set by add_gradient_rect)
            if (obj.__aceGradientStart) {
                gradientStart = obj.__aceGradientStart;
                gradientEnd = obj.__aceGradientEnd;
                gradientAngle = obj.__aceGradientAngle;
                fill = gradientStart ?? fill;
            }

            let shapeType: ShapeElement['shapeType'] = 'rectangle';
            if (obj.type === 'ellipse') shapeType = 'ellipse';

            const shapeEl: ShapeElement = {
                id: elementId,
                name,
                type: 'shape',
                constraints,
                opacity,
                visible: obj.visible !== false,
                locked: false,
                zIndex,
                shapeType,
                fill,
                borderRadius: obj.rx ?? 0,
                ...(gradientStart ? { gradientStart, gradientEnd, gradientAngle } : {}),
                ...(animation ? { animation } : {}),
            };
            elements.push(shapeEl);
        }
    }

    // Sort by zIndex for consistent ordering
    elements.sort((a, b) => a.zIndex - b.zIndex);
    return elements;
}

/**
 * List of custom ACE properties to include in Fabric's toObject() serialization.
 * Re-exported from fabricHelpers for convenience.
 */
export { ACE_CUSTOM_PROPS };
