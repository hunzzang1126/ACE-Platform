// ─────────────────────────────────────────────────
// aiServiceTypes.test.ts — Config & helper tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
});

import { loadConfig, saveConfig, sleep, humanizeToolStep } from './aiServiceTypes';

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe('loadConfig', () => {
    it('returns default config when nothing saved', () => {
        const c = loadConfig();
        expect(c.maxToolRounds).toBeGreaterThan(0);
    });

    it('loads saved config from localStorage', () => {
        store['ace-ai-config'] = JSON.stringify({ model: 'test-model', maxToolRounds: 5 });
        const c = loadConfig();
        expect(c.model).toBe('test-model');
    });

    it('handles corrupted localStorage gracefully', () => {
        store['ace-ai-config'] = 'NOT-JSON';
        const c = loadConfig();
        expect(c.maxToolRounds).toBeGreaterThan(0); // defaults
    });
});

describe('saveConfig', () => {
    it('persists to localStorage', () => {
        const cfg = loadConfig();
        cfg.model = 'custom-model';
        saveConfig(cfg);
        expect(store['ace-ai-config']).toContain('custom-model');
    });
});

describe('sleep', () => {
    it('resolves after delay', async () => {
        const start = Date.now();
        await sleep(10);
        expect(Date.now() - start).toBeGreaterThanOrEqual(5);
    });
});

describe('humanizeToolStep', () => {
    it('formats add_rect', () => {
        const s = humanizeToolStep('add_rect', { x: 10, y: 20, w: 100, h: 50 });
        expect(typeof s).toBe('string');
        expect(s.length).toBeGreaterThan(0);
    });

    it('formats add_text', () => {
        const s = humanizeToolStep('add_text', { content: 'Hello World' });
        expect(typeof s).toBe('string');
    });

    it('formats unknown tools', () => {
        const s = humanizeToolStep('some_custom_tool', { key: 'val' });
        expect(typeof s).toBe('string');
    });
});
