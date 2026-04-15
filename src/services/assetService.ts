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
import { uploadToCloud, isStorageRef, isCloudUrl, getCurrentUserId, resolveCloudUrl, uploadToTemplateStorage, isTemplateStorageRef, resolveTemplateStorageUrl } from './cloudStorageService';

const IDB_PREFIX = 'idb://';

// ── Core API ────────────────────────────────────

/**
 * Store a data URL — tries Supabase Storage first, falls back to IndexedDB.
 * Returns storage:// ref (cloud) or idb://{hash} (local fallback).
 */
export async function storeAsset(dataUrl: string): Promise<string> {
    // Skip if already a cloud ref, idb:// ref, or non-data URL
    if (!dataUrl.startsWith('data:')) return dataUrl;

    // ★ Try Supabase Storage first
    const userId = await getCurrentUserId();
    if (userId) {
        const cloudRef = await uploadToCloud(dataUrl, 'designs', userId);
        if (cloudRef) return cloudRef;
    }

    // Fallback: IndexedDB
    const blob = dataUrlToBlob(dataUrl);
    const hash = await computeSha256(blob);
    const ref = `${IDB_PREFIX}${hash}`;
    const existing = await aceDB.assets.get(hash);
    if (!existing) {
        const buffer = await blob.arrayBuffer();
        await aceDB.assets.put({ id: hash, buffer, mimeType: blob.type, savedAt: Date.now() });
    }
    return ref;
}

/**
 * Resolve an asset reference to a usable URL.
 * - storage:// → signed URL via Supabase (private, 1hr expiry)
 * - idb://{hash} → blob: URL from IndexedDB
 * - https:// / blob: / data: → returned as-is
 */
export async function resolveAsset(ref: string): Promise<string> {
    // ★ Cloud storage refs → signed URL
    if (isStorageRef(ref)) {
        const signedUrl = await resolveCloudUrl(ref);
        if (signedUrl) return signedUrl;
        console.warn(`[assetService] Cloud asset unreachable: ${ref}`);
        return ref;
    }

    // ★ Template storage refs → public URL (no signed URL needed)
    if (isTemplateStorageRef(ref)) {
        const publicUrl = resolveTemplateStorageUrl(ref);
        if (publicUrl) return publicUrl;
        console.warn(`[assetService] Template asset unreachable: ${ref}`);
        return ref;
    }

    // ★ CONSOLIDATED FIX (was duplicated in useCanvasSync.ts restoreImage):
    // Recover expired signed Supabase URLs → re-sign via storage:// ref.
    // Images saved before v0.0.0.488 may have leaked signed URLs as src.
    if (isCloudUrl(ref)) {
        const storageRef = signedUrlToStorageRef(ref);
        if (storageRef) {
            const signedUrl = await resolveCloudUrl(storageRef);
            if (signedUrl) return signedUrl;
        }
        // If we can't recover, pass through as-is (may work if not expired)
        return ref;
    }

    // Already-external or blob URLs — pass through
    if (ref.startsWith('https://') || ref.startsWith('http://') || ref.startsWith('blob:')) return ref;

    // idb:// → IndexedDB
    if (!ref.startsWith(IDB_PREFIX)) return ref;

    const hash = ref.slice(IDB_PREFIX.length);
    const entry = await aceDB.assets.get(hash);
    if (!entry) {
        console.warn(`[assetService] Asset not found: ${ref}`);
        return ref;
    }

    const blob = new Blob([entry.buffer], { type: entry.mimeType });
    return URL.createObjectURL(blob);
}

/**
 * Check if a string is an asset reference that needs resolving.
 * Recognizes both idb:// (IndexedDB) and storage:// (Supabase) refs.
 */
