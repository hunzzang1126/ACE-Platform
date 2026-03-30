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
}

export interface UploadState {
    uploads: UploadEntry[];
    addUpload: (entry: UploadEntry) => void;
    removeUpload: (id: string) => void;
    clearAll: () => void;
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
        }),
        {
            name: 'ace-upload-library',
            storage: createJSONStorage(() => idbStorage),
        },
    ),
);

// ── Helpers ──

/**
 * Save a data URL to IndexedDB assets AND register in upload library.
 * Returns the idb:// reference.
 */
export async function saveToUploadLibrary(
    dataUrl: string,
    name: string,
    width: number,
    height: number,
    source: 'user' | 'ai',
): Promise<string> {
    const idbRef = await storeAsset(dataUrl);

    // Extract hash from idb:// ref for unique ID
    const id = idbRef.startsWith('idb://') ? idbRef.slice(6) : crypto.randomUUID();

    useUploadStore.getState().addUpload({
        id,
        name,
        idbRef,
        width,
        height,
        source,
        createdAt: new Date().toISOString(),
    });

    return idbRef;
}
