// ─────────────────────────────────────────────────
// executorCompound.test.ts — AI executor unit tests
// ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/useAnimationPresets', () => ({
    useAnimPresetStore: {
        getState: () => ({
            presets: {},
            setPreset: vi.fn(),
        }),
    },
}));

vi.mock('./contextRouter', () => ({
    STORE_API_REFERENCE: '[STORE_API_REF]',
}));

import {
    executeAddText,
    executeSetAnimPreset,
    executeCreateLayout,
    executeAnimateAll,
    analyzeScene,
    setExecuteToolCallRef,
} from './executorCompound';
import type { SceneNodeInfo } from './agentContext';

// ── Mock Engine ──
function mockEngine() {
    return {
        add_text: vi.fn().mockReturnValue(10),
        add_rect: vi.fn().mockReturnValue(20),
        add_rounded_rect: vi.fn().mockReturnValue(21),
        add_ellipse: vi.fn().mockReturnValue(22),
        add_keyframe: vi.fn(),
        set_duration: vi.fn(),
        set_looping: vi.fn(),
        anim_duration: vi.fn().mockReturnValue(0),
    };
}

function emptyTracked(): SceneNodeInfo[] { return []; }

// ══════════════════════════════════════════════════
// executeAddText
// ══════════════════════════════════════════════════

describe('executeAddText', () => {
    it('creates text with default params', () => {
        const eng = mockEngine();
        const tracked = emptyTracked();
        const r = executeAddText(eng, { content: 'Hello' }, tracked);
        expect(r.success).toBe(true);
        expect(eng.add_text).toHaveBeenCalledOnce();
        expect(tracked.length).toBe(1);
        expect(tracked[0]!.type).toBe('text');
    });

    it('rejects empty content', () => {
        const r = executeAddText(mockEngine(), { content: '  ' }, emptyTracked());
        expect(r.success).toBe(false);
        expect(r.message).toContain('empty');
    });

    it('passes custom position and font', () => {
        const eng = mockEngine();
        executeAddText(eng, { content: 'Hi', x: 100, y: 200, font_size: 36, font_weight: '700' }, emptyTracked());
        const call = eng.add_text.mock.calls[0];
        expect(call[0]).toBe(100); // x
        expect(call[1]).toBe(200); // y
        expect(call[3]).toBe(36);  // fontSize
        expect(call[5]).toBe('700'); // fontWeight
    });

    it('converts color_hex to RGB', () => {
        const eng = mockEngine();
        executeAddText(eng, { content: 'Hi', color_hex: '#ff0000' }, emptyTracked());
        const call = eng.add_text.mock.calls[0];
        expect(call[6]).toBeCloseTo(1, 1); // r
        expect(call[7]).toBeCloseTo(0, 1); // g
        expect(call[8]).toBeCloseTo(0, 1); // b
    });

    it('tracks created node with correct info', () => {
        const eng = mockEngine();
        const tracked = emptyTracked();
        executeAddText(eng, { content: 'Title', x: 50, y: 30, font_size: 24, width: 300 }, tracked);
        expect(tracked[0]!.id).toBe(10);
        expect(tracked[0]!.x).toBe(50);
        expect(tracked[0]!.width).toBe(300);
    });
});

// ══════════════════════════════════════════════════
// executeSetAnimPreset
// ══════════════════════════════════════════════════

