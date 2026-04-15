// ─────────────────────────────────────────────────
// templatePreviewRenderer.ts — Render template previews for AI vision
// ─────────────────────────────────────────────────
// ★ CLOUD-FIRST: Reads from templateStore (Supabase-synced).
// Only templates that exist in Supabase are shown to the AI.
// No hardcoded template references.
// ─────────────────────────────────────────────────

import type { RenderElement } from '@/services/autoDesignTypes';
import { resolveTemplateElements } from '@/services/templateResolver';
import { useTemplateStore } from '@/stores/templateStore';

// ── Types (minimal — just what the grid needs) ───

interface TemplateInfo {
    id: string;
    name: string;
    description: string;
}

// ── Cache ────────────────────────────────────────

const previewCache = new Map<string, string>();

function getTemplateList(): TemplateInfo[] {
    const templates = useTemplateStore.getState().templates ?? [];
    return templates
        .filter((t: any) => t.id.startsWith('ai-') || t.id.startsWith('builtin-'))
        .map((t: any) => ({ id: t.id, name: t.name, description: t.description }));
}

function getCacheKey(canvasW: number, canvasH: number): string {
    const ids = getTemplateList().map(t => t.id).join(',');
    return `${ids}|${canvasW}x${canvasH}`;
}

// ── Render single template to base64 ─────────────

