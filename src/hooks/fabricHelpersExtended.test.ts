// ─────────────────────────────────────────────────
// fabricHelpersExtended.test.ts — fabricToEngineNode + patchAceProps
// ─────────────────────────────────────────────────
// Direct unit tests on the core data conversion functions.
// Mocks Fabric.js classes to avoid requiring a real Canvas.

import { describe, it, expect, vi } from 'vitest';

// ★ Mock Fabric.js BEFORE importing fabricHelpers
vi.mock('fabric', () => {
    class MockTextbox {
        type = 'textbox';
        text = ''; fontSize = 16; fontFamily = 'Inter'; fontWeight = '400';
        fontStyle = 'normal'; fill: any = '#000'; textAlign = 'left';
        lineHeight = 1.4; charSpacing = 0;
        left = 0; top = 0; width = 100; height = 20;
        scaleX = 1; scaleY = 1; opacity = 1; angle = 0;
        visible = true; shadow: any = undefined; rx = 0;
        constructor(text: string, opts: any = {}) {
            this.text = text;
            Object.assign(this, opts);
        }
    }
    class MockShadow {
        color = 'rgba(0,0,0,0.5)'; blur = 0; offsetX = 0; offsetY = 0;
        constructor(opts: any = {}) { Object.assign(this, opts); }
    }
    return { Textbox: MockTextbox, Shadow: MockShadow, FabricObject: class {}, Group: class MockGroup {
        type = 'group'; left = 0; top = 0; width = 0; height = 0; scaleX = 1; scaleY = 1; opacity = 1; angle = 0; visible = true; rx = 0; _objects: any[] = [];
        constructor(objs: any[] = []) { this._objects = objs; }
        getObjects() { return this._objects; }
    } };
});

import { fabricToEngineNode, patchAceProps, isArtboard } from './fabricHelpers';
import { Textbox, Shadow } from 'fabric';

// ── Mock helpers ──
function mockObj(ov: Record<string, any> = {}) {
    return {
        type: 'rect', left: 10, top: 20, width: 100, height: 80,
        scaleX: 1, scaleY: 1, opacity: 0.9, angle: 0,
        fill: '#ff0000', shadow: undefined, visible: true, rx: 0,
        __glidId: 1, __glidZIndex: 0, __glidName: undefined,
        ...ov,
    } as any;
}

function mockText(ov: Record<string, any> = {}) {
    const tb = new Textbox('Hello World', {
        left: 10, top: 20, width: 200, height: 30,
        fontSize: 24, fontFamily: 'Inter', fontWeight: '700',
        fill: '#ffffff', textAlign: 'center', lineHeight: 1.5, charSpacing: 20,
    });
    Object.assign(tb, { __glidId: 5, __glidZIndex: 2, __glidName: 'Headline', rx: 0 });
    Object.assign(tb, ov);
    return tb as any;
}

// ══════════════════════════════════════════════════
// fabricToEngineNode — SHAPE
// ══════════════════════════════════════════════════

describe('fabricToEngineNode — shape basics', () => {
    it('extracts id, type, position, dimensions, opacity', () => {
        const n = fabricToEngineNode(mockObj());
        expect(n.id).toBe(1);
        expect(n.type).toBe('rect');
        expect(n.x).toBe(10);
        expect(n.y).toBe(20);
        expect(n.w).toBe(100);
        expect(n.h).toBe(80);
        expect(n.opacity).toBe(0.9);
    });

    it('★ REGRESSION: scale-aware w/h (scaleX=2, scaleY=3)', () => {
        const n = fabricToEngineNode(mockObj({ scaleX: 2, scaleY: 3 }));
        expect(n.w).toBe(200);
        expect(n.h).toBe(240);
    });

    it('detects ellipse type', () => {
        expect(fabricToEngineNode(mockObj({ type: 'ellipse' })).type).toBe('ellipse');
    });

    it('detects rounded_rect via rx > 0', () => {
        expect(fabricToEngineNode(mockObj({ rx: 12 })).type).toBe('rounded_rect');
    });

    it('★ REGRESSION: borderRadius scales with min(scaleX, scaleY)', () => {
        const n = fabricToEngineNode(mockObj({ rx: 12, scaleX: 2, scaleY: 1 }));
        expect(n.border_radius).toBe(12); // 12 * min(2,1) = 12
    });

    it('detects path type', () => {
        expect(fabricToEngineNode(mockObj({ type: 'path' })).type).toBe('path');
    });

    it('uses __glidName when set', () => {
        expect(fabricToEngineNode(mockObj({ __glidName: 'BG' })).name).toBe('BG');
    });

    it('extracts angle', () => {
        expect(fabricToEngineNode(mockObj({ angle: 45 })).angle).toBe(45);
    });
});

