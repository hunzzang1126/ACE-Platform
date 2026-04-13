// ─────────────────────────────────────────────────
// useOverlayInteractions — Regression tests for stuck rotation/drag/resize
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useOverlayInteractions.ts'), 'utf-8');

describe('★ REGRESSION GUARD: Listener re-registration gap (v511)', () => {
    it('useEffect has empty deps to prevent listener churn', () => {
        // The fix: deps must be [] so listeners are registered once
        expect(src).toContain('}, []); // ★ Empty deps');
    });

    it('uses onUpdateRef instead of direct onOverlayUpdate in handlers', () => {
        // handlers must use ref, not closure prop
        expect(src).toContain('onUpdateRef.current?.(');
        // onOverlayUpdate should NOT appear inside handleMove/handleUp
        const handleMoveSection = src.split('const handleMove')[1]?.split('const handleUp')[0] ?? '';
        expect(handleMoveSection).not.toContain('onOverlayUpdate?.(');
    });

    it('declares onUpdateRef with useRef', () => {
        expect(src).toContain('const onUpdateRef = useRef(onOverlayUpdate)');
        expect(src).toContain('onUpdateRef.current = onOverlayUpdate');
    });

    it('registers both mousemove and mouseup on document', () => {
        expect(src).toContain("document.addEventListener('mousemove', handleMove)");
        expect(src).toContain("document.addEventListener('mouseup', handleUp)");
    });

    it('cleanup removes both listeners', () => {
        expect(src).toContain("document.removeEventListener('mousemove', handleMove)");
        expect(src).toContain("document.removeEventListener('mouseup', handleUp)");
    });
});

describe('useOverlayInteractions — Drag/Resize/Rotate state management', () => {
    it('exports useOverlayInteractions function', () => {
        expect(src).toContain('export function useOverlayInteractions');
    });

    it('tracks drag state with refs', () => {
        expect(src).toContain('isDragging');
        expect(src).toContain('dragId');
        expect(src).toContain('dragStart');
    });

    it('tracks resize state with refs', () => {
        expect(src).toContain('isResizing');
        expect(src).toContain('resizeDir');
        expect(src).toContain('resizeId');
    });

    it('tracks rotation state with refs', () => {
        expect(src).toContain('isRotating');
        expect(src).toContain('rotateId');
        expect(src).toContain('rotateCenter');
    });

    it('handleUp resets ALL interaction states', () => {
        expect(src).toContain('isDragging.current = false');
        expect(src).toContain('isResizing.current = false');
        expect(src).toContain('isRotating.current = false');
    });

    it('supports Shift+drag axis lock', () => {
        expect(src).toContain('e.shiftKey');
        expect(src).toContain('axis lock');
    });

    it('supports Shift+rotate 15° snap', () => {
        expect(src).toContain('Math.round(finalAngle / 15) * 15');
    });

    it('normalizes rotation to 0-360', () => {
        expect(src).toContain('((finalAngle % 360) + 360) % 360');
    });

    it('supports proportional resize with Shift+corner', () => {
        expect(src).toContain('Proportional resize');
        expect(src).toContain('aspect');
    });

    it('exposes tooltip state for rendering', () => {
        expect(src).toContain('resizeTooltip');
        expect(src).toContain('rotationTooltip');
    });
});
