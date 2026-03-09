// ─────────────────────────────────────────────────
// assetProcessor.ts — Asset Upload Pipeline
// ─────────────────────────────────────────────────
// Processes uploaded files: generates thumbnails,
// computes SHA-256 hash for dedup, extracts dominant
// colors, detects transparency, auto-categorizes.
// ─────────────────────────────────────────────────

import type { AssetCategory, AssetFormat, BrandAsset } from '@/stores/brandKitStore';

// ── Public Types ──

export type ProcessedAsset = Omit<
    BrandAsset,
    'id' | 'uploadedAt' | 'usageCount' | 'isFavorite' | 'deletedAt'
>;

// ── Main Processor ──

export async function processUploadedAsset(
    file: File,
    nameOverride?: string,
): Promise<ProcessedAsset> {
    const dataUrl = await readFileAsDataUrl(file);
    const { width, height } = await getImageDimensions(dataUrl);
    const thumbSrc = await generateThumbnail(dataUrl, 150);
    const hash = await computeHash(file);
    const dominantColors = extractDominantColors(dataUrl, 3);
    const hasTransparency = file.type === 'image/png' || file.type === 'image/webp';
    const format = detectFormat(file.type);
    const category = autoDetectCategory(file.name, width, height, hasTransparency);
    const suggestedPlacement = suggestPlacement(width, height, category);

    return {
        name: nameOverride ?? cleanFileName(file.name),
        category,
        tags: autoGenerateTags(file.name, category),
        role: null,
        src: dataUrl,
        thumbSrc,
        width,
        height,
        format,
        sizeBytes: file.size,
        hash,
        metadata: {
            hasTransparency,
            dominantColors: await dominantColors,
            suggestedPlacement,
        },
    };
}

// ── File Reading ──

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// ── Image Dimensions ──

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
    });
}

// ── Thumbnail Generation ──

async function generateThumbnail(src: string, maxWidth: number): Promise<string> {
    const { width, height } = await getImageDimensions(src);
    const scale = Math.min(maxWidth / width, 1);
    const thumbW = Math.round(width * scale);
    const thumbH = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = thumbW;
    canvas.height = thumbH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src; // fallback

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Thumbnail load failed'));
        img.src = src;
    });

    ctx.drawImage(img, 0, 0, thumbW, thumbH);
    return canvas.toDataURL('image/webp', 0.7);
}

// ── SHA-256 Hash (for Dedup) ──

async function computeHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Dominant Color Extraction ──

async function extractDominantColors(src: string, count: number): Promise<string[]> {
    try {
        const { width, height } = await getImageDimensions(src);
        const sampleW = Math.min(width, 50);
        const sampleH = Math.min(height, 50);

        const canvas = document.createElement('canvas');
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return ['#000000'];

        const img = new Image();
        await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.src = src;
        });

        ctx.drawImage(img, 0, 0, sampleW, sampleH);
        const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

        // Simple histogram-based extraction
        const colorMap = new Map<string, number>();
        for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
            const r = Math.round(data[i] / 32) * 32;
            const g = Math.round(data[i + 1] / 32) * 32;
            const b = Math.round(data[i + 2] / 32) * 32;
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            colorMap.set(hex, (colorMap.get(hex) ?? 0) + 1);
        }

        return [...colorMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([hex]) => hex);
    } catch {
        return ['#000000'];
    }
}

// ── Auto-Detection Utilities ──

function detectFormat(mimeType: string): AssetFormat {
    if (mimeType.includes('svg')) return 'svg';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
    return 'png';
}

function autoDetectCategory(
    name: string, w: number, h: number, hasAlpha: boolean,
): AssetCategory {
    const n = name.toLowerCase();
    if (n.includes('logo') || (hasAlpha && w < 500 && h < 500)) return 'logo';
    if (n.includes('product') || n.includes('item')) return 'product';
    if (n.includes('icon') || (w < 128 && h < 128)) return 'icon';
    if (n.includes('texture') || n.includes('pattern')) return 'texture';
    if (n.includes('bg') || n.includes('background')) return 'background';
    return 'photo';
}

function suggestPlacement(
    w: number, h: number, category: AssetCategory,
): BrandAsset['metadata']['suggestedPlacement'] {
    if (category === 'logo') return 'top-right';
    if (category === 'icon') return 'top-left';
    const ratio = w / h;
    if (ratio > 3) return 'top-left'; // very wide → banner-style
    if (ratio < 0.5) return 'center'; // very tall
    return 'center';
}

function cleanFileName(name: string): string {
    return name
        .replace(/\.[^/.]+$/, '')  // remove extension
        .replace(/[-_]/g, ' ')     // dashes/underscores → spaces
        .replace(/\b\w/g, c => c.toUpperCase()); // title case
}

function autoGenerateTags(name: string, category: AssetCategory): string[] {
    const tags = [category];
    const n = name.toLowerCase();
    // Extract meaningful words
    const words = n.replace(/\.[^/.]+$/, '').split(/[-_\s]+/).filter(w => w.length > 2);
    tags.push(...words);
    return [...new Set(tags)];
}
