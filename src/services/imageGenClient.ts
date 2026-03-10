// ─────────────────────────────────────────────────────────────
// imageGenClient.ts — AI Image Generation Service
// ─────────────────────────────────────────────────────────────
// Generates images via Flux Schnell (fast) or Imagen 3 (quality)
// through OpenRouter API.
//
// Fallback: When no API key is configured, generates gradient
// placeholder images locally — no API call needed.
//
// Used by:
//   - Scan Design (generate assets that can't be built with shapes)
//   - AI Pipeline (when planner decides an element needs a photo)
//   - Brand Kit (generate hero images, product mockups)
// ─────────────────────────────────────────────────────────────

import { getOpenRouterKey } from '@/config/apiKeys';
import { getOpenRouterUrl, getOpenRouterHeaders } from '@/services/openRouterClient';
import { getModelId, type AceModelRole } from '@/services/modelRouter';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ImageGenModel = 'flux' | 'imagen' | 'fallback';

export interface ImageGenRequest {
    /** Detailed description of the image to generate */
    prompt: string;
    /** Target width in pixels */
    width: number;
    /** Target height in pixels */
    height: number;
    /** Model preference (default: 'flux' for speed) */
    model?: ImageGenModel;
    /** Brand palette constraint — generated image should use these colors */
    colorConstraint?: string[];
    /** Visual style hint */
    style?: 'realistic' | 'illustration' | 'abstract' | 'minimal' | 'photography';
    /** Negative prompt — what to avoid */
    negativePrompt?: string;
}

