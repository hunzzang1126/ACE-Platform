// BottomPanel.tsx.test.ts — Contract tests

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './BottomPanel.tsx'), 'utf-8');

describe('BottomPanel.tsx — exports', () => {
    it('exports BottomPanel', () => { expect(src).toContain('export function BottomPanel'); });
});

describe('BottomPanel.tsx — dependencies', () => {
    it('imports from react', () => { expect(src).toContain("react"); });
    it('imports from design.types', () => { expect(src).toContain("design.types"); });
    it('imports from useCanvasEngine', () => { expect(src).toContain("useCanvasEngine"); });
    it('imports from useOverlayElements', () => { expect(src).toContain("useOverlayElements"); });
    it('imports from Icons', () => { expect(src).toContain("Icons"); });
    it('imports from useAnimationPresets', () => { expect(src).toContain("useAnimationPresets"); });
    it('imports from useLayerDrag', () => { expect(src).toContain("useLayerDrag"); });
    it('imports from bottomPanelHelpers', () => { expect(src).toContain("bottomPanelHelpers"); });
    it('imports from LayerRow', () => { expect(src).toContain("LayerRow"); });
    it('imports from TimelineBar', () => { expect(src).toContain("TimelineBar"); });
});

describe('BottomPanel.tsx — React patterns', () => {
    it('uses useState', () => { expect(src).toContain('useState'); });
    it('uses useCallback', () => { expect(src).toContain('useCallback'); });
    it('uses useMemo', () => { expect(src).toContain('useMemo'); });
    it('uses useRef', () => { expect(src).toContain('useRef'); });
    it('uses useEffect for resize/playhead drag', () => { expect(src).toContain('useEffect'); });
});

describe('★ Progressive Animation Disclosure (v0.0.0.599)', () => {
    it('checks hasAnyAnimation from BOTH saved elements AND live preset store', () => {
        expect(src).toContain('variant.elements.some(el => el.animation');
        expect(src).toContain('Object.values(livePresets).some(p => p.anim');
    });

    it('imports useAnimPresetStore for live preset detection', () => {
        expect(src).toContain('useAnimPresetStore');
    });

    it('subscribes to livePresets from the store', () => {
        expect(src).toContain('const livePresets = useAnimPresetStore');
    });

    it('hides timeline controls when hasAnyAnimation is false', () => {
        expect(src).toContain('{hasAnyAnimation && <div className="bp-timeline-header">');
    });

    it('hides ruler row when hasAnyAnimation is false', () => {
        expect(src).toContain('{hasAnyAnimation && <div className="bp-ruler-row">');
    });

    it('hides timeline bars when hasAnyAnimation is false', () => {
        expect(src).toContain('{hasAnyAnimation && <div className="bp-timeline-bars"');
    });

    it('expands layers to full width when no animations', () => {
        expect(src).toContain("style={hasAnyAnimation ? {} : { flex: 1, width: '100%', minWidth: 0 }}");
    });

    it('shows "Layers" label when static, "Layers & Timeline" when animated', () => {
        expect(src).toContain("hasAnyAnimation ? 'Layers & Timeline' : 'Layers'");
    });
});

describe('★ Panel Resize Handle (v0.0.0.599)', () => {
    it('renders bp-resize-handle div', () => {
        expect(src).toContain('bp-resize-handle');
    });

    it('renders resize dots indicator', () => {
        expect(src).toContain('bp-resize-dots');
    });

    it('tracks panelMaxH state for dynamic height', () => {
        expect(src).toContain('panelMaxH');
        expect(src).toContain('setPanelMaxH');
    });

    it('uses resizing ref to track drag state', () => {
        expect(src).toContain('resizingRef');
        expect(src).toContain('resizeStartY');
        expect(src).toContain('resizeStartH');
    });

    it('applies panelMaxH as maxHeight on bp-rows', () => {
        expect(src).toContain('style={{ maxHeight: panelMaxH }}');
    });
});

describe('★ Playhead Drag Scrubbing (v0.0.0.599)', () => {
    it('tracks draggingPlayhead state', () => {
        expect(src).toContain('draggingPlayhead');
        expect(src).toContain('setDraggingPlayhead');
    });

    it('has rulerRef for position calculation during drag', () => {
        expect(src).toContain('rulerRef');
        expect(src).toContain('ref={rulerRef}');
    });

    it('attaches onMouseDown to playhead element', () => {
        expect(src).toContain('onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingPlayhead(true);');
    });

    it('uses window mousemove listener for drag scrubbing', () => {
        expect(src).toContain("window.addEventListener('mousemove', onMove)");
        expect(src).toContain("window.addEventListener('mouseup', onUp)");
    });

    it('calculates seek position from mouse position during drag', () => {
        expect(src).toContain('if (draggingPlayhead && rulerRef.current)');
        expect(src).toContain('st.handleSeek(pct * duration)');
    });
});

describe('★ Cursor Threshold (v0.0.0.600)', () => {
    it('uses 6px cursor edge threshold (synced with EDGE_PX)', () => {
        expect(src).toContain('localX <= 6 || localX >= rect.width - 6');
    });
});
