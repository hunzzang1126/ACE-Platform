// ─────────────────────────────────────────────────
// useBottomPanelState — Playback + bar drag logic for BottomPanel
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { EngineNode } from '@/hooks/useCanvasEngine';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';
import type { Engine, UnifiedLayer } from './bottomPanelHelpers';

/** All state and handlers needed by the BottomPanel render layer */
export function useBottomPanelState(
    engine: Engine | undefined,
    nodes: EngineNode[],
    overlayElements: OverlayElement[],
) {
    const animPresets = useAnimPresetStore();
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const MAX_DURATION = 20;
    const DEFAULT_DURATION = 5;
    const [duration, setDuration] = useState(DEFAULT_DURATION);
    const [looping, setLooping] = useState(false);
    const [speed, setSpeed] = useState(1.0);
    const rafRef = useRef<number>(0);

    // ── Bar drag state ──
    const [barDrag, setBarDrag] = useState<{
        elementId: string; mode: 'move' | 'resize-left' | 'resize-right';
        startX: number; origStart: number; origEnd: number;
    } | null>(null);
    const timelineBarsRef = useRef<HTMLDivElement>(null);

    // ── Auto-duration: expand/contract based on furthest bar end (max 20s) ──
    const recalcDuration = useCallback(() => {
        const store = useAnimPresetStore.getState();
        const allIds = [...overlayElements.map(el => el.id), ...nodes.map(n => String(n.id))];
        let maxEnd = 0.5;
        for (const id of allIds) {
            const cfg = store.getPreset(id);
            const et = cfg.endTime < 0 ? 5 : cfg.endTime; // -1 default = 5s, NOT current duration
            if (et > maxEnd) maxEnd = et;
        }
        const newDuration = Math.min(MAX_DURATION, Math.max(1, Math.ceil(maxEnd)));
        if (Math.abs(newDuration - duration) > 0.01) {
            setDuration(newDuration);
            try { engine?.set_duration(newDuration); } catch { /* ok */ }
        }
    }, [overlayElements, nodes, duration, engine, MAX_DURATION]);

    // ── Bar drag handlers ──
    const handleBarMouseDown = useCallback((e: React.MouseEvent, elementId: string, barEl: HTMLElement) => {
        e.stopPropagation(); e.preventDefault();
        const rect = barEl.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const EDGE_PX = 6; // ★ Reduced from 8 — less sensitive edge detection
        let mode: 'move' | 'resize-left' | 'resize-right' = 'move';
        if (localX <= EDGE_PX) mode = 'resize-left';
        else if (localX >= rect.width - EDGE_PX) mode = 'resize-right';
        const config = animPresets.getPreset(elementId);
        // ★ Resolve ALL bars' -1 to DEFAULT_DURATION so timeline can shrink
        const allIds = [...overlayElements.map(el => el.id), ...nodes.map(n => String(n.id))];
        for (const id of allIds) {
            const cfg = animPresets.getPreset(id);
            if (cfg.endTime < 0) animPresets.setTiming(id, cfg.startTime, DEFAULT_DURATION);
        }
        const resolvedEnd = config.endTime < 0 ? DEFAULT_DURATION : config.endTime;
        setBarDrag({ elementId, mode, startX: e.clientX, origStart: config.startTime, origEnd: resolvedEnd });
    }, [animPresets, duration, overlayElements, nodes, DEFAULT_DURATION]);

    // ★ Refs for values used inside mousemove/mouseup to avoid listener churn.
    // Same pattern fix as useOverlayInteractions rotation stuck bug (v511).
    const durationRef = useRef(duration);
    durationRef.current = duration;
    const animPresetsRef = useRef(animPresets);
    animPresetsRef.current = animPresets;
    const engineRef = useRef(engine);
    engineRef.current = engine;
    const recalcDurationRef = useRef(recalcDuration);
    recalcDurationRef.current = recalcDuration;

    useEffect(() => {
        if (!barDrag) return;
        const container = timelineBarsRef.current;
        if (!container) return;
        const containerWidth = container.clientWidth;
        const MIN_BAR = 0.1;
        const MIN_DRAG_PX = 3; // ★ Minimum pixels before resize takes effect
        const handleMove = (e: MouseEvent) => {
            const pxToTime = (px: number) => (px / containerWidth) * durationRef.current;
            const dx = e.clientX - barDrag.startX;
            // ★ Skip resize if mouse hasn't moved enough (prevents accidental 5→6s bug)
            if (barDrag.mode !== 'move' && Math.abs(dx) < MIN_DRAG_PX) return;
            const dt = pxToTime(dx);
            let newStart = barDrag.origStart, newEnd = barDrag.origEnd;
            if (barDrag.mode === 'move') {
                const barLen = barDrag.origEnd - barDrag.origStart;
                newStart = Math.max(0, barDrag.origStart + dt);
                newEnd = newStart + barLen;
                // Allow moving past current duration up to MAX_DURATION
                if (newEnd > MAX_DURATION) { newEnd = MAX_DURATION; newStart = newEnd - barLen; }
                if (newStart < 0) { newStart = 0; newEnd = barLen; }
            }
            else if (barDrag.mode === 'resize-left') { newStart = Math.max(0, Math.min(barDrag.origStart + dt, barDrag.origEnd - MIN_BAR)); }
            else if (barDrag.mode === 'resize-right') {
                // Allow extending past current duration up to MAX_DURATION
                newEnd = Math.min(MAX_DURATION, Math.max(barDrag.origStart + MIN_BAR, barDrag.origEnd + dt));
            }
            animPresetsRef.current.setTiming(barDrag.elementId, newStart, newEnd);
            // ★ AE model: re-apply visibility after timing change so Fabric
            // hides/shows elements based on their new in/out points.
            try { engineRef.current?.anim_seek(engineRef.current.anim_time?.()); } catch { /* ok */ }
            // Auto-extend/shrink duration in real-time during drag
            const store = useAnimPresetStore.getState();
            const allBarIds = [...overlayElements.map(el => el.id), ...nodes.map(n => String(n.id))];
            let maxEnd = 0.5;
            for (const id of allBarIds) {
                const cfg = id === barDrag.elementId ? { endTime: newEnd } : store.getPreset(id);
                const et = cfg.endTime < 0 ? DEFAULT_DURATION : cfg.endTime;
                if (et > maxEnd) maxEnd = et;
            }
            const targetDur = Math.min(MAX_DURATION, Math.max(1, Math.ceil(maxEnd)));
            // Use functional setState to avoid stale closure — always compare latest
            setDuration(prev => {
                if (Math.abs(targetDur - prev) > 0.01) {
                    try { engineRef.current?.set_duration(targetDur); } catch { /* ok */ }
                    return targetDur;
                }
                return prev;
            });
        };
        const handleUp = () => { setBarDrag(null); document.body.style.cursor = ''; document.body.style.userSelect = ''; recalcDurationRef.current(); };
        document.body.style.cursor = barDrag.mode === 'move' ? 'grabbing' : 'ew-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    }, [barDrag]); // ★ Only barDrag triggers re-registration (null→drag or drag→null)

    // ── Engine sync ──
    const syncTime = useCallback(() => {
        if (!engine) return;
        try { const t = engine.anim_time?.() ?? 0; const p = engine.anim_playing?.() ?? false; const d = engine.anim_duration?.() ?? 5.0; setCurrentTime(t); setPlaying(p); setDuration(d); setLooping(engine.anim_looping?.() ?? false); animPresets.setCurrentTime(t); animPresets.setIsPlaying(p); animPresets.setDuration(d); } catch { /* */ }
    }, [engine, animPresets]);

    useEffect(() => {
        if (!engine) return;
        const tick = () => {
            try { const ep = engine.anim_playing?.() ?? false; setPlaying(ep); if (ep) { const t = engine.anim_time?.() ?? 0; setCurrentTime(t); animPresets.setCurrentTime(t); } animPresets.setIsPlaying(ep); } catch { /* */ }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [engine, animPresets]);

    useEffect(() => { syncTime(); }, [syncTime]);

    // ── Playback controls ──
    const handlePlay = useCallback(() => { if (!engine) return; try { engine.anim_play(); setPlaying(true); } catch { /* */ } }, [engine]);
    const handlePause = useCallback(() => { if (!engine) return; try { engine.anim_pause(); setPlaying(false); } catch { /* */ } }, [engine]);
    const handleStop = useCallback(() => { if (!engine) return; try { engine.anim_stop(); setPlaying(false); setCurrentTime(0); animPresets.setCurrentTime(0); animPresets.setIsPlaying(false); } catch { /* */ } }, [engine]);
    const handleSeek = useCallback((time: number) => { if (!engine) return; try { engine.anim_seek(time); setCurrentTime(time); animPresets.setCurrentTime(time); } catch { /* */ } }, [engine]);
    const handleDurationChange = useCallback((d: number) => { const clamped = Math.min(MAX_DURATION, Math.max(0.5, d)); if (!engine) return; try { engine.set_duration(clamped); setDuration(clamped); } catch { /* */ } }, [engine, MAX_DURATION]);
    const handleToggleLoop = useCallback(() => { if (!engine) return; const next = !looping; try { engine.set_looping(next); setLooping(next); } catch { /* */ } }, [engine, looping]);
    const handleSpeedChange = useCallback((s: number) => { if (!engine) return; try { engine.anim_set_speed(s); setSpeed(s); } catch { /* */ } }, [engine]);

    return {
        animPresets, playing, currentTime, duration, looping, speed, timelineBarsRef,
        handleBarMouseDown, handlePlay, handlePause, handleStop, handleSeek,
        handleDurationChange, handleToggleLoop, handleSpeedChange,
    };
}