describe('executeSetAnimPreset', () => {
    it('rejects invalid node_id', () => {
        const r = executeSetAnimPreset(mockEngine(), { node_id: 0 }, emptyTracked());
        expect(r.success).toBe(false);
    });

    it('rejects missing node_id', () => {
        const r = executeSetAnimPreset(mockEngine(), {}, emptyTracked());
        expect(r.success).toBe(false);
    });

    it('applies fade preset with keyframes', () => {
        const eng = mockEngine();
        const r = executeSetAnimPreset(eng, { node_id: 5, preset: 'fade', duration: 0.5, delay: 0.2 }, emptyTracked());
        expect(r.success).toBe(true);
        expect(eng.add_keyframe).toHaveBeenCalledWith(5, 'opacity', 0.2, 0, 'ease_out');
        expect(eng.add_keyframe).toHaveBeenCalledWith(5, 'opacity', 0.7, 1, 'ease_out');
    });

    it('applies slide-left preset', () => {
        const eng = mockEngine();
        executeSetAnimPreset(eng, { node_id: 5, preset: 'slide-left' }, emptyTracked());
        expect(eng.add_keyframe).toHaveBeenCalledWith(5, 'x', expect.any(Number), -200, 'ease_out');
    });

    it('applies scale preset (x and y)', () => {
        const eng = mockEngine();
        executeSetAnimPreset(eng, { node_id: 5, preset: 'scale' }, emptyTracked());
        const calls = eng.add_keyframe.mock.calls;
        expect(calls.some((c: any) => c[1] === 'scale_x')).toBe(true);
        expect(calls.some((c: any) => c[1] === 'scale_y')).toBe(true);
    });

    it('tracks animation in node info', () => {
        const tracked: SceneNodeInfo[] = [{
            id: 5, type: 'text', x: 0, y: 0, width: 100, height: 20,
            color: '#fff', opacity: 1, label: 'HL', animations: [],
        }];
        executeSetAnimPreset(mockEngine(), { node_id: 5, preset: 'fade' }, tracked);
        expect(tracked[0]!.animations).toContain('fade +0s');
    });
});

// ══════════════════════════════════════════════════
// executeCreateLayout
// ══════════════════════════════════════════════════

describe('executeCreateLayout', () => {
    it('creates N elements in row pattern', () => {
        const eng = mockEngine();
        const tracked = emptyTracked();
        const r = executeCreateLayout(eng, { pattern: 'row', count: 3, element_type: 'rect' }, tracked);
        expect(r.success).toBe(true);
        expect(eng.add_rect).toHaveBeenCalledTimes(3);
        expect(tracked.length).toBe(3);
    });

    it('creates column layout', () => {
        const eng = mockEngine();
        const tracked = emptyTracked();
        executeCreateLayout(eng, { pattern: 'column', count: 4, start_x: 10, start_y: 10, spacing: 15, element_height: 40 }, tracked);
        // y positions should increment: 10, 10+40+15=65, 120, 175
        expect(tracked[1]!.y).toBe(65);
        expect(tracked[2]!.y).toBe(120);
    });

    it('creates grid layout', () => {
        const eng = mockEngine();
        const tracked = emptyTracked();
        executeCreateLayout(eng, { pattern: 'grid', count: 4 }, tracked);
        // 4 elements → ceil(sqrt(4))=2 cols
        expect(tracked.length).toBe(4);
    });

    it('creates circle layout', () => {
        const eng = mockEngine();
        const tracked = emptyTracked();
        executeCreateLayout(eng, { pattern: 'circle', count: 6 }, tracked);
        expect(tracked.length).toBe(6);
    });

    it('uses ellipse element type', () => {
        const eng = mockEngine();
        executeCreateLayout(eng, { element_type: 'ellipse', count: 2 }, emptyTracked());
        expect(eng.add_ellipse).toHaveBeenCalledTimes(2);
    });

    it('uses rounded_rect element type', () => {
        const eng = mockEngine();
        executeCreateLayout(eng, { element_type: 'rounded_rect', count: 2 }, emptyTracked());
        expect(eng.add_rounded_rect).toHaveBeenCalledTimes(2);
    });
});

// ══════════════════════════════════════════════════
// executeAnimateAll
// ══════════════════════════════════════════════════

