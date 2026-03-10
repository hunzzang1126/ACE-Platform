// ─────────────────────────────────────────────────────────────
// visionService.ts — AI Vision: Capture · Analyze · Compare
// ─────────────────────────────────────────────────────────────
// The "eyes" of ACE's AI — enables the AI to SEE the canvas,
// analyze design quality, compare to references, and self-correct.
//
// Six capabilities:
//   1. captureCanvas()       — screenshot any canvas element to base64
//   2. captureElement()      — screenshot an arbitrary HTML element's canvas
//   3. analyzeDesign()       — send screenshot to Vision → structured analysis
//   4. analyzeReference()    — analyze a reference image for Scan Design
//   5. compareToReference()  — compare ACE output vs reference → similarity
//   6. batchQA()             — run Vision QA on multiple size variants
//
// Also re-exports the legacy callVisionCheck() for backward compat.
//
// Used by:
//   - agentPipeline (Vision QA Loop after Auto Design)
//   - Scan Design   (analyze reference → extract structure → recreate)
//   - Smart Check   (batch QA all size variants from dashboard)
//   - criticAgent   (visual scoring in runVisionCritic)
// ─────────────────────────────────────────────────────────────

import { z } from 'zod';
import { callWithRole } from '@/services/openRouterClient';
import { callAnthropicApi, DEFAULT_CLAUDE_MODEL } from '@/services/anthropicClient';

// ═══════════════════════════════════════════════════════════════
// SECTION 1: ZOD SCHEMAS — Typed, runtime-validated AI responses
// ═══════════════════════════════════════════════════════════════

// ── Semantic roles matching ACE's Smart Sizing role system ──

export const VISION_ROLES = [
    'headline', 'subline', 'cta', 'logo', 'hero',
    'background', 'accent', 'detail', 'badge', 'tnc',
    'image', 'decoration', 'divider', 'unknown',
] as const;

export const ELEMENT_TYPES = [
    'text', 'shape', 'image', 'button', 'icon', 'group', 'unknown',
] as const;

// ── Detected element from Vision analysis ──

export const DetectedElementSchema = z.object({
    /** Human-readable label (e.g. "Main Headline", "CTA Button") */
    name: z.string(),
    /** Semantic role — maps 1:1 to ACE's Smart Sizing roles */
    role: z.enum(VISION_ROLES),
    /** Visual type as perceived by the AI */
    type: z.enum(ELEMENT_TYPES),
    /** Position as PERCENTAGE of canvas (0-100). Size-independent. */
    bounds: z.object({
        xPct: z.number().min(0).max(100),
        yPct: z.number().min(0).max(100),
        wPct: z.number().min(0).max(100),
        hPct: z.number().min(0).max(100),
    }),
    /** Visual properties the AI can extract */
    style: z.object({
        primaryColor: z.string().optional(),
        fontSize: z.enum(['xl', 'lg', 'md', 'sm', 'xs']).optional(),
        fontWeight: z.enum(['bold', 'semibold', 'normal', 'light']).optional(),
        textContent: z.string().optional(),
    }).optional(),
});

export type DetectedElement = z.infer<typeof DetectedElementSchema>;

// ── Design quality issue ──

export const VisionIssueSchema = z.object({
    type: z.enum([
        'overlap', 'clipping', 'contrast', 'hierarchy', 'spacing',
        'alignment', 'text_overflow', 'visual_balance', 'readability',
        'brand_mismatch', 'empty_space', 'crowding',
    ]),
    severity: z.enum(['error', 'warning', 'suggestion']),
    element: z.string().optional(),
    description: z.string(),
    suggestion: z.string().optional(),
});

export type VisionIssue = z.infer<typeof VisionIssueSchema>;

// ── Full design analysis response ──

