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
        const errMsg = err instanceof Error ? err.message : String(err);
        const fallback = generateFallbackImage(request);
        fallback.message = `Image API failed: ${errMsg.slice(0, 200)}`;
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

    // ★ ROOT CAUSE FIX (v709): Gemini image models REQUIRE modalities: ["image", "text"]
    // Without this, the model returns text-only responses → extractImageUrl returns null → fallback!
    // See: https://openrouter.ai/docs — Gemini image gen requires explicit modality declaration.
    const body: Record<string, unknown> = {
        model: modelId,
        messages: [{ role: 'user', content: promptWithSize }],
        modalities: ['image', 'text'],
    };
    const url = getOpenRouterUrl();

    // ★ Retry logic matching callOpenRouterApi — cold starts cause first-request failures
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 90_000; // Image gen can take 45-60s on cold start
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
            console.warn(`[ImageGen] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }

        // ★ Fresh headers on each attempt — JWT may refresh between retries
        const headers = await getProxyHeaders();
        console.log(`[ImageGen] Calling ${modelId} (attempt ${attempt + 1}) — "${enhancedPrompt.slice(0, 80)}..."`);

        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => { console.warn(`[ImageGen] ${modelId} timed out (attempt ${attempt + 1})`); timeoutController.abort(); }, TIMEOUT_MS);
        const combinedSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;

        try {
            const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: combinedSignal });
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[ImageGen] ${res.status} error (attempt ${attempt + 1}):`, errText.slice(0, 200));

                // Non-retryable: 401 (auth), 402 (billing)
                if (res.status === 401 || res.status === 402) {
                    throw new Error(`Image gen auth failed (${res.status}): ${errText.slice(0, 200)}`);
                }

                // Retryable: 400, 429, 5xx
                if (res.status === 400 || res.status === 429 || res.status >= 500) {
                    lastError = new Error(`Image gen failed (${res.status}): ${errText.slice(0, 200)}`);
                    continue; // retry
                }

                throw new Error(`OpenRouter image gen failed (${res.status}): ${errText.slice(0, 200)}`);
            }

            const data = await res.json() as Record<string, unknown>;
            const imageUrl = extractImageUrl(data);
            if (!imageUrl) {
                console.error('[ImageGen] FAILED to extract image. Response:', JSON.stringify(data).slice(0, 2000));
                // ★ Retry on empty image response — model may return text instead of image on cold start
                lastError = new Error('No image data in API response');
                continue; // retry
            }

            const resizedUrl = await resizeImageToTarget(imageUrl, request.width, request.height);
            return { success: true, imageUrl: resizedUrl, model, isFallback: false, message: `Generated ${request.width}x${request.height} image via ${model === 'flux' ? 'Flux Schnell' : 'Imagen 3'}` };
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError' && attempt < MAX_RETRIES) {
                lastError = new Error(`Image gen timed out (attempt ${attempt + 1})`);
                continue; // retry on timeout
            }
            if (attempt < MAX_RETRIES && err instanceof Error && !err.message.includes('auth failed')) {
                lastError = err;
                continue; // retry on other transient errors
            }
            throw err;
        }
    }

    throw lastError ?? new Error('Image gen failed after retries.');
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
