// ─────────────────────────────────────────────────
// uploadStore — Upload Library (User + AI images)
// ─────────────────────────────────────────────────
// Stores metadata for all uploaded/AI-generated images.
// Binary data lives in aceDB.assets (via assetService).
// This store holds only lightweight metadata for the grid UI.
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorageAdapter';
import { storeAsset } from '@/services/assetService';

// ── Types ──

export interface UploadEntry {
    /** Unique ID (SHA-256 hash or uuid) */
    id: string;
    /** Display name */
    name: string;
    /** Stable reference to binary in IndexedDB: idb://{hash} */
    idbRef: string;
    /** Natural width */
    width: number;
    /** Natural height */
    height: number;
    /** Origin: user upload or AI generation */
    source: 'user' | 'ai';
    /** ISO timestamp */
    createdAt: string;
    /** MIME type */
    mimeType?: string;
    /** AI-analyzed metadata (populated async after upload) */
    analysis?: import('@/ai/services/assetAnalyzer').AssetAnalysis;
}

export interface UploadState {
    uploads: UploadEntry[];
    addUpload: (entry: UploadEntry) => void;
    removeUpload: (id: string) => void;
    clearAll: () => void;
    /** Update analysis result for a specific upload */
    updateAnalysis: (id: string, analysis: import('@/ai/services/assetAnalyzer').AssetAnalysis) => void;
}

const MAX_UPLOADS = 100;

// ── Store ──

export const useUploadStore = create<UploadState>()(
    persist(
        (set) => ({
            uploads: [],

            addUpload: (entry) => set((state) => {
                // Dedup by idbRef — same image shouldn't appear twice
                if (state.uploads.some(u => u.idbRef === entry.idbRef)) return state;
                const next = [entry, ...state.uploads].slice(0, MAX_UPLOADS);
                return { uploads: next };
            }),

            removeUpload: (id) => set((state) => ({
                uploads: state.uploads.filter(u => u.id !== id),
            })),

            clearAll: () => set({ uploads: [] }),

            updateAnalysis: (id, analysis) => set((state) => ({
                uploads: state.uploads.map(u => u.id === id ? { ...u, analysis } : u),
            })),
        }),
        {
            name: 'ace-upload-library',
            storage: createJSONStorage(() => idbStorage),
        },
    ),
);

// ── Helpers ──

/**
 * Save a data URL to storage (Supabase first, IndexedDB fallback)
 * AND register in upload library.
 * Returns the asset URL (https:// or idb://).
 */
export async function saveToUploadLibrary(
    dataUrl: string,
    name: string,
    width: number,
    height: number,
    source: 'user' | 'ai',
): Promise<string> {
    // storeAsset now tries Supabase first, falls back to IndexedDB
    const assetUrl = await storeAsset(dataUrl);

    // Generate a stable ID from the URL
    const id = assetUrl.startsWith('idb://')
        ? assetUrl.slice(6)
        : assetUrl.startsWith('storage://')
            ? assetUrl.split('/').pop()?.replace(/\.[^.]+$/, '') ?? crypto.randomUUID()
            : crypto.randomUUID();

    useUploadStore.getState().addUpload({
        id,
        name,
        idbRef: assetUrl, // backwards compat field name — holds idb://, storage://, or https://
        width,
        height,
        source,
        createdAt: new Date().toISOString(),
    });

    // ★ Background asset analysis (non-blocking)
    if (dataUrl.startsWith('data:image/')) {
        analyzeUploadedAsset(id, dataUrl, name, width, height).catch(() => {/* non-critical */});
    }

    return assetUrl;
}

/** Fire-and-forget: run AI analysis on uploaded image */
async function analyzeUploadedAsset(
    id: string, dataUrl: string, fileName: string, width: number, height: number,
): Promise<void> {
    try {
        const { analyzeAsset } = await import('@/ai/services/assetAnalyzer');
        const analysis = await analyzeAsset(dataUrl, fileName, width, height);
        useUploadStore.getState().updateAnalysis(id, analysis);
        console.info(`[uploadStore] Asset analyzed: ${fileName} → ${analysis.type} (${analysis.suggestedRole})`);
    } catch (err) {
        console.warn('[uploadStore] Asset analysis failed:', err);
    }
}

/**
 * ★ Cloud-first: Fetch ALL images from Supabase Storage bucket for this user.
 * Merges with local entries so Image Panel shows everything across devices.
 * Called on SidebarUploadsTab mount.
 */
export async function fetchCloudUploads(userId: string): Promise<number> {
    try {
        const { getSupabase } = await import('@/services/supabaseClient');
        const sb = getSupabase();
        if (!sb) return 0;

        const { data, error } = await sb.storage
            .from('ace-assets')
            .list(`${userId}/designs`, { limit: MAX_UPLOADS, sortBy: { column: 'created_at', order: 'desc' } });

        if (error || !data) {
            console.warn('[uploadStore] Failed to list cloud assets:', error?.message);
            return 0;
        }

        const existing = useUploadStore.getState().uploads;
        const existingRefs = new Set(existing.map(u => u.idbRef));
        let added = 0;

        for (const file of data) {
            if (!file.name || file.name.startsWith('.')) continue;
            const ref = `storage://${userId}/designs/${file.name}`;

            // Skip if already in local store
            if (existingRefs.has(ref)) continue;

            const id = file.name.replace(/\.[^.]+$/, '');
            const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';

            useUploadStore.getState().addUpload({
                id,
                name: `AI Image`,
                idbRef: ref,
                width: 0,  // Unknown until loaded — UI can lazy-detect
                height: 0,
                source: 'ai',
                createdAt: file.created_at ?? new Date().toISOString(),
                mimeType,
            });
            added++;
        }

        if (added > 0) console.log(`[uploadStore] Merged ${added} cloud image(s) into Image Panel`);
        return added;
    } catch (err) {
        console.warn('[uploadStore] fetchCloudUploads failed:', err);
        return 0;
    }
}