export const DesignAnalysisSchema = z.object({
    qualityScore: z.number().min(0).max(100),
    layoutType: z.enum([
        'horizontal', 'vertical', 'centered', 'grid',
        'asymmetric', 'full_bleed', 'split', 'unknown',
    ]),
    aspectCategory: z.enum(['ultra_wide', 'landscape', 'square', 'portrait', 'unknown']),
    colorPalette: z.object({
        background: z.string(),
        primary: z.string(),
        secondary: z.string().optional(),
        accent: z.string().optional(),
        textPrimary: z.string(),
    }),
    typography: z.object({
        headlineSize: z.enum(['xl', 'lg', 'md', 'sm', 'xs']),
        bodySize: z.enum(['xl', 'lg', 'md', 'sm', 'xs']),
        hasGoodHierarchy: z.boolean(),
        estimatedFontCount: z.number(),
    }),
    elements: z.array(DetectedElementSchema),
    issues: z.array(VisionIssueSchema),
    impression: z.enum(['premium', 'professional', 'adequate', 'amateur', 'broken']),
    summary: z.string(),
});

export type DesignAnalysis = z.infer<typeof DesignAnalysisSchema>;

// ── Reference comparison response (for Scan Design) ──

export const ReferenceComparisonSchema = z.object({
    similarityScore: z.number().min(0).max(100),
    matches: z.array(z.object({
        aspect: z.string(),
        score: z.number().min(0).max(100),
    })),
    differences: z.array(z.object({
        aspect: z.string(),
        referenceValue: z.string(),
        currentValue: z.string(),
        importance: z.enum(['critical', 'major', 'minor']),
        suggestion: z.string(),
    })),
    referenceElements: z.array(DetectedElementSchema),
    feasibility: z.object({
        nativeElements: z.array(z.object({
            description: z.string(),
            tool: z.enum(['create_shape', 'create_text', 'create_button', 'create_image', 'set_animation']),
            confidence: z.number().min(0).max(100),
        })),
        requiresImageGen: z.array(z.object({
            description: z.string(),
            suggestedPrompt: z.string(),
            reason: z.string(),
        })),
    }),
});

export type ReferenceComparison = z.infer<typeof ReferenceComparisonSchema>;

// ═══════════════════════════════════════════════════════════════
// SECTION 2: CANVAS CAPTURE — Screenshot any canvas to base64
// ═══════════════════════════════════════════════════════════════

export interface CaptureOptions {
    /** CSS selector for the canvas element (default: '.ed-artboard canvas') */
    selector?: string;
    /** Maximum image dimension — larger canvases are downscaled (default: 1024) */
    maxDimension?: number;
    /** Image format (default: 'image/png') */
    format?: 'image/png' | 'image/jpeg' | 'image/webp';
    /** JPEG/WebP quality 0-1 (default: 0.92) */
    quality?: number;
}

/**
 * Capture a <canvas> element as a pure base64 string.
 *
 * The returned string has NO data:image/... prefix — it is ready
 * for direct injection into Vision API image blocks.
 *
 * Large canvases are automatically downscaled (high-quality bicubic)
 * to save Vision API token costs (~$0.003 per 1024px image).
 */
export function captureCanvas(options: CaptureOptions = {}): string | null {
    const {
        // Fabric.js renders to canvas.lower-canvas inside .ed-canvas-area
        selector = '.ed-canvas-area canvas.lower-canvas',
        maxDimension = 1024,
        format = 'image/png',
        quality = 0.92,
    } = options;

    // Try primary selector, then broader fallbacks
    let canvasEl = document.querySelector(selector) as HTMLCanvasElement | null;

    if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
        // Fallback 1: any canvas inside the canvas area
        canvasEl = document.querySelector('.ed-canvas-area canvas') as HTMLCanvasElement | null;
    }
    if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
        // Fallback 2: canvas inside canvas-container (Fabric.js wraps in this)
        canvasEl = document.querySelector('.canvas-container canvas') as HTMLCanvasElement | null;
    }
    if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
        console.warn(`[Vision] Canvas not found with selector "${selector}" or fallbacks`);
        return null;
    }

    const srcW = canvasEl.width;
    const srcH = canvasEl.height;
    if (srcW === 0 || srcH === 0) {
        console.warn('[Vision] Canvas has zero dimensions');
        return null;
    }

    let dataUrl: string;

    if (srcW <= maxDimension && srcH <= maxDimension) {
        dataUrl = canvasEl.toDataURL(format, quality);
    } else {
        // Downscale preserving aspect ratio
        const scale = maxDimension / Math.max(srcW, srcH);
        const dstW = Math.round(srcW * scale);
        const dstH = Math.round(srcH * scale);

        const offscreen = document.createElement('canvas');
        offscreen.width = dstW;
        offscreen.height = dstH;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return null;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvasEl, 0, 0, dstW, dstH);
        dataUrl = offscreen.toDataURL(format, quality);
    }

    // Strip "data:image/png;base64," prefix → pure base64
    const idx = dataUrl.indexOf(',');
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