describe('executeAnimateAll', () => {
    it('applies fade_in to all tracked nodes', () => {
        const eng = mockEngine();
        const tracked: SceneNodeInfo[] = [
            { id: 1, type: 'rect', x: 0, y: 0, width: 50, height: 50, color: '#f00', opacity: 1, label: 'A', animations: [] },
            { id: 2, type: 'rect', x: 0, y: 0, width: 50, height: 50, color: '#0f0', opacity: 1, label: 'B', animations: [] },
        ];
        const r = executeAnimateAll(eng, { animation_type: 'fade_in' }, tracked);
        expect(r.success).toBe(true);
        expect(eng.add_keyframe.mock.calls.length).toBe(4); // 2 nodes × 2 keyframes
    });

    it('applies stagger delay', () => {
        const eng = mockEngine();
        const tracked: SceneNodeInfo[] = [
            { id: 1, type: 'rect', x: 0, y: 0, width: 50, height: 50, color: '#f00', opacity: 1, label: 'A', animations: [] },
            { id: 2, type: 'rect', x: 0, y: 0, width: 50, height: 50, color: '#0f0', opacity: 1, label: 'B', animations: [] },
        ];
        executeAnimateAll(eng, { animation_type: 'fade_in', stagger: 0.3 }, tracked);
        // Node 2 should start at delay = 1 * 0.3 = 0.3
        const node2Calls = eng.add_keyframe.mock.calls.filter((c: any) => c[0] === 2);
        expect(node2Calls[0][2]).toBeCloseTo(0.3); // start time
    });

    it('sets duration and looping', () => {
        const eng = mockEngine();
        executeAnimateAll(eng, { animation_type: 'rotate', duration: 3.0 }, emptyTracked());
        expect(eng.set_duration).toHaveBeenCalled();
        expect(eng.set_looping).toHaveBeenCalledWith(true);
    });
});

// ══════════════════════════════════════════════════
// analyzeScene
// ══════════════════════════════════════════════════

describe('analyzeScene', () => {
    it('returns empty message for empty canvas', () => {
        const r = analyzeScene([]);
        expect(r).toContain('empty');
        expect(r).toContain('[STORE_API_REF]');
    });

    it('lists all elements', () => {
        const tracked: SceneNodeInfo[] = [
            { id: 1, type: 'rect', x: 10, y: 20, width: 100, height: 80, color: '#f00', opacity: 1, label: 'BG', animations: [] },
            { id: 2, type: 'text', x: 30, y: 40, width: 200, height: 30, color: '#fff', opacity: 1, label: 'HL', animations: [] },
        ];
        const r = analyzeScene(tracked);
        expect(r).toContain('2 elements');
        expect(r).toContain('BG');
        expect(r).toContain('HL');
    });

    it('detects overlapping elements', () => {
        const tracked: SceneNodeInfo[] = [
            { id: 1, type: 'rect', x: 0, y: 0, width: 100, height: 100, color: '#f00', opacity: 1, label: 'A', animations: [] },
            { id: 2, type: 'rect', x: 50, y: 50, width: 100, height: 100, color: '#0f0', opacity: 1, label: 'B', animations: [] },
        ];
        const r = analyzeScene(tracked);
        expect(r).toContain('overlaps');
    });

    it('no overlap warning for non-overlapping', () => {
        const tracked: SceneNodeInfo[] = [
            { id: 1, type: 'rect', x: 0, y: 0, width: 50, height: 50, color: '#f00', opacity: 1, label: 'A', animations: [] },
            { id: 2, type: 'rect', x: 200, y: 200, width: 50, height: 50, color: '#0f0', opacity: 1, label: 'B', animations: [] },
        ];
        const r = analyzeScene(tracked);
        expect(r).not.toContain('overlaps');
    });

    it('★ REGRESSION: falls back to designStore when trackedNodes is empty', async () => {
        // Import the actual store (not mocked)
        const { useDesignStore } = await vi.importActual<typeof import('@/stores/designStore')>('@/stores/designStore');
        useDesignStore.setState({ allCreativeSets: {}, activeCreativeSetId: null, creativeSet: null });
        useDesignStore.getState().createCreativeSet('Test', {
            id: 'p1', name: '300x250', width: 300, height: 250, category: 'display',
        });
        useDesignStore.getState().addElementToMaster({
            id: 'el-1', name: 'Headline', type: 'text',
            content: 'Hello World', fontFamily: 'Inter', fontSize: 32, fontWeight: 700,
            fontStyle: 'normal', color: '#fff', textAlign: 'center',
            lineHeight: 1.2, letterSpacing: 0, autoShrink: false,
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 40 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 200, height: 40 }, rotation: 0 },
            opacity: 1, visible: true, locked: false, zIndex: 1,
        });

        const result = analyzeScene([]);
        // Should NOT say "empty"
        expect(result).toContain('Headline');
        expect(result).toContain('Hello World');
        expect(result).toContain('from store');
        // Cleanup
        useDesignStore.setState({ allCreativeSets: {}, activeCreativeSetId: null, creativeSet: null });
    });
});
