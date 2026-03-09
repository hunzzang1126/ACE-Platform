// ─────────────────────────────────────────────────
// editorStore — Regression Tests
// ─────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';

beforeEach(() => {
    useEditorStore.setState({
        activeLayer: 'dashboard',
        selectedElementIds: [],
        activeVariantId: null,
        zoom: 1,
        panX: 0,
        panY: 0,
        activeTool: 'select',
    });
});

describe('editorStore — Selection', () => {
    it('selectElements sets element IDs', () => {
        useEditorStore.getState().selectElements(['a', 'b']);
        expect(useEditorStore.getState().selectedElementIds).toEqual(['a', 'b']);
    });

    it('addToSelection appends unique ID', () => {
        useEditorStore.getState().selectElements(['a']);
        useEditorStore.getState().addToSelection('b');
        expect(useEditorStore.getState().selectedElementIds).toEqual(['a', 'b']);
    });

    it('addToSelection deduplicates — no double add', () => {
        useEditorStore.getState().selectElements(['a']);
        useEditorStore.getState().addToSelection('a');
        expect(useEditorStore.getState().selectedElementIds).toEqual(['a']);
    });

    it('clearSelection empties the array', () => {
        useEditorStore.getState().selectElements(['a', 'b', 'c']);
        useEditorStore.getState().clearSelection();
        expect(useEditorStore.getState().selectedElementIds).toEqual([]);
    });
});

describe('editorStore — Zoom', () => {
    it('setZoom updates value', () => {
        useEditorStore.getState().setZoom(2);
        expect(useEditorStore.getState().zoom).toBe(2);
    });

    it('setZoom clamps minimum to 0.1', () => {
        useEditorStore.getState().setZoom(0.01);
        expect(useEditorStore.getState().zoom).toBe(0.1);
    });

    it('setZoom clamps maximum to 10', () => {
        useEditorStore.getState().setZoom(999);
        expect(useEditorStore.getState().zoom).toBe(10);
    });

    it('setZoom accepts boundary values', () => {
        useEditorStore.getState().setZoom(0.1);
        expect(useEditorStore.getState().zoom).toBe(0.1);
        useEditorStore.getState().setZoom(10);
        expect(useEditorStore.getState().zoom).toBe(10);
    });
});

describe('editorStore — Pan', () => {
    it('setPan updates both panX and panY', () => {
        useEditorStore.getState().setPan(100, -50);
        expect(useEditorStore.getState().panX).toBe(100);
        expect(useEditorStore.getState().panY).toBe(-50);
    });

    it('setPan accepts negative values', () => {
        useEditorStore.getState().setPan(-200, -300);
        expect(useEditorStore.getState().panX).toBe(-200);
        expect(useEditorStore.getState().panY).toBe(-300);
    });
});

describe('editorStore — Tool & Layer', () => {
    it('setTool switches active tool', () => {
        useEditorStore.getState().setTool('shape');
        expect(useEditorStore.getState().activeTool).toBe('shape');
        useEditorStore.getState().setTool('text');
        expect(useEditorStore.getState().activeTool).toBe('text');
    });

    it('setLayer switches active layer', () => {
        useEditorStore.getState().setLayer('detail');
        expect(useEditorStore.getState().activeLayer).toBe('detail');
        useEditorStore.getState().setLayer('general');
        expect(useEditorStore.getState().activeLayer).toBe('general');
    });

    it('setActiveVariant sets and clears variant', () => {
        useEditorStore.getState().setActiveVariant('v-123');
        expect(useEditorStore.getState().activeVariantId).toBe('v-123');
        useEditorStore.getState().setActiveVariant(null);
        expect(useEditorStore.getState().activeVariantId).toBeNull();
    });
});