export interface ImageGenResult {
    success: boolean;
    /** Data URL of generated image (data:image/png;base64,...) */
    imageUrl: string;
    /** Which model actually generated the image */
    model: ImageGenModel;
    /** Whether this was a real AI generation or a fallback gradient */
    isFallback: boolean;
    /** Human-readable status message */
    message: string;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

/**
 * Generate an image from a text prompt.
 *
 * Routing logic:
 *   1. If OpenRouter API key exists → call real model (Flux or Imagen)
 *   2. No API key → generate gradient fallback locally
 *
 * @param request — Image generation parameters
 * @param signal — AbortSignal for cancellation
 */
export async function generateImage(
    request: ImageGenRequest,
    signal?: AbortSignal,
): Promise<ImageGenResult> {
    const key = getOpenRouterKey();

    if (!key) {
        console.info('[ImageGen] No API key — using gradient fallback');
        return generateFallbackImage(request);
    }

    const model = request.model ?? 'flux';
    if (model === 'fallback') {
        return generateFallbackImage(request);
    }

    try {
        return await callImageGenApi(request, model, signal);
    } catch (err) {
        console.warn('[ImageGen] API call failed, using fallback:', err);
        const fallback = generateFallbackImage(request);
        fallback.message = `API failed (${err instanceof Error ? err.message : 'unknown'}), using gradient fallback`;
        return fallback;
    }
}

// ═══════════════════════════════════════════════════════════════
// REAL API CALL — Flux Schnell / Imagen 3 via OpenRouter
// ═══════════════════════════════════════════════════════════════

/**
 * Build an enhanced prompt with style and color constraints.
 * Makes the AI generation match brand guidelines.
 */
function buildEnhancedPrompt(request: ImageGenRequest): string {
    const parts: string[] = [request.prompt];

    if (request.style) {
        const styleMap: Record<string, string> = {
            'realistic': 'photorealistic, high resolution, detailed textures',
            'illustration': 'digital illustration, clean vector style, vibrant',
            'abstract': 'abstract art, geometric shapes, modern composition',
            'minimal': 'minimalist design, clean, white space, simple',
            'photography': 'professional photography, studio lighting, sharp focus',
        };
        parts.push(styleMap[request.style] ?? '');
    }

    if (request.colorConstraint && request.colorConstraint.length > 0) {
        parts.push(`Color palette: ${request.colorConstraint.join(', ')}`);
    }

    // Banner-specific quality boosters
    parts.push('high quality, professional, clean composition');

    return parts.filter(Boolean).join('. ');
}

async function callImageGenApi(
    request: ImageGenRequest,
    model: 'flux' | 'imagen',
    signal?: AbortSignal,
): Promise<ImageGenResult> {
    // Map our model names to OpenRouter model IDs via modelRouter
    const role: AceModelRole = model === 'flux' ? 'image_fast' : 'image_quality';
    const modelId = getModelId(role);

    const enhancedPrompt = buildEnhancedPrompt(request);

    // OpenRouter image gen uses the same chat/completions endpoint
    // with the image model ID — response contains image data
    const isGemini = modelId.includes('gemini');

    // Gemini doesn't accept width/height params — include in prompt instead
    const promptWithSize = isGemini && request.width && request.height
        ? `${enhancedPrompt}. Image dimensions: ${request.width}x${request.height} pixels, aspect ratio ${(request.width / request.height).toFixed(2)}.`
        : enhancedPrompt;

    const body: Record<string, unknown> = {
        model: modelId,
        messages: [{
            role: 'user',
            content: promptWithSize,
        }],
    };

    // Only Flux supports provider-level size params
    if (!isGemini && request.width && request.height) {
        body.provider = {
            width: clampDimension(request.width),
            height: clampDimension(request.height),
        };
    }

    const url = getOpenRouterUrl();
    const headers = getOpenRouterHeaders();

    console.log(`[ImageGen] Calling ${modelId} — "${enhancedPrompt.slice(0, 80)}..."`);

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter image gen failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json() as Record<string, unknown>;

    // Extract image from response
    // OpenRouter returns images in the choices[0].message.content field
    // as base64 data URLs or as image_url objects
    const imageUrl = extractImageUrl(data);

    if (!imageUrl) {
        throw new Error('No image data in API response');
    }

    return {
        success: true,
        imageUrl,
        model,
        isFallback: false,
        message: `Generated ${request.width}x${request.height} image via ${model === 'flux' ? 'Flux Schnell' : 'Imagen 3'}`,
    };
}

/**
 * Extract image URL from various OpenRouter response formats.
 *
 * Image models can return data in different structures:
 * 1. choices[0].message.images[].image_url.url = "data:..." (Gemini)
 * 2. choices[0].message.content = "data:image/png;base64,..."
 * 3. choices[0].message.content[].image_url.url = "data:..."
 * 4. data[0].b64_json = base64 string (DALL-E format)
 */
function extractImageUrl(response: Record<string, unknown>): string | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const choices = (response.choices as any[]) ?? [];
    const message = choices[0]?.message;

    if (!message) {
        // Try DALL-E/images.generate format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imageData = (response.data as any[]) ?? [];
        if (imageData[0]?.b64_json) {
            return `data:image/png;base64,${imageData[0].b64_json}`;
        }
        if (imageData[0]?.url) {
            return imageData[0].url as string;
        }
        return null;
    }

    // ★ Gemini format: message.images[] (content is null, images is separate)
    if (Array.isArray(message.images)) {
        for (const img of message.images) {
            if (img.image_url?.url) {
                return img.image_url.url as string;
            }
            if (img.type === 'image' && img.source?.data) {
                return `data:${img.source.media_type ?? 'image/png'};base64,${img.source.data}`;
            }
        }
    }

    // ★ Gemini parts[] format (some variants)
    if (Array.isArray(message.parts)) {
        for (const part of message.parts) {
            if (part.inline_data?.data) {
                return `data:${part.inline_data.mime_type ?? 'image/png'};base64,${part.inline_data.data}`;
            }
        }
    }

    const content = message.content;

    // String content — could be data URL directly
    if (typeof content === 'string') {
        if (content.startsWith('data:image')) {
            return content;
        }
        // Some models return just the base64 without prefix
        if (content.length > 1000 && !content.includes(' ')) {
            return `data:image/png;base64,${content}`;
        }
        return null;
    }

