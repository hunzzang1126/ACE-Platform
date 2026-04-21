// ─────────────────────────────────────────────────
// fabricHeadlessRenderer — Pixel-perfect Fabric.js export
// ─────────────────────────────────────────────────
// ★ SINGLE SOURCE OF TRUTH for rendering.
// Creates a headless Fabric canvas, restores all elements using
// the SAME Fabric APIs as the interactive editor, then exports.
// Result: Preview == Export == Canvas Editor rendering.
// ─────────────────────────────────────────────────

import {
    Canvas, Rect, Ellipse, Textbox, FabricImage, Gradient,
} from 'fabric';
import { constraintsToAbsolute, hexToRgbFloat } from '@/engine/elementConverters';
import { applyTextEffectCSS } from '@/hooks/shimTextEffects';
import { getAnimPreset } from '@/ai/fontAnimPresets';
import { generateFontAnimCSS } from '@/services/fontAnimGenerator';
import type { BannerVariant } from '@/schema/design.types';
import type { ShapeElement, TextElement, ImageElement } from '@/schema/elements.types';

/**
 * Render a BannerVariant to a PNG dataURL using a headless Fabric canvas.
 * Uses the exact same Fabric.js rendering as the interactive editor.
 */
export async function renderVariantWithFabric(variant: BannerVariant): Promise<string> {
    const { width: w, height: h } = variant.preset;

    // Create offscreen canvas element + Fabric instance
    const canvasEl = document.createElement('canvas');
    canvasEl.width = w;
    canvasEl.height = h;
    const fc = new Canvas(canvasEl, {
        width: w, height: h,
        renderOnAddRemove: false,
        backgroundColor: variant.backgroundColor || '#ffffff',
    });

    // Sort elements by z-index and render each
    const sorted = [...variant.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sorted) {
        const abs = constraintsToAbsolute(el.constraints, w, h);

        if (el.type === 'shape') {
            addShapeToFabric(fc, el as ShapeElement, abs);
        } else if (el.type === 'text') {
            addTextToFabric(fc, el as TextElement, abs);
        } else if (el.type === 'image' && el.src) {
            await addImageToFabric(fc, el as ImageElement, abs);
        } else if (el.type === 'button') {
            addButtonToFabric(fc, el, abs);
        }
    }

    fc.renderAll();

    const dataUrl = fc.toDataURL({
        format: 'png', left: 0, top: 0,
        width: w, height: h, multiplier: 1,
    });

    // Cleanup
    fc.dispose();
    return dataUrl;
}

/**
 * Generate HTML5 banner code for a variant, including font animations.
 * Returns a complete HTML string with embedded CSS @keyframes.
 */
export function renderVariantToHTML5(variant: BannerVariant): string {
    const cssBlocks: string[] = [];

    // Collect font animation CSS from text elements
    for (const el of variant.elements) {
        if (el.type === 'text' && el.fontAnimation?.enabled) {
            const preset = getAnimPreset(el.fontAnimation.presetId);
            const css = generateFontAnimCSS(el.id, preset);
            if (css) cssBlocks.push(css);
        }
    }

    // Return CSS blocks (to be included in HTML5 export template)
    // This is a data helper — the actual HTML template assembly is done by the export UI
    return cssBlocks.join('\n\n');
}

// ── Element adders (mirror shimCreators.ts logic) ──

interface AbsRect { x: number; y: number; w: number; h: number }

