// ─────────────────────────────────────────────────
// fabricSerializer.test.ts — Round-trip fidelity tests
// ─────────────────────────────────────────────────
// Verifies that Fabric JSON → DesignElement[] conversion preserves
// all critical properties without data loss.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { fabricJsonToElements } from './fabricSerializer';

// ── Helper: create mock Fabric JSON ──

function makeFabricJSON(objects: Record<string, unknown>[]): string {
    return JSON.stringify({
        version: '6.0.0',
        objects,
    });
}

describe('fabricJsonToElements', () => {
    it('should return empty array for invalid JSON', () => {
        const result = fabricJsonToElements('not-valid-json', 300, 250);
        expect(result).toEqual([]);
    });

    it('should return empty array for JSON with no objects', () => {
        const json = makeFabricJSON([]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result).toEqual([]);
    });

    it('should skip artboard objects', () => {
        const json = makeFabricJSON([
            { type: 'rect', left: 0, top: 0, width: 300, height: 250, scaleX: 1, scaleY: 1, opacity: 1, fill: '#ffffff', __aceArtboard: true },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result).toEqual([]);
    });

    it('should skip guide objects', () => {
        const json = makeFabricJSON([
            { type: 'rect', left: 50, top: 0, width: 1, height: 250, scaleX: 1, scaleY: 1, opacity: 0.5, fill: '#ff0000', __aceGuide: true },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result).toEqual([]);
    });

    // ── Shape conversion ──

    it('should convert rect to ShapeElement with correct fill', () => {
        const json = makeFabricJSON([
            { type: 'rect', left: 10, top: 20, width: 100, height: 80, scaleX: 1, scaleY: 1, opacity: 0.8, fill: '#FF5733', __aceId: 1, __aceZIndex: 0, __aceName: 'Red Box' },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result).toHaveLength(1);
        const shape = result[0];
        expect(shape.type).toBe('shape');
        expect(shape.name).toBe('Red Box');
        expect(shape.opacity).toBe(0.8);
        expect(shape.zIndex).toBe(0);
        if (shape.type === 'shape') {
            expect(shape.fill).toBe('#FF5733');
            expect(shape.shapeType).toBe('rectangle');
        }
    });

    it('should convert ellipse to ShapeElement with ellipse type', () => {
        const json = makeFabricJSON([
            { type: 'ellipse', left: 50, top: 50, width: 120, height: 80, scaleX: 1, scaleY: 1, opacity: 1, fill: '#00FF00', __aceId: 2, __aceZIndex: 1, __aceName: 'Green Ellipse' },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result).toHaveLength(1);
        if (result[0].type === 'shape') {
            expect(result[0].shapeType).toBe('ellipse');
        }
    });

    it('should preserve gradient data from ACE custom props', () => {
        const json = makeFabricJSON([
            {
                type: 'rect', left: 0, top: 0, width: 300, height: 250, scaleX: 1, scaleY: 1, opacity: 1,
                fill: '#000000', __aceId: 3, __aceZIndex: 0, __aceName: 'Gradient BG',
                __aceGradientStart: '#FF0000', __aceGradientEnd: '#0000FF', __aceGradientAngle: 45,
            },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result).toHaveLength(1);
        if (result[0].type === 'shape') {
            expect(result[0].gradientStart).toBe('#FF0000');
            expect(result[0].gradientEnd).toBe('#0000FF');
            expect(result[0].gradientAngle).toBe(45);
        }
    });

    it('should preserve border radius', () => {
        const json = makeFabricJSON([
            { type: 'rect', left: 10, top: 10, width: 100, height: 50, scaleX: 1, scaleY: 1, opacity: 1, fill: '#333', __aceId: 4, __aceZIndex: 0, rx: 12 },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        if (result[0].type === 'shape') {
            expect(result[0].borderRadius).toBe(12);
        }
    });

    // ── Text conversion ──

    it('should convert textbox to TextElement with all font properties', () => {
        const json = makeFabricJSON([
            {
                type: 'textbox', left: 20, top: 30, width: 200, height: 40, scaleX: 1, scaleY: 1, opacity: 1,
                fill: '#FFFFFF', text: 'Hello World', fontSize: 24, fontFamily: 'Roboto',
                fontWeight: '700', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.2,
                charSpacing: 50, __aceId: 5, __aceZIndex: 2, __aceName: 'Title',
            },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result).toHaveLength(1);
        if (result[0].type === 'text') {
            expect(result[0].content).toBe('Hello World');
            expect(result[0].fontSize).toBe(24);
            expect(result[0].fontFamily).toBe('Roboto');
            expect(result[0].fontWeight).toBe(700);
            expect(result[0].fontStyle).toBe('italic');
            expect(result[0].textAlign).toBe('center');
            expect(result[0].lineHeight).toBe(1.2);
            expect(result[0].letterSpacing).toBe(5); // charSpacing / 10
            expect(result[0].color).toBe('#FFFFFF');
        }
    });

    it('should resolve fontWeight keyword "bold" to 700 (regression guard)', () => {
        const json = makeFabricJSON([
            {
                type: 'textbox', left: 0, top: 0, width: 100, height: 30, scaleX: 1, scaleY: 1, opacity: 1,
                fill: '#000', text: 'Bold', fontWeight: 'bold', __aceId: 6, __aceZIndex: 0,
            },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        if (result[0].type === 'text') {
            expect(result[0].fontWeight).toBe(700);
        }
    });

    // ── Image conversion ──

    it('should convert image to ImageElement with src and dimensions', () => {
        const json = makeFabricJSON([
            {
                type: 'image', left: 10, top: 10, width: 400, height: 300, scaleX: 0.5, scaleY: 0.5, opacity: 1,
                src: 'data:image/png;base64,abc123', __aceId: 7, __aceZIndex: 3, __aceName: 'Product Photo',
            },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result).toHaveLength(1);
        if (result[0].type === 'image') {
            expect(result[0].src).toBe('data:image/png;base64,abc123');
            expect(result[0].naturalWidth).toBe(400);
            expect(result[0].naturalHeight).toBe(300);
            expect(result[0].name).toBe('Product Photo');
        }
    });

    // ── Z-index ordering ──

    it('should sort elements by zIndex', () => {
        const json = makeFabricJSON([
            { type: 'rect', left: 0, top: 0, width: 50, height: 50, scaleX: 1, scaleY: 1, opacity: 1, fill: '#f00', __aceId: 1, __aceZIndex: 2, __aceName: 'Top' },
            { type: 'rect', left: 0, top: 0, width: 50, height: 50, scaleX: 1, scaleY: 1, opacity: 1, fill: '#0f0', __aceId: 2, __aceZIndex: 0, __aceName: 'Bottom' },
            { type: 'rect', left: 0, top: 0, width: 50, height: 50, scaleX: 1, scaleY: 1, opacity: 1, fill: '#00f', __aceId: 3, __aceZIndex: 1, __aceName: 'Middle' },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result.map(e => e.name)).toEqual(['Bottom', 'Middle', 'Top']);
    });

    // ── Scale applied to dimensions ──

    it('should apply scaleX/scaleY to element dimensions for constraints', () => {
        const json = makeFabricJSON([
            { type: 'rect', left: 0, top: 0, width: 100, height: 100, scaleX: 2, scaleY: 3, opacity: 1, fill: '#abc', __aceId: 8, __aceZIndex: 0 },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        // The constraints should be computed from scaled dimensions (200x300)
        expect(result).toHaveLength(1);
        if (result[0].type === 'shape') {
            const size = result[0].constraints.size;
            expect(size.width).toBe(200);
            // Height 300 >= 250*0.98 so absoluteToConstraints produces relative height
            expect(size.heightMode).toBe('relative');
            expect(size.height).toBe(1);
        }
    });

    // ── Visibility ──

    it('should respect visible property', () => {
        const json = makeFabricJSON([
            { type: 'rect', left: 0, top: 0, width: 50, height: 50, scaleX: 1, scaleY: 1, opacity: 1, fill: '#f00', __aceId: 1, __aceZIndex: 0, visible: false },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result[0].visible).toBe(false);
    });

    // ── Default values ──

    it('should use sensible defaults for missing properties', () => {
        const json = makeFabricJSON([
            { type: 'textbox', __aceId: 1, __aceZIndex: 0 },
        ]);
        const result = fabricJsonToElements(json, 300, 250);
        expect(result).toHaveLength(1);
        if (result[0].type === 'text') {
            expect(result[0].content).toBe('');
            expect(result[0].fontFamily).toBe('Inter');
            expect(result[0].fontSize).toBe(16);
            expect(result[0].fontWeight).toBe(400);
            expect(result[0].fontStyle).toBe('normal');
            expect(result[0].textAlign).toBe('left');
        }
    });
});
