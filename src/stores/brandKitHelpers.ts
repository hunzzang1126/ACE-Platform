// ─────────────────────────────────────────────────
// brandKitHelpers — Cloud upload + "Save to Brand Kit"
// ─────────────────────────────────────────────────
// Extracted from brandKitStore to keep store under 400L.
// Provides saveToBrandKit() for upload → brand kit flow.
// ─────────────────────────────────────────────────

import { useBrandKitStore, type AssetCategory, type AssetFormat } from './brandKitStore';
import { uploadToCloud, getCurrentUserId, isCloudUrl } from '@/services/cloudStorageService';
import { resolveAsset, isAssetRef } from '@/services/assetService';

/**
 * Save an image (from uploads or canvas) to the active Brand Kit,
 * uploading to Supabase Storage first if possible.
 */
export async function saveToBrandKit(
    src: string,
    name: string,
    width: number,
    height: number,
    category: AssetCategory = 'photo',
): Promise<string | null> {
    const store = useBrandKitStore.getState();
    let kitId = store.activeKitId;

    // Auto-create a default brand kit if none exists
    if (!kitId) {
        kitId = store.createKit('My Brand');
        store.setActiveKit(kitId);
    }

    // Resolve idb:// refs to actual blob data for cloud upload
    let uploadSrc = src;
    if (isAssetRef(src)) {
        uploadSrc = await resolveAsset(src);
    }

    // Try uploading to Supabase 'brand' folder
    let cloudSrc = src;
    const userId = await getCurrentUserId();
    if (userId && (uploadSrc.startsWith('blob:') || uploadSrc.startsWith('data:'))) {
        const result = await uploadToCloud(uploadSrc, 'brand', userId);
        if (result) cloudSrc = result;
    } else if (isCloudUrl(src)) {
        cloudSrc = src; // already a cloud URL
    }

    // Generate a lightweight thumbnail
    let thumbSrc = cloudSrc;
    try {
        const thumb = await generateBrandThumb(uploadSrc, 150);
        if (userId && thumb.startsWith('data:')) {
            const thumbCloud = await uploadToCloud(thumb, 'brand', userId, `${name}_thumb`);
            if (thumbCloud) thumbSrc = thumbCloud;
        }
    } catch { /* thumbnail generation failed, use full image */ }

    // Compute hash for dedup
    const hash = await computeQuickHash(cloudSrc);

    const assetId = store.addAsset(kitId, {
        name,
        category,
        tags: [],
        role: null,
        src: cloudSrc,
        thumbSrc,
        width,
        height,
        format: guessFormatFromUrl(cloudSrc),
        sizeBytes: 0,
        hash,
        metadata: { hasTransparency: false, dominantColors: [], suggestedPlacement: null },
    });

    return assetId;
}

// ── Internal Helpers ──

async function generateBrandThumb(src: string, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = src;
    });
}

async function computeQuickHash(input: string): Promise<string> {
    const buffer = new TextEncoder().encode(input.slice(0, 2000));
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function guessFormatFromUrl(url: string): AssetFormat {
    const ext = url.split('.').pop()?.toLowerCase() ?? 'png';
    if (['png', 'jpg', 'svg', 'webp', 'gif', 'avif'].includes(ext)) return ext as AssetFormat;
    return 'png';
}
