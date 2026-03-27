// ─────────────────────────────────────────────────
// visionService — AI Vision: Capture · Analyze · Compare
// ─────────────────────────────────────────────────
// Schemas → visionSchemas.ts
// Legacy compat → visionLegacy.ts
// ─────────────────────────────────────────────────

import { callWithRole } from '@/services/openRouterClient';
import {
    DesignAnalysisSchema, ReferenceComparisonSchema,
    extractJsonFromResponse, safeZodParse,
} from './visionSchemas';
import type { DesignAnalysis, ReferenceComparison } from './visionSchemas';

// Re-export everything for backward compatibility
export * from './visionSchemas';
export * from './visionLegacy';

// ═══════════════════════════════════════════════════════════════
// CANVAS CAPTURE — Screenshot any canvas to base64
// ═══════════════════════════════════════════════════════════════

export interface CaptureOptions {
    selector?: string;
    maxDimension?: number;
    format?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
}

export function captureCanvas(options: CaptureOptions = {}): string | null {
    const { selector = '.ed-canvas-area canvas.lower-canvas', maxDimension = 1024, format = 'image/png', quality = 0.92 } = options;

    let canvasEl = document.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) canvasEl = document.querySelector('.ed-canvas-area canvas') as HTMLCanvasElement | null;
    if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) canvasEl = document.querySelector('.canvas-container canvas') as HTMLCanvasElement | null;
    if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) { console.warn(`[Vision] Canvas not found with selector "${selector}" or fallbacks`); return null; }

    const srcW = canvasEl.width, srcH = canvasEl.height;
    if (srcW === 0 || srcH === 0) { console.warn('[Vision] Canvas has zero dimensions'); return null; }

    let dataUrl: string;
    if (srcW <= maxDimension && srcH <= maxDimension) {
        dataUrl = canvasEl.toDataURL(format, quality);
    } else {
        const scale = maxDimension / Math.max(srcW, srcH);
        const offscreen = document.createElement('canvas');
        offscreen.width = Math.round(srcW * scale);
        offscreen.height = Math.round(srcH * scale);
        const ctx = offscreen.getContext('2d');
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvasEl, 0, 0, offscreen.width, offscreen.height);
        dataUrl = offscreen.toDataURL(format, quality);
    }

    const idx = dataUrl.indexOf(',');
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export function captureElement(element: HTMLElement): string | null {
    const canvas = element.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return null;
    const dataUrl = canvas.toDataURL('image/png');
    const idx = dataUrl.indexOf(',');
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export function fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => { const r = reader.result as string; const idx = r.indexOf(','); resolve(idx >= 0 ? r.slice(idx + 1) : r); };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// ═══════════════════════════════════════════════════════════════
// VISION API — The AI's eyes
// ═══════════════════════════════════════════════════════════════

function buildAnalysisPrompt(canvasW: number, canvasH: number): string {
    return `You are Glid Vision — a world-class design quality analysis system.
You analyze banner ad screenshots with pixel-perfect precision.

Canvas: ${canvasW}x${canvasH}px

RESPOND WITH JSON ONLY. No markdown, no explanation, just the JSON object.

Schema:
{
  "qualityScore": <0-100>,
  "layoutType": "horizontal|vertical|centered|grid|asymmetric|full_bleed|split|unknown",
  "aspectCategory": "ultra_wide|landscape|square|portrait|unknown",
  "colorPalette": { "background": "#hex", "primary": "#hex", "secondary": "#hex", "accent": "#hex", "textPrimary": "#hex" },
  "typography": { "headlineSize": "xl|lg|md|sm|xs", "bodySize": "xl|lg|md|sm|xs", "hasGoodHierarchy": boolean, "estimatedFontCount": number },
  "elements": [{ "name": "...", "role": "headline|subline|cta|logo|hero|background|accent|detail|badge|tnc|image|decoration|divider|unknown", "type": "text|shape|image|button|icon|group|unknown", "bounds": { "xPct": 0-100, "yPct": 0-100, "wPct": 0-100, "hPct": 0-100 }, "style": { "primaryColor": "#hex", "fontSize": "lg", "fontWeight": "bold", "textContent": "..." } }],
  "issues": [{ "type": "overlap|clipping|contrast|hierarchy|spacing|alignment|text_overflow|visual_balance|readability|brand_mismatch|empty_space|crowding", "severity": "error|warning|suggestion", "element": "name", "description": "...", "suggestion": "..." }],
  "impression": "premium|professional|adequate|amateur|broken",
  "summary": "1-2 sentence assessment"
}

SCORING:
95-100: Exceptional — publication-ready, Figma showcase quality
85-94:  Professional — clean, well-balanced, minor tweaks
70-84:  Adequate — functional but lacks polish
50-69:  Amateur — noticeable issues
0-49:   Broken — fundamentally flawed

CHECK ALL:
- Text contrast (WCAG AA: 4.5:1 body, 3:1 large)
- Text overflow/clipping
- Visual balance and composition
- Spacing consistency
- Alignment precision
- Hierarchy clarity (headline most prominent?)
- Empty space / crowding
- Color harmony
- Professional quality

Positions in bounds are PERCENTAGES (0-100), not pixels.
Be brutally honest — this drives auto-correction.`;
}

export async function analyzeDesign(base64Image: string, canvasW: number, canvasH: number, signal?: AbortSignal): Promise<DesignAnalysis | null> {
    try {
        const response = await callWithRole('vision', {
            messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Image } },
                { type: 'text', text: buildAnalysisPrompt(canvasW, canvasH) },
            ] }],
            max_tokens: 2048,
        }, signal);
        const json = extractJsonFromResponse(response);
        if (!json) { console.warn('[Vision] No JSON in analyzeDesign response'); return null; }
        return safeZodParse(DesignAnalysisSchema, json, 'analyzeDesign');
    } catch (err) { if (signal?.aborted) return null; console.error('[Vision] analyzeDesign failed:', err); return null; }
}

