// ─────────────────────────────────────────────────
// previewRenderer — Canvas2D rendering + export utilities
// ─────────────────────────────────────────────────
// Renders BannerVariant elements to a Canvas for PNG export.
// Uses constraintsToAbsolute() as SINGLE SOURCE OF TRUTH.
// ─────────────────────────────────────────────────

import type { BannerVariant } from '@/schema/design.types';
import { constraintsToAbsolute } from '@/engine/elementConverters';
import { loadVideoBlob } from '@/stores/videoStorage';
import type { TextEffectConfig } from '@/schema/elements.types';

/** Convert TextEffectConfig → CSS properties for preview rendering */
export function getTextEffectCSS(fx: TextEffectConfig | undefined): React.CSSProperties {
    if (!fx || fx.type === 'none') return {};
    const scale = (fx.intensity ?? 50) / 50;
    const c = fx.color || '#ffffff';
    switch (fx.type) {
        case 'drop': return { textShadow: `${4 * scale}px ${4 * scale}px ${8 * scale}px ${c}cc` };
        case 'glow': return { textShadow: `0 0 ${20 * scale}px ${c}80` };
        case 'echo': return { textShadow: `${6 * scale}px ${6 * scale}px 0 ${c}40` };
        case 'outline': return { WebkitTextStroke: `${Math.max(1, 2 * scale)}px ${c}`, paintOrder: 'stroke fill' } as any;
        case 'splice': return { WebkitTextStroke: `${Math.max(2, 3 * scale)}px ${c}`, paintOrder: 'stroke fill' } as any;
        case 'neon': return { textShadow: `0 0 ${8 * scale}px ${c}, 0 0 ${20 * scale}px ${c}80, 0 0 ${40 * scale}px ${c}40` };
        case 'glitch': return { textShadow: `${3 * scale}px 0 0 #ff0000, ${-3 * scale}px 0 0 #00ffff` };
        case 'curve': return { textShadow: `0 ${2 * scale}px ${4 * scale}px ${c}30` };
        case '70s': return { WebkitTextStroke: `${Math.max(3, 5 * scale)}px ${c}`, paintOrder: 'stroke fill', textShadow: `3px 3px ${6 * scale}px #ff8c0060` } as any;
        default: return {};
    }
}

/** Canvas rounded rectangle helper */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

/** Load image with CORS-safe blob fetching */
export async function loadImageCORS(src: string): Promise<HTMLImageElement> {
    if (src.startsWith('blob:') || src.startsWith('data:')) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    const resp = await fetch(src, { mode: 'cors' });
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
        img.src = url;
    });
}

