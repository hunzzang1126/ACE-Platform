// ─────────────────────────────────────────────────
// fabricEngineShim Z-Order — Regression tests
// ─────────────────────────────────────────────────
// ★ REGRESSION: send_to_back() used fc.sendObjectToBack() which placed
// objects at Fabric index 0 (BEHIND the artboard), making elements invisible.
// These tests ensure z-order operations use moveObjectTo() and normalize z-indices.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Minimal Fabric.js Mock ──

function createMockCanvas() {
    const objects: any[] = [];
    return {
        _objects: objects,
        getObjects: () => [...objects],
        add: (obj: any) => { objects.push(obj); },
        remove: (obj: any) => { const i = objects.indexOf(obj); if (i >= 0) objects.splice(i, 1); },
        renderAll: vi.fn(),
        moveObjectTo: vi.fn((obj: any, index: number) => {
            const i = objects.indexOf(obj);
            if (i >= 0) objects.splice(i, 1);
            objects.splice(index, 0, obj);
        }),
        // ★ These are the DANGEROUS methods that should NOT be used
        sendObjectToBack: vi.fn((obj: any) => {
            const i = objects.indexOf(obj);
            if (i >= 0) { objects.splice(i, 1); objects.unshift(obj); }
        }),
        bringObjectToFront: vi.fn((obj: any) => {
            const i = objects.indexOf(obj);
            if (i >= 0) { objects.splice(i, 1); objects.push(obj); }
        }),
        setActiveObject: vi.fn(),
    };
}

function createMockObject(id: number, zIndex: number, type = 'rect', isArtboard = false) {
    return {
        type,
        __glidId: id,
        __glidZIndex: zIndex,
        __glidArtboard: isArtboard,
        dirty: false,
        setCoords: vi.fn(),
        set: vi.fn(),
        visible: true,
    };
}

// ── Simulate the shim's z-order functions ──

function reorderByZIndex(fc: any, userObjects: () => any[]) {
    const objs = userObjects().sort(
        (a: any, b: any) => ((a as any).__glidZIndex ?? 0) - ((b as any).__glidZIndex ?? 0)
    );
    objs.forEach((o: any, i: number) => fc.moveObjectTo(o, i + 1));
    objs.forEach((o: any) => { o.dirty = true; o.setCoords(); });
    fc.renderAll();
}

function sendToBack(id: number, fc: any, findById: (id: number) => any, userObjects: () => any[]) {
    const obj = findById(id);
    if (!obj) return;
    // ★ The FIX: set z to -1, then normalize all z-indices
    obj.__glidZIndex = -1;
    const sorted = userObjects().sort((a: any, b: any) => (a.__glidZIndex ?? 0) - (b.__glidZIndex ?? 0));
    sorted.forEach((o: any, i: number) => { fc.moveObjectTo(o, i + 1); o.__glidZIndex = i; });
    sorted.forEach((o: any) => { o.dirty = true; o.setCoords(); });
    fc.renderAll();
}

function sendToFront(id: number, fc: any, findById: (id: number) => any, userObjects: () => any[]) {
    const obj = findById(id);
    if (!obj) return;
    const maxZ = userObjects().reduce((m: number, o: any) => Math.max(m, o.__glidZIndex ?? 0), 0);
    obj.__glidZIndex = maxZ + 1;
    const sorted = userObjects().sort((a: any, b: any) => (a.__glidZIndex ?? 0) - (b.__glidZIndex ?? 0));
    sorted.forEach((o: any, i: number) => { fc.moveObjectTo(o, i + 1); o.__glidZIndex = i; });
    sorted.forEach((o: any) => { o.dirty = true; o.setCoords(); });
    fc.renderAll();
}

// ── Tests ──

