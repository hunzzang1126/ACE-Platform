// ─────────────────────────────────────────────────
// backgroundRemovalService — Client-side BG removal
// ─────────────────────────────────────────────────
// Uses @imgly/background-removal (SAM-based WASM).
// Runs entirely in the browser — no server, no API cost.
// ─────────────────────────────────────────────────

/**
 * Remove the background from an image blob.
 * Returns a transparent PNG blob.
 *
 * @param imageBlob  Source image (JPEG, PNG, WebP)
 * @param onProgress Optional progress callback (0-1)
 * @returns Transparent PNG blob
 */
export async function removeBackground(
    imageBlob: Blob,
    onProgress?: (progress: number) => void,
): Promise<Blob> {
    // Dynamic import to avoid loading WASM on startup (~15MB)
    let removeBg: typeof import('@imgly/background-removal')['removeBackground'];
    try {
        const mod = await import('@imgly/background-removal');
        removeBg = mod.removeBackground;
    } catch {
        // ★ Stale chunk hash after Vercel redeploy — auto-reload once
        const reloadKey = 'bgRemovalReloadAttempt';
        const lastAttempt = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        if (!lastAttempt || now - parseInt(lastAttempt, 10) > 30000) {
            sessionStorage.setItem(reloadKey, String(now));
            window.location.reload();
            // Return a promise that never resolves (page is reloading)
            return new Promise<Blob>(() => {});
        }
        throw new Error(
            'Background removal module failed to load. Please refresh the page (Cmd+Shift+R) and try again.',
        );
    }

    const result = await removeBg(imageBlob, {
        // ★ FIX: Use library's built-in CDN (staticimgly.com) — it has resources.json + WASM models.
        // jsDelivr and unpkg only serve JS bundles, NOT the model files, causing
        // "Resource /models/isnet_fp16 not found" errors.
        // Omitting publicPath = use the library's own CDN which always works.
        progress: onProgress
            ? (key: string, current: number, total: number) => {
                  onProgress(total > 0 ? current / total : 0);
              }
            : undefined,
        output: { format: 'image/png' },
    });

    // Result may be Blob or ImageData depending on version
    if (result instanceof Blob) return result;

    // Fallback: convert ImageData to Blob
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = (result as any).width;
    canvas.height = (result as any).height;
    ctx.putImageData(result as any, 0, 0);

    return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
}

/**
 * Remove background from an image URL.
 * Handles CORS: if direct fetch fails (AI-generated images from Flux/external CDNs),
 * falls back to loading via HTMLImageElement with crossOrigin and converting via canvas.
 */
export async function removeBackgroundFromUrl(
    imageUrl: string,
    onProgress?: (progress: number) => void,
): Promise<Blob> {
    let blob: Blob;

    if (imageUrl.startsWith('idb://') || imageUrl.startsWith('storage://')) {
        // ★ Resolve idb:// or storage:// asset ref to usable URL, then fetch
        const { resolveAsset } = await import('@/services/assetService');
        const resolvedUrl = await resolveAsset(imageUrl);
        if (resolvedUrl === imageUrl) {
            throw new Error(`Asset not found: ${imageUrl.slice(0, 40)}...`);
        }
        const response = await fetch(resolvedUrl);
        if (!response.ok) throw new Error(`Fetch failed: HTTP ${response.status}`);
        blob = await response.blob();
    } else if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
        // Data URLs and blob URLs can be fetched directly
        const response = await fetch(imageUrl);
        blob = await response.blob();
    } else {
        // External URLs (Flux CDN, etc.) — try fetch first, fall back to canvas conversion
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            blob = await response.blob();
        } catch {
            // ★ CORS fallback: load image via HTMLImageElement (which respects crossOrigin
            // set during Fabric.js load) and convert to blob via canvas
            blob = await imageUrlToBlob(imageUrl);
        }
    }

    return removeBackground(blob, onProgress);
}

/**
 * Convert an external image URL to a Blob via canvas.
 * Bypasses CORS fetch restrictions by using HTMLImageElement with crossOrigin.
 */
async function imageUrlToBlob(url: string): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Canvas toBlob returned null'));
                }, 'image/png');
            } catch (err) {
                reject(new Error(`Canvas conversion failed: ${err}`));
            }
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}

/**
 * Convert a Blob to a data URL for use in Fabric.js image src.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}
