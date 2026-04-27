// ─────────────────────────────────────────────────────────────
// imageGenClient.ts — AI Image Generation Service
// ─────────────────────────────────────────────────────────────
// Helpers → imageGenHelpers.ts
// ─────────────────────────────────────────────────────────────

import { isAiAvailable } from '@/config/apiKeys';
import { getOpenRouterUrl, getProxyHeaders } from '@/services/openRouterClient';
import { getModelId, type AceModelRole } from '@/services/modelRouter';
import { extractImageUrl, resizeImageToTarget, generateFallbackImage, buildEnhancedPrompt, snapToFluxResolution } from './imageGenHelpers';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type ImageGenModel = 'flux' | 'imagen' | 'fallback';

export interface ImageGenRequest {
    prompt: string;
    width: number;
    height: number;
    model?: ImageGenModel;
    colorConstraint?: string[];
    style?: 'realistic' | 'illustration' | 'abstract' | 'minimal' | 'photography';
    negativePrompt?: string;
}

export interface ImageGenResult {
    success: boolean;
    imageUrl: string;
    model: ImageGenModel;
    isFallback: boolean;
    message: string;
}

// ═══════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════

export async function generateImage(
    request: ImageGenRequest,
    signal?: AbortSignal,
): Promise<ImageGenResult> {
    if (!isAiAvailable()) { console.info('[ImageGen] AI not available — using gradient fallback'); return generateFallbackImage(request); }

    const model = request.model ?? 'flux';
    if (model === 'fallback') return generateFallbackImage(request);

    try {
        return await callImageGenApi(request, model, signal);
    } catch (err) {
        console.warn(`[ImageGen] ${model} failed — using gradient fallback:`, err);
        const fallback = generateFallbackImage(request);
        fallback.message = `Image API failed, using gradient fallback`;
        return fallback;
    }
}

// ═══════════════════════════════════════════════════════
// API CALL
// ═══════════════════════════════════════════════════════

async function callImageGenApi(
    request: ImageGenRequest,
    model: 'flux' | 'imagen',
    signal?: AbortSignal,
): Promise<ImageGenResult> {
    const role: AceModelRole = model === 'flux' ? 'image_fast' : 'image_quality';
    const modelId = getModelId(role);
    const enhancedPrompt = buildEnhancedPrompt(request);
    const promptWithSize = `${enhancedPrompt}. Image dimensions: ${request.width}x${request.height} pixels, aspect ratio ${(request.width / request.height).toFixed(2)}.`;

    const body: Record<string, unknown> = { model: modelId, messages: [{ role: 'user', content: promptWithSize }] };
    const url = getOpenRouterUrl();
    // ★ Use async proxy headers — sends JWT in production (not raw API key)
    const headers = await getProxyHeaders();

    console.log(`[ImageGen] Calling ${modelId} — "${enhancedPrompt.slice(0, 80)}..."`);

    const TIMEOUT_MS = 60_000; // Image gen can take 30-45s
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => { console.warn(`[ImageGen] ${modelId} timed out`); timeoutController.abort(); }, TIMEOUT_MS);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;

    try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: combinedSignal });
        clearTimeout(timeoutId);
        if (!res.ok) { const errText = await res.text(); throw new Error(`OpenRouter image gen failed (${res.status}): ${errText.slice(0, 200)}`); }

        const data = await res.json() as Record<string, unknown>;
        const imageUrl = extractImageUrl(data);
        if (!imageUrl) { console.error('[ImageGen] FAILED to extract image. Response:', JSON.stringify(data).slice(0, 2000)); throw new Error('No image data in API response'); }

        const resizedUrl = await resizeImageToTarget(imageUrl, request.width, request.height);
        return { success: true, imageUrl: resizedUrl, model, isFallback: false, message: `Generated ${request.width}x${request.height} image via ${model === 'flux' ? 'Flux Schnell' : 'Imagen 3'}` };
    } finally {
        clearTimeout(timeoutId);
    }
}

// ═══════════════════════════════════════════════════════
// BACKGROUND IMAGE GENERATION
// ═══════════════════════════════════════════════════════

export async function generateBackgroundImage(
    bgPrompt: string, canvasW: number, canvasH: number, accentColors: string[], signal?: AbortSignal,
): Promise<ImageGenResult> {
    // ★ Snap to Flux-optimal resolution for best quality output.
    // Flux produces much better results at standard sizes (1024x768, etc.)
    // than at arbitrary canvas dimensions (300x250, 728x90, etc.).
    // The resizeImageToTarget in callImageGenApi will crop/fit to exact canvas size.
    const fluxSize = snapToFluxResolution(canvasW, canvasH);
    console.log(`[ImageGen] Canvas ${canvasW}x${canvasH} → Flux gen ${fluxSize.width}x${fluxSize.height}`);
    const enhancedBgPrompt = [bgPrompt, 'Background image for premium advertisement.', 'No text, no logos, no watermarks, no UI elements.', 'Cinematic lighting, rich tonal range, room for text overlay.', 'Ultra high resolution, magazine-quality, 8K detail.'].join('. ');
    return generateImage({ prompt: enhancedBgPrompt, width: fluxSize.width, height: fluxSize.height, model: 'flux', colorConstraint: accentColors, style: 'photography', negativePrompt: 'text, logos, watermark, low quality, blurry, distorted' }, signal);
}
