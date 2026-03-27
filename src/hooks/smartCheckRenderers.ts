// ─────────────────────────────────────────────────
// smartCheckRenderers — Canvas rendering for Vision QA
// ─────────────────────────────────────────────────

import type { BannerVariant } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { constraintsToAbsolute } from '@/engine/elementConverters';

/** Draw a rounded rectangle path on canvas context */
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * Render a variant's elements to an offscreen <canvas> for Vision QA.
 * Returns pure base64 (no data: prefix) or null on failure.
 */
export function renderVariantToCanvas(variant: BannerVariant): string | null {
    const w = variant.preset.width;
    const h = variant.preset.height;
    if (w === 0 || h === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(0, 0, w, h);

    const sorted = [...variant.elements]
        .filter(el => el.visible !== false)
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    for (const el of sorted) {
        const resolved = constraintsToAbsolute(el.constraints, w, h);
        const { x, y, w: elW, h: elH } = resolved;
        ctx.save();
        ctx.globalAlpha = el.opacity ?? 1;

        if (el.type === 'shape') {
            renderShape(ctx, el, x, y, elW, elH);
        } else if (el.type === 'text') {
            renderText(ctx, el, x, y, elW, elH);
        } else if (el.type === 'button') {
            renderButton(ctx, el, x, y, elW, elH);
        } else if (el.type === 'image') {
            renderImagePlaceholder(ctx, x, y, elW, elH);
        }

        ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/png');
    const idx = dataUrl.indexOf(',');
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function renderShape(ctx: CanvasRenderingContext2D, el: DesignElement, x: number, y: number, elW: number, elH: number): void {
    const shape = el as DesignElement & {
        fill?: string; borderRadius?: number; shapeType?: string;
        gradientStart?: string; gradientEnd?: string; gradientAngle?: number;
    };

    if (shape.gradientStart && shape.gradientEnd) {
        const cssAngle = shape.gradientAngle ?? 135;
        const mathAngle = (90 - cssAngle) * Math.PI / 180;
        const cx = x + elW / 2, cy = y + elH / 2;
        const len = Math.max(elW, elH);
        const grad = ctx.createLinearGradient(
            cx - Math.cos(mathAngle) * len / 2, cy + Math.sin(mathAngle) * len / 2,
            cx + Math.cos(mathAngle) * len / 2, cy - Math.sin(mathAngle) * len / 2,
        );
        grad.addColorStop(0, shape.gradientStart);
        grad.addColorStop(1, shape.gradientEnd);
        ctx.fillStyle = grad;
    } else {
        ctx.fillStyle = shape.fill ?? '#6C63FF';
    }

    const r = shape.borderRadius ?? 0;
    const isEllipse = shape.shapeType === 'ellipse' || shape.shapeType === 'circle' || r >= Math.min(elW, elH) / 2;

    if (isEllipse) {
        ctx.beginPath();
        ctx.ellipse(x + elW / 2, y + elH / 2, elW / 2, elH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (r > 0) {
        roundRect(ctx, x, y, elW, elH, r);
        ctx.fill();
    } else {
        ctx.fillRect(x, y, elW, elH);
    }
}

function renderText(ctx: CanvasRenderingContext2D, el: DesignElement, x: number, y: number, elW: number, elH: number): void {
    const text = el as DesignElement & {
        content?: string; fontSize?: number; fontWeight?: number;
        fontFamily?: string; color?: string; textAlign?: string; lineHeight?: number;
    };
    const fs = text.fontSize ?? 16;
    const fw = text.fontWeight ?? 400;
    const ff = text.fontFamily ?? 'Inter, sans-serif';
    ctx.font = `${fw} ${fs}px ${ff}`;
    ctx.fillStyle = text.color ?? '#FFFFFF';
    ctx.textBaseline = 'top';
    const lineH = fs * (text.lineHeight ?? 1.2);

    // ★ Split by \n first, then word-wrap each paragraph
    const paragraphs = (text.content ?? '').split('\n');
    let lineY = y;
    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let line = '';
        for (const word of words) {
            const test = line + (line ? ' ' : '') + word;
            if (ctx.measureText(test).width > elW && line) {
                const drawX = text.textAlign === 'center' ? x + elW / 2 - ctx.measureText(line).width / 2
                    : text.textAlign === 'right' ? x + elW - ctx.measureText(line).width : x;
                ctx.fillText(line, drawX, lineY);
                line = word;
                lineY += lineH;
            } else {
                line = test;
            }
        }
        if (line) {
            const drawX = text.textAlign === 'center' ? x + elW / 2 - ctx.measureText(line).width / 2
                : text.textAlign === 'right' ? x + elW - ctx.measureText(line).width : x;
            ctx.fillText(line, drawX, lineY);
        }
        lineY += lineH;
    }
}

function renderButton(ctx: CanvasRenderingContext2D, el: DesignElement, x: number, y: number, elW: number, elH: number): void {
    const btn = el as DesignElement & {
        label?: string; fontSize?: number; fontWeight?: number;
        fontFamily?: string; color?: string; backgroundColor?: string; borderRadius?: number;
    };
    const bg = btn.backgroundColor ?? '#FF5733';
    const r = Math.min(btn.borderRadius ?? 8, elW / 2, elH / 2);
    ctx.fillStyle = bg;
    roundRect(ctx, x, y, elW, elH, r);
    ctx.fill();
    const fs = btn.fontSize ?? 14;
    ctx.font = `${btn.fontWeight ?? 600} ${fs}px ${btn.fontFamily ?? 'Inter, sans-serif'}`;
    ctx.fillStyle = btn.color ?? '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label ?? '', x + elW / 2, y + elH / 2, elW - 16);
}

function renderImagePlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, elW: number, elH: number): void {
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(x, y, elW, elH);
    ctx.strokeStyle = '#3a4050';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + elW, y + elH);
    ctx.moveTo(x + elW, y); ctx.lineTo(x, y + elH);
    ctx.stroke();
}
