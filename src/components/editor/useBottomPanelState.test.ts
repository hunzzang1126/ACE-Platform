// ─────────────────────────────────────────────────
// useBottomPanelState — Regression tests for bar drag listener gap
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './useBottomPanelState.ts'), 'utf-8');

describe('★ REGRESSION GUARD: Bar drag listener gap (v512)', () => {
    it('useEffect deps only include barDrag', () => {
        expect(src).toContain('}, [barDrag]); // ★ Only barDrag');
    });

    it('uses durationRef instead of duration closure', () => {
        expect(src).toContain('durationRef.current');
        expect(src).toContain('const durationRef = useRef(duration)');
    });

    it('uses animPresetsRef instead of animPresets closure', () => {
        expect(src).toContain('animPresetsRef.current.setTiming');
        expect(src).toContain('const animPresetsRef = useRef(animPresets)');
    });

    it('uses engineRef instead of engine closure', () => {
        expect(src).toContain('engineRef.current?.anim_seek');
        expect(src).toContain('const engineRef = useRef(engine)');
    });

    it('uses recalcDurationRef instead of recalcDuration closure', () => {
        expect(src).toContain('recalcDurationRef.current()');
    });
});

describe('useBottomPanelState — Exports and structure', () => {
    it('exports useBottomPanelState function', () => {
        expect(src).toContain('export function useBottomPanelState');
    });

    it('handles bar drag modes: move, resize-left, resize-right', () => {
        expect(src).toContain("'move'");
        expect(src).toContain("'resize-left'");
        expect(src).toContain("'resize-right'");
    });

    it('has MAX_DURATION limit', () => {
        expect(src).toContain('MAX_DURATION');
        expect(src).toContain('const MAX_DURATION = 20');
    });

    it('exposes playback controls', () => {
        expect(src).toContain('handlePlay');
        expect(src).toContain('handlePause');
        expect(src).toContain('handleStop');
        expect(src).toContain('handleSeek');
    });

    it('supports looping toggle', () => {
        expect(src).toContain('handleToggleLoop');
        expect(src).toContain('set_looping');
    });

    it('supports speed control', () => {
        expect(src).toContain('handleSpeedChange');
        expect(src).toContain('anim_set_speed');
    });

    it('auto-extends/shrinks duration based on bar positions', () => {
        expect(src).toContain('recalcDuration');
        expect(src).toContain('Auto-extend/shrink');
    });

    it('registers mousemove and mouseup on document', () => {
        expect(src).toContain("document.addEventListener('mousemove', handleMove)");
        expect(src).toContain("document.addEventListener('mouseup', handleUp)");
    });

    it('sets cursor to grabbing during move drag', () => {
        expect(src).toContain("'grabbing'");
    });

    it('sets cursor to ew-resize during bar resize', () => {
        expect(src).toContain("'ew-resize'");
    });
});
