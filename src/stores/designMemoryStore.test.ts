// ─────────────────────────────────────────────────
// designMemoryStore — Unit Tests
// ─────────────────────────────────────────────────
// Tests for the few-shot design memory bank.

import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignMemoryStore, buildFewShotExamples } from './designMemoryStore';
import type { DesignMemoryEntry } from './designMemoryStore';

beforeEach(() => {
    useDesignMemoryStore.setState({ entries: [] });
});

// ── addEntry ──

describe('designMemoryStore — addEntry', () => {
    it('adds an entry with auto-generated id and timestamp', () => {
        useDesignMemoryStore.getState().addEntry({
            prompt: 'tech product launch',
            elements: [],
            canvasW: 1080,
            canvasH: 1080,
            rating: 5,
            personality: 'bold',
        });
        const entries = useDesignMemoryStore.getState().entries;
        expect(entries).toHaveLength(1);
        expect(entries[0]!.id).toMatch(/^mem_/);
        expect(entries[0]!.timestamp).toBeGreaterThan(0);
    });

    it('keeps entries sorted by rating (descending)', () => {
        const { addEntry } = useDesignMemoryStore.getState();
        addEntry({ prompt: 'low', elements: [], canvasW: 300, canvasH: 250, rating: 2, personality: 'a' });
        addEntry({ prompt: 'high', elements: [], canvasW: 300, canvasH: 250, rating: 5, personality: 'b' });
        addEntry({ prompt: 'mid', elements: [], canvasW: 300, canvasH: 250, rating: 3, personality: 'c' });

        const entries = useDesignMemoryStore.getState().entries;
        expect(entries[0]!.rating).toBe(5);
        expect(entries[1]!.rating).toBe(3);
        expect(entries[2]!.rating).toBe(2);
    });

    it('caps at MAX_MEMORY (20) entries', () => {
        const { addEntry } = useDesignMemoryStore.getState();
        for (let i = 0; i < 25; i++) {
            addEntry({ prompt: `p${i}`, elements: [], canvasW: 300, canvasH: 250, rating: i % 5 + 1, personality: 'x' });
        }
        expect(useDesignMemoryStore.getState().entries.length).toBeLessThanOrEqual(20);
    });
});

// ── rateEntry ──

describe('designMemoryStore — rateEntry', () => {
    it('updates rating for existing entry', () => {
        useDesignMemoryStore.getState().addEntry({
            prompt: 'test', elements: [], canvasW: 300, canvasH: 250, rating: 3, personality: 'x',
        });
        const entryId = useDesignMemoryStore.getState().entries[0]!.id;

        useDesignMemoryStore.getState().rateEntry(entryId, 5);
        expect(useDesignMemoryStore.getState().entries[0]!.rating).toBe(5);
    });

    it('re-sorts after rating change', () => {
        const { addEntry } = useDesignMemoryStore.getState();
        addEntry({ prompt: 'a', elements: [], canvasW: 300, canvasH: 250, rating: 5, personality: 'x' });
        addEntry({ prompt: 'b', elements: [], canvasW: 300, canvasH: 250, rating: 1, personality: 'x' });

        const lowId = useDesignMemoryStore.getState().entries[1]!.id;
        useDesignMemoryStore.getState().rateEntry(lowId, 5);

        // Both are 5 now — order is stable but rating should be correct
        const entries = useDesignMemoryStore.getState().entries;
        expect(entries.every(e => e.rating === 5)).toBe(true);
    });
});

// ── getTopExamples ──

describe('designMemoryStore — getTopExamples', () => {
    it('returns only high-rated entries (>= 4)', () => {
        const { addEntry } = useDesignMemoryStore.getState();
        addEntry({ prompt: 'bad', elements: [], canvasW: 300, canvasH: 250, rating: 2, personality: 'x' });
        addEntry({ prompt: 'good', elements: [], canvasW: 300, canvasH: 250, rating: 5, personality: 'x' });
        addEntry({ prompt: 'ok', elements: [], canvasW: 300, canvasH: 250, rating: 3, personality: 'x' });

        const examples = useDesignMemoryStore.getState().getTopExamples();
        expect(examples).toHaveLength(1);
        expect(examples[0]!.prompt).toBe('good');
    });

    it('limits to n entries', () => {
        const { addEntry } = useDesignMemoryStore.getState();
        for (let i = 0; i < 5; i++) {
            addEntry({ prompt: `p${i}`, elements: [], canvasW: 300, canvasH: 250, rating: 5, personality: 'x' });
        }
        const examples = useDesignMemoryStore.getState().getTopExamples(2);
        expect(examples).toHaveLength(2);
    });

    it('returns empty array when no high-rated entries', () => {
        useDesignMemoryStore.getState().addEntry({
            prompt: 'low', elements: [], canvasW: 300, canvasH: 250, rating: 1, personality: 'x',
        });
        expect(useDesignMemoryStore.getState().getTopExamples()).toHaveLength(0);
    });
});

// ── clearMemory ──

describe('designMemoryStore — clearMemory', () => {
    it('removes all entries', () => {
        useDesignMemoryStore.getState().addEntry({
            prompt: 'test', elements: [], canvasW: 300, canvasH: 250, rating: 5, personality: 'x',
        });
        expect(useDesignMemoryStore.getState().entries).toHaveLength(1);

        useDesignMemoryStore.getState().clearMemory();
        expect(useDesignMemoryStore.getState().entries).toHaveLength(0);
    });
});

// ── buildFewShotExamples ──

describe('buildFewShotExamples', () => {
    it('returns empty string for no entries', () => {
        expect(buildFewShotExamples([])).toBe('');
    });

    it('builds text/gradient summaries for entries', () => {
        const entries: DesignMemoryEntry[] = [{
            id: 'mem_1',
            prompt: 'tech launch',
            elements: [
                { type: 'text', name: 'Headline', content: 'Hello', font_size: 24, font_weight: '700', color_hex: '#fff', x: 0, y: 0, w: 100, h: 30 } as any,
                { type: 'rect', name: 'BG', gradient_start_hex: '#000', gradient_end_hex: '#333', gradient_angle: 135, x: 0, y: 0, w: 300, h: 250 } as any,
            ],
            canvasW: 300,
            canvasH: 250,
            rating: 5,
            personality: 'bold',
            timestamp: Date.now(),
        }];
        const result = buildFewShotExamples(entries);
        expect(result).toContain('Example 1');
        expect(result).toContain('rated 5/5');
        expect(result).toContain('tech launch');
        expect(result).toContain('Headline');
        expect(result).toContain('gradient');
    });

    it('limits to 3 examples max', () => {
        const entries: DesignMemoryEntry[] = Array.from({ length: 5 }, (_, i) => ({
            id: `mem_${i}`,
            prompt: `prompt ${i}`,
            elements: [{ type: 'rect', name: `el_${i}`, x: 0, y: 0, w: 100, h: 100 }] as any,
            canvasW: 300,
            canvasH: 250,
            rating: 5,
            personality: 'x',
            timestamp: Date.now(),
        }));
        const result = buildFewShotExamples(entries);
        expect(result).toContain('Example 1');
        expect(result).toContain('Example 3');
        expect(result).not.toContain('Example 4');
    });
});
