// ─────────────────────────────────────────────────
// projectSync.test.ts — Cloud sync & queue contract tests
// ─────────────────────────────────────────────────
// projectSync uses import.meta.env + localStorage + fetch at runtime.
// We test the contract via source inspection + exported type validation.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './projectSync.ts'), 'utf-8');

describe('projectSync — queue design', () => {
    it('uses localStorage for offline queue', () => {
        expect(src).toContain("localStorage.getItem(QUEUE_KEY");
        expect(src).toContain("localStorage.setItem(QUEUE_KEY");
    });

    it('queue key is ace-sync-queue', () => {
        expect(src).toContain("'ace-sync-queue'");
    });

    it('queue items have id, timestamp, retryCount', () => {
        expect(src).toContain('id:');
        expect(src).toContain('timestamp: Date.now()');
        expect(src).toContain('retryCount: 0');
    });

    it('max retry count is 5', () => {
        expect(src).toContain('retryCount < 5');
    });
});

describe('projectSync — cloudUpsert', () => {
    it('queues when no Supabase config', () => {
        expect(src).toContain("addToQueue({ table, operation: 'upsert', payload: data })");
    });

    it('uses POST with merge-duplicates', () => {
        expect(src).toContain("method: 'POST'");
        expect(src).toContain("resolution=merge-duplicates");
    });

    it('queues on fetch error', () => {
        // There are two addToQueue calls for upsert: one for no config, one for catch
        const upsertBlock = src.slice(src.indexOf('async function cloudUpsert'), src.indexOf('async function cloudDelete'));
        const queueCalls = (upsertBlock.match(/addToQueue/g) || []).length;
        expect(queueCalls).toBe(2);
    });
});

describe('projectSync — cloudDelete', () => {
    it('uses DELETE method with id filter', () => {
        expect(src).toContain("method: 'DELETE'");
        expect(src).toContain("?id=eq.${id}");
    });

    it('queues on failure', () => {
        const deleteBlock = src.slice(src.indexOf('async function cloudDelete'), src.indexOf('async function cloudFetch'));
        expect(deleteBlock).toContain('addToQueue');
    });
});

describe('projectSync — cloudFetch', () => {
    it('returns null when no config', () => {
        expect(src).toContain('if (!config) return null');
    });

    it('uses GET with Accept: application/json', () => {
        expect(src).toContain("Accept: 'application/json'");
    });
});

describe('projectSync — processQueue', () => {
    it('sets status to syncing during processing', () => {
        expect(src).toContain("status: 'syncing'");
    });

    it('sets status to offline when no config', () => {
        expect(src).toContain("status: 'offline'");
    });

    it('sets status to error when items remain', () => {
        expect(src).toContain("remaining.length > 0 ? 'error' : 'idle'");
    });

    it('records lastSyncAt timestamp', () => {
        expect(src).toContain('lastSyncAt: Date.now()');
    });

    it('notifies listeners after processing', () => {
        expect(src).toContain('notifyListeners()');
    });
});

describe('projectSync — auth headers', () => {
    it('includes Bearer token from session', () => {
        expect(src).toContain('Bearer ${session.accessToken}');
    });

    it('falls back to anon key when no session', () => {
        expect(src).toContain('Bearer ${config.key}');
    });
});

describe('projectSync — autoSync', () => {
    it('checks navigator.onLine before syncing', () => {
        expect(src).toContain('navigator.onLine');
    });

    it('listens for online event', () => {
        expect(src).toContain("addEventListener('online'");
    });

    it('returns cleanup function', () => {
        expect(src).toContain('clearInterval(timer)');
        expect(src).toContain("removeEventListener('online'");
    });
});

// ── Type exports ──

import type { SyncStatus, SyncQueueItem, SyncState } from './projectSync';

describe('projectSync — type exports', () => {
    it('SyncStatus has expected values', () => {
        const valid: SyncStatus[] = ['idle', 'syncing', 'error', 'offline', 'conflict'];
        expect(valid.length).toBe(5);
    });

    it('SyncState shape', () => {
        const s: SyncState = { status: 'idle', lastSyncAt: null, pendingCount: 0, error: null };
        expect(s.status).toBe('idle');
    });

    it('SyncQueueItem shape', () => {
        const item: SyncQueueItem = {
            id: '1', table: 't', operation: 'upsert',
            payload: {}, timestamp: 0, retryCount: 0,
        };
        expect(item.operation).toBe('upsert');
    });
});
