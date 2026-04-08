// ─────────────────────────────────────────────────
// fabricVideoExporter — MP4 export via headless Fabric frame-by-frame
// ─────────────────────────────────────────────────
// Steps through time, applies animation offsets, renders each frame
// with Fabric.js, encodes to H.264 via WebCodecs + mp4-muxer.
// ─────────────────────────────────────────────────

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import {
    Canvas, Rect, Ellipse, Textbox, FabricImage, Gradient,
} from 'fabric';
import { constraintsToAbsolute, hexToRgbFloat } from '@/engine/elementConverters';
import { applyTextEffectCSS } from '@/hooks/shimTextEffects';
import { computeAnimStyle } from '@/hooks/useAnimationPresets';
import type { BannerVariant } from '@/schema/design.types';
import type { ShapeElement, TextElement, ImageElement, DesignElement } from '@/schema/elements.types';

export interface VideoExportOptions {
    fps: number;
    bitrate?: number;
}

export interface VideoExportProgress {
    phase: 'rendering' | 'encoding' | 'muxing' | 'done' | 'error';
    currentFrame: number;
    totalFrames: number;
    percent: number;
    error?: string;
}

/**
 * Export a BannerVariant as MP4 by rendering frame-by-frame with Fabric.js.
 * Animation transforms are applied per-element at each time step.
 */
export async function exportVariantToMp4(
    variant: BannerVariant,
    duration: number,
    options: VideoExportOptions,
    onProgress?: (p: VideoExportProgress) => void,
): Promise<ArrayBuffer> {
    const { fps, bitrate = 5_000_000 } = options;
    const { width: w, height: h } = variant.preset;
    const totalFrames = Math.ceil(duration * fps);

    if (typeof VideoEncoder === 'undefined') {
        throw new Error('WebCodecs API not available. Use Chrome 94+.');
    }

    // Resolve idb:// image URLs upfront (once)
    const resolvedSrcs: Record<string, string> = {};
    for (const el of variant.elements) {
        if (el.type === 'image' && el.src?.startsWith('idb://')) {
            try {
                const { resolveAsset } = await import('@/services/assetService');
                resolvedSrcs[el.id] = await resolveAsset(el.src);
            } catch { /* skip */ }
        }
    }

    // Pre-load image elements as HTMLImageElements
    const imageCache: Record<string, HTMLImageElement> = {};
    for (const el of variant.elements) {
        if (el.type !== 'image' || !el.src) continue;
        const src = resolvedSrcs[el.id] || el.src;
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject();
                img.src = src;
            });
            imageCache[el.id] = img;
        } catch { /* skip */ }
    }

    // Create MP4 muxer
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
        target,
        video: { codec: 'avc', width: w, height: h },
        fastStart: 'in-memory',
    });

    // Create H.264 encoder
    let encodedFrames = 0;
    const encoder = new VideoEncoder({
        output: (chunk, meta) => {
            muxer.addVideoChunk(chunk, meta ?? undefined);
            encodedFrames++;
        },
        error: (e) => {
            onProgress?.({ phase: 'error', currentFrame: encodedFrames, totalFrames, percent: 0, error: String(e) });
        },
    });

    encoder.configure({
        codec: 'avc1.42001f',
        width: w, height: h,
        bitrate,
        framerate: fps,
    });

    // ── Frame render loop ──
    const sorted = [...variant.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (let i = 0; i < totalFrames; i++) {
        const time = i / fps;

        // Render one frame with animation offsets
        const frameDataUrl = await renderFrameAtTime(sorted, w, h, time, variant.backgroundColor, imageCache, resolvedSrcs, duration);

        // Convert data URL → ImageBitmap → VideoFrame
        const img = new Image();
        await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = frameDataUrl; });
        const bitmap = await createImageBitmap(img);
        const frame = new VideoFrame(bitmap, {
            timestamp: Math.round((i / fps) * 1_000_000),
            duration: Math.round((1 / fps) * 1_000_000),
        });

        encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
        frame.close();
        bitmap.close();

        onProgress?.({ phase: 'rendering', currentFrame: i + 1, totalFrames, percent: ((i + 1) / totalFrames) * 100 });

        // Yield to browser every 5 frames
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    await encoder.flush();
    encoder.close();

    onProgress?.({ phase: 'muxing', currentFrame: totalFrames, totalFrames, percent: 100 });
    muxer.finalize();
    onProgress?.({ phase: 'done', currentFrame: totalFrames, totalFrames, percent: 100 });

    return target.buffer!;
}

