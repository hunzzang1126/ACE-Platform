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
        // ★ Stale chunk hash after Vercel redeploy — tell user to refresh
        throw new Error(
            'Background removal module failed to load. Please refresh the page (Cmd+Shift+R) and try again.',
        );
    }

    const result = await removeBg(imageBlob, {
        // ★ Use jsDelivr CDN for WASM models (more reliable than unpkg)
        publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/',
        model: 'isnet_fp16',
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
 * Convenience wrapper that fetches the image first.
 */
export async function removeBackgroundFromUrl(
    imageUrl: string,
    onProgress?: (progress: number) => void,
): Promise<Blob> {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return removeBackground(blob, onProgress);
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
