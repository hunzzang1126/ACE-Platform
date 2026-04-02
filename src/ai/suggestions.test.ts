// ─────────────────────────────────────────────────
// suggestions.test.ts — Proactive design suggestions tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { generateSuggestions } from './suggestions';
import type { SceneNodeInfo } from './agentContext';

// ── Helpers ──

function makeNode(overrides: Partial<SceneNodeInfo> & { id: number }): SceneNodeInfo {
    return {
        type: 'rect',
        x: 0, y: 0, width: 100, height: 50,
        color: '#ff0000', opacity: 1, zIndex: 0,
        label: `Element #${overrides.id}`,
        effects: { hasShadow: false, brightness: 1, contrast: 1, saturation: 1, hueRotate: 0, blendMode: 'normal' },
        animations: [],
        ...overrides,
    };
}

describe('generateSuggestions', () => {

    // ── Empty Canvas ──

    it('should suggest demo layout when canvas is empty', () => {
        const suggestions = generateSuggestions([]);
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].id).toBe('empty-canvas');
        expect(suggestions[0].type).toBe('tip');
    });

    it('should include action with prompt for empty canvas', () => {
        const suggestions = generateSuggestions([]);
        expect(suggestions[0].action).toBeDefined();
        expect(suggestions[0].action!.prompt).toBeTruthy();
    });

    // ── Shadow Detection ──

    it('should suggest adding shadows when no elements have shadows', () => {
        const nodes = [
            makeNode({ id: 1 }),
            makeNode({ id: 2 }),
        ];
        const suggestions = generateSuggestions(nodes);
        const shadowSuggestion = suggestions.find(s => s.id === 'add-shadows');
        expect(shadowSuggestion).toBeDefined();
        expect(shadowSuggestion!.type).toBe('improvement');
    });

    it('should not suggest shadows when some elements have shadows', () => {
        const nodes = [
            makeNode({ id: 1, effects: { hasShadow: true, brightness: 1, contrast: 1, saturation: 1, hueRotate: 0, blendMode: 'normal' } }),
            makeNode({ id: 2 }),
        ];
        const suggestions = generateSuggestions(nodes);
        const shadowSuggestion = suggestions.find(s => s.id === 'add-shadows');
        expect(shadowSuggestion).toBeUndefined();
    });

    // ── Overlap Detection ──

    it('should detect overlapping elements', () => {
        const nodes = [
            makeNode({ id: 1, x: 0, y: 0, width: 100, height: 100 }),
            makeNode({ id: 2, x: 50, y: 50, width: 100, height: 100 }),
        ];
        const suggestions = generateSuggestions(nodes);
        const overlapSuggestion = suggestions.find(s => s.id.startsWith('overlap'));
        expect(overlapSuggestion).toBeDefined();
        expect(overlapSuggestion!.type).toBe('warning');
    });

    it('should not report overlap for non-overlapping elements', () => {
        const nodes = [
            makeNode({ id: 1, x: 0, y: 0, width: 100, height: 100 }),
            makeNode({ id: 2, x: 200, y: 200, width: 100, height: 100 }),
        ];
        const suggestions = generateSuggestions(nodes);
        const overlapSuggestion = suggestions.find(s => s.id.startsWith('overlap'));
        expect(overlapSuggestion).toBeUndefined();
    });

    // ── Animation Detection ──

    it('should suggest animations when elements >= 2 and none have animations', () => {
        const nodes = [makeNode({ id: 1 }), makeNode({ id: 2 })];
        const suggestions = generateSuggestions(nodes);
        const animSuggestion = suggestions.find(s => s.id === 'add-animation');
        expect(animSuggestion).toBeDefined();
        expect(animSuggestion!.type).toBe('tip');
    });

    it('should not suggest animations when some elements are animated', () => {
        const nodes = [
            makeNode({ id: 1, animations: [{ name: 'fade', startTime: 0, duration: 0.3 }] as any }),
            makeNode({ id: 2 }),
        ];
        const suggestions = generateSuggestions(nodes);
        const animSuggestion = suggestions.find(s => s.id === 'add-animation');
        expect(animSuggestion).toBeUndefined();
    });

    it('should not suggest animations for single element', () => {
        const nodes = [makeNode({ id: 1 })];
        const suggestions = generateSuggestions(nodes);
        const animSuggestion = suggestions.find(s => s.id === 'add-animation');
        expect(animSuggestion).toBeUndefined();
    });

    // ── Alignment Detection ──

    it('should suggest alignment when 3+ elements have different Y positions', () => {
        // Use non-overlapping elements with shadows and animations
        // to avoid those suggestions filling the max-3 slots
        const shadowed = { hasShadow: true, brightness: 1, contrast: 1, saturation: 1, hueRotate: 0, blendMode: 'normal' as const };
        const nodes = [
            makeNode({ id: 1, x: 0, y: 10, width: 50, height: 50, effects: shadowed, animations: [{ name: 'fade' }] as any }),
            makeNode({ id: 2, x: 100, y: 50, width: 50, height: 50, effects: shadowed, animations: [{ name: 'fade' }] as any }),
            makeNode({ id: 3, x: 200, y: 90, width: 50, height: 50, effects: shadowed, animations: [{ name: 'fade' }] as any }),
        ];
        const suggestions = generateSuggestions(nodes);
        const alignSuggestion = suggestions.find(s => s.id === 'align-elements');
        expect(alignSuggestion).toBeDefined();
        expect(alignSuggestion!.type).toBe('improvement');
    });

    it('should not suggest alignment when elements are already aligned', () => {
        const nodes = [
            makeNode({ id: 1, y: 50 }),
            makeNode({ id: 2, y: 50 }),
            makeNode({ id: 3, y: 51 }), // within 10px tolerance
        ];
        const suggestions = generateSuggestions(nodes);
        const alignSuggestion = suggestions.find(s => s.id === 'align-elements');
        expect(alignSuggestion).toBeUndefined();
    });

    it('should not suggest alignment for fewer than 3 elements', () => {
        const nodes = [
            makeNode({ id: 1, y: 10 }),
            makeNode({ id: 2, y: 90 }),
        ];
        const suggestions = generateSuggestions(nodes);
        const alignSuggestion = suggestions.find(s => s.id === 'align-elements');
        expect(alignSuggestion).toBeUndefined();
    });

    // ── Max Suggestions ──

    it('should return at most 3 suggestions', () => {
        const nodes = [
            makeNode({ id: 1, x: 0, y: 10, width: 200, height: 200 }),
            makeNode({ id: 2, x: 50, y: 50, width: 200, height: 200 }),
            makeNode({ id: 3, x: 100, y: 90, width: 200, height: 200 }),
        ];
        const suggestions = generateSuggestions(nodes);
        expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    // ── Action Structure ──

    it('should include action with label and prompt on actionable suggestions', () => {
        const nodes = [makeNode({ id: 1 }), makeNode({ id: 2 })];
        const suggestions = generateSuggestions(nodes);
        for (const s of suggestions) {
            if (s.action) {
                expect(s.action.label).toBeTruthy();
                expect(s.action.prompt).toBeTruthy();
            }
        }
    });
});
