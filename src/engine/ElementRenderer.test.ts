// ─────────────────────────────────────────────────
// ElementRenderer.test.ts — DesignElement → Pixi Object
// ─────────────────────────────────────────────────
// Covers: renderElement dispatch, each element type renderer,
// constraint resolution, rotation, visibility, opacity, renderVariant
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ElementRenderer.ts'), 'utf-8');

describe('ElementRenderer — exports', () => {
    it('exports renderElement function', () => {
        expect(src).toContain('export function renderElement');
    });

    it('exports renderVariant function', () => {
        expect(src).toContain('export function renderVariant');
    });
});

describe('ElementRenderer — type dispatch', () => {
    it('handles text type', () => {
        expect(src).toContain("case 'text':");
        expect(src).toContain('renderText(');
    });

    it('handles shape type', () => {
        expect(src).toContain("case 'shape':");
        expect(src).toContain('renderShape(');
    });

    it('handles button type', () => {
        expect(src).toContain("case 'button':");
        expect(src).toContain('renderButton(');
    });

    it('handles image type', () => {
        expect(src).toContain("case 'image':");
        expect(src).toContain('renderImagePlaceholder(');
    });

    it('handles group type', () => {
        expect(src).toContain("case 'group':");
        expect(src).toContain('renderGroup(');
    });

    it('returns empty Container for unknown types', () => {
        expect(src).toContain('default:');
        expect(src).toContain('new Container()');
    });
});

describe('ElementRenderer — text rendering', () => {
    it('creates TextStyle with all properties', () => {
        expect(src).toContain('new TextStyle({');
        expect(src).toContain('fontFamily:');
        expect(src).toContain('fontSize:');
        expect(src).toContain('fontWeight:');
        expect(src).toContain('wordWrap: true');
        expect(src).toContain('letterSpacing:');
    });

    it('sets word wrap width from resolved width', () => {
        expect(src).toContain('wordWrapWidth: r.width');
    });

    it('calculates lineHeight from fontSize * lineHeight ratio', () => {
        expect(src).toContain('el.fontSize * el.lineHeight');
    });
});

describe('ElementRenderer — shape rendering', () => {
    it('supports rectangle shape', () => {
        expect(src).toContain("case 'rectangle':");
        expect(src).toContain('roundRect(0, 0, r.width, r.height');
    });

    it('supports ellipse shape', () => {
        expect(src).toContain("case 'ellipse':");
        expect(src).toContain('r.width / 2, r.height / 2');
    });

    it('supports line shape', () => {
        expect(src).toContain("case 'line':");
        expect(src).toContain('moveTo(0, 0)');
        expect(src).toContain('lineTo(r.width, r.height)');
    });

    it('applies border radius for rectangles', () => {
        expect(src).toContain('el.borderRadius ?? 0');
    });

    it('applies fill and stroke', () => {
        expect(src).toContain('g.fill(el.fill)');
        expect(src).toContain("g.stroke({ color: el.stroke, width: el.strokeWidth ?? 1 })");
    });
});

describe('ElementRenderer — common properties', () => {
    it('applies opacity via alpha', () => {
        expect(src).toContain('.alpha = el.opacity');
    });

    it('applies visibility', () => {
        expect(src).toContain('.visible = el.visible');
    });

    it('applies rotation (degrees to radians)', () => {
        expect(src).toContain('el.constraints.rotation * Math.PI) / 180');
    });

    it('assigns element ID as label', () => {
        expect(src).toContain('.label = el.id');
    });
});

describe('ElementRenderer — button rendering', () => {
    it('creates container with bg + text', () => {
        expect(src).toContain('el.backgroundColor');
        expect(src).toContain('el.label');
    });

    it('centers text in button', () => {
        expect(src).toContain('(r.width - label.width) / 2');
        expect(src).toContain('(r.height - label.height) / 2');
    });

    it('applies button border radius', () => {
        expect(src).toContain('el.borderRadius');
    });
});

describe('ElementRenderer — constraint resolution', () => {
    it('uses resolveConstraints for positioning', () => {
        expect(src).toContain('resolveConstraints(element.constraints, parentWidth, parentHeight)');
    });
});

describe('ElementRenderer — renderVariant', () => {
    it('sorts elements by zIndex before rendering', () => {
        expect(src).toContain('sort((a, b) => a.zIndex - b.zIndex)');
    });

    it('uses variant preset dimensions', () => {
        expect(src).toContain('variant.preset.width');
        expect(src).toContain('variant.preset.height');
    });
});

describe('ElementRenderer — group rendering', () => {
    it('recursively renders children', () => {
        expect(src).toContain('renderElement(child, r.width, r.height)');
    });

    it('iterates over el.children', () => {
        expect(src).toContain('el.children');
    });
});
