// ─────────────────────────────────────────────────
// aceDB — Central IndexedDB database for ACE platform
// ─────────────────────────────────────────────────
// Replaces localStorage as the persistence layer for all stores.
// Uses Dexie.js for clean IndexedDB API with versioning support.
// No size limits (GB-scale), async I/O, structured data.
// ─────────────────────────────────────────────────

import Dexie, { type EntityTable } from 'dexie';

// ── Key-value store for Zustand persist adapter ──
export interface KVEntry {
    key: string;       // store name (e.g. 'ace-design-store')
    value: string;     // JSON string of store state
    updatedAt: number; // timestamp
}

// ── Binary asset store (images, videos) ──
export interface AssetEntry {
    id: string;            // element ID or content hash
    buffer: ArrayBuffer;
    mimeType: string;
    savedAt: number;
}

// ── Database definition ──

class AceDatabase extends Dexie {
    kvStore!: EntityTable<KVEntry, 'key'>;
    assets!: EntityTable<AssetEntry, 'id'>;

    constructor() {
        super('ace-platform');

        this.version(1).stores({
            // key-value store for all Zustand persist data
            kvStore: 'key',
            // binary assets (images, videos) — replaces videoStorage.ts
            assets: 'id',
        });
    }
}

// ── Singleton instance ──
export const aceDB = new AceDatabase();

// ── Asset helpers (replaces videoStorage.ts) ──

/** Save a binary asset (image/video) to IndexedDB */
export async function saveAsset(id: string, blob: Blob): Promise<void> {
    const buffer = await blob.arrayBuffer();
    await aceDB.assets.put({
        id,
        buffer,
        mimeType: blob.type,
        savedAt: Date.now(),
    });
}

/** Load a binary asset from IndexedDB and return a fresh blob URL */
export async function loadAsset(id: string): Promise<string | null> {
    const entry = await aceDB.assets.get(id);
    if (!entry) return null;
    const blob = new Blob([entry.buffer], { type: entry.mimeType });
    return URL.createObjectURL(blob);
}

/** Delete an asset from IndexedDB */
export async function deleteAsset(id: string): Promise<void> {
    await aceDB.assets.delete(id);
}

/** Check if an asset exists in IndexedDB */
export async function hasAsset(id: string): Promise<boolean> {
    return (await aceDB.assets.get(id)) !== undefined;
}
