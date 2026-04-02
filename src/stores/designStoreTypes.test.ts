// ─────────────────────────────────────────────────
// designStoreTypes.test.ts — Helper function tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { getActiveCS, mergePropertyChanges } from './designStoreTypes';
import type { DesignState } from './designStoreTypes';
import type { DesignElement, TextElement, ShapeElement } from '@/schema/elements.types';

// ── Mock smartSizing ──
vi.mock('@/engine/smartSizing', () => ({
    smartSizeElements: vi.fn((els: DesignElement[]) => els.map(e => ({ ...e, id: `sized-${e.id}` }))),
}));

// ── Factories ──

const makeConstraints = () => ({
    position: { x: { anchor: 'left' as const, offset: 10 }, y: { anchor: 'top' as const, offset: 20 } },
    size: { width: 100, height: 50 },
    rotation: 0,
});

function makeTextEl(id: string, name: string, content: string, overrides: Partial<TextElement> = {}): TextElement {
    return {
        id, name, type: 'text', role: 'body',
        constraints: makeConstraints(), zIndex: 1, opacity: 1,
        content, fontSize: 16, color: '#ffffff', fontFamily: 'Inter',
        fontWeight: '400', fontStyle: 'normal', textAlign: 'left',
        lineHeight: 1.4, letterSpacing: 0, textDecoration: 'none',
        ...overrides,
    } as TextElement;
}

function makeShapeEl(id: string, name: string, fill: string): ShapeElement {
    return {
        id, name, type: 'shape', role: 'background',
        constraints: makeConstraints(), zIndex: 0, opacity: 1,
        shapeType: 'rect', fill, borderRadius: 0,
    } as ShapeElement;
}

describe('designStoreTypes', () => {

    // ── getActiveCS ──

    describe('getActiveCS', () => {
        it('should return undefined when no active ID', () => {
            const state = { activeCreativeSetId: null, allCreativeSets: {} } as unknown as DesignState;
            expect(getActiveCS(state)).toBeUndefined();
        });

        it('should return undefined for non-existent ID', () => {
            const state = { activeCreativeSetId: 'missing', allCreativeSets: {} } as unknown as DesignState;
            expect(getActiveCS(state)).toBeUndefined();
        });

        it('should return the correct creative set', () => {
            const cs = { id: 'cs-1', name: 'Test' };
            const state = {
                activeCreativeSetId: 'cs-1',
                allCreativeSets: { 'cs-1': cs },
            } as unknown as DesignState;
            expect(getActiveCS(state)).toBe(cs);
        });
    });

    // ── mergePropertyChanges ──

    describe('mergePropertyChanges', () => {
        it('should merge visual properties from origin to target', () => {
            const target = [makeTextEl('t1', 'Headline', 'Old Text', { color: '#aaaaaa' })];
            const origin = [makeTextEl('t1', 'Headline', 'New Text', { color: '#ff0000', fontWeight: '700' })];

            const result = mergePropertyChanges(
                target as DesignElement[], origin as DesignElement[],
                300, 250, 300, 250,
            );

            expect(result).toHaveLength(1);
            const merged = result[0] as TextElement;
            expect(merged.content).toBe('New Text');
            expect(merged.color).toBe('#ff0000');
            expect(merged.fontWeight).toBe('700');
        });

        it('should preserve target constraints (position/size)', () => {
            const targetConstraints = {
                position: { x: { anchor: 'left' as const, offset: 999 }, y: { anchor: 'top' as const, offset: 888 } },
                size: { width: 200, height: 100 },
                rotation: 45,
            };
            const target = [{ ...makeTextEl('t1', 'H', 'old'), constraints: targetConstraints }];
            const origin = [makeTextEl('t1', 'H', 'new')];

            const result = mergePropertyChanges(
                target as DesignElement[], origin as DesignElement[],
                300, 250, 300, 250,
            );

            expect((result[0] as TextElement).constraints.position.x.offset).toBe(999);
            expect((result[0] as TextElement).constraints.size.width).toBe(200);
        });

        it('should match by name first, fallback to id', () => {
            const target = [makeTextEl('id-A', 'Headline', 'Target')];
            const origin = [makeTextEl('id-B', 'Headline', 'Origin')]; // same name, diff id

            const result = mergePropertyChanges(
                target as DesignElement[], origin as DesignElement[],
                300, 250, 300, 250,
            );

            expect(result).toHaveLength(1);
            expect((result[0] as TextElement).content).toBe('Origin');
        });

        it('should drop target elements not in origin (deletion)', () => {
            const target = [
                makeTextEl('t1', 'Keep', 'keep'),
                makeTextEl('t2', 'Remove', 'delete this'),
            ];
            const origin = [makeTextEl('t1', 'Keep', 'keep')];

            const result = mergePropertyChanges(
                target as DesignElement[], origin as DesignElement[],
                300, 250, 300, 250,
            );

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Keep');
        });

        it('should add NEW elements from origin that are missing in target', () => {
            const target = [makeTextEl('t1', 'Existing', 'text')];
            const origin = [
                makeTextEl('t1', 'Existing', 'text'),
                makeShapeEl('s1', 'NewShape', '#ff0000'),
            ];

            const result = mergePropertyChanges(
                target as DesignElement[], origin as DesignElement[],
                300, 250, 600, 500, // different target size → smartSize called
            );

            expect(result).toHaveLength(2);
        });

        it('should merge shape fill property', () => {
            const target = [makeShapeEl('s1', 'BG', '#000000')];
            const origin = [makeShapeEl('s1', 'BG', '#ff6b35')];

            const result = mergePropertyChanges(
                target as DesignElement[], origin as DesignElement[],
                300, 250, 300, 250,
            );

            expect((result[0] as ShapeElement).fill).toBe('#ff6b35');
        });

        it('should merge gradient properties', () => {
            const target = [makeShapeEl('s1', 'Accent', '#000')];
            const origin = [{
                ...makeShapeEl('s1', 'Accent', '#000'),
                gradientStart: '#ff0000',
                gradientEnd: '#0000ff',
                gradientAngle: 45,
            }];

            const result = mergePropertyChanges(
                target as DesignElement[], origin as DesignElement[],
                300, 250, 300, 250,
            );

            expect((result[0] as any).gradientStart).toBe('#ff0000');
            expect((result[0] as any).gradientEnd).toBe('#0000ff');
            expect((result[0] as any).gradientAngle).toBe(45);
        });

        it('should merge text alignment and spacing', () => {
            const target = [makeTextEl('t1', 'H', 'text', { textAlign: 'left', lineHeight: 1.0, letterSpacing: 0 })];
            const origin = [makeTextEl('t1', 'H', 'text', { textAlign: 'center', lineHeight: 1.6, letterSpacing: 2 })];

            const result = mergePropertyChanges(
                target as DesignElement[], origin as DesignElement[],
                300, 250, 300, 250,
            );

            const merged = result[0] as TextElement;
            expect(merged.textAlign).toBe('center');
            expect(merged.lineHeight).toBe(1.6);
            expect(merged.letterSpacing).toBe(2);
        });

        it('should handle empty origin (returns empty)', () => {
            const target = [makeTextEl('t1', 'H', 'text')];
            const result = mergePropertyChanges(
                target as DesignElement[], [],
                300, 250, 300, 250,
            );
            expect(result).toHaveLength(0);
        });

        it('should handle empty target (adds all origin elements as new)', () => {
            const origin = [makeTextEl('t1', 'H', 'text')];
            const result = mergePropertyChanges(
                [], origin as DesignElement[],
                300, 250, 600, 500,
            );
            expect(result).toHaveLength(1);
        });
    });
});
