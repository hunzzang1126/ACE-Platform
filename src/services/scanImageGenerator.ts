// ─────────────────────────────────────────────────
// scanImageGenerator.ts — AI Image Gen for Scan V2
// ─────────────────────────────────────────────────
// Wraps imageGenClient.generateImage() with scan-specific
// prompt enhancement for image_placeholder elements.
// ─────────────────────────────────────────────────

import { generateImage, type ImageGenResult } from '@/services/imageGenClient';

export type ScanImageStyle = 'photo' | 'illustration' | 'texture' | 'gradient_complex' | 'pattern';

export interface ScanImageGenRequest {
    description: string;   // Rich description from Vision scan
    style: ScanImageStyle;
    width: number;         // Target element width on canvas
    height: number;        // Target element height on canvas
    crop?: string;         // Framing hint from Vision scan
}

/**
 * Generate an AI image for a scanned image_placeholder element.
 * Enhances the Vision-provided description with style/quality modifiers.
 * Returns a data URL ready for engine.add_image().
 */
export async function generateScanImage(
    req: ScanImageGenRequest,
    signal?: AbortSignal,
): Promise<ImageGenResult> {
    const prompt = buildScanPrompt(req);
    return generateImage({
        prompt,
        width: req.width,
        height: req.height,
        model: 'flux',
        style: styleToGenStyle(req.style),
        negativePrompt: 'text, logos, watermark, low quality, blurry, distorted, ui elements',
    }, signal);
}

// ── Prompt Builder ──

function buildScanPrompt(req: ScanImageGenRequest): string {
    const parts = [req.description];

    // Style modifiers
    switch (req.style) {
        case 'photo':
            parts.push('Professional high-resolution photography. Cinematic lighting, sharp focus.');
            break;
        case 'illustration':
            parts.push('Clean vector-style illustration. Flat design, modern aesthetic.');
            break;
        case 'texture':
            parts.push('Seamless texture pattern. Tileable, suitable for background use.');
            break;
        case 'gradient_complex':
            parts.push('Complex gradient artwork. Smooth color transitions, abstract beauty.');
            break;
        case 'pattern':
            parts.push('Geometric or organic repeating pattern. Subtle, decorative.');
            break;
    }

    // Crop/framing hint
    if (req.crop) parts.push(`Framing: ${req.crop}.`);

    // Universal quality boost
    parts.push('8K resolution, premium quality, magazine-grade.');

    return parts.join(' ');
}

function styleToGenStyle(style: ScanImageStyle): 'photography' | 'illustration' | 'abstract' | 'minimal' {
    switch (style) {
        case 'photo': return 'photography';
        case 'illustration': return 'illustration';
        case 'texture': return 'abstract';
        case 'gradient_complex': return 'abstract';
        case 'pattern': return 'minimal';
    }
}
