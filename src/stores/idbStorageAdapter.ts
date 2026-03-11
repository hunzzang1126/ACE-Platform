// ─────────────────────────────────────────────────
// idbStorageAdapter — Zustand persist adapter for IndexedDB
// ─────────────────────────────────────────────────
// Drop-in replacement for Zustand's default localStorage adapter.
// Uses aceDB.kvStore (Dexie/IndexedDB) for unlimited storage.
//
// Usage:
//   persist(stateCreator, {
//     name: 'ace-design-store',
//     storage: idbStorage,  // ← replaces default localStorage
//   })
// ─────────────────────────────────────────────────

import type { StateStorage } from 'zustand/middleware';
import { aceDB } from './aceDB';

/**
 * Zustand-compatible StateStorage backed by IndexedDB via Dexie.
 * Zustand's persist middleware supports async getItem/setItem/removeItem.
 */
export const idbStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        try {
            const entry = await aceDB.kvStore.get(name);
            return entry?.value ?? null;
        } catch (err) {
            console.warn('[idbStorage] getItem failed, falling back to localStorage:', err);
            return localStorage.getItem(name);
        }
    },

    setItem: async (name: string, value: string): Promise<void> => {
        try {
            await aceDB.kvStore.put({
                key: name,
                value,
                updatedAt: Date.now(),
            });
        } catch (err) {
            console.warn('[idbStorage] setItem failed, falling back to localStorage:', err);
            try {
                localStorage.setItem(name, value);
            } catch {
                // Both failed — data won't persist this cycle
                console.error('[idbStorage] Both IndexedDB and localStorage failed for:', name);
            }
        }
    },

    removeItem: async (name: string): Promise<void> => {
        try {
            await aceDB.kvStore.delete(name);
        } catch (err) {
            console.warn('[idbStorage] removeItem failed:', err);
        }
        // Also clean localStorage (migration cleanup)
        try {
            localStorage.removeItem(name);
        } catch {
            // ok
        }
    },
};