    // Array content — look for image_url blocks
    if (Array.isArray(content)) {
        for (const block of content) {
            if (block.type === 'image_url' && block.image_url?.url) {
                return block.image_url.url as string;
            }
            if (block.type === 'image' && block.source?.data) {
                return `data:${block.source.media_type ?? 'image/png'};base64,${block.source.data}`;
            }
        }
    }

    return null;
}

/**
 * Clamp dimension to valid image gen range.
 * Most models support 256-2048px in increments of 64.
 */
function clampDimension(px: number): number {
    const min = 256;
    const max = 2048;
    const step = 64;
    const clamped = Math.max(min, Math.min(max, px));
    return Math.round(clamped / step) * step;
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK GENERATOR — No API key needed
// ═══════════════════════════════════════════════════════════════
// Creates gradient/solid color images locally.
// Surprisingly convincing as background fills.

function generateFallbackImage(request: ImageGenRequest): ImageGenResult {
    const { width, height, colorConstraint, style } = request;

    const colors = colorConstraint && colorConstraint.length >= 2
        ? colorConstraint
        : getColorsForStyle(style ?? 'minimal');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return {
            success: false,
            imageUrl: '',
            model: 'fallback',
            isFallback: true,
            message: 'Canvas context not available',
        };
    }

    // Gradient with random angle
    const angle = Math.random() * 360;
    const rad = (angle * Math.PI) / 180;
    const x1 = width / 2 + Math.cos(rad) * width / 2;
    const y1 = height / 2 + Math.sin(rad) * height / 2;
    const x2 = width / 2 - Math.cos(rad) * width / 2;
    const y2 = height / 2 - Math.sin(rad) * height / 2;

    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, colors[0]!);
    gradient.addColorStop(1, colors[1] ?? colors[0]!);
    if (colors.length > 2) gradient.addColorStop(0.5, colors[2]!);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle noise texture for realism
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 15;
        data[i]! += noise;
        data[i + 1]! += noise;
        data[i + 2]! += noise;
    }
    ctx.putImageData(imageData, 0, 0);

    return {
        success: true,
        imageUrl: canvas.toDataURL('image/png'),
        model: 'fallback',
        isFallback: true,
        message: `Generated ${width}x${height} gradient fallback (connect API key for real AI image gen)`,
    };
}

function getColorsForStyle(style: string): string[] {
    switch (style) {
        case 'realistic':
            return ['#1a1a2e', '#16213e', '#0f3460'];
        case 'illustration':
            return ['#ff6b6b', '#feca57', '#48dbfb'];
        case 'abstract':
            return ['#a29bfe', '#fd79a8', '#6c5ce7'];
        case 'photography':
            return ['#2d3436', '#636e72', '#b2bec3'];
        case 'minimal':
        default:
            return ['#0a0e1a', '#1a2e4a', '#0d1b2a'];
    }
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND IMAGE GENERATION — for AI design pipeline
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a background image for the design pipeline.
 * Uses NANO Banana 2.0 (Gemini 2.5 Flash Image) for fast generation.
 *
 * @param bgPrompt — AI-generated description of the ideal background
 * @param canvasW — Canvas width
 * @param canvasH — Canvas height
 * @param accentColors — Brand colors to constrain the image
 * @param signal — AbortSignal for cancellation
 */
export async function generateBackgroundImage(
    bgPrompt: string,
    canvasW: number,
    canvasH: number,
    accentColors: string[],
    signal?: AbortSignal,
): Promise<ImageGenResult> {
    // Enhance the prompt for background-suitable output
    const enhancedBgPrompt = [
        bgPrompt,
        'Background image for advertisement. No text, no logos, no watermarks.',
        'Dark and moody with room for text overlay.',
        'Professional quality, high resolution.',
    ].join('. ');

    return generateImage({
        prompt: enhancedBgPrompt,
        width: canvasW,
        height: canvasH,
        model: 'flux', // routes to image_fast = NANO Banana 2.0
        colorConstraint: accentColors,
        style: 'photography',
        negativePrompt: 'text, logos, watermark, low quality, blurry, distorted',
    }, signal);
}