// ══════════════════════════════════════════════════
// fabricToEngineNode — TEXT
// ══════════════════════════════════════════════════

describe('fabricToEngineNode — text properties', () => {
    it('extracts content, fontFamily, fontWeight, textAlign, lineHeight', () => {
        const n = fabricToEngineNode(mockText());
        expect(n.type).toBe('text');
        expect(n.content).toBe('Hello World');
        expect(n.fontFamily).toBe('Inter');
        expect(n.fontWeight).toBe('700');
        expect(n.textAlign).toBe('center');
        expect(n.lineHeight).toBe(1.5);
    });

    it('★ REGRESSION: fontSize × scaleY', () => {
        expect(fabricToEngineNode(mockText({ fontSize: 20, scaleY: 2 })).fontSize).toBe(40);
    });

    it('★ REGRESSION: charSpacing × scaleX', () => {
        const n = fabricToEngineNode(mockText({ charSpacing: 20, scaleX: 2 }));
        expect(n.letterSpacing).toBe(4); // (20/10)*2 = 4
    });

    it('preserves fontStyle italic', () => {
        expect(fabricToEngineNode(mockText({ fontStyle: 'italic' })).fontStyle).toBe('italic');
    });

    it('defaults fontStyle to normal', () => {
        expect(fabricToEngineNode(mockText({ fontStyle: '' })).fontStyle).toBe('normal');
    });

    it('uses __glidOriginalFill for color when set', () => {
        expect(fabricToEngineNode(mockText({ __glidOriginalFill: '#00ff00' })).color).toBe('#00ff00');
    });

    it('uses fill as color fallback', () => {
        expect(fabricToEngineNode(mockText({ fill: '#ff6b00' })).color).toBe('#ff6b00');
    });

    it('uses __glidName for text name', () => {
        expect(fabricToEngineNode(mockText()).name).toBe('Headline');
    });
});

// ══════════════════════════════════════════════════
// fabricToEngineNode — IMAGE
// ══════════════════════════════════════════════════

describe('fabricToEngineNode — image', () => {
    it('detects image type', () => {
        expect(fabricToEngineNode(mockObj({ type: 'image' })).type).toBe('image');
    });

    it('★ DATA INTEGRITY: prefers __glidPersistSrc over _element.src', () => {
        const n = fabricToEngineNode(mockObj({
            type: 'image',
            __glidPersistSrc: 'idb://abc',
            _element: { src: 'blob:x', naturalWidth: 100, naturalHeight: 100 },
        }));
        expect(n.src).toBe('idb://abc');
    });

    it('falls back to _element.src', () => {
        const n = fabricToEngineNode(mockObj({
            type: 'image',
            _element: { src: 'https://cdn.com/img.png', naturalWidth: 200, naturalHeight: 200 },
        }));
        expect(n.src).toBe('https://cdn.com/img.png');
    });

    it('★ REGRESSION: SVG fallback — Fabric w/h when naturalWidth=0', () => {
        const n = fabricToEngineNode(mockObj({
            type: 'image', width: 300, height: 200,
            _element: { src: 'x', naturalWidth: 0, naturalHeight: 0 },
        }));
        expect(n.naturalWidth).toBe(300);
        expect(n.naturalHeight).toBe(200);
    });

    it('detects stretched objectFit (scaleX ≠ scaleY×aspect)', () => {
        const n = fabricToEngineNode(mockObj({
            type: 'image', width: 200, height: 100, scaleX: 1.5, scaleY: 2.5,
            _element: { src: 'x', naturalWidth: 200, naturalHeight: 100 },
        }));
        expect(n.objectFit).toBe('fill');
    });

    it('detects cover objectFit (aspect-matched scale)', () => {
        // 200x100 image → aspect = 2:1, so scaleX=2 scaleY=1 → ratio 2/1=2 matches 200/100=2
        const n = fabricToEngineNode(mockObj({
            type: 'image', width: 200, height: 100, scaleX: 2, scaleY: 1,
            _element: { src: 'x', naturalWidth: 200, naturalHeight: 100 },
        }));
        expect(n.objectFit).toBe('cover');
    });
});

// ══════════════════════════════════════════════════
// fabricToEngineNode — GRADIENT
// ══════════════════════════════════════════════════

