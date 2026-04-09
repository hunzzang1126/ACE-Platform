// ─────────────────────────────────────────────────
// cloudStorageService — Supabase Storage (PRIVATE bucket)
// ─────────────────────────────────────────────────
// PRIVATE bucket: no public URLs. Uses signed URLs for access.
// User A CANNOT see User B's files.
// Path format: {userId}/{folder}/{hash}.{ext}
// ─────────────────────────────────────────────────

import { getSupabase } from '@/services/supabaseClient';

const BUCKET = 'ace-assets';
// Signed URLs expire after 1 hour — re-resolve on each session
const SIGNED_URL_EXPIRY = 3600;

export type StorageFolder = 'uploads' | 'brand' | 'designs';

// ★ Storage path prefix — used to identify cloud-stored assets
// Format: "storage://{userId}/{folder}/{hash}.{ext}"
// Unlike public URLs, these are stable refs resolved to signed URLs at runtime.
const STORAGE_PREFIX = 'storage://';

/**
 * Upload a data URL or Blob to Supabase Storage (PRIVATE).
 * Returns a stable storage:// ref on success, null on failure.
 */
export async function uploadToCloud(
    input: string | Blob,
    folder: StorageFolder,
    userId: string,
    _fileName?: string,
): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;

    const blob = typeof input === 'string' ? dataUrlToBlob(input) : input;
    const hash = await computeHash(blob);
    const ext = mimeToExt(blob.type);
    const path = `${userId}/${folder}/${hash}.${ext}`;

    // Upload (upsert = skip if same hash already exists)
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type,
        upsert: true,
    });

    if (error) {
        // "already exists" is fine — dedup success
        if (error.message?.includes('already exists') || error.message?.includes('Duplicate')) {
            console.log(`[cloudStorage] Dedup hit: ${path}`);
        } else {
            console.error('[cloudStorage] Upload failed:', error.message);
            return null;
        }
    }

    const ref = `${STORAGE_PREFIX}${path}`;
    console.log(`[cloudStorage] Stored: ${ref}`);
    return ref;
}

// ── Signed URL Cache (55min TTL — 5min safety margin before 1hr expiry) ──
const _signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 55 * 60 * 1000;

/**
 * Resolve a storage:// ref to a signed URL for display.
 * ★ Cached in-memory with 55min TTL — avoids redundant network calls.
 */
export async function resolveCloudUrl(ref: string): Promise<string | null> {
    if (!isStorageRef(ref)) return null;

    // ★ Cache hit — return instantly
    const cached = _signedUrlCache.get(ref);
    if (cached && Date.now() < cached.expiresAt) return cached.url;

    const sb = getSupabase();
    if (!sb) return null;

    const path = ref.slice(STORAGE_PREFIX.length);
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
        console.warn('[cloudStorage] Failed to create signed URL:', error?.message);
        return null;
    }

    // ★ Cache the result
    _signedUrlCache.set(ref, { url: data.signedUrl, expiresAt: Date.now() + CACHE_TTL_MS });
    return data.signedUrl;
}

/** Clear signed URL cache. Exported for testing. */
export function clearSignedUrlCache(): void { _signedUrlCache.clear(); }
/** Get cache size. Exported for testing. */
export function getSignedUrlCacheSize(): number { return _signedUrlCache.size; }

/**
 * Delete a file from Supabase Storage by storage:// ref.
 */
export async function deleteFromCloud(ref: string): Promise<boolean> {
    if (!isStorageRef(ref)) return false;

    const sb = getSupabase();
    if (!sb) return false;

    const path = ref.slice(STORAGE_PREFIX.length);
    const { error } = await sb.storage.from(BUCKET).remove([path]);
    if (error) {
        console.error('[cloudStorage] Delete failed:', error.message);
        return false;
    }
    return true;
}

/**
 * Check if a ref is a cloud storage reference.
 */
export function isStorageRef(ref: string): boolean {
    return ref.startsWith(STORAGE_PREFIX);
}

/**
 * Check if a URL is a Supabase signed URL (resolved from storage://).
 */
export function isCloudUrl(url: string): boolean {
    return url.includes('supabase.co/storage/v1/object');
}

/**
 * Get current user ID from Supabase auth.
 */
export async function getCurrentUserId(): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
}

// ── Helpers ──

function dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const header = parts[0] ?? '';
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch?.[1] ?? 'image/png';
    const binary = atob(parts[1] ?? '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

async function computeHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function mimeToExt(mime: string): string {
    const map: Record<string, string> = {
        'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
        'image/svg+xml': 'svg', 'image/gif': 'gif', 'image/avif': 'avif',
    };
    return map[mime] ?? 'png';
}