export async function analyzeReference(referenceBase64: string, targetW: number, targetH: number, signal?: AbortSignal): Promise<DesignAnalysis | null> {
    try {
        const response = await callWithRole('vision', {
            messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/png', data: referenceBase64 } },
                { type: 'text', text: `Analyze this banner/ad design reference image in detail.\nI must RECREATE this design on a ${targetW}x${targetH}px canvas using shape/text/button tools.\n\n${buildAnalysisPrompt(targetW, targetH)}\n\nEXTRA FOR REFERENCE ANALYSIS:\n- Extract ALL text content exactly as written\n- Note gradient directions and color stops\n- Identify decorative elements (lines, patterns, shapes)\n- For photos/illustrations: describe them for image generation prompts\n- Pay attention to layout structure — this drives Smart Sizing` },
            ] }],
            max_tokens: 2048,
        }, signal);
        const json = extractJsonFromResponse(response);
        if (!json) return null;
        return safeZodParse(DesignAnalysisSchema, json, 'analyzeReference');
    } catch (err) { if (signal?.aborted) return null; console.error('[Vision] analyzeReference failed:', err); return null; }
}

export async function compareToReference(referenceBase64: string, currentBase64: string, canvasW: number, canvasH: number, signal?: AbortSignal): Promise<ReferenceComparison | null> {
    try {
        const response = await callWithRole('vision', {
            messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/png', data: referenceBase64 } },
                { type: 'image', source: { type: 'base64', media_type: 'image/png', data: currentBase64 } },
                { type: 'text', text: `Compare these two ${canvasW}x${canvasH}px banner designs.\nIMAGE 1 = REFERENCE (target to replicate)\nIMAGE 2 = CURRENT Glid OUTPUT (what we built)\n\nReturn JSON ONLY:\n{\n  "similarityScore": 0-100,\n  "matches": [{ "aspect": "...", "score": 0-100 }],\n  "differences": [{ "aspect": "...", "referenceValue": "...", "currentValue": "...", "importance": "critical|major|minor", "suggestion": "..." }],\n  "referenceElements": [{ "name": "...", "role": "...", "type": "...", "bounds": { "xPct": ..., "yPct": ..., "wPct": ..., "hPct": ... } }],\n  "feasibility": {\n    "nativeElements": [{ "description": "...", "tool": "create_shape|create_text|create_button|create_image|set_animation", "confidence": 0-100 }],\n    "requiresImageGen": [{ "description": "...", "suggestedPrompt": "...", "reason": "..." }]\n  }\n}\n\nCOMPARE: layout, colors, typography, spacing, elements, overall feel.\nFor feasibility: which Glid tools can handle each element vs what needs Flux/Imagen image generation.` },
            ] }],
            max_tokens: 3072,
        }, signal);
        const json = extractJsonFromResponse(response);
        if (!json) return null;
        return safeZodParse(ReferenceComparisonSchema, json, 'compareToReference');
    } catch (err) { if (signal?.aborted) return null; console.error('[Vision] compareToReference failed:', err); return null; }
}

// ═══════════════════════════════════════════════════════════════
// BATCH QA — Smart Check for Size Dashboard
// ═══════════════════════════════════════════════════════════════

export interface BatchQAResult {
    variantId: string; label: string; width: number; height: number;
    analysis: DesignAnalysis | null; passed: boolean; error?: string;
}

export interface BatchQAProgress {
    current: number; total: number; variantLabel: string;
    status: 'analyzing' | 'passed' | 'failed' | 'error';
}

export async function batchQA(
    variants: Array<{ id: string; label: string; width: number; height: number; captureBase64: () => string | null }>,
    onProgress?: (progress: BatchQAProgress) => void,
    signal?: AbortSignal,
): Promise<BatchQAResult[]> {
    const results: BatchQAResult[] = [];
    const passThreshold = 70;

    for (let i = 0; i < variants.length; i++) {
        const v = variants[i]!;
        if (signal?.aborted) break;
        onProgress?.({ current: i + 1, total: variants.length, variantLabel: v.label, status: 'analyzing' });
        try {
            const base64 = v.captureBase64();
            if (!base64) { results.push({ variantId: v.id, label: v.label, width: v.width, height: v.height, analysis: null, passed: false, error: 'Could not capture canvas' }); onProgress?.({ current: i + 1, total: variants.length, variantLabel: v.label, status: 'error' }); continue; }
            const analysis = await analyzeDesign(base64, v.width, v.height, signal);
            const passed = analysis ? analysis.qualityScore >= passThreshold : false;
            results.push({ variantId: v.id, label: v.label, width: v.width, height: v.height, analysis, passed });
            onProgress?.({ current: i + 1, total: variants.length, variantLabel: v.label, status: passed ? 'passed' : 'failed' });
        } catch (err) {
            results.push({ variantId: v.id, label: v.label, width: v.width, height: v.height, analysis: null, passed: false, error: err instanceof Error ? err.message : String(err) });
            onProgress?.({ current: i + 1, total: variants.length, variantLabel: v.label, status: 'error' });
        }
    }
    return results;
}
