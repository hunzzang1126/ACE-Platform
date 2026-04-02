// ─────────────────────────────────────────────────
// fabricEngineShimExtended.test.ts — Z-order, fill_to_page, visibility, grouping
// ─────────────────────────────────────────────────
// Tests the shim's pure-logic methods with a mock Fabric Canvas.

import { describe, it, expect, vi } from 'vitest';

vi.mock('fabric', () => {
    class MO {
        type = 'rect'; left = 0; top = 0; width = 100; height = 80;
        scaleX = 1; scaleY = 1; opacity = 1; angle = 0;
        fill: any = '#808080'; shadow: any = undefined;
        visible = true; dirty = false; selectable = true; rx = 0;
        lockMovementX = false; lockMovementY = false;
        lockScalingX = false; lockScalingY = false; lockRotation = false;
        __glidId = 0; __glidZIndex = 0; __glidArtboard = false; __glidName = '';
        set(p: any) { Object.assign(this, p); }
        setCoords() {}
        toObject() { return {}; }
        getBoundingRect() { return { left: this.left, top: this.top, width: this.width, height: this.height }; }
    }
    class MG extends MO {
        _obj: MO[] = [];
        constructor(o: MO[] = []) { super(); this.type = 'group'; this._obj = o; }
        getObjects() { return this._obj; }
    }
    class MC {
        _o: MO[] = [];
        getObjects() { return this._o; }
        getActiveObjects() { return []; }
        getActiveObject() { return null; }
        add(o: MO) { this._o.push(o); }
        remove(o: MO) { this._o = this._o.filter(x => x !== o); }
        moveObjectTo(o: MO, i: number) { this._o = this._o.filter(x => x !== o); this._o.splice(i, 0, o); }
        setActiveObject() {} discardActiveObject() {} renderAll() {}
        getZoom() { return 1; }
        get viewportTransform() { return [1,0,0,1,0,0]; }
        toObject() { return {}; }
        toDataURL() { return 'data:'; }
        loadFromJSON() { return Promise.resolve(); }
        sendObjectToBack(o: MO) { this._o = this._o.filter(x => x !== o); this._o.unshift(o); }
        bringObjectToFront(o: MO) { this._o = this._o.filter(x => x !== o); this._o.push(o); }
    }
    class MS { color = ''; blur = 0; offsetX = 0; offsetY = 0; constructor(o: any = {}) { Object.assign(this, o); } }
    class MT extends MO {
        type = 'textbox'; text = ''; fontSize = 16; fontFamily = 'I'; fontWeight = '400';
        constructor(t = '', o: any = {}) { super(); this.text = t; Object.assign(this, o); }
        setControlsVisibility() {}
    }
    class MR extends MO { constructor(o: any = {}) { super(); Object.assign(this, o); } }
    class ME extends MO { constructor(o: any = {}) { super(); Object.assign(this, o); this.type = 'ellipse'; } }
    const MFI = class extends MO {
        constructor(o: any = {}) { super(); this.type = 'image'; Object.assign(this, o); }
        static fromURL = vi.fn().mockResolvedValue(new MO());
    };
    class MGr { constructor() {} }
    class MAS extends MO { constructor() { super(); } }
    return {
        Canvas: MC, FabricObject: MO, Group: MG, Shadow: MS,
        Textbox: MT, Rect: MR, Ellipse: ME, FabricImage: MFI,
        Gradient: MGr, ActiveSelection: MAS, PencilBrush: class { color=''; width=1; },
    };
});

import { createEngineShim } from './fabricEngineShim';
import { Canvas } from 'fabric';

function setup() {
    const fc = new Canvas() as any;
    const sync = vi.fn();
    const ab = el(0); ab.__glidArtboard = true;
    fc.add(ab);
    return { fc, shim: createEngineShim(fc, sync, 300, 250), sync };
}

function el(id: number, ov: Record<string, any> = {}) {
    return {
        type: 'rect', left: 0, top: 0, width: 100, height: 80,
        scaleX: 1, scaleY: 1, opacity: 1, angle: 0,
        fill: '#808080', shadow: undefined, visible: true,
        selectable: true, dirty: false, rx: 0,
        lockMovementX: false, lockMovementY: false,
        lockScalingX: false, lockScalingY: false, lockRotation: false,
        __glidId: id, __glidZIndex: id, __glidArtboard: false, __glidName: `E${id}`,
        set(p: any) { Object.assign(this, p); },
        setCoords() {},
        toObject() { return {}; },
        getBoundingRect() { return { left: this.left, top: this.top, width: this.width, height: this.height }; },
        ...ov,
    } as any;
}

