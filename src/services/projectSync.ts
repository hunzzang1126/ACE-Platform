// ─────────────────────────────────────────────────
// projectSync — Bidirectional localStorage ↔ Cloud sync
// ─────────────────────────────────────────────────
// Offline-first: always works locally, queues changes,
// syncs to Supabase when online. Last-write-wins conflict.
// ─────────────────────────────────────────────────

import { useAuthStore } from '@/stores/authStore';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'conflict';

export interface SyncQueueItem {
    id: string;
    table: string;
    operation: 'upsert' | 'delete';
    payload: Record<string, unknown>;
    timestamp: number;
    retryCount: number;
}

export interface SyncState {
    status: SyncStatus;
    lastSyncAt: number | null;
    pendingCount: number;
    error: string | null;
}

// ── Queue (persisted to localStorage) ──

const QUEUE_KEY = 'ace-sync-queue';

function getQueue(): SyncQueueItem[] {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    } catch {
        return [];
    }
}

function setQueue(queue: SyncQueueItem[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): void {
    const queue = getQueue();
    queue.push({
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        retryCount: 0,
    });
    setQueue(queue);
}

// ── Supabase API helpers ──

function getSupabaseConfig(): { url: string; key: string } | null {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return { url, key };
}

function getAuthHeaders(): Record<string, string> {
    const session = useAuthStore.getState().session;
    const config = getSupabaseConfig();
    if (!config) return {};
    return {
        'Content-Type': 'application/json',
        apikey: config.key,
        Authorization: session ? `Bearer ${session.accessToken}` : `Bearer ${config.key}`,
        Prefer: 'return=minimal',
    };
}

// ── CRUD operations ──

export async function cloudUpsert(table: string, data: Record<string, unknown>): Promise<boolean> {
    const config = getSupabaseConfig();
    if (!config) {
        addToQueue({ table, operation: 'upsert', payload: data });
        return false; // offline
    }

    try {
        const res = await fetch(`${config.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify(data),
        });
        return res.ok;
    } catch {
        addToQueue({ table, operation: 'upsert', payload: data });
        return false;
    }
}

export async function cloudDelete(table: string, id: string): Promise<boolean> {
    const config = getSupabaseConfig();
    if (!config) {
        addToQueue({ table, operation: 'delete', payload: { id } });
        return false;
    }

    try {
        const res = await fetch(`${config.url}/rest/v1/${table}?id=eq.${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        return res.ok;
    } catch {
        addToQueue({ table, operation: 'delete', payload: { id } });
        return false;
    }
}

export async function cloudFetch<T>(table: string, query = ''): Promise<T[] | null> {
    const config = getSupabaseConfig();
    if (!config) return null;

    try {
        const res = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
            headers: { ...getAuthHeaders(), Accept: 'application/json' },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// ── Sync engine ──

let syncState: SyncState = {
    status: 'idle',
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
};

const listeners = new Set<(state: SyncState) => void>();

function notifyListeners(): void {
    for (const fn of listeners) fn({ ...syncState });
}

export function onSyncStateChange(fn: (state: SyncState) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function getSyncState(): SyncState {
    return { ...syncState };
}

/**
 * Process the sync queue — push all pending changes to cloud.
 */
export async function processQueue(): Promise<number> {
    const config = getSupabaseConfig();
    if (!config) {
        syncState = { ...syncState, status: 'offline', pendingCount: getQueue().length };
        notifyListeners();
        return 0;
    }

    const queue = getQueue();
    if (queue.length === 0) {
        syncState = { ...syncState, status: 'idle', pendingCount: 0 };
        notifyListeners();
        return 0;
    }

    syncState = { ...syncState, status: 'syncing', pendingCount: queue.length };
    notifyListeners();

    let processed = 0;
    const remaining: SyncQueueItem[] = [];

    for (const item of queue) {
        try {
            let success = false;
            if (item.operation === 'upsert') {
                const res = await fetch(`${config.url}/rest/v1/${item.table}`, {
                    method: 'POST',
                    headers: { ...getAuthHeaders(), Prefer: 'resolution=merge-duplicates' },
                    body: JSON.stringify(item.payload),
                });
                success = res.ok;
            } else if (item.operation === 'delete') {
                const id = item.payload.id as string;
                const res = await fetch(`${config.url}/rest/v1/${item.table}?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders(),
                });
                success = res.ok;
            }

            if (success) {
                processed++;
            } else {
                item.retryCount++;
                if (item.retryCount < 5) remaining.push(item);
            }
        } catch {
            item.retryCount++;
            if (item.retryCount < 5) remaining.push(item);
        }
    }

    setQueue(remaining);

    syncState = {
        status: remaining.length > 0 ? 'error' : 'idle',
        lastSyncAt: Date.now(),
        pendingCount: remaining.length,
        error: remaining.length > 0 ? `${remaining.length} items failed to sync` : null,
    };
    notifyListeners();

    return processed;
}

/**
 * Start auto-sync interval (every 30s when online).
 */
export function startAutoSync(intervalMs = 30000): () => void {
    const timer = setInterval(() => {
        if (navigator.onLine) processQueue();
    }, intervalMs);

    // Also sync on coming back online
    const onOnline = () => processQueue();
    window.addEventListener('online', onOnline);

    return () => {
        clearInterval(timer);
        window.removeEventListener('online', onOnline);
    };
}
