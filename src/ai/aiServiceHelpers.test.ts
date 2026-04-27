// ─────────────────────────────────────────────────
// aiServiceHelpers.test.ts — Canvas inspection + memory
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { getCanvasElementCount, getCanvasElementNames } from './aiServiceHelpers';

describe('aiServiceHelpers', () => {
    describe('getCanvasElementCount', () => {
        it('returns count from engine.get_all_nodes()', () => {
            const engine = {
                get_all_nodes: () => JSON.stringify([
                    { name: 'bg' }, { name: 'headline' }, { name: 'cta' },
                ]),
            };
            expect(getCanvasElementCount(engine)).toBe(3);
        });

        it('returns 0 for null engine', () => {
            expect(getCanvasElementCount(null)).toBe(0);
        });

        it('returns 0 for engine without get_all_nodes', () => {
            expect(getCanvasElementCount({})).toBe(0);
        });

        it('returns 0 for invalid JSON', () => {
            const engine = { get_all_nodes: () => 'not json' };
            expect(getCanvasElementCount(engine)).toBe(0);
        });

        it('returns 0 for non-array result', () => {
            const engine = { get_all_nodes: () => JSON.stringify({ count: 5 }) };
            expect(getCanvasElementCount(engine)).toBe(0);
        });

        it('returns 0 for empty array', () => {
            const engine = { get_all_nodes: () => '[]' };
            expect(getCanvasElementCount(engine)).toBe(0);
        });

        it('handles engine throwing', () => {
            const engine = { get_all_nodes: () => { throw new Error('crash'); } };
            expect(getCanvasElementCount(engine)).toBe(0);
        });
    });

    describe('getCanvasElementNames', () => {
        it('returns names from engine nodes', () => {
            const engine = {
                get_all_nodes: () => JSON.stringify([
                    { name: 'background' }, { name: 'headline' }, { name: '' }, { name: 'cta_button' },
                ]),
            };
            const names = getCanvasElementNames(engine);
            expect(names).toEqual(['background', 'headline', 'cta_button']);
        });

        it('filters out empty names', () => {
            const engine = {
                get_all_nodes: () => JSON.stringify([
                    { name: '' }, { name: null }, {},
                ]),
            };
            expect(getCanvasElementNames(engine)).toEqual([]);
        });

        it('returns empty array for null engine', () => {
            expect(getCanvasElementNames(null)).toEqual([]);
        });

        it('returns empty array for engine without get_all_nodes', () => {
            expect(getCanvasElementNames({})).toEqual([]);
        });

        it('returns empty array on parse error', () => {
            const engine = { get_all_nodes: () => 'broken' };
            expect(getCanvasElementNames(engine)).toEqual([]);
        });

        it('handles engine throwing', () => {
            const engine = { get_all_nodes: () => { throw new Error('crash'); } };
            expect(getCanvasElementNames(engine)).toEqual([]);
        });
    });
});