describe('z-order — syncZIndexFromStack', () => {
    it('assigns sequential z-indices', () => {
        const { fc, shim } = setup();
        const a = el(1), b = el(2), c = el(3);
        fc.add(a); fc.add(b); fc.add(c);
        shim.syncZIndexFromStack();
        expect(a.__glidZIndex).toBe(1);
        expect(b.__glidZIndex).toBe(2);
        expect(c.__glidZIndex).toBe(3);
    });
});

describe('z-order — set_z_index', () => {
    it('sets __glidZIndex on target', () => {
        const { fc, shim } = setup();
        const a = el(1); fc.add(a);
        shim.set_z_index(1, 99);
        expect(a.__glidZIndex).toBe(99);
    });
});

describe('fill_to_page', () => {
    it('scales image to cover artboard', () => {
        const { fc, shim } = setup();
        const img = el(1, { type: 'image', width: 600, height: 400 });
        fc.add(img);
        shim.fill_to_page(1);
        expect(img.scaleX).toBeCloseTo(0.625, 2);
    });

    it('centers image on artboard', () => {
        const { fc, shim } = setup();
        const img = el(1, { type: 'image', width: 600, height: 400 });
        fc.add(img);
        shim.fill_to_page(1);
        expect(img.left).toBeCloseTo(-37.5, 0);
    });

    it('no-ops for non-image', () => {
        const { fc, shim } = setup();
        const r = el(1, { type: 'rect' }); fc.add(r);
        shim.fill_to_page(1);
        expect(r.scaleX).toBe(1);
    });
});

describe('set_size', () => {
    it('sets w/h directly for non-image', () => {
        const { fc, shim } = setup();
        const r = el(1); fc.add(r);
        shim.set_size(1, 200, 150);
        expect(r.width).toBe(200); expect(r.height).toBe(150);
    });

    it('uses scale for image', () => {
        const { fc, shim } = setup();
        const img = el(1, { type: 'image', width: 400, height: 300 });
        fc.add(img);
        shim.set_size(1, 200, 150);
        expect(img.scaleX).toBeCloseTo(0.5, 2);
    });
});

describe('visibility & lock', () => {
    it('set_visible toggles', () => {
        const { fc, shim } = setup();
        const a = el(1); fc.add(a);
        shim.set_visible(1, false);
        expect(a.visible).toBe(false);
    });

    it('set_locked sets all lock props', () => {
        const { fc, shim } = setup();
        const a = el(1); fc.add(a);
        shim.set_locked(1, true);
        expect(a.lockMovementX).toBe(true);
        expect(a.lockMovementY).toBe(true);
        expect(a.selectable).toBe(false);
    });
});

describe('lookup', () => {
    it('find_by_name returns id', () => {
        const { fc, shim } = setup();
        const a = el(42, { __glidName: 'HL' }); fc.add(a);
        expect(shim.find_by_name('HL')).toBe(42);
    });

    it('find_by_name returns null for missing', () => {
        const { shim } = setup();
        expect(shim.find_by_name('X')).toBeNull();
    });

    it('set_name updates name', () => {
        const { fc, shim } = setup();
        const a = el(1); fc.add(a);
        shim.set_name(1, 'New');
        expect(a.__glidName).toBe('New');
    });
});

describe('utility', () => {
    it('node_count excludes artboard', () => {
        const { fc, shim } = setup();
        fc.add(el(1)); fc.add(el(2));
        expect(shim.node_count()).toBe(2);
    });

    it('get_canvas_size returns artboard dims', () => {
        const { shim } = setup();
        expect(shim.get_canvas_size()).toEqual({ width: 300, height: 250 });
    });

    it('remove_element removes from canvas', () => {
        const { fc, shim } = setup();
        fc.add(el(1)); fc.add(el(2));
        shim.remove_element(1);
        expect(shim.node_count()).toBe(1);
    });
});
