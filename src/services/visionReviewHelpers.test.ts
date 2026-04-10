// ─────────────────────────────────────────────────
// visionReviewHelpers — Pure Logic Tests (no API calls)
// ─────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { buildReviewPrompt, applyFix, saveCanvasState, restoreCanvasState, type ElementInfo } from './visionReviewHelpers';

describe('buildReviewPrompt — Prompt Construction', () => {
    const elements: ElementInfo[] = [
        { name: 'Background', type: 'rect', x: 0, y: 0, w: 300, h: 250 },
        { name: 'Headline', type: 'text', x: 20, y: 30, w: 260, h: 40 },
        { name: 'CTA', type: 'text', x: 100, y: 200, w: 100, h: 36 },
    ];

    it('includes canvas dimensions', () => {
        const prompt = buildReviewPrompt(300, 250, elements);
        expect(prompt).toContain('300x250');
    });

    it('lists all elements with positions', () => {
        const prompt = buildReviewPrompt(300, 250, elements);
        expect(prompt).toContain('"Background"');
        expect(prompt).toContain('"Headline"');
        expect(prompt).toContain('"CTA"');
        expect(prompt).toContain('at (20, 30)');
    });

    it('classifies small canvas (<100K area)', () => {
        const prompt = buildReviewPrompt(300, 250, elements);
        expect(prompt).toContain('SMALL banner');
    });

    it('classifies large canvas', () => {
        const prompt = buildReviewPrompt(1080, 1080, elements);
        expect(prompt).toContain('large banner');
    });

    it('medium canvas classification', () => {
        const prompt = buildReviewPrompt(728, 250, elements);
        expect(prompt).toContain('medium banner');
    });

    it('includes scoring rules', () => {
        const prompt = buildReviewPrompt(300, 250, elements);
        expect(prompt).toContain('score');
        expect(prompt).toContain('issues');
        expect(prompt).toContain('fixes');
    });

    it('includes canvas bounds for clipping check', () => {
        const prompt = buildReviewPrompt(728, 90, elements);
        expect(prompt).toContain('728');
        expect(prompt).toContain('90');
    });

    it('returns a non-empty string', () => {
        const prompt = buildReviewPrompt(300, 250, []);
        expect(prompt.length).toBeGreaterThan(100);
    });
});

