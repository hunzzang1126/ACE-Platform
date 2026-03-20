// ─────────────────────────────────────────────────
// templatePreviewRenderer.ts — Render template previews for AI vision
// ─────────────────────────────────────────────────
// Renders each design template to a small Canvas2D thumbnail,
// then composes a labeled grid collage that the AI can "see"
// to pick the best layout for the user's request.
//
// Dynamic: reads from DESIGN_TEMPLATES at render time.
// Adding/removing templates automatically updates the grid.
// ─────────────────────────────────────────────────

import { DESIGN_TEMPLATES, type DesignTemplate, type GeneratedContent } from '@/services/designTemplates';
import type { DesignStyleGuide } from '@/services/designStyleGuides';

// ── Neutral style guide for preview rendering ────

const PREVIEW_GUIDE: DesignStyleGuide = {
    id: 'preview',
    name: 'Preview',
    description: '',
    keywords: [],
    colors: {
        background: '#1a1a2e',
        surface: '#16213e',
        border: '#0f3460',
        foreground: '#e2e8f0',
        secondary: '#94a3b8',
        tertiary: '#64748b',
        muted: '#475569',
        accent: '#e94560',
        accentForeground: '#ffffff',
        error: '#ff4444',
        warning: '#ffaa00',
        info: '#4488ff',
        gradientStart: '#1a1a2e',
        gradientEnd: '#16213e',
        gradientAngle: 135,
    },
    typography: {
        primaryFont: 'Inter',
        secondaryFont: 'Inter',
        scale: { hero: 0.18, headline: 0.11, title: 0.08, body: 0.055, caption: 0.04, micro: 0.03 },
        weights: { bold: '800', semibold: '600', medium: '500', normal: '400' },
        letterSpacing: { tight: -0.5, normal: 0, wide: 1.5 },
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, safe: 16 },
    radius: 6,
};

const PREVIEW_CONTENT: GeneratedContent = {
    headline: 'Bold\nHeadline',
    subheadline: 'Supporting text goes here with context',
    cta: 'Get Started',
    tag: 'FEATURED',
};

// ── Cache ────────────────────────────────────────
// Keyed by template IDs + canvas aspect, invalidated when templates change.

const previewCache = new Map<string, string>();

function getCacheKey(canvasW: number, canvasH: number): string {
    const ids = DESIGN_TEMPLATES.map(t => t.id).join(',');
    return `${ids}|${canvasW}x${canvasH}`;
}

// ── Render single template to base64 ─────────────

function renderSinglePreview(
    template: DesignTemplate,
    canvasW: number,
    canvasH: number,
    thumbW: number,
    thumbH: number,
): string {
    const elements = template.build(canvasW, canvasH, PREVIEW_GUIDE, PREVIEW_CONTENT);

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
            // Render text
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
            // Gradient rect
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
            // Regular rect
            ctx.fillStyle = rgbaFromEl(el);
            ctx.fillRect(x, y, w, h);
        }

        ctx.restore();
    }

    return canvas.toDataURL('image/png');
}

// ── Compose labeled grid collage ─────────────────

/**
 * Renders all compatible templates into a single labeled grid image.
 * Each cell shows the template preview with its name below.
 * Returns base64 data URL.
 */
export function renderTemplateGrid(
    canvasW: number,
    canvasH: number,
): string {
    const cacheKey = getCacheKey(canvasW, canvasH);
    const cached = previewCache.get(cacheKey);
    if (cached) return cached;

    const templates = DESIGN_TEMPLATES;
    const count = templates.length;

    // Grid layout: aim for ~4 columns
    const cols = Math.min(4, count);
    const rows = Math.ceil(count / cols);

    // Each cell size
    const cellW = 200;
    const thumbAspect = canvasH / canvasW;
    const thumbH = Math.round(cellW * thumbAspect);
    const labelH = 22;
    const cellH = thumbH + labelH + 8; // thumb + label + padding
    const padding = 8;

    // Total grid size
    const gridW = cols * (cellW + padding) + padding;
    const gridH = rows * (cellH + padding) + padding;

    const grid = document.createElement('canvas');
    grid.width = gridW;
    grid.height = gridH;
    const gctx = grid.getContext('2d')!;

    // Dark background
    gctx.fillStyle = '#0d0d0d';
    gctx.fillRect(0, 0, gridW, gridH);

    templates.forEach((tmpl, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = padding + col * (cellW + padding);
        const cy = padding + row * (cellH + padding);

        // Render thumbnail
        const thumbDataUrl = renderSinglePreview(tmpl, canvasW, canvasH, cellW, thumbH);

        // Draw thumbnail onto grid
        const img = new Image();
        img.src = thumbDataUrl;
        // Synchronous because data URL loads immediately
        gctx.drawImage(img, cx, cy, cellW, thumbH);

        // Draw border
        gctx.strokeStyle = '#333';
        gctx.lineWidth = 1;
        gctx.strokeRect(cx, cy, cellW, thumbH);

        // Draw label
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
 * Get template by ID.
 */
export function getTemplateById(id: string): DesignTemplate | undefined {
    return DESIGN_TEMPLATES.find(t => t.id === id);
}

/**
 * Get template by 1-based index (as shown in the grid labels).
 */
export function getTemplateByIndex(idx: number): DesignTemplate | undefined {
    return DESIGN_TEMPLATES[idx - 1];
}

/**
 * Build the AI prompt for template selection.
 * Returns the system instruction + available template IDs.
 */
export function buildTemplateSelectionPrompt(canvasW: number, canvasH: number): string {
    const templates = DESIGN_TEMPLATES;
    const list = templates.map((t, i) =>
        `${i + 1}. "${t.id}" — ${t.name}: ${t.description}`
    ).join('\n');

    return `You are selecting the best layout template for a ${canvasW}x${canvasH}px creative.

AVAILABLE TEMPLATES (shown in the grid image):
${list}

Look at the grid image carefully. Each cell shows a rendered preview of that template layout.
Based on the user's design request, pick the template whose VISUAL STRUCTURE best matches the mood and purpose.

Rules:
- Sports/energy/bold → pick dynamic layouts (Bold Headline, Full Bleed Hero)
- Corporate/finance/trust → pick structured layouts (Left-Aligned Card, Minimal Clean)
- Events/creative → pick flowing layouts (Top-Down Cascade, Diagonal Split)
- Products/e-commerce → pick split layouts (Split Horizontal)
- Luxury/editorial → pick elegant layouts (Right-Aligned, Minimal Clean)
- Social/promo → pick attention-grabbing layouts (Badge Focus, Bold Headline)
- If unsure, pick the one that LOOKS best for the content

Return ONLY a JSON object: { "templateId": "<id from list>", "reason": "<1 sentence why>" }`;
}

// ── Helpers ──────────────────────────────────────

function rgbaFromEl(el: import('@/services/autoDesignService').RenderElement): string {
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
