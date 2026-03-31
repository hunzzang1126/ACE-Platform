// ─────────────────────────────────────────────────
// cloudStorageService — Supabase Storage Upload/Resolve
// ─────────────────────────────────────────────────
// Central service for uploading blobs to Supabase Storage.
// Falls back to IndexedDB (idb://) when Supabase is unavailable.
// ─────────────────────────────────────────────────

import { getSupabase } from '@/services/supabaseClient';

const BUCKET = 'ace-assets';

export type StorageFolder = 'uploads' | 'brand' | 'designs';

/**
 * Upload a data URL or Blob to Supabase Storage.
 * Returns a public https:// URL on success, or falls back to null.
 */
export async function uploadToCloud(
    input: string | Blob,
    folder: StorageFolder,
    userId: string,
    fileName?: string,
): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;

    const blob = typeof input === 'string' ? dataUrlToBlob(input) : input;
    const hash = await computeHash(blob);
    const ext = mimeToExt(blob.type);
    const path = `${userId}/${folder}/${hash}.${ext}`;

    // ★ Check if already exists (dedup by hash)
    const { data: existing } = sb.storage.from(BUCKET).getPublicUrl(path);
    if (existing?.publicUrl) {
        // Verify file actually exists by HEAD request
        try {
            const resp = await fetch(existing.publicUrl, { method: 'HEAD' });
            if (resp.ok) return existing.publicUrl;
        } catch { /* file doesn't exist yet, continue upload */ }
    }

    // Upload
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type,
        upsert: true,
    });

    if (error) {
        console.error('[cloudStorage] Upload failed:', error.message);
        return null;
    }

    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path);
    console.log(`[cloudStorage] Uploaded: ${folder}/${hash}.${ext}`);
    return urlData?.publicUrl ?? null;
}

/**
 * Upload a Blob to cloud storage (convenience wrapper).
 */
export async function uploadBlobToCloud(
    blob: Blob,
    folder: StorageFolder,
    userId: string,
): Promise<string | null> {
    return uploadToCloud(blob, folder, userId);
}

/**
 * Delete a file from Supabase Storage by full URL.
 */
export async function deleteFromCloud(publicUrl: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;

    const path = extractPathFromUrl(publicUrl);
    if (!path) return false;

    const { error } = await sb.storage.from(BUCKET).remove([path]);
    if (error) {
        console.error('[cloudStorage] Delete failed:', error.message);
        return false;
    }
    return true;
}

/**
 * Check if a URL is a Supabase Storage URL.
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

function extractPathFromUrl(url: string): string | null {
    const match = url.match(/\/object\/public\/ace-assets\/(.+)$/);
    return match?.[1] ?? null;
}