export function isAssetRef(src: string): boolean {
    return src.startsWith(IDB_PREFIX) || isStorageRef(src) || isTemplateStorageRef(src);
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
 * Returns a new elements array with stable references (storage:// or idb://).
 * ★ Also converts signed Supabase URLs back to storage:// refs — signed URLs expire!
 * Non-image elements and already-extracted elements pass through unchanged.
 */
export async function extractAssets(
    elements: DesignElement[],
): Promise<DesignElement[]> {
    const results: DesignElement[] = [];

    for (const el of elements) {
        if (el.type !== 'image') { results.push(el); continue; }

        const src = el.src;
        if (isDataUrl(src)) {
            // data: → upload to cloud or store in IDB
            const ref = await storeAsset(src);
            results.push({ ...el, src: ref } as ImageElement);
        } else if (isCloudUrl(src)) {
            // ★ REGRESSION FIX: Signed Supabase URL leaked into element src.
            // These expire after 1 hour. Convert back to storage:// ref.
            const storageRef = signedUrlToStorageRef(src);
            if (storageRef) {
                console.log(`[extractAssets] Converted signed URL → ${storageRef}`);
                results.push({ ...el, src: storageRef } as ImageElement);
            } else {
                // Can't extract storage path — keep as-is (will break after expiry)
                console.warn('[extractAssets] Could not convert signed URL to storage ref:', src.slice(0, 80));
                results.push(el);
            }
        } else {
            results.push(el);
        }
    }

    return results;
}

/**
 * Extract assets for TEMPLATE storage — uses the PUBLIC ace-templates bucket.
 * ★ Template images must be globally visible to all users.
 * Converts data: URLs → tmpl-storage:// refs.
 * Also migrates any storage:// (private) refs to tmpl-storage:// (public).
 */
export async function extractTemplateAssets(
    elements: DesignElement[],
): Promise<DesignElement[]> {
    const results: DesignElement[] = [];

    for (const el of elements) {
        if (el.type !== 'image') { results.push(el); continue; }

        const src = el.src;
        if (isDataUrl(src)) {
            // data: → upload to PUBLIC template bucket
            const ref = await uploadToTemplateStorage(src);
            results.push({ ...el, src: ref ?? src } as ImageElement);
        } else if (isStorageRef(src)) {
            // ★ Private ref → re-upload to public template bucket
            // Resolve the private ref to a URL, download, re-upload to public
            const resolved = await resolveAsset(src);
            if (resolved && resolved !== src) {
                try {
                    const resp = await fetch(resolved);
                    const blob = await resp.blob();
                    const ref = await uploadToTemplateStorage(blob);
                    results.push({ ...el, src: ref ?? src } as ImageElement);
                } catch {
                    results.push(el);
                }
            } else {
                results.push(el);
            }
        } else if (src.startsWith('idb://')) {
            // idb:// → resolve from IndexedDB, upload to public
            const resolved = await resolveAsset(src);
            if (resolved && resolved !== src) {
                try {
                    const resp = await fetch(resolved);
                    const blob = await resp.blob();
                    const ref = await uploadToTemplateStorage(blob);
                    results.push({ ...el, src: ref ?? src } as ImageElement);
                } catch {
                    results.push(el);
                }
            } else {
                results.push(el);
            }
        } else {
            results.push(el);
        }
    }

    return results;
}

/**
 * Convert a signed Supabase URL back to a storage:// ref.
 * Input: https://xxx.supabase.co/storage/v1/object/sign/ace-assets/{userId}/designs/{hash}.{ext}?token=...
 * Output: storage://{userId}/designs/{hash}.{ext}
 */
function signedUrlToStorageRef(signedUrl: string): string | null {
    try {
        const url = new URL(signedUrl);
        // Path format: /storage/v1/object/sign/ace-assets/{userId}/{folder}/{file}
        const match = url.pathname.match(/\/storage\/v1\/object\/sign\/ace-assets\/(.+)/);
        if (match?.[1]) return `storage://${match[1]}`;
    } catch { /* invalid URL */ }
    return null;
}

/**
 * Resolve all asset references (idb:// and storage://) in elements to usable URLs.
 * Returns a new elements array with resolved URLs.
 */
export async function resolveAssets(
    elements: DesignElement[],
): Promise<DesignElement[]> {
    const results: DesignElement[] = [];

    for (const el of elements) {
        if (el.type === 'image' && isAssetRef(el.src)) {
            // Use full ref as cache key (works for both idb:// and storage://)
            const cacheKey = el.src;

            // Check cache first
            let blobUrl = _blobUrlCache.get(cacheKey);
            if (!blobUrl) {
                blobUrl = await resolveAsset(el.src);
                if (blobUrl !== el.src) {
                    _blobUrlCache.set(cacheKey, blobUrl);
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
    const parts = dataUrl.split(',');
    const header = parts[0] ?? '';
    const base64 = parts[1] ?? '';
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