function renderSinglePreview(
    templateId: string,
    canvasW: number,
    canvasH: number,
    thumbW: number,
    thumbH: number,
): string {
    // ★ Get elements from Supabase-synced templateStore
    let elements: RenderElement[];
    try {
        elements = resolveTemplateElements(templateId, canvasW, canvasH);
    } catch {
        // Template might have invalid data — return blank
        const canvas = document.createElement('canvas');
        canvas.width = thumbW;
        canvas.height = thumbH;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, thumbW, thumbH);
        return canvas.toDataURL('image/png');
    }

    const canvas = document.createElement('canvas');
    canvas.width = thumbW;
    canvas.height = thumbH;
    const ctx = canvas.getContext('2d')!;

    // Scale factor to fit canvasW x canvasH into thumbW x thumbH
    const scaleX = thumbW / canvasW;
    const scaleY = thumbH / canvasH;
    ctx.scale(scaleX, scaleY);

    // Draw elements
    for (const el of elements) {
        ctx.save();
        ctx.globalAlpha = el.a ?? 1;

        const x = el.x ?? 0;
        const y = el.y ?? 0;
        const w = el.w ?? 100;
        const h = el.h ?? 50;

        if (el.type === 'text') {
            const fontSize = Math.max(8, el.font_size ?? 14);
            ctx.font = `${el.font_weight ?? '400'} ${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = el.color_hex ?? '#ffffff';
            ctx.textAlign = (el.text_align as CanvasTextAlign) ?? 'left';
            ctx.textBaseline = 'top';

            const textX = el.text_align === 'center' ? x + w / 2
                : el.text_align === 'right' ? x + w
                : x;

            const lines = (el.content ?? '').split('\n');
            const lineH = fontSize * (el.line_height ?? 1.2);
            lines.forEach((line, i) => {
                ctx.fillText(line, textX, y + i * lineH, w);
            });
        } else if (el.gradient_start_hex && el.gradient_end_hex) {
            const angle = (el.gradient_angle ?? 135) * Math.PI / 180;
            const cx = x + w / 2;
            const cy = y + h / 2;
            const len = Math.sqrt(w * w + h * h) / 2;
            const grad = ctx.createLinearGradient(
                cx - Math.cos(angle) * len, cy - Math.sin(angle) * len,
                cx + Math.cos(angle) * len, cy + Math.sin(angle) * len,
            );
            grad.addColorStop(0, el.gradient_start_hex);
            grad.addColorStop(1, el.gradient_end_hex);
            ctx.fillStyle = grad;
            if (el.radius && el.radius > 0) {
                roundRect(ctx, x, y, w, h, el.radius);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, w, h);
            }
        } else if (el.type === 'ellipse') {
            ctx.fillStyle = rgbaFromEl(el);
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (el.type === 'rounded_rect') {
            ctx.fillStyle = rgbaFromEl(el);
            roundRect(ctx, x, y, w, h, el.radius ?? 6);
            ctx.fill();
        } else {
            ctx.fillStyle = rgbaFromEl(el);
            ctx.fillRect(x, y, w, h);
        }

        ctx.restore();
    }

    return canvas.toDataURL('image/png');
}

// ── Compose labeled grid collage ─────────────────

/**
 * Renders all Supabase templates into a single labeled grid image.
 * ★ Only templates in templateStore (synced from Supabase) are shown.
 */
export function renderTemplateGrid(
    canvasW: number,
    canvasH: number,
): string {
    const cacheKey = getCacheKey(canvasW, canvasH);
    const cached = previewCache.get(cacheKey);
    if (cached) return cached;

    const templates = getTemplateList();
    const count = templates.length;
    if (count === 0) return '';

    const cols = Math.min(4, count);
    const rows = Math.ceil(count / cols);

    const cellW = 200;
    const thumbAspect = canvasH / canvasW;
    const thumbH = Math.round(cellW * thumbAspect);
    const labelH = 22;
    const cellH = thumbH + labelH + 8;
    const padding = 8;

    const gridW = cols * (cellW + padding) + padding;
    const gridH = rows * (cellH + padding) + padding;

    const grid = document.createElement('canvas');
    grid.width = gridW;
    grid.height = gridH;
    const gctx = grid.getContext('2d')!;

    gctx.fillStyle = '#0d0d0d';
    gctx.fillRect(0, 0, gridW, gridH);

    templates.forEach((tmpl, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = padding + col * (cellW + padding);
        const cy = padding + row * (cellH + padding);

        const thumbDataUrl = renderSinglePreview(tmpl.id, canvasW, canvasH, cellW, thumbH);

        const img = new Image();
        img.src = thumbDataUrl;
        gctx.drawImage(img, cx, cy, cellW, thumbH);

        gctx.strokeStyle = '#333';
        gctx.lineWidth = 1;
        gctx.strokeRect(cx, cy, cellW, thumbH);

        gctx.fillStyle = '#ffffff';
        gctx.font = 'bold 11px Inter, sans-serif';
        gctx.textAlign = 'center';
        gctx.textBaseline = 'top';
        gctx.fillText(`${idx + 1}. ${tmpl.name}`, cx + cellW / 2, cy + thumbH + 4, cellW - 8);
    });

    const result = grid.toDataURL('image/png');
    previewCache.set(cacheKey, result);
    return result;
}

/**
 * Get template by ID from templateStore (Supabase-synced).
 */
export function getTemplateById(id: string): TemplateInfo | undefined {
    return getTemplateList().find(t => t.id === id);
}

/**
 * Get template by 1-based index (as shown in the grid labels).
 */
export function getTemplateByIndex(idx: number): TemplateInfo | undefined {
    return getTemplateList()[idx - 1];
}

/**
 * Build the AI prompt for template selection.
 * ★ Only lists templates from templateStore (Supabase).
 */
export function buildTemplateSelectionPrompt(canvasW: number, canvasH: number): string {
    const templates = getTemplateList();
    const list = templates.map((t, i) =>
        `${i + 1}. "${t.id}" — ${t.name}: ${t.description}`
    ).join('\n');

    return `You are selecting the best layout template for a ${canvasW}x${canvasH}px creative.

AVAILABLE TEMPLATES (shown in the grid image):
${list}

Look at the grid image carefully. Each cell shows a rendered preview of that template layout.
Based on the user's design request, pick the template whose VISUAL STRUCTURE best fits the content and mood.

You can see the layouts — trust your visual judgment. Choose freely.

Return ONLY a JSON object: { "templateId": "<id from list>", "reason": "<1 sentence explaining why this layout fits the request>" }`;
}

// ── Helpers ──────────────────────────────────────

function rgbaFromEl(el: RenderElement): string {
    const r = Math.round((el.r ?? 0.5) * 255);
    const g = Math.round((el.g ?? 0.5) * 255);
    const b = Math.round((el.b ?? 0.5) * 255);
    const a = el.a ?? 1;
    return `rgba(${r},${g},${b},${a})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    r = Math.min(r, w / 2, h / 2);
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
 * Clear the preview cache (e.g., after templates are updated).
 */
export function clearPreviewCache(): void {
    previewCache.clear();
}
