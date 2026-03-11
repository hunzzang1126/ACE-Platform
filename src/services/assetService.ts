// ─────────────────────────────────────────────────
// assetService — Extract & Store Images Separately
// ─────────────────────────────────────────────────
// Separates binary image data from design JSON.
// Images are stored as blobs in IndexedDB (aceDB.assets)
// and replaced with lightweight `idb://{hash}` references.
//
// Benefits:
//   - JSON size reduced by 80-95%
//   - Dedup by SHA-256 hash (same image = single entry)
//   - Async blob loading (no JSON parse perf hit)
//   - Ready for Supabase Storage migration (Phase 3)
// ─────────────────────────────────────────────────

import { aceDB } from '@/stores/aceDB';
import type { DesignElement, ImageElement } from '@/schema/elements.types';

const IDB_PREFIX = 'idb://';

// ── Core API ────────────────────────────────────

/**
 * Store a data URL as a blob in IndexedDB. Returns an `idb://{hash}` ref.
 * Dedup: if the same hash already exists, skips the write.
 */
export async function storeAsset(dataUrl: string): Promise<string> {
    // Skip if already an idb:// reference or non-data URL
    if (!dataUrl.startsWith('data:')) return dataUrl;

    const blob = dataUrlToBlob(dataUrl);
    const hash = await computeSha256(blob);
    const ref = `${IDB_PREFIX}${hash}`;

    // Dedup — check if already stored
    const existing = await aceDB.assets.get(hash);
    if (!existing) {
        const buffer = await blob.arrayBuffer();
        await aceDB.assets.put({
            id: hash,
            buffer,
            mimeType: blob.type,
            savedAt: Date.now(),
        });
    }

    return ref;
}

/**
 * Resolve an `idb://{hash}` reference back to a usable blob URL.
 * Returns the input unchanged if it's not an idb:// reference.
 */
export async function resolveAsset(ref: string): Promise<string> {
    if (!ref.startsWith(IDB_PREFIX)) return ref;

    const hash = ref.slice(IDB_PREFIX.length);
    const entry = await aceDB.assets.get(hash);
    if (!entry) {
        console.warn(`[assetService] Asset not found: ${ref}`);
        return ref; // return broken ref — UI can show placeholder
    }

    const blob = new Blob([entry.buffer], { type: entry.mimeType });
    return URL.createObjectURL(blob);
}

/**
 * Check if a string is an idb:// asset reference.
 */
export function isAssetRef(src: string): boolean {
    return src.startsWith(IDB_PREFIX);
}

/**
 * Check if a string is a base64 data URL (candidate for extraction).
 */
export function isDataUrl(src: string): boolean {
    return src.startsWith('data:');
}

// ── Batch Operations ────────────────────────────

// Active blob URL cache — prevents creating duplicate blob URLs
// for the same hash within a session.
const _blobUrlCache = new Map<string, string>();

/**
 * Extract all base64 data URLs from elements and store them as blobs.
 * Returns a new elements array with `idb://` references.
 * Non-image elements and already-extracted elements pass through unchanged.
 */
export async function extractAssets(
    elements: DesignElement[],
): Promise<DesignElement[]> {
    const results: DesignElement[] = [];

    for (const el of elements) {
        if (el.type === 'image' && isDataUrl(el.src)) {
            const ref = await storeAsset(el.src);
            results.push({ ...el, src: ref } as ImageElement);
        } else {
            results.push(el);
        }
    }

    return results;
}

/**
 * Resolve all `idb://` references in elements to usable blob URLs.
 * Returns a new elements array with blob URLs.
 */
export async function resolveAssets(
    elements: DesignElement[],
): Promise<DesignElement[]> {
    const results: DesignElement[] = [];

    for (const el of elements) {
        if (el.type === 'image' && isAssetRef(el.src)) {
            const hash = el.src.slice(IDB_PREFIX.length);

            // Check cache first
            let blobUrl = _blobUrlCache.get(hash);
            if (!blobUrl) {
                blobUrl = await resolveAsset(el.src);
                if (blobUrl !== el.src) {
                    _blobUrlCache.set(hash, blobUrl);
                }
            }

            results.push({ ...el, src: blobUrl } as ImageElement);
        } else {
            results.push(el);
        }
    }

    return results;
}

/**
 * Revoke all cached blob URLs. Call on unmount or navigation.
 */
export function revokeAssetCache(): void {
    for (const url of _blobUrlCache.values()) {
        URL.revokeObjectURL(url);
    }
    _blobUrlCache.clear();
}

// ── Helpers ─────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch?.[1] ?? 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}

async function computeSha256(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
