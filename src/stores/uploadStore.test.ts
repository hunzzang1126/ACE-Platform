// ─────────────────────────────────────────────────
// uploadStore.test.ts — Upload Library Tests
// ─────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { useUploadStore, type UploadEntry } from '@/stores/uploadStore';

function makeEntry(overrides: Partial<UploadEntry> = {}): UploadEntry {
    const id = overrides.id ?? crypto.randomUUID();
    return {
        id,
        name: `test-image-${id.slice(0, 6)}`,
        idbRef: overrides.idbRef ?? `idb://${id}`,
        width: 300,
        height: 250,
        source: 'user',
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

describe('uploadStore', () => {
    beforeEach(() => {
        useUploadStore.setState({ uploads: [] });
    });

    it('starts with empty uploads', () => {
        expect(useUploadStore.getState().uploads).toHaveLength(0);
    });

    it('adds an upload entry', () => {
        const entry = makeEntry();
        useUploadStore.getState().addUpload(entry);
        expect(useUploadStore.getState().uploads).toHaveLength(1);
        expect(useUploadStore.getState().uploads[0]!.id).toBe(entry.id);
    });

    it('prepends new entries (newest first)', () => {
        const first = makeEntry({ name: 'first' });
        const second = makeEntry({ name: 'second' });
        useUploadStore.getState().addUpload(first);
        useUploadStore.getState().addUpload(second);
        const uploads = useUploadStore.getState().uploads;
        expect(uploads[0]!.name).toBe('second');
        expect(uploads[1]!.name).toBe('first');
    });

    it('deduplicates by idbRef', () => {
        const entry = makeEntry({ idbRef: 'idb://samehash' });
        useUploadStore.getState().addUpload(entry);
        useUploadStore.getState().addUpload({ ...entry, id: 'different-id' });
        expect(useUploadStore.getState().uploads).toHaveLength(1);
    });

    it('respects max limit (100)', () => {
        for (let i = 0; i < 105; i++) {
            useUploadStore.getState().addUpload(makeEntry());
        }
        expect(useUploadStore.getState().uploads.length).toBeLessThanOrEqual(100);
    });

    it('removes an upload by id', () => {
        const entry = makeEntry();
        useUploadStore.getState().addUpload(entry);
        expect(useUploadStore.getState().uploads).toHaveLength(1);
        useUploadStore.getState().removeUpload(entry.id);
        expect(useUploadStore.getState().uploads).toHaveLength(0);
    });

    it('clearAll removes everything', () => {
        useUploadStore.getState().addUpload(makeEntry());
        useUploadStore.getState().addUpload(makeEntry());
        useUploadStore.getState().addUpload(makeEntry());
        expect(useUploadStore.getState().uploads).toHaveLength(3);
        useUploadStore.getState().clearAll();
        expect(useUploadStore.getState().uploads).toHaveLength(0);
    });

    it('stores AI source correctly', () => {
        const entry = makeEntry({ source: 'ai', name: 'AI Background' });
        useUploadStore.getState().addUpload(entry);
        expect(useUploadStore.getState().uploads[0]!.source).toBe('ai');
    });

    it('stores user source correctly', () => {
        const entry = makeEntry({ source: 'user' });
        useUploadStore.getState().addUpload(entry);
        expect(useUploadStore.getState().uploads[0]!.source).toBe('user');
    });

    it('preserves width and height', () => {
        const entry = makeEntry({ width: 1920, height: 1080 });
        useUploadStore.getState().addUpload(entry);
        const stored = useUploadStore.getState().uploads[0]!;
        expect(stored.width).toBe(1920);
        expect(stored.height).toBe(1080);
    });
});

// ═══════════════════════════════════════════════════
// ★ REGRESSION GUARD: AI flow registers uploads
// ═══════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('★ REGRESSION GUARD: AI images saved to upload library', () => {
    it('agentGenerateFlow.ts imports saveToUploadLibrary', () => {
        const src = readFileSync(resolve(__dirname, '../hooks/agentGenerateFlow.ts'), 'utf-8');
        expect(src).toContain('saveToUploadLibrary');
    });

    it('saveToUploadLibrary function exists and is exported', async () => {
        const mod = await import('@/stores/uploadStore');
        expect(typeof mod.saveToUploadLibrary).toBe('function');
    });
});