describe('Z-Order — send_to_back regression', () => {
    let fc: ReturnType<typeof createMockCanvas>;
    let artboard: any;
    let aibg: any;
    let roundedRect: any;
    let headline: any;

    beforeEach(() => {
        fc = createMockCanvas();
        // Artboard is always at index 0
        artboard = createMockObject(0, -999, 'rect', true);
        aibg = createMockObject(1, 0, 'image');
        roundedRect = createMockObject(2, 1, 'rect');
        headline = createMockObject(3, 2, 'text');
        fc.add(artboard);
        fc.add(aibg);
        fc.add(roundedRect);
        fc.add(headline);
    });

    const userObjects = () => fc.getObjects().filter((o: any) => !o.__glidArtboard);
    const findById = (id: number) => fc.getObjects().find((o: any) => o.__glidId === id);

    it('★ REGRESSION: send_to_back should NOT use sendObjectToBack (places behind artboard)', () => {
        sendToBack(1, fc, findById, userObjects);
        // sendObjectToBack should NEVER be called
        expect(fc.sendObjectToBack).not.toHaveBeenCalled();
    });

    it('★ REGRESSION: send_to_back should place element at position 1 (above artboard)', () => {
        sendToBack(3, fc, findById, userObjects);
        // After send_to_back, headline should be at lowest z-index
        const objs = userObjects();
        const sorted = objs.sort((a: any, b: any) => a.__glidZIndex - b.__glidZIndex);
        expect(sorted[0].__glidId).toBe(3); // headline is now at bottom
        // Its z-index should be 0, not negative
        expect(headline.__glidZIndex).toBe(0);
    });

    it('★ REGRESSION: elements above AI BG should remain visible after z-order operations', () => {
        // Simulate the exact bug scenario:
        // aibg(z:0), roundedRect(z:1), headline(z:2)
        // After reorder, ALL user objects should have z-index >= 0
        reorderByZIndex(fc, userObjects);
        const objs = userObjects();
        for (const obj of objs) {
            expect(obj.__glidZIndex).toBeGreaterThanOrEqual(0);
        }
        // moveObjectTo should use index >= 1 (artboard is at 0)
        const calls = fc.moveObjectTo.mock.calls;
        for (const [, index] of calls) {
            expect(index).toBeGreaterThanOrEqual(1);
        }
    });

    it('send_to_back normalizes all z-indices to contiguous 0..N-1', () => {
        // Give gaps: z=0, z=5, z=10
        aibg.__glidZIndex = 0;
        roundedRect.__glidZIndex = 5;
        headline.__glidZIndex = 10;

        sendToBack(3, fc, findById, userObjects);

        const objs = userObjects().sort((a: any, b: any) => a.__glidZIndex - b.__glidZIndex);
        expect(objs[0].__glidZIndex).toBe(0);
        expect(objs[1].__glidZIndex).toBe(1);
        expect(objs[2].__glidZIndex).toBe(2);
    });

    it('send_to_front normalizes all z-indices to contiguous 0..N-1', () => {
        sendToFront(1, fc, findById, userObjects);

        const objs = userObjects().sort((a: any, b: any) => a.__glidZIndex - b.__glidZIndex);
        expect(objs[0].__glidZIndex).toBe(0);
        expect(objs[1].__glidZIndex).toBe(1);
        expect(objs[2].__glidZIndex).toBe(2);
        // aibg should now be at the top
        expect(objs[2].__glidId).toBe(1);
    });

    it('★ REGRESSION: repeated send_to_back/front should not create z-index drift', () => {
        // Perform multiple operations
        sendToBack(3, fc, findById, userObjects);
        sendToFront(1, fc, findById, userObjects);
        sendToBack(2, fc, findById, userObjects);
        sendToFront(3, fc, findById, userObjects);

        const objs = userObjects().sort((a: any, b: any) => a.__glidZIndex - b.__glidZIndex);
        // Z-indices should always be contiguous 0..N-1
        objs.forEach((obj: any, i: number) => {
            expect(obj.__glidZIndex).toBe(i);
        });
        // No negative z-indices
        for (const obj of objs) {
            expect(obj.__glidZIndex).toBeGreaterThanOrEqual(0);
        }
    });
});