/**
 * Render a BannerVariant at a given animation time → data URL.
 * Convenience wrapper for the preview grid (handles image loading internally).
 */
export async function renderVariantAtTime(variant: BannerVariant, time: number): Promise<string> {
    const { width: w, height: h } = variant.preset;
    const sorted = [...variant.elements].sort((a, b) => a.zIndex - b.zIndex);

    // Load images inline (preview only renders ~10fps, so this is acceptable)
    const imageCache: Record<string, HTMLImageElement> = {};
    for (const el of sorted) {
        if (el.type !== 'image' || !el.src) continue;
        let src = el.src;
        if (src.startsWith('idb://')) {
            try { const { resolveAsset } = await import('@/services/assetService'); src = await resolveAsset(src); } catch { continue; }
        }
        try {
            const img = new Image(); img.crossOrigin = 'anonymous';
            await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = src; });
            imageCache[el.id] = img;
        } catch { /* skip */ }
    }

    return renderFrameAtTime(sorted, w, h, time, variant.backgroundColor, imageCache, {}, 5);
}

/**
 * Render a single frame at a given time, applying animation offsets.
 */
export async function renderFrameAtTime(
    elements: DesignElement[],
    w: number, h: number,
    time: number,
    bgColor: string | undefined,
    imageCache: Record<string, HTMLImageElement>,
    resolvedSrcs: Record<string, string>,
    timelineDuration: number = 5,
): Promise<string> {
    const canvasEl = document.createElement('canvas');
    canvasEl.width = w;
    canvasEl.height = h;
    const fc = new Canvas(canvasEl, {
        width: w, height: h,
        renderOnAddRemove: false,
        backgroundColor: bgColor || '#ffffff',
    });

    for (const el of elements) {
        const abs = constraintsToAbsolute(el.constraints, w, h);
        const anim = el.animation;
        let offsetX = 0, offsetY = 0, opacity = el.opacity ?? 1, scaleM = 1;

        // Apply animation transform for this time
        const hasIn = anim && anim.preset !== 'none';
        const hasOut = anim && anim.outPreset && anim.outPreset !== 'none';
        if (hasIn || hasOut) {
            // ★ Use full timeline duration as fallback when element has no custom endTime
            const timelineDur = timelineDuration;
            const style = computeAnimStyle(
                (anim?.preset ?? 'none') as any, time, anim?.duration ?? 0.3, anim?.startTime ?? 0,
                anim?.endTime && anim.endTime > 0 ? anim.endTime : undefined,
                anim?.outPreset as any, anim?.outDuration,
                timelineDur,
            );
            // AE model: element doesn't exist at this time
            if (style.display === 'none') continue;
            if (style.opacity !== undefined) opacity = style.opacity as number;
            if (style.transform) {
                const tx = style.transform.match(/translateX\(([^)]+)px\)/);
                const ty = style.transform.match(/translateY\(([^)]+)px\)/);
                const sc = style.transform.match(/scale\(([^)]+)\)/);
                if (tx) offsetX = parseFloat(tx[1] ?? '0');
                if (ty) offsetY = parseFloat(ty[1] ?? '0');
                if (sc) scaleM = parseFloat(sc[1] ?? '1');
            }
        }

        if (el.type === 'shape') {
            addShapeFrame(fc, el as ShapeElement, abs, offsetX, offsetY, opacity, scaleM);
        } else if (el.type === 'text') {
            addTextFrame(fc, el as TextElement, abs, offsetX, offsetY, opacity, scaleM);
        } else if (el.type === 'image' && el.src) {
            addImageFrame(fc, el as ImageElement, abs, offsetX, offsetY, opacity, scaleM, imageCache);
        } else if (el.type === 'button') {
            addButtonFrame(fc, el, abs, offsetX, offsetY, opacity);
        }
    }

    fc.renderAll();
    const dataUrl = fc.toDataURL({ format: 'png', left: 0, top: 0, width: w, height: h, multiplier: 1 });
    fc.dispose();
    return dataUrl;
}

// ── Element rendering with animation offsets ──

interface AbsRect { x: number; y: number; w: number; h: number }

