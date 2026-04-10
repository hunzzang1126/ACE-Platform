// ─────────────────────────────────────────────────
// resilientImport.test.ts — Auto-retry dynamic imports
// ─────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resilientImport } from './resilientImport';

describe('resilientImport', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns module on successful import', async () => {
        const mod = { foo: 'bar' };
        const result = await resilientImport(() => Promise.resolve(mod));
        expect(result).toBe(mod);
    });

    it('re-throws non-chunk errors immediately', async () => {
        await expect(
            resilientImport(() => Promise.reject(new Error('syntax error')))
        ).rejects.toThrow('syntax error');
    });

    it('retries on chunk error and succeeds on second attempt', async () => {
        let attempts = 0;
        const mod = { foo: 'bar' };
        const result = await resilientImport(() => {
            attempts++;
            if (attempts === 1) throw new Error('Failed to fetch dynamically imported module');
            return Promise.resolve(mod);
        });
        expect(result).toBe(mod);
        expect(attempts).toBe(2);
    });

    it('re-throws non-Error values', async () => {
        await expect(
            resilientImport(() => Promise.reject('string error'))
        ).rejects.toBe('string error');
    });

    it('throws user-friendly error when all retries and reload exhausted', async () => {
        // Simulate "already reloaded recently" scenario
        const mockStorage = new Map<string, string>();
        mockStorage.set('ace-chunk-reload', String(Date.now()));
        vi.stubGlobal('sessionStorage', {
            getItem: (k: string) => mockStorage.get(k) ?? null,
            setItem: (k: string, v: string) => mockStorage.set(k, v),
        });

        await expect(
            resilientImport(() => {
                throw new Error('Failed to fetch dynamically imported module');
            }, 0)
        ).rejects.toThrow('The app needs to update');

        vi.unstubAllGlobals();
    });

    it('recognizes various chunk error messages', async () => {
        const chunkErrors = [
            'Failed to fetch dynamically imported module',
            'Loading chunk 123 failed',
            'Loading CSS chunk abc failed',
            'Importing a module script failed',
        ];

        for (const msg of chunkErrors) {
            let retried = false;
            const mod = { ok: true };
            const result = await resilientImport(() => {
                if (!retried) {
                    retried = true;
                    throw new Error(msg);
                }
                return Promise.resolve(mod);
            });
            expect(result).toBe(mod);
        }
    });
});
