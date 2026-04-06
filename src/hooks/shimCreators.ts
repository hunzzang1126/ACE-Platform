// ─────────────────────────────────────────────────
// shimCreators — Element creation methods for Fabric engine shim
// ─────────────────────────────────────────────────
// Handles add_rect, add_rounded_rect, add_gradient_rect,
// add_ellipse, add_text, add_image, replace_image_src.
// ─────────────────────────────────────────────────

import {
    Rect, Ellipse, Textbox,
    FabricImage, Gradient,
} from 'fabric';
import { nextId, rgbToHex, patchAceProps } from './fabricHelpers';
import type { ShimContext } from './shimTypes';

/** Create element factory methods for the Fabric engine shim */
export function createCreatorMethods(ctx: ShimContext) {
    const { fc, syncState, findById, userObjects, artboardW } = ctx;

    return {
        add_rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, name?: string) => {
            const id = nextId();
            const rect = new Rect({
                left: x, top: y, width: w, height: h,
                fill: rgbToHex(r, g, b), opacity: a,
            });
            (rect as any).__glidId = id;
            (rect as any).__glidName = name || `Rectangle #${id}`;
            (rect as any).__glidZIndex = userObjects().length;
            patchAceProps(rect);
            fc.add(rect); fc.renderAll(); syncState();
            return id;
        },

        add_rounded_rect: (x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, radius: number, name?: string) => {
            const id = nextId();
            const rect = new Rect({
                left: x, top: y, width: w, height: h,
                fill: rgbToHex(r, g, b), opacity: a, rx: radius, ry: radius,
            });
            (rect as any).__glidId = id;
            (rect as any).__glidName = name || `Rounded Rect #${id}`;
            (rect as any).__glidZIndex = userObjects().length;
            patchAceProps(rect);
            fc.add(rect); fc.renderAll(); syncState();
            return id;
        },

        add_gradient_rect: (
            x: number, y: number, w: number, h: number,
            hex1: string, hex2: string,
            angleDeg: number = 0, radius: number = 0, name?: string,
        ) => {
            const id = nextId();
            const rad = (angleDeg * Math.PI) / 180;
            const x1 = 0.5 - Math.sin(rad) * 0.5;
            const y1 = 0.5 - Math.cos(rad) * 0.5;
            const x2 = 0.5 + Math.sin(rad) * 0.5;
            const y2 = 0.5 + Math.cos(rad) * 0.5;
            const gradient = new Gradient({
                type: 'linear',
                coords: { x1: x1 * w, y1: y1 * h, x2: x2 * w, y2: y2 * h },
                colorStops: [{ offset: 0, color: hex1 }, { offset: 1, color: hex2 }],
                gradientUnits: 'pixels',
            });
            const rect = new Rect({
                left: x, top: y, width: w, height: h, fill: gradient, rx: radius, ry: radius,
            });
            (rect as any).__glidId = id;
            (rect as any).__glidName = name || `Gradient Rect #${id}`;
            (rect as any).__glidZIndex = userObjects().length;
            (rect as any).__glidGradientStart = hex1;
            (rect as any).__glidGradientEnd = hex2;
            (rect as any).__glidGradientAngle = angleDeg;
            patchAceProps(rect);
            fc.add(rect); fc.renderAll(); syncState();
            return id;
        },

        add_ellipse: (cx: number, cy: number, rx: number, ry: number, r: number, g: number, b: number, a: number) => {
            const id = nextId();
            const el = new Ellipse({
                left: cx - rx, top: cy - ry, rx, ry,
                fill: rgbToHex(r, g, b), opacity: a,
            });
            (el as any).__glidId = id;
            (el as any).__glidZIndex = userObjects().length;
            patchAceProps(el);
            fc.add(el); fc.renderAll();
            return id;
        },

        add_text: (
            x: number, y: number, content: string,
            fontSize: number, fontFamily: string, fontWeight: string,
            r: number, g: number, b: number, _a: number,
            width: number, textAlign: string,
            name?: string, lineHeight?: number, letterSpacing?: number, fontStyle?: string,
        ) => {
            const id = nextId();
            const tb = new Textbox(content || 'Text', {
                left: x, top: y, width: width > 0 ? width : 200,
                fontSize: fontSize || 18,
                fontFamily: fontFamily || 'Inter, system-ui, sans-serif',
                fontWeight: fontWeight || '400',
                fontStyle: (fontStyle === 'italic' ? 'italic' : 'normal') as any,
                fill: rgbToHex(r, g, b),
                textAlign: (textAlign as any) || 'left',
                lineHeight: lineHeight ?? 1.4,
                charSpacing: (letterSpacing ?? 0) * 10,
                editable: true,
            });
            (tb as any).__glidId = id;
            (tb as any).__glidName = name || `Text #${id}`;
            (tb as any).__glidZIndex = userObjects().length;
            patchAceProps(tb);
            tb.padding = 4; // ★ Consistent handle spacing around text
            fc.add(tb);
            tb.setCoords();
            fc.renderAll(); syncState();
            return id;
        },

        add_image: async (x: number, y: number, src: string, w?: number, h?: number, name?: string, zIndex?: number, storedNatW?: number, storedNatH?: number, fit?: 'cover' | 'contain' | 'fill'): Promise<number> => {
            const id = nextId();
            try {
                const isDataUrl = src.startsWith('data:');
                const isSvg = src.startsWith('data:image/svg') || (src.startsWith('http') && src.endsWith('.svg'));
                const imgOptions = isDataUrl ? {} : { crossOrigin: 'anonymous' as const };
                const img = await FabricImage.fromURL(src, imgOptions);

                // ★ SVG viewBox dimension resolution
                let resolvedNatW = (storedNatW && storedNatW > 0) ? storedNatW : (img.width ?? 0);
                let resolvedNatH = (storedNatH && storedNatH > 0) ? storedNatH : (img.height ?? 0);

                if (isSvg && (resolvedNatW === 0 || resolvedNatH === 0)) {
                    try {
                        const svgText = isSvg && isDataUrl
                            ? atob(src.split(',')[1] ?? '') || decodeURIComponent(src.split(',')[1] ?? '')
                            : '';
                        const vbMatch = svgText.match(/viewBox=["']([^"']+)["']/);
                        if (vbMatch && vbMatch[1]) {
                            const parts = vbMatch[1].trim().split(/[,\s]+/).map(Number);
                            if (parts.length >= 4 && (parts[2] ?? 0) > 0 && (parts[3] ?? 0) > 0) {
                                resolvedNatW = resolvedNatW > 0 ? resolvedNatW : (parts[2] ?? 0);
                                resolvedNatH = resolvedNatH > 0 ? resolvedNatH : (parts[3] ?? 0);
                            }
                        }
                        const wMatch = svgText.match(/\bwidth=["'](\d+(?:\.\d+)?)/);
                        const hMatch = svgText.match(/\bheight=["'](\d+(?:\.\d+)?)/);
                        if (wMatch && wMatch[1] && resolvedNatW === 0) resolvedNatW = parseFloat(wMatch[1]);
                        if (hMatch && hMatch[1] && resolvedNatH === 0) resolvedNatH = parseFloat(hMatch[1]);
                    } catch { /* SVG parse failed */ }
                }

                const natW = resolvedNatW > 0 ? resolvedNatW : 200;
                const natH = resolvedNatH > 0 ? resolvedNatH : 200;

                let scaleX: number, scaleY: number;
                if (w != null && h != null) {
                    // ★ REGRESSION GUARD: Preserve aspect ratio unless fit='fill'.
                    // 'cover' (default): uniform scale to cover target area — NO distortion.
                    // 'fill': stretch independently — matches what Fabric saved.
                    if (fit === 'fill') {
                        scaleX = w / Math.max(natW, 1);
                        scaleY = h / Math.max(natH, 1);
                    } else {
                        // Uniform scale (cover mode) — preserve aspect ratio
                        const uniformScale = Math.max(w / Math.max(natW, 1), h / Math.max(natH, 1));
                        scaleX = uniformScale;
                        scaleY = uniformScale;
                    }
                } else if (w != null) {
                    scaleX = scaleY = w / Math.max(natW, 1);
                } else {
                    const targetW = Math.min(natW, artboardW * 0.7);
                    scaleX = scaleY = targetW / Math.max(natW, 1);
                }

                img.set({ left: x, top: y, scaleX, scaleY });
                (img as any).__glidId = id;
                (img as any).__glidName = name || `Image #${id}`;
                // ★ DATA INTEGRITY: Capture original src before any blob: conversion.
                // data: URLs and http(s): URLs are stable, blob: URLs are not.
                if (src.startsWith('data:') || src.startsWith('idb://')) {
                    (img as any).__glidPersistSrc = src;
                }
                const targetZIndex = zIndex ?? userObjects().length;
                (img as any).__glidZIndex = targetZIndex;
                patchAceProps(img);
                fc.add(img);

                const sortedByZ = userObjects().sort(
                    (a, b) => ((a as any).__glidZIndex ?? 0) - ((b as any).__glidZIndex ?? 0)
                );
                const rank = sortedByZ.indexOf(img);
                if (rank >= 0) fc.moveObjectTo(img, rank + 1);
                if (zIndex === undefined) fc.setActiveObject(img);
                fc.renderAll(); syncState();
            } catch (err) {
                console.error('[EngineShim] Failed to load image:', err);
            }
            return id;
        },

        replace_image_src: async (id: number, newSrc: string): Promise<void> => {
            const obj = findById(id);
            if (!obj || obj.type !== 'image') return;
            try {
                const isDataUrl = newSrc.startsWith('data:');
                const imgOptions = isDataUrl ? {} : { crossOrigin: 'anonymous' as const };
                const newImg = await FabricImage.fromURL(newSrc, imgOptions);
                (obj as any)._element = (newImg as any)._element;
                (obj as any)._originalElement = (newImg as any)._originalElement;
                // ★ CRITICAL: Update stable ref so save persists the NEW image,
                // not the original. Without this, Remove BG results are lost on save.
                (obj as any).__glidPersistSrc = newSrc;
                obj.dirty = true;
                fc.renderAll(); syncState();
            } catch (err) {
                console.error('[EngineShim] replaceImageSrc failed:', err);
            }
        },
    };
}