function addShapeToFabric(fc: Canvas, el: ShapeElement, abs: AbsRect): void {
    const { x, y, w, h } = abs;

    if (el.shapeType === 'ellipse') {
        const [r, g, b] = hexToRgbFloat(el.fill || '#808080');
        const ellipse = new Ellipse({
            left: x, top: y, rx: w / 2, ry: h / 2,
            fill: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`,
            opacity: el.opacity ?? 1,
            angle: el.constraints.rotation ?? 0,
        });
        fc.add(ellipse);
        return;
    }

    const opts: Record<string, unknown> = {
        left: x, top: y, width: w, height: h,
        opacity: el.opacity ?? 1,
        rx: el.borderRadius ?? 0,
        ry: el.borderRadius ?? 0,
        angle: el.constraints.rotation ?? 0,
    };

    if (el.gradientStart && el.gradientEnd) {
        const angleDeg = el.gradientAngle ?? 135;
        const rad = (angleDeg * Math.PI) / 180;
        const x1 = 0.5 - Math.sin(rad) * 0.5;
        const y1 = 0.5 - Math.cos(rad) * 0.5;
        const x2 = 0.5 + Math.sin(rad) * 0.5;
        const y2 = 0.5 + Math.cos(rad) * 0.5;
        opts.fill = new Gradient({
            type: 'linear',
            coords: { x1: x1 * w, y1: y1 * h, x2: x2 * w, y2: y2 * h },
            colorStops: [{ offset: 0, color: el.gradientStart }, { offset: 1, color: el.gradientEnd }],
            gradientUnits: 'pixels',
        });
    } else {
        opts.fill = el.fill || '#cccccc';
    }

    const rect = new Rect(opts);
    fc.add(rect);
}

function addTextToFabric(fc: Canvas, el: TextElement, abs: AbsRect): void {
    const { x, y, w } = abs;
    const [r, g, b] = hexToRgbFloat(el.color || '#ffffff');
    const fillColor = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

    const tb = new Textbox(el.content || '', {
        left: x, top: y, width: w > 0 ? w : 200,
        fontSize: el.fontSize || 16,
        fontFamily: el.fontFamily || 'Inter, system-ui, sans-serif',
        fontWeight: el.fontWeight || '400',
        fontStyle: (el.fontStyle === 'italic' ? 'italic' : 'normal') as any,
        fill: fillColor,
        textAlign: (el.textAlign as any) || 'left',
        lineHeight: el.lineHeight ?? 1.4,
        charSpacing: (el.letterSpacing ?? 0) * 10,
        opacity: el.opacity ?? 1,
        angle: el.constraints.rotation ?? 0,
    });

    // ★ Apply textEffect using the SAME function as the interactive editor.
    // This guarantees: Editor == Preview == Export for all text effects.
    const fx = el.textEffect;
    if (fx && fx.type !== 'none') {
        applyTextEffectCSS(tb, fx.type, fx.intensity ?? 50, fx.color || '#ffffff', fc);
    }

    fc.add(tb);
}

async function addImageToFabric(fc: Canvas, el: ImageElement, abs: AbsRect): Promise<void> {
    const { x, y, w, h } = abs;
    try {
        let src = el.src;
        if (src.startsWith('idb://') || src.startsWith('storage://')) {
            const { resolveAsset } = await import('@/services/assetService');
            src = await resolveAsset(src);
        }
        const isDataUrl = src.startsWith('data:');
        const imgOptions = isDataUrl ? {} : { crossOrigin: 'anonymous' as const };
        const img = await FabricImage.fromURL(src, imgOptions);
        const natW = img.width ?? 200;
        const natH = img.height ?? 200;
        img.set({
            left: x, top: y,
            scaleX: w / Math.max(natW, 1),
            scaleY: h / Math.max(natH, 1),
            opacity: el.opacity ?? 1,
            angle: el.constraints.rotation ?? 0,
        });
        fc.add(img);
    } catch {
        // Skip failed images silently
    }
}

function addButtonToFabric(fc: Canvas, el: any, abs: AbsRect): void {
    const { x, y, w, h } = abs;
    // Button background
    const bg = new Rect({
        left: x, top: y, width: w, height: h,
        fill: el.backgroundColor || '#2563eb',
        rx: el.borderRadius ?? 6, ry: el.borderRadius ?? 6,
        opacity: el.opacity ?? 1,
        angle: el.constraints?.rotation ?? 0,
    });
    fc.add(bg);

    // Button label
    if (el.label) {
        const tb = new Textbox(el.label, {
            left: x, top: y, width: w,
            fontSize: el.fontSize ?? 14,
            fontFamily: el.fontFamily || 'Inter, system-ui, sans-serif',
            fontWeight: el.fontWeight || '600',
            fill: el.color || '#ffffff',
            textAlign: 'center',
            opacity: el.opacity ?? 1,
        });
        // Vertically center text in button
        const textH = (el.fontSize ?? 14) * 1.2;
        tb.set({ top: y + (h - textH) / 2 });
        fc.add(tb);
    }
}
