// ─────────────────────────────────────────────────
// shimTextEffects.test.ts — applyTextEffectCSS unit tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('fabric', () => {
    class MockTextbox {
        type = 'textbox';
        fill: any = '#ffffff';
        shadow: any = undefined;
        stroke: any = undefined;
        strokeWidth = 0;
        paintFirst = 'fill';
        dirty = false;
        __glidOriginalFill: string | undefined = undefined;
        __glidCustomStyles: Record<string, string> | undefined = undefined;
        constructor() {}
        set(props: Record<string, any>) { Object.assign(this, props); }
    }
    class MockShadow {
        color: string; blur: number; offsetX: number; offsetY: number;
        constructor(opts: any = {}) {
            this.color = opts.color ?? 'rgba(0,0,0,0.5)';
            this.blur = opts.blur ?? 0;
            this.offsetX = opts.offsetX ?? 0;
            this.offsetY = opts.offsetY ?? 0;
        }
    }
    class MockCanvas { renderAll() {} }
    return { Textbox: MockTextbox, Shadow: MockShadow, Canvas: MockCanvas, FabricObject: class {} };
});

import { applyTextEffectCSS } from './shimTextEffects';
import { Textbox, Canvas } from 'fabric';

function makeObj(fill = '#ffffff') {
    const obj = new Textbox() as any;
    obj.fill = fill;
    return obj;
}
const fc = new Canvas() as any;

// ══════════════════════════════════════════════════
// Effect: drop
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — drop', () => {
    it('should add shadow with offset', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'drop', 50, '#000000', fc);
        expect(obj.shadow).toBeTruthy();
        expect(obj.shadow.offsetX).toBe(4);  // 4 * scale(1)
        expect(obj.shadow.offsetY).toBe(4);
        expect(obj.shadow.blur).toBe(8);
    });

    it('should scale with intensity', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'drop', 100, '#000000', fc);
        expect(obj.shadow.offsetX).toBe(8); // 4 * 2
        expect(obj.shadow.blur).toBe(16);
    });

    it('should append cc to color', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'drop', 50, '#ff0000', fc);
        expect(obj.shadow.color).toBe('#ff0000cc');
    });
});

// ══════════════════════════════════════════════════
// Effect: glow
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — glow', () => {
    it('should add shadow with zero offset', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'glow', 50, '#00ff00', fc);
        expect(obj.shadow.offsetX).toBe(0);
        expect(obj.shadow.offsetY).toBe(0);
        expect(obj.shadow.blur).toBe(20);
    });

    it('should append 80 to color', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'glow', 50, '#00ff00', fc);
        expect(obj.shadow.color).toBe('#00ff0080');
    });
});

// ══════════════════════════════════════════════════
// Effect: echo
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — echo', () => {
    it('should add shadow with blur=0', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'echo', 50, '#0000ff', fc);
        expect(obj.shadow.blur).toBe(0);
        expect(obj.shadow.offsetX).toBe(6);
        expect(obj.shadow.offsetY).toBe(6);
    });
});

// ══════════════════════════════════════════════════
// Effect: outline
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — outline', () => {
    it('should set stroke and paintFirst=stroke for Textbox', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'outline', 50, '#ff00ff', fc);
        expect(obj.stroke).toBe('#ff00ff');
        expect(obj.strokeWidth).toBeGreaterThanOrEqual(1);
        expect(obj.paintFirst).toBe('stroke');
    });
});

// ══════════════════════════════════════════════════
// Effect: splice
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — splice', () => {
    it('should set thicker stroke than outline', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'splice', 50, '#aabbcc', fc);
        expect(obj.stroke).toBe('#aabbcc');
        expect(obj.strokeWidth).toBeGreaterThanOrEqual(2);
    });
});

// ══════════════════════════════════════════════════
// Effect: neon
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — neon', () => {
    it('should add shadow + customStyles.textShadow', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'neon', 50, '#00ff00', fc);
        expect(obj.shadow).toBeTruthy();
        expect(obj.shadow.blur).toBe(12);
        expect(obj.__glidCustomStyles?.textShadow).toBeTruthy();
        expect(obj.__glidCustomStyles!.textShadow).toContain('#00ff00');
    });
});

// ══════════════════════════════════════════════════
// Effect: glitch
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — glitch', () => {
    it('should add red shadow + cyan/red custom textShadow', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'glitch', 50, '#ff0000', fc);
        expect(obj.shadow.color).toBe('#ff0000');
        expect(obj.__glidCustomStyles?.textShadow).toContain('#00ffff');
        expect(obj.__glidCustomStyles?.textShadow).toContain('#ff0000');
    });
});

// ══════════════════════════════════════════════════
// Effect: curve
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — curve', () => {
    it('should add small blur shadow', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, 'curve', 50, '#333333', fc);
        expect(obj.shadow).toBeTruthy();
        expect(obj.shadow.blur).toBe(4);
    });
});

// ══════════════════════════════════════════════════
// Effect: 70s
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — 70s', () => {
    it('should combine stroke + shadow', () => {
        const obj = makeObj();
        applyTextEffectCSS(obj, '70s', 50, '#ff8c00', fc);
        expect(obj.stroke).toBe('#ff8c00');
        expect(obj.strokeWidth).toBeGreaterThanOrEqual(3);
        expect(obj.paintFirst).toBe('stroke');
        expect(obj.shadow).toBeTruthy();
    });
});

// ══════════════════════════════════════════════════
// Effect: none — clears all
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — none (clear)', () => {
    it('should clear shadow, stroke, and customStyles', () => {
        const obj = makeObj();
        // First apply an effect
        applyTextEffectCSS(obj, 'neon', 50, '#00ff00', fc);
        expect(obj.shadow).toBeTruthy();
        // Then clear
        applyTextEffectCSS(obj, 'none', 0, '', fc);
        expect(obj.shadow).toBeUndefined();
        expect(obj.stroke).toBeUndefined();
        expect(obj.strokeWidth).toBe(0);
        expect(obj.__glidCustomStyles).toBeUndefined();
    });
});

// ══════════════════════════════════════════════════
// Original fill preservation
// ══════════════════════════════════════════════════

describe('applyTextEffectCSS — fill preservation', () => {
    it('should store original fill before first effect', () => {
        const obj = makeObj('#ff6b00');
        applyTextEffectCSS(obj, 'glow', 50, '#fff', fc);
        expect(obj.__glidOriginalFill).toBe('#ff6b00');
    });

    it('should restore original fill on "none"', () => {
        const obj = makeObj('#ff6b00');
        applyTextEffectCSS(obj, 'glow', 50, '#fff', fc);
        applyTextEffectCSS(obj, 'none', 0, '', fc);
        expect(obj.fill).toBe('#ff6b00');
        expect(obj.__glidOriginalFill).toBeUndefined();
    });

    it('should not overwrite __glidOriginalFill if already set', () => {
        const obj = makeObj('#ff6b00');
        obj.__glidOriginalFill = '#original';
        applyTextEffectCSS(obj, 'outline', 50, '#000', fc);
        expect(obj.__glidOriginalFill).toBe('#original');
    });
});
