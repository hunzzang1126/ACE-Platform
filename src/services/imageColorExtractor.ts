// ─────────────────────────────────────────────────
// imageColorExtractor.ts — Extract dominant colors from image
// ─────────────────────────────────────────────────
// ★ v747: Image-First pipeline.
// Uses Canvas getImageData() to sample pixel colors from
// a generated background image. Returns dominant palette
// + suggested text/accent colors for colorHarmony integration.
//
// No external dependencies. Works with data: URLs (CORS-safe).
// ─────────────────────────────────────────────────

import { hexToHSL, hslToHex, type HSL } from './colorHarmony';

// ── Types ────────────────────────────────────────

export interface ExtractedColors {
    /** Most frequent color in the image */
    dominant: string;
    /** Top 5 dominant colors (sorted by frequency) */
    palette: string[];
    /** Average luminance 0-1 */
    avgLuminance: number;
    /** Overall warmth classification */
    warmth: 'warm' | 'cool' | 'neutral';
    /** Recommended text color for readability over this image */
    suggestedText: string;
    /** Recommended accent color (high contrast, trendy) */
    suggestedAccent: string;
}

// ── Quantization ─────────────────────────────────
// Reduce RGB to a smaller set of "buckets" for frequency counting.
// HSL quantization: H → 24 bins (15° each), S → 4 bins, L → 6 bins

function quantizeHSL(h: number, s: number, l: number): string {
    const hBin = Math.floor(h / 15) * 15;
    const sBin = Math.round(s * 3) / 3; // 0, 0.33, 0.67, 1.0
    const lBin = Math.round(l * 5) / 5; // 0, 0.2, 0.4, 0.6, 0.8, 1.0
    return `${hBin}|${sBin.toFixed(2)}|${lBin.toFixed(2)}`;
}

function bucketToHex(key: string): string {
    const [h, s, l] = key.split('|').map(Number);
    return hslToHex(h!, s!, l!);
}

// ── Core Extraction ──────────────────────────────

/**
 * Extract dominant colors from an image URL using Canvas pixel sampling.
 * Works with data: URLs and same-origin URLs.
 *
 * Strategy: Load image → draw on canvas → sample pixels on 8x8 grid
 * → HSL-quantize → frequency sort → top 5 palette.
 */
export async function extractColorsFromImage(
    imageUrl: string,
    sampleSize = 64, // 8x8 grid = 64 sample points
): Promise<ExtractedColors> {
    // Load image into canvas
    const img = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    const size = 128; // Downscale to 128px for speed
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallbackColors();

    ctx.drawImage(img, 0, 0, size, size);

    // Sample pixels on grid
    const gridSize = Math.floor(Math.sqrt(sampleSize));
    const stepX = Math.floor(size / gridSize);
    const stepY = Math.floor(size / gridSize);
    const buckets = new Map<string, number>();
    let totalLum = 0;
    let sampleCount = 0;

    for (let gx = 0; gx < gridSize; gx++) {
        for (let gy = 0; gy < gridSize; gy++) {
            const px = Math.min(gx * stepX + Math.floor(stepX / 2), size - 1);
            const py = Math.min(gy * stepY + Math.floor(stepY / 2), size - 1);
            const pixel = ctx.getImageData(px, py, 1, 1).data;
            const r = pixel[0]! / 255, g = pixel[1]! / 255, b = pixel[2]! / 255;

            // RGB → HSL
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            const l = (max + min) / 2;
            let h = 0, s = 0;
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
                else if (max === g) h = ((b - r) / d + 2) * 60;
                else h = ((r - g) / d + 4) * 60;
            }

            const key = quantizeHSL(h, s, l);
            buckets.set(key, (buckets.get(key) ?? 0) + 1);

            // Luminance for text color decision
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            totalLum += lum;
            sampleCount++;
        }
    }

    // Sort buckets by frequency → top 5
    const sorted = [...buckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sorted.length === 0) return fallbackColors();

    const palette = sorted.map(([key]) => bucketToHex(key));
    const dominant = palette[0]!;
    const avgLuminance = sampleCount > 0 ? totalLum / sampleCount : 0.5;

    // Classify warmth from dominant
    const domHSL = hexToHSL(dominant);
    const warmth = classifyWarmth(domHSL);

    // Suggest text color (high contrast)
    const suggestedText = avgLuminance > 0.5 ? '#1A1A2E' : '#FFFFFF';

    // Suggest accent (complementary hue, high saturation)
    const compH = (domHSL.h + 180) % 360;
    const suggestedAccent = hslToHex(compH, Math.max(0.6, domHSL.s), 0.55);

    console.log(`[ImageColors] Extracted: dominant=${dominant}, palette=[${palette.join(',')}], lum=${avgLuminance.toFixed(2)}, warmth=${warmth}`);

    return { dominant, palette, avgLuminance, warmth, suggestedText, suggestedAccent };
}

// ── Helpers ──────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = url;
    });
}

function classifyWarmth(hsl: HSL): 'warm' | 'cool' | 'neutral' {
    if (hsl.s < 0.1) return 'neutral';
    if ((hsl.h >= 0 && hsl.h <= 60) || hsl.h >= 330) return 'warm';
    if (hsl.h >= 180 && hsl.h <= 270) return 'cool';
    return 'neutral';
}

function fallbackColors(): ExtractedColors {
    return {
        dominant: '#1a1a2e',
        palette: ['#1a1a2e', '#0f172a', '#334155', '#475569', '#64748b'],
        avgLuminance: 0.15,
        warmth: 'neutral',
        suggestedText: '#FFFFFF',
        suggestedAccent: '#3B82F6',
    };
}