function addShapeFrame(fc: Canvas, el: ShapeElement, abs: AbsRect, ox: number, oy: number, opacity: number, scaleM: number): void {
    const { x, y, w: sw, h: sh } = abs;
    const finalX = x + ox, finalY = y + oy, finalW = sw * scaleM, finalH = sh * scaleM;

    if (el.shapeType === 'ellipse') {
        const [r, g, b] = hexToRgbFloat(el.fill || '#808080');
        fc.add(new Ellipse({ left: finalX, top: finalY, rx: finalW / 2, ry: finalH / 2, fill: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`, opacity, angle: el.constraints.rotation ?? 0 }));
        return;
    }

    const opts: Record<string, unknown> = { left: finalX, top: finalY, width: finalW, height: finalH, opacity, rx: el.borderRadius ?? 0, ry: el.borderRadius ?? 0, angle: el.constraints.rotation ?? 0 };
    if (el.gradientStart && el.gradientEnd) {
        const rad = ((el.gradientAngle ?? 135) * Math.PI) / 180;
        opts.fill = new Gradient({ type: 'linear', coords: { x1: (0.5 - Math.sin(rad) * 0.5) * finalW, y1: (0.5 - Math.cos(rad) * 0.5) * finalH, x2: (0.5 + Math.sin(rad) * 0.5) * finalW, y2: (0.5 + Math.cos(rad) * 0.5) * finalH }, colorStops: [{ offset: 0, color: el.gradientStart }, { offset: 1, color: el.gradientEnd }], gradientUnits: 'pixels' });
    } else { opts.fill = el.fill || '#cccccc'; }
    fc.add(new Rect(opts));
}

function addTextFrame(fc: Canvas, el: TextElement, abs: AbsRect, ox: number, oy: number, opacity: number, scaleM: number): void {
    const { x, y, w } = abs;
    const [r, g, b] = hexToRgbFloat(el.color || '#ffffff');
    const tb = new Textbox(el.content || '', {
        left: x + ox, top: y + oy, width: (w > 0 ? w : 200) * scaleM,
        fontSize: (el.fontSize || 16) * scaleM, fontFamily: el.fontFamily || 'Inter, system-ui, sans-serif',
        fontWeight: el.fontWeight || '400', fontStyle: (el.fontStyle === 'italic' ? 'italic' : 'normal') as any,
        fill: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`,
        textAlign: (el.textAlign as any) || 'left', lineHeight: el.lineHeight ?? 1.4,
        charSpacing: (el.letterSpacing ?? 0) * 10, opacity, angle: el.constraints.rotation ?? 0,
    });
    const fx = el.textEffect;
    if (fx && fx.type !== 'none') { applyTextEffectCSS(tb, fx.type, fx.intensity ?? 50, fx.color || '#ffffff', fc); }
    fc.add(tb);
}

function addImageFrame(fc: Canvas, el: ImageElement, abs: AbsRect, ox: number, oy: number, opacity: number, scaleM: number, imageCache: Record<string, HTMLImageElement>): void {
    const { x, y, w: iw, h: ih } = abs;
    const cached = imageCache[el.id];
    if (!cached) return;
    const fImg = new FabricImage(cached);
    const natW = fImg.width ?? 200, natH = fImg.height ?? 200;
    fImg.set({ left: x + ox, top: y + oy, scaleX: (iw * scaleM) / Math.max(natW, 1), scaleY: (ih * scaleM) / Math.max(natH, 1), opacity, angle: el.constraints.rotation ?? 0 });
    fc.add(fImg);
}

function addButtonFrame(fc: Canvas, el: any, abs: AbsRect, ox: number, oy: number, opacity: number): void {
    const { x, y, w, h } = abs;
    fc.add(new Rect({ left: x + ox, top: y + oy, width: w, height: h, fill: el.backgroundColor || '#2563eb', rx: el.borderRadius ?? 6, ry: el.borderRadius ?? 6, opacity, angle: el.constraints?.rotation ?? 0 }));
    if (el.label) {
        const tb = new Textbox(el.label, { left: x + ox, top: y + oy + (h - (el.fontSize ?? 14) * 1.2) / 2, width: w, fontSize: el.fontSize ?? 14, fontFamily: el.fontFamily || 'Inter', fontWeight: el.fontWeight || '600', fill: el.color || '#ffffff', textAlign: 'center', opacity });
        fc.add(tb);
    }
}

/** Trigger browser download */
export function downloadBlob(buffer: ArrayBuffer, filename: string, mime = 'video/mp4') {
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
