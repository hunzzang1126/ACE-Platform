// ─────────────────────────────────────────────────
// videoStorage – IndexedDB-based video blob persistence
// ─────────────────────────────────────────────────
// Video files are too large for localStorage. We store them in IndexedDB
// as ArrayBuffer and regenerate blob URLs on demand.

const DB_NAME = 'ace-video-store';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/** Save a video File/Blob to IndexedDB by element ID */
export async function saveVideoBlob(elementId: string, blob: Blob): Promise<void> {
    const db = await openDB();
    const buffer = await blob.arrayBuffer();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(
            { buffer, type: blob.type, savedAt: Date.now() },
            elementId,
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Load a video from IndexedDB and return a fresh blob URL */
export async function loadVideoBlob(elementId: string): Promise<string | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(elementId);
        req.onsuccess = () => {
            const data = req.result as { buffer: ArrayBuffer; type: string } | undefined;
            if (!data) { resolve(null); return; }
            const blob = new Blob([data.buffer], { type: data.type });
            const url = URL.createObjectURL(blob);
            resolve(url);
        };
        req.onerror = () => reject(req.error);
    });
}

/** Delete a video from IndexedDB */
export async function deleteVideoBlob(elementId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(elementId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Check if a video exists in IndexedDB */
export async function hasVideoBlob(elementId: string): Promise<boolean> {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).count(IDBKeyRange.only(elementId));
        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => resolve(false);
    });
}