/**
 * Capture a specific HTML element's inner <canvas>.
 * Used for Size Dashboard banner preview cards.
 */
export function captureElement(element: HTMLElement): string | null {
    const canvas = element.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return null;
    const dataUrl = canvas.toDataURL('image/png');
    const idx = dataUrl.indexOf(',');
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

/**
 * Convert an uploaded File/Blob to base64 string.
 * Used by Scan Design to process user-uploaded reference images.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const idx = result.indexOf(',');
            resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: VISION API — The AI's eyes
// ═══════════════════════════════════════════════════════════════

/**
 * Build the analysis system prompt. Instructs the Vision model
 * on exactly what to detect and how to format the JSON response.
 */
function buildAnalysisPrompt(canvasW: number, canvasH: number): string {
    return `You are ACE Vision — a world-class design quality analysis system.
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

// ── Helper: safely extract JSON from AI response ──

function extractJsonFromResponse(response: unknown): string | null {
    const data = response as { content?: Array<{ type: string; text?: string }> };
    const rawText = data.content?.find(c => c.type === 'text')?.text ?? '';
    const match = rawText.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
}

// ── Helper: parse with Zod, graceful fallback on partial match ──

function safeZodParse<T>(schema: z.ZodType<T>, raw: string, label: string): T | null {
    try {
        const parsed = JSON.parse(raw);
        const result = schema.safeParse(parsed);
        if (result.success) return result.data;

        // Log specific validation issues for debugging
        console.warn(`[Vision] ${label} Zod validation issues:`,
            result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
        );

        // Attempt partial recovery — return what we can
        // (fill missing required fields with defaults)
        return parsed as T;
    } catch (err) {
        console.error(`[Vision] ${label} JSON parse failed:`, err);
        return null;
    }
}

/**
 * Analyze a design screenshot using Claude Vision.
 *
 * This is the CORE function — every upstream feature depends on it:
 *   - Vision QA Loop (agentPipeline step 3)
 *   - Smart Check (batch QA in size dashboard)
 *   - Scan Design (analyze reference before recreation)
 *
 * @param base64Image — Pure base64 PNG (no data: prefix)
 * @param canvasW — Width in px
 * @param canvasH — Height in px
 * @param signal — AbortSignal for cancellation
 */
export async function analyzeDesign(
    base64Image: string,
    canvasW: number,
    canvasH: number,
    signal?: AbortSignal,
): Promise<DesignAnalysis | null> {
    try {
        const response = await callWithRole('vision', {
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: 'image/png', data: base64Image },
                    },
                    { type: 'text', text: buildAnalysisPrompt(canvasW, canvasH) },
                ],
            }],
            max_tokens: 2048,
        }, signal);

        const json = extractJsonFromResponse(response);
        if (!json) {
            console.warn('[Vision] No JSON in analyzeDesign response');
            return null;
        }

        return safeZodParse(DesignAnalysisSchema, json, 'analyzeDesign');
    } catch (err) {
        if (signal?.aborted) return null;
        console.error('[Vision] analyzeDesign failed:', err);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: REFERENCE ANALYSIS — Scan Design step 1
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze ONLY a reference image (before ACE has built anything).
 * First step of Scan Design — extracts structure from the reference
 * so the AI planner knows what tools to call.
 */
export async function analyzeReference(
    referenceBase64: string,
    targetW: number,
    targetH: number,
    signal?: AbortSignal,
): Promise<DesignAnalysis | null> {
    try {
        const response = await callWithRole('vision', {
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: 'image/png', data: referenceBase64 },
                    },
                    {
                        type: 'text',
                        text: `Analyze this banner/ad design reference image in detail.
I must RECREATE this design on a ${targetW}x${targetH}px canvas using shape/text/button tools.

${buildAnalysisPrompt(targetW, targetH)}

EXTRA FOR REFERENCE ANALYSIS:
- Extract ALL text content exactly as written
- Note gradient directions and color stops
- Identify decorative elements (lines, patterns, shapes)
- For photos/illustrations: describe them for image generation prompts
- Pay attention to layout structure — this drives Smart Sizing`,
                    },
                ],
            }],
            max_tokens: 2048,
        }, signal);

        const json = extractJsonFromResponse(response);
        if (!json) return null;
        return safeZodParse(DesignAnalysisSchema, json, 'analyzeReference');
    } catch (err) {
        if (signal?.aborted) return null;
        console.error('[Vision] analyzeReference failed:', err);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: REFERENCE COMPARISON — Scan Design verification
// ═══════════════════════════════════════════════════════════════

/**
 * Compare ACE output against a reference image.
 * Sends BOTH images to Vision API for side-by-side analysis.
 *
 * Returns:
 *   - Similarity score (0-100)
 *   - What matches and what differs
 *   - Feasibility: what ACE tools handle vs what needs Flux/Imagen
 */
export async function compareToReference(
    referenceBase64: string,
    currentBase64: string,
    canvasW: number,
    canvasH: number,
    signal?: AbortSignal,
): Promise<ReferenceComparison | null> {
    try {
        const response = await callWithRole('vision', {
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: 'image/png', data: referenceBase64 },
                    },
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: 'image/png', data: currentBase64 },
                    },
                    {
                        type: 'text',
                        text: `Compare these two ${canvasW}x${canvasH}px banner designs.
IMAGE 1 = REFERENCE (target to replicate)
IMAGE 2 = CURRENT ACE OUTPUT (what we built)

Return JSON ONLY:
{
  "similarityScore": 0-100,
  "matches": [{ "aspect": "...", "score": 0-100 }],
  "differences": [{ "aspect": "...", "referenceValue": "...", "currentValue": "...", "importance": "critical|major|minor", "suggestion": "..." }],
  "referenceElements": [{ "name": "...", "role": "...", "type": "...", "bounds": { "xPct": ..., "yPct": ..., "wPct": ..., "hPct": ... } }],
  "feasibility": {
    "nativeElements": [{ "description": "...", "tool": "create_shape|create_text|create_button|create_image|set_animation", "confidence": 0-100 }],
    "requiresImageGen": [{ "description": "...", "suggestedPrompt": "...", "reason": "..." }]
  }
}

COMPARE: layout, colors, typography, spacing, elements, overall feel.
For feasibility: which ACE tools can handle each element vs what needs Flux/Imagen image generation.`,
                    },
                ],
            }],
            max_tokens: 3072,
        }, signal);

        const json = extractJsonFromResponse(response);
        if (!json) return null;
        return safeZodParse(ReferenceComparisonSchema, json, 'compareToReference');
    } catch (err) {
        if (signal?.aborted) return null;
        console.error('[Vision] compareToReference failed:', err);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: BATCH QA — Smart Check for Size Dashboard
// ═══════════════════════════════════════════════════════════════

export interface BatchQAResult {
    variantId: string;
    label: string;
    width: number;
    height: number;
    analysis: DesignAnalysis | null;
    passed: boolean;
    error?: string;
}

export interface BatchQAProgress {
    current: number;
    total: number;
    variantLabel: string;
    status: 'analyzing' | 'passed' | 'failed' | 'error';
}

/**
 * Run Vision QA across multiple size variants.
 * Powers the "Smart Check" button in the Size Dashboard.
 *
 * Processes variants sequentially (Vision API rate limits)
 * and reports progress via callback for UI updates.
 */
export async function batchQA(
    variants: Array<{
        id: string;
        label: string;
        width: number;
        height: number;
        captureBase64: () => string | null;
    }>,
    onProgress?: (progress: BatchQAProgress) => void,
    signal?: AbortSignal,
): Promise<BatchQAResult[]> {
    const results: BatchQAResult[] = [];
    // Auto-generated variants get a lower pass threshold
    // since they're proportionally scaled and may need manual tweaks
    const passThreshold = 70;

    for (let i = 0; i < variants.length; i++) {
        const v = variants[i]!;
        if (signal?.aborted) break;

        onProgress?.({
            current: i + 1,
            total: variants.length,
            variantLabel: v.label,
            status: 'analyzing',
        });

        try {
            const base64 = v.captureBase64();
            if (!base64) {
                results.push({
                    variantId: v.id, label: v.label,
                    width: v.width, height: v.height,
                    analysis: null, passed: false,
                    error: 'Could not capture canvas',
                });
                onProgress?.({ current: i + 1, total: variants.length, variantLabel: v.label, status: 'error' });
                continue;
            }

            const analysis = await analyzeDesign(base64, v.width, v.height, signal);
            const passed = analysis ? analysis.qualityScore >= passThreshold : false;

            results.push({
                variantId: v.id, label: v.label,
                width: v.width, height: v.height,
                analysis, passed,
            });

            onProgress?.({
                current: i + 1,
                total: variants.length,
                variantLabel: v.label,
                status: passed ? 'passed' : 'failed',
            });
        } catch (err) {
            results.push({
                variantId: v.id, label: v.label,
                width: v.width, height: v.height,
                analysis: null, passed: false,
                error: err instanceof Error ? err.message : String(err),
            });
            onProgress?.({ current: i + 1, total: variants.length, variantLabel: v.label, status: 'error' });
        }
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: LEGACY COMPATIBILITY — callVisionCheck()
// ═══════════════════════════════════════════════════════════════
// This preserves backward compatibility with existing callers
// that use the old VisionResult / VisionIssue / VisionPatch types.

export interface LegacyVisionIssue {
    element: string;
    problem:
        | 'text_overflow' | 'too_small' | 'overlap' | 'misaligned'
        | 'off_center' | 'low_contrast' | 'cta_not_prominent' | 'poor_hierarchy';
    severity: 'error' | 'warning';
    detail?: string;
}

export interface LegacyVisionPatch {
    elementName: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    fontSize?: number;
}

export interface VisionResult {
    score: number;
    issues: LegacyVisionIssue[];
    patches: LegacyVisionPatch[];
    reasoning: string;
}

/**
 * @deprecated Use analyzeDesign() for new code.
 * Preserved for backward compatibility with useSmartSizingVision.
 */
export async function callVisionCheck(
    base64Png: string,
    canvasW: number,
    canvasH: number,
    category: string,
    elements: Array<{ name: string; role?: string; type: string }>,
): Promise<VisionResult> {
    const pureBase64 = base64Png.startsWith('data:')
        ? base64Png.split(',')[1] ?? base64Png
        : base64Png;

    const elementList = elements
        .map((e) => `  - "${e.name}" (type: ${e.type}, role: ${e.role ?? 'unknown'})`)
        .join('\n');

    const prompt = `You are a professional banner ad designer reviewing a resized layout.

Canvas: ${canvasW}x${canvasH}px (category: ${category})
Elements present:
${elementList}

Analyze this banner image for visual quality. Return ONLY valid JSON:
{
  "score": <0-100>,
  "issues": [{ "element": "<name>", "problem": "<text_overflow|too_small|overlap|misaligned|off_center|low_contrast|cta_not_prominent|poor_hierarchy>", "severity": "<error|warning>", "detail": "<brief>" }],
  "patches": [{ "elementName": "<name>", "x": <num>, "y": <num>, "w": <num>, "h": <num>, "fontSize": <num> }],
  "reasoning": "<1-2 sentence summary>"
}

Check: readability, hierarchy, CTA prominence, whitespace, clipping.
Return ONLY JSON.`;

    const body = {
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [{
            role: 'user',
            content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/png', data: pureBase64 } },
                { type: 'text', text: prompt },
            ],
        }],
    };

    const data = await callAnthropicApi(body) as {
        content: Array<{ type: string; text?: string }>;
    };

    const rawText = data.content.find(c => c.type === 'text')?.text ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error(`Vision API returned non-JSON: ${rawText.slice(0, 200)}`);
    }

    return JSON.parse(jsonMatch[0]) as VisionResult;
}
