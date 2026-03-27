// ─────────────────────────────────────────────────
// imageGenHelpers — Response parsing, resizing, fallback
// ─────────────────────────────────────────────────

import type { ImageGenRequest, ImageGenResult } from './imageGenClient';

/**
 * Extract image URL from various OpenRouter response formats.
 * Handles: Gemini images[], parts[], DALL-E b64_json, string content, array content.
 */
export function extractImageUrl(response: Record<string, unknown>): string | null {
    const choices = (response.choices as any[]) ?? [];
    const message = choices[0]?.message;

    if (!message) {
        const imageData = (response.data as any[]) ?? [];
        if (imageData[0]?.b64_json) return `data:image/png;base64,${imageData[0].b64_json}`;
        if (imageData[0]?.url) return imageData[0].url as string;
        return null;
    }

    // Gemini format: message.images[]
    if (Array.isArray(message.images)) {
        for (const img of message.images) {
            if (img.image_url?.url) return img.image_url.url as string;
            if (img.type === 'image' && img.source?.data) return `data:${img.source.media_type ?? 'image/png'};base64,${img.source.data}`;
        }
    }

    // Gemini parts[] format
    if (Array.isArray(message.parts)) {
        for (const part of message.parts) {
            if (part.inline_data?.data) return `data:${part.inline_data.mime_type ?? 'image/png'};base64,${part.inline_data.data}`;
        }
    }

    const content = message.content;

    if (typeof content === 'string') {
        if (content.startsWith('data:image')) return content;
        if (content.length > 1000 && !content.includes(' ')) return `data:image/png;base64,${content}`;
        if (content.startsWith('http') && (content.includes('.png') || content.includes('.jpg') || content.includes('.webp') || content.includes('image'))) return content;
        return null;
    }

    if (Array.isArray(content)) {
        for (const block of content) {
            if (block.type === 'image_url' && block.image_url?.url) return block.image_url.url as string;
            if (block.type === 'image' && block.source?.data) return `data:${block.source.media_type ?? 'image/png'};base64,${block.source.data}`;
            if (block.inline_data?.data) return `data:${block.inline_data.mime_type ?? 'image/png'};base64,${block.inline_data.data}`;
            if (typeof block === 'string' && block.startsWith('data:image')) return block;
            if (block.type === 'text' && typeof block.text === 'string') {
                const t = block.text.trim();
                if (t.startsWith('data:image')) return t;
                if (t.length > 1000 && !t.includes(' ')) return `data:image/png;base64,${t}`;
            }
        }
    }
    return null;
}

/**
 * Resize image data URL to exact target dimensions (object-fit: cover).
 */
export async function resizeImageToTarget(imageUrl: string, targetW: number, targetH: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            if (img.naturalWidth === targetW && img.naturalHeight === targetH) { resolve(imageUrl); return; }
            const canvas = document.createElement('canvas');
            canvas.width = targetW; canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(imageUrl); return; }
            const srcAspect = img.naturalWidth / img.naturalHeight;
            const dstAspect = targetW / targetH;
            let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
            if (srcAspect > dstAspect) { sw = img.naturalHeight * dstAspect; sx = (img.naturalWidth - sw) / 2; }
            else { sh = img.naturalWidth / dstAspect; sy = (img.naturalHeight - sh) / 2; }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => { resolve(imageUrl); };
        img.src = imageUrl;
    });
}

/** Generate gradient fallback image locally (no API key needed). */
export function generateFallbackImage(request: ImageGenRequest): ImageGenResult {
    const { width, height, colorConstraint, style } = request;
    const colors = colorConstraint && colorConstraint.length >= 2 ? colorConstraint : getColorsForStyle(style ?? 'minimal');
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { success: false, imageUrl: '', model: 'fallback', isFallback: true, message: 'Canvas context not available' };

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
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) { const n = (Math.random() - 0.5) * 15; data[i]! += n; data[i + 1]! += n; data[i + 2]! += n; }
    ctx.putImageData(imageData, 0, 0);

    return { success: true, imageUrl: canvas.toDataURL('image/png'), model: 'fallback', isFallback: true, message: `Generated ${width}x${height} gradient fallback (connect API key for real AI image gen)` };
}

function getColorsForStyle(style: string): string[] {
    switch (style) {
        case 'realistic': return ['#1a1a2e', '#16213e', '#0f3460'];
        case 'illustration': return ['#ff6b6b', '#feca57', '#48dbfb'];
        case 'abstract': return ['#a29bfe', '#fd79a8', '#6c5ce7'];
        case 'photography': return ['#2d3436', '#636e72', '#b2bec3'];
        case 'minimal': default: return ['#0a0e1a', '#1a2e4a', '#0d1b2a'];
    }
}

/** Build enhanced prompt with style and color constraints. */
export function buildEnhancedPrompt(request: ImageGenRequest): string {
    const parts: string[] = [request.prompt];
    if (request.style) {
        const styleMap: Record<string, string> = {
            'realistic': 'photorealistic, ultra high resolution, detailed textures, shot on Canon EOS R5, RAW, 8K',
            'illustration': 'digital illustration, clean vector style, vibrant colors, behance trending, dribbble quality',
            'abstract': 'abstract art, geometric shapes, modern composition, award-winning design, museum quality',
            'minimal': 'minimalist design, clean negative space, refined, premium aesthetic, Apple-style',
            'photography': 'professional DSLR photography, f/2.8 shallow depth of field, golden hour cinematic lighting, 8K sharp focus',
        };
        parts.push(styleMap[request.style] ?? '');
    }
    if (request.colorConstraint && request.colorConstraint.length > 0) parts.push(`Dominant color palette: ${request.colorConstraint.join(', ')}`);
    parts.push('masterpiece quality, award-winning composition, ultra detailed, premium advertisement');
    return parts.filter(Boolean).join('. ');
}