describe('fabricToEngineNode — gradient fill', () => {
    it('extracts from __glidGradient* props', () => {
        const n = fabricToEngineNode(mockObj({
            __glidGradientStart: '#0a0e1a', __glidGradientEnd: '#1a2e4a', __glidGradientAngle: 135,
        }));
        expect(n.gradient_start).toBe('#0a0e1a');
        expect(n.gradient_end).toBe('#1a2e4a');
        expect(n.gradient_angle).toBe(135);
    });

    it('extracts from Fabric Gradient object', () => {
        const n = fabricToEngineNode(mockObj({
            fill: { colorStops: [{ color: '#ff0000' }, { color: '#0000ff' }] },
        }));
        expect(n.gradient_start).toBe('#ff0000');
        expect(n.gradient_end).toBe('#0000ff');
    });

    it('no gradient for plain string fill', () => {
        const n = fabricToEngineNode(mockObj({ fill: '#123456' }));
        expect(n.gradient_start).toBeUndefined();
    });
});

// ══════════════════════════════════════════════════
// fabricToEngineNode — SHADOW / EFFECTS / FLAGS
// ══════════════════════════════════════════════════

describe('fabricToEngineNode — shadow, effects, flags', () => {
    it('extracts shadow properties', () => {
        const s = new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 10, offsetX: 3, offsetY: 4 });
        const n = fabricToEngineNode(mockObj({ shadow: s }));
        expect(n.shadow_blur).toBe(10);
        expect(n.shadow_offsetX).toBe(3);
        expect(n.shadow_offsetY).toBe(4);
        expect(n.shadow_color).toBe('rgba(0,0,0,0.5)');
    });

    it('extracts textEffect props', () => {
        const n = fabricToEngineNode(mockObj({
            __glidTextEffectType: 'neon', __glidTextEffectIntensity: 75, __glidTextEffectColor: '#0f0',
        }));
        expect(n.textEffect_type).toBe('neon');
        expect(n.textEffect_intensity).toBe(75);
    });

    it('skips textEffect for "none"', () => {
        expect(fabricToEngineNode(mockObj({ __glidTextEffectType: 'none' })).textEffect_type).toBeUndefined();
    });

    it('extracts visible=false', () => {
        expect(fabricToEngineNode(mockObj({ visible: false })).visible).toBe(false);
    });

    it('extracts locked from lockMovementX', () => {
        expect(fabricToEngineNode(mockObj({ lockMovementX: true })).locked).toBe(true);
    });

    it('defaults locked to false', () => {
        expect(fabricToEngineNode(mockObj()).locked).toBe(false);
    });
});

// ══════════════════════════════════════════════════
// patchAceProps — serialization
// ══════════════════════════════════════════════════

describe('patchAceProps — toObject serialization', () => {
    it('includes __glidId and __glidZIndex', () => {
        const obj: any = { toObject: vi.fn().mockReturnValue({}), __glidId: 42, __glidZIndex: 3 };
        patchAceProps(obj);
        const r = obj.toObject();
        expect(r.__glidId).toBe(42);
        expect(r.__glidZIndex).toBe(3);
    });

    it('includes __glidArtboard when true', () => {
        const obj: any = { toObject: vi.fn().mockReturnValue({}), __glidId: 1, __glidZIndex: 0, __glidArtboard: true };
        patchAceProps(obj);
        expect(obj.toObject().__glidArtboard).toBe(true);
    });

    it('includes __glidName', () => {
        const obj: any = { toObject: vi.fn().mockReturnValue({}), __glidId: 1, __glidZIndex: 0, __glidName: 'HL' };
        patchAceProps(obj);
        expect(obj.toObject().__glidName).toBe('HL');
    });

    it('includes gradient props', () => {
        const obj: any = {
            toObject: vi.fn().mockReturnValue({}), __glidId: 1, __glidZIndex: 0,
            __glidGradientStart: '#a', __glidGradientEnd: '#b', __glidGradientAngle: 90,
        };
        patchAceProps(obj);
        const r = obj.toObject();
        expect(r.__glidGradientStart).toBe('#a');
        expect(r.__glidGradientEnd).toBe('#b');
        expect(r.__glidGradientAngle).toBe(90);
    });

    it('includes text effect props', () => {
        const obj: any = {
            toObject: vi.fn().mockReturnValue({}), __glidId: 1, __glidZIndex: 0,
            __glidTextEffectType: 'glow', __glidTextEffectIntensity: 60, __glidTextEffectColor: '#f0f',
        };
        patchAceProps(obj);
        const r = obj.toObject();
        expect(r.__glidTextEffectType).toBe('glow');
        expect(r.__glidTextEffectIntensity).toBe(60);
    });

    it('includes __glidOriginalFill', () => {
        const obj: any = {
            toObject: vi.fn().mockReturnValue({}), __glidId: 1, __glidZIndex: 0, __glidOriginalFill: '#fff',
        };
        patchAceProps(obj);
        expect(obj.toObject().__glidOriginalFill).toBe('#fff');
    });
});
