// ─────────────────────────────────────────────────
// imageGenClient.ts — AI Image Generation Client
// ─────────────────────────────────────────────────
// Abstraction layer for AI image generation.
// - Without API key: returns gradient/solid placeholders
// - With API key: routes to Flux/DALL-E via OpenRouter
//
// Phase 2: Fallback mode (no API needed)
// Phase 3: Real model routing via modelRouter.ts
// ─────────────────────────────────────────────────

export type ImageGenModel = 'flux' | 'dall-e-3' | 'midjourney' | 'fallback';

export interface ImageGenRequest {
    prompt: string;
    width: number;
    height: number;
    model?: ImageGenModel;
    /** Brand palette constraint — AI should use these colors */
    colorConstraint?: string[];
    style?: 'realistic' | 'illustration' | 'abstract' | 'minimal';
}

export interface ImageGenResult {
    success: boolean;
    /** Data URL of generated image */
    imageUrl: string;
    model: ImageGenModel;
    /** Whether this was a real AI generation or a fallback */
    isFallback: boolean;
    message: string;
}

// ── Main Entry Point ──

export async function generateImage(request: ImageGenRequest): Promise<ImageGenResult> {
    // Phase 2: Always use fallback (no API key needed)
    // Phase 3: Check for OpenRouter API key and route to real model
    return generateFallbackImage(request);
}

// ── Fallback Generator (no API needed) ──
// Creates gradient/solid color images based on the prompt and constraints.

function generateFallbackImage(request: ImageGenRequest): ImageGenResult {
    const { width, height, colorConstraint, style } = request;

    // Use brand colors if available, otherwise generate from style
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

    // Create gradient
    const angle = Math.random() * 360;
    const radians = (angle * Math.PI) / 180;
    const x1 = width / 2 + Math.cos(radians) * width / 2;
    const y1 = height / 2 + Math.sin(radians) * height / 2;
    const x2 = width / 2 - Math.cos(radians) * width / 2;
    const y2 = height / 2 - Math.sin(radians) * height / 2;

    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1] ?? colors[0]);
    if (colors.length > 2) gradient.addColorStop(0.5, colors[2]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle noise texture
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 15;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    const imageUrl = canvas.toDataURL('image/png');

    return {
        success: true,
        imageUrl,
        model: 'fallback',
        isFallback: true,
        message: `Generated ${width}x${height} fallback gradient (real AI gen available in Phase 3)`,
    };
}

// ── Style-Based Color Selection ──

function getColorsForStyle(style: string): string[] {
    switch (style) {
        case 'realistic':
            return ['#1a1a2e', '#16213e', '#0f3460'];
        case 'illustration':
            return ['#ff6b6b', '#feca57', '#48dbfb'];
        case 'abstract':
            return ['#a29bfe', '#fd79a8', '#6c5ce7'];
        case 'minimal':
        default:
            return ['#0a0e1a', '#1a2e4a', '#0d1b2a'];
    }
}