/** Download a data URL as a file */
export function downloadDataURL(dataURL: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Render a BannerVariant's elements directly to a Canvas (CORS-safe).
 * Avoids "tainted canvas" error by fetching images as blobs first.
 */
export async function renderVariantToCanvas(variant: BannerVariant): Promise<string> {
    const { width: w, height: h } = variant.preset;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = variant.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const sorted = [...variant.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sorted) {
        const resolved = constraintsToAbsolute(el.constraints, w, h);
        const { x, y, w: ew, h: eh } = resolved;

        ctx.save();
        ctx.globalAlpha = el.opacity ?? 1;

        if (el.shadow) {
            ctx.shadowOffsetX = el.shadow.offsetX;
            ctx.shadowOffsetY = el.shadow.offsetY;
            ctx.shadowBlur = el.shadow.blur;
            ctx.shadowColor = el.shadow.color;
        }

        if (el.type === 'image' && el.src) {
            try {
                let imgSrc = el.src;
                if (imgSrc.startsWith('idb://')) {
                    const { resolveAsset } = await import('@/services/assetService');
                    imgSrc = await resolveAsset(imgSrc);
                }
                const img = await loadImageCORS(imgSrc);
                ctx.drawImage(img, x, y, ew, eh);
            } catch { /* skip failed images */ }
        } else if (el.type === 'shape') {
            renderShapeToCanvas(ctx, el as any, x, y, ew, eh);
        } else if (el.type === 'text' && el.content) {
            renderTextToCanvas(ctx, el, x, y, ew);
        } else if (el.type === 'button') {
            renderButtonToCanvas(ctx, el, x, y, ew, eh);
        }

        ctx.restore();
    }

    return canvas.toDataURL('image/png');
}

/** Render a shape element to Canvas2D */
function renderShapeToCanvas(
    ctx: CanvasRenderingContext2D,
    el: import('@/schema/elements.types').ShapeElement,
    x: number, y: number, ew: number, eh: number,
) {
    if (el.gradientStart && el.gradientEnd) {
        const cssAngle = el.gradientAngle ?? 135;
        const mathAngle = (90 - cssAngle) * Math.PI / 180;
        const cx = x + ew / 2, cy = y + eh / 2;
        const len = Math.max(ew, eh);
        const grad = ctx.createLinearGradient(
            cx - Math.cos(mathAngle) * len / 2, cy + Math.sin(mathAngle) * len / 2,
            cx + Math.cos(mathAngle) * len / 2, cy - Math.sin(mathAngle) * len / 2,
        );
        grad.addColorStop(0, el.gradientStart);
        grad.addColorStop(1, el.gradientEnd);
        ctx.fillStyle = grad;
    } else {
        ctx.fillStyle = el.fill || '#cccccc';
    }

    const r = el.borderRadius ?? 0;
    const isEllipse = el.shapeType === 'ellipse' || r >= Math.min(ew, eh) / 2;

    if (isEllipse) {
        ctx.beginPath();
        ctx.ellipse(x + ew / 2, y + eh / 2, ew / 2, eh / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (r > 0) {
        roundRect(ctx, x, y, ew, eh, r);
        ctx.fill();
    } else {
        ctx.fillRect(x, y, ew, eh);
    }
}

/** Render a text element to Canvas2D */
function renderTextToCanvas(
    ctx: CanvasRenderingContext2D,
    el: import('@/schema/design.types').BannerElement,
    x: number, y: number, ew: number,
) {
    const fontSize = el.fontSize ?? 16;
    const fontFamily = el.fontFamily || 'Inter, system-ui, sans-serif';
    const fontWeight = el.fontWeight || '400';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    const lineHeight = fontSize * (el.lineHeight ?? 1.2);

    // Apply text effects
    const fx = el.textEffect;
    let useStroke = false;
    let strokeColor = '';
    let strokeWidth = 0;
    if (fx && fx.type !== 'none') {
        const fxScale = (fx.intensity ?? 50) / 50;
        const fxColor = fx.color || '#ffffff';
        switch (fx.type) {
            case 'outline': useStroke = true; strokeColor = fxColor; strokeWidth = Math.max(1, 2 * fxScale); break;
            case 'splice': useStroke = true; strokeColor = fxColor; strokeWidth = Math.max(2, 3 * fxScale); break;
            case '70s': useStroke = true; strokeColor = fxColor; strokeWidth = Math.max(3, 5 * fxScale); break;
            case 'drop': ctx.shadowColor = fxColor + 'cc'; ctx.shadowBlur = 8 * fxScale; ctx.shadowOffsetX = 4 * fxScale; ctx.shadowOffsetY = 4 * fxScale; break;
            case 'glow': ctx.shadowColor = fxColor + '80'; ctx.shadowBlur = 20 * fxScale; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; break;
            case 'echo': ctx.shadowColor = fxColor + '40'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 6 * fxScale; ctx.shadowOffsetY = 6 * fxScale; break;
            case 'neon': ctx.shadowColor = fxColor; ctx.shadowBlur = 12 * fxScale; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; break;
            case 'glitch': ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 3 * fxScale; ctx.shadowOffsetY = 0; break;
            case 'curve': ctx.shadowColor = fxColor + '30'; ctx.shadowBlur = 4 * fxScale; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 2 * fxScale; break;
        }
        if (useStroke) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineJoin = 'round';
        }
    }

    ctx.fillStyle = el.color || '#000000';

    // Split by explicit \n first, then word-wrap each paragraph
    const paragraphs = el.content!.split('\n');
    let lineY = y;
    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let line = '';
        for (const word of words) {
            const test = line + (line ? ' ' : '') + word;
            if (ctx.measureText(test).width > ew && line) {
                const drawX = el.textAlign === 'center' ? x + ew / 2 - ctx.measureText(line).width / 2
                    : el.textAlign === 'right' ? x + ew - ctx.measureText(line).width : x;
                if (useStroke) ctx.strokeText(line, drawX, lineY);
                ctx.fillText(line, drawX, lineY);
                line = word;
                lineY += lineHeight;
            } else {
                line = test;
            }
        }
        if (line) {
            const drawX = el.textAlign === 'center' ? x + ew / 2 - ctx.measureText(line).width / 2
                : el.textAlign === 'right' ? x + ew - ctx.measureText(line).width : x;
            if (useStroke) ctx.strokeText(line, drawX, lineY);
            ctx.fillText(line, drawX, lineY);
        }
        lineY += lineHeight;
    }
}

/** Render a button element to Canvas2D */
function renderButtonToCanvas(
    ctx: CanvasRenderingContext2D,
    el: import('@/schema/design.types').BannerElement,
    x: number, y: number, ew: number, eh: number,
) {
    ctx.fillStyle = el.backgroundColor || '#2563eb';
    const r = el.borderRadius ?? 6;
    if (r > 0) {
        roundRect(ctx, x, y, ew, eh, r);
        ctx.fill();
    } else {
        ctx.fillRect(x, y, ew, eh);
    }
    if (el.label) {
        ctx.fillStyle = el.color || '#ffffff';
        const fontSize = el.fontSize ?? 14;
        ctx.font = `${el.fontWeight || '600'} ${fontSize}px ${el.fontFamily || 'Inter, system-ui, sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.label, x + ew / 2, y + eh / 2);
        ctx.textAlign = 'start';
    }
}
