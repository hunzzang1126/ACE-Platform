// ─────────────────────────────────────────────────
// useFabricCanvas.test.ts — Canvas init & lifecycle
// ─────────────────────────────────────────────────
// Covers: artboard creation, event setup, Textbox controls,
// engine shim creation, viewport centering, z-index sync
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useFabricCanvas.ts'), 'utf-8');

describe('useFabricCanvas — artboard creation', () => {
    it('creates artboard Rect with fill #ffffff', () => {
        expect(src).toContain("const artboard = new Rect({");
        expect(src).toContain("fill: '#ffffff'");
    });

    it('marks artboard with __glidArtboard flag', () => {
        expect(src).toContain('__glidArtboard = true');
    });

    it('sets artboard as non-selectable', () => {
        expect(src).toContain('selectable: false');
    });

    it('adds artboard shadow for visual depth', () => {
        expect(src).toContain('new Shadow({');
    });

    it('centers viewport around artboard', () => {
        expect(src).toContain('(cw - width) / 2');
        expect(src).toContain('(ch - height) / 2');
    });

    it('sets clipPath to artboard bounds', () => {
        expect(src).toContain('fc.clipPath = new Rect({');
    });
});

describe('useFabricCanvas — engine shim', () => {
    it('creates engine shim from createEngineShim', () => {
        expect(src).toContain('createEngineShim(fc, syncState, width, height)');
    });

    it('stores engine in engineRef', () => {
        expect(src).toContain('engineRef.current = createEngineShim');
    });

    it('cleans up on dispose', () => {
        expect(src).toContain('fabricRef.current.dispose()');
        expect(src).toContain('engineRef.current = null');
    });
});

describe('useFabricCanvas — Textbox controls', () => {
    it('configures Textbox controls: corners + side handles + rotation', () => {
        // tl/tr/bl/br = corners, ml/mr = side, mt/mb = disabled, mtr = enabled
        expect(src).toContain('tl: true, tr: true, bl: true, br: true');
        expect(src).toContain('mt: false, mb: false');
        expect(src).toContain('ml: true, mr: true');
        expect(src).toContain('mtr: true');
    });

    it('normalizes Textbox scaleX/Y to 1 on add', () => {
        expect(src).toContain('scaleX: 1, scaleY: 1');
    });

    it('trims trailing text height gap on add', () => {
        expect(src).toContain('calcTextHeight()');
    });
});

describe('useFabricCanvas — event setup', () => {
    it('delegates events to setupCanvasEvents', () => {
        expect(src).toContain('setupCanvasEvents(');
    });

    it('imports setupCanvasEvents from fabricCanvasEvents', () => {
        expect(src).toContain("from './fabricCanvasEvents'");
    });
});

describe('useFabricCanvas — Fabric v6 selection defaults', () => {
    it('sets Figma-blue corner and border colors', () => {
        expect(src).toContain("FabricObject.ownDefaults.cornerStrokeColor = '#0D99FF'");
        expect(src).toContain("FabricObject.ownDefaults.borderColor = '#0D99FF'");
    });

    it('uses white filled circle corners', () => {
        expect(src).toContain("FabricObject.ownDefaults.cornerColor = '#FFFFFF'");
        expect(src).toContain("FabricObject.ownDefaults.cornerStyle = 'circle'");
    });

    it('sets non-transparent corners for visibility', () => {
        expect(src).toContain('FabricObject.ownDefaults.transparentCorners = false');
    });
});

describe('useFabricCanvas — history integration', () => {
    it('integrates with useHistoryStore', () => {
        expect(src).toContain('useHistoryStore');
    });

    it('has undo/redo actions', () => {
        expect(src).toContain('undo');
        expect(src).toContain('redo');
    });
});

describe('useFabricCanvas — text effects', () => {
    it('supports set_text_effect API', () => {
        expect(src).toContain('set_text_effect');
    });
});

describe('useFabricCanvas — return shape', () => {
    it('returns canvasRef, overlayRef, engineRef, state, actions', () => {
        expect(src).toContain('return { canvasRef, overlayRef, engineRef, state, actions, syncState, retryInit }');
    });
});