describe('applyFix — Engine Patching', () => {
    function mockEngine(nodes?: any[]) {
        const positions: Record<number, { x: number; y: number }> = {};
        const sizes: Record<number, { w: number; h: number }> = {};
        return {
            find_by_name: vi.fn((name: string) => {
                const n = (nodes ?? []).find(n => n.name === name);
                return n?.id ?? null;
            }),
            get_all_nodes: vi.fn(() => JSON.stringify(nodes ?? [])),
            set_position: vi.fn((id: number, x: number, y: number) => { positions[id] = { x, y }; }),
            set_size: vi.fn((id: number, w: number, h: number) => { sizes[id] = { w, h }; }),
            set_font_size: vi.fn(),
            set_fill_hex: vi.fn(),
            _positions: positions,
            _sizes: sizes,
        };
    }

    it('returns false for unknown element', () => {
        const engine = mockEngine([]);
        const result = applyFix(engine, { elementName: 'nonexistent' }, 300, 250);
        expect(result).toBe(false);
    });

    it('applies position fix', () => {
        const engine = mockEngine([{ id: 1, name: 'Headline', x: 0, y: 0, w: 200, h: 40 }]);
        const result = applyFix(engine, { elementName: 'Headline', x: 50, y: 30 }, 300, 250);
        expect(result).toBe(true);
        expect(engine.set_position).toHaveBeenCalledWith(1, 50, 30);
    });

    it('clamps position to canvas bounds', () => {
        const engine = mockEngine([{ id: 1, name: 'CTA', x: 0, y: 0, w: 100, h: 36 }]);
        applyFix(engine, { elementName: 'CTA', x: 500, y: 400 }, 300, 250);
        // x should be clamped to canvasW - 10 = 290
        expect(engine.set_position).toHaveBeenCalledWith(1, 290, 240);
    });

    it('applies size fix', () => {
        const engine = mockEngine([{ id: 1, name: 'BG', x: 0, y: 0, w: 100, h: 100 }]);
        applyFix(engine, { elementName: 'BG', w: 300, h: 250 }, 300, 250);
        expect(engine.set_size).toHaveBeenCalledWith(1, 300, 250);
    });

    it('clamps size to canvas dimensions', () => {
        const engine = mockEngine([{ id: 1, name: 'BG', x: 0, y: 0, w: 100, h: 100 }]);
        applyFix(engine, { elementName: 'BG', w: 5000, h: 3000 }, 300, 250);
        expect(engine.set_size).toHaveBeenCalledWith(1, 300, 250);
    });

    it('applies font size fix', () => {
        const engine = mockEngine([{ id: 2, name: 'Text', x: 0, y: 0, w: 200, h: 30 }]);
        applyFix(engine, { elementName: 'Text', fontSize: 20 }, 300, 250);
        expect(engine.set_font_size).toHaveBeenCalledWith(2, 20);
    });

    it('clamps font size to min 8', () => {
        const engine = mockEngine([{ id: 2, name: 'Text', x: 0, y: 0, w: 200, h: 30 }]);
        applyFix(engine, { elementName: 'Text', fontSize: 3 }, 300, 250);
        expect(engine.set_font_size).toHaveBeenCalledWith(2, 8);
    });

    it('clamps font size to max 80', () => {
        const engine = mockEngine([{ id: 2, name: 'Text', x: 0, y: 0, w: 200, h: 30 }]);
        applyFix(engine, { elementName: 'Text', fontSize: 200 }, 300, 250);
        expect(engine.set_font_size).toHaveBeenCalledWith(2, 80);
    });

    it('applies fill color fix', () => {
        const engine = mockEngine([{ id: 3, name: 'Button', x: 0, y: 0, w: 100, h: 36 }]);
        applyFix(engine, { elementName: 'Button', fill: '#FF0000' }, 300, 250);
        expect(engine.set_fill_hex).toHaveBeenCalledWith(3, '#FF0000');
    });
});

describe('saveCanvasState / restoreCanvasState', () => {
    it('saveCanvasState returns engine node state', () => {
        const engine = { get_all_nodes: vi.fn(() => '[{"id":1,"x":0,"y":0}]') };
        const state = saveCanvasState(engine);
        expect(state).toBe('[{"id":1,"x":0,"y":0}]');
    });

    it('saveCanvasState returns null on engine error', () => {
        const engine = { get_all_nodes: vi.fn(() => { throw new Error('crash'); }) };
        const state = saveCanvasState(engine);
        expect(state).toBeNull();
    });

    it('restoreCanvasState calls set_position on each node', () => {
        const engine = { set_position: vi.fn(), set_size: vi.fn(), set_font_size: vi.fn() };
        const snapshot = JSON.stringify([
            { id: 1, x: 10, y: 20, w: 100, h: 50 },
            { id: 2, x: 30, y: 40, w: 200, h: 60, fontSize: 24 },
        ]);
        restoreCanvasState(engine, snapshot);
        expect(engine.set_position).toHaveBeenCalledWith(1, 10, 20);
        expect(engine.set_position).toHaveBeenCalledWith(2, 30, 40);
        expect(engine.set_size).toHaveBeenCalledWith(1, 100, 50);
        expect(engine.set_font_size).toHaveBeenCalledWith(2, 24);
    });

    it('restoreCanvasState handles invalid JSON gracefully', () => {
        const engine = { set_position: vi.fn() };
        // Should not throw
        expect(() => restoreCanvasState(engine, 'invalid json')).not.toThrow();
    });
});
