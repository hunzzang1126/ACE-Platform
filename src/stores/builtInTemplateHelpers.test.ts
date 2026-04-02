// ─────────────────────────────────────────────────
// builtInTemplateHelpers.test.ts — Element factories
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { el, textEl, shapeEl, btnEl, makeVariant, makeTemplate } from './builtInTemplateHelpers';

describe('el — constraint builder', () => {
    it('sets position and size', () => {
        const c = el('id', 'name', 10, 20, 300, 250);
        expect(c.horizontal.offset).toBe(10);
        expect(c.vertical.offset).toBe(20);
        expect(c.size.width).toBe(300);
        expect(c.size.height).toBe(250);
    });
});

describe('textEl', () => {
    it('creates text element with correct type', () => {
        const t = textEl('t1', 'Headline', 10, 20, 200, 40, {
            content: 'Hello', fontSize: 24, fontWeight: 700, color: '#fff',
        });
        expect(t.type).toBe('text');
        expect(t.content).toBe('Hello');
        expect(t.fontSize).toBe(24);
        expect(t.color).toBe('#fff');
    });

    it('defaults to Inter font and left align', () => {
        const t = textEl('t1', 'T', 0, 0, 100, 30, { content: 'X', fontSize: 16, fontWeight: 400, color: '#000' });
        expect(t.fontFamily).toBe('Inter');
        expect(t.textAlign).toBe('left');
    });

    it('accepts optional textAlign and fontFamily', () => {
        const t = textEl('t1', 'T', 0, 0, 100, 30, {
            content: 'X', fontSize: 16, fontWeight: 400, color: '#000',
            textAlign: 'center', fontFamily: 'Roboto',
        });
        expect(t.textAlign).toBe('center');
        expect(t.fontFamily).toBe('Roboto');
    });
});

describe('shapeEl', () => {
    it('creates shape element', () => {
        const s = shapeEl('s1', 'BG', 0, 0, 300, 250, { fill: '#000' });
        expect(s.type).toBe('shape');
        expect(s.fill).toBe('#000');
        expect(s.borderRadius).toBe(0);
    });

    it('supports gradient', () => {
        const s = shapeEl('s1', 'BG', 0, 0, 300, 250, {
            fill: '#000', gradientStart: '#ff0000', gradientEnd: '#0000ff', gradientAngle: 90,
        });
        expect(s.gradientStart).toBe('#ff0000');
        expect(s.gradientEnd).toBe('#0000ff');
        expect(s.gradientAngle).toBe(90);
    });
});

describe('btnEl', () => {
    it('creates button element', () => {
        const b = btnEl('b1', 'CTA', 50, 200, 150, 40, {
            label: 'Shop Now', fontSize: 14, color: '#fff', backgroundColor: '#2563eb',
        });
        expect(b.type).toBe('button');
        expect(b.label).toBe('Shop Now');
        expect(b.backgroundColor).toBe('#2563eb');
        expect(b.fontWeight).toBe(700);
    });

    it('defaults borderRadius to 8', () => {
        const b = btnEl('b1', 'CTA', 0, 0, 100, 40, {
            label: 'Go', fontSize: 14, color: '#fff', backgroundColor: '#000',
        });
        expect(b.borderRadius).toBe(8);
    });
});

describe('makeVariant', () => {
    it('creates variant with elements', () => {
        const v = makeVariant('v1', 300, 250, '#000', []);
        expect(v.id).toBe('v1');
        expect(v.preset.width).toBe(300);
        expect(v.preset.height).toBe(250);
        expect(v.backgroundColor).toBe('#000');
        expect(v.overriddenElementIds).toEqual([]);
    });
});

describe('makeTemplate', () => {
    it('creates template with embedded variant', () => {
        const t = makeTemplate('t1', 'Test Template', 'A test', 'display', ['test'], 300, 250, '#000', []);
        expect(t.id).toBe('t1');
        expect(t.name).toBe('Test Template');
        expect(t.isBuiltIn).toBe(true);
        expect(t.width).toBe(300);
        expect(JSON.parse(t.variantSnapshot)).toBeDefined();
    });
});
