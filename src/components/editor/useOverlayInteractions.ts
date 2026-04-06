// ─────────────────────────────────────────────────
// useOverlayInteractions — Figma-style drag/resize/rotate
// ─────────────────────────────────────────────────
// Resize: corner = free, Shift+corner = proportional
// Edge: single-axis only (width or height)
// Rotate: corner outside zone → atan2, Shift → 15° snap
// Move: drag inside, Shift → axis lock
// ─────────────────────────────────────────────────

import { useCallback, useRef, useEffect, useState } from 'react';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';
import type { HandleDir } from './ResizeHandles';

const CORNER_DIRS = new Set(['ne', 'nw', 'se', 'sw']);
const MIN_SIZE = 20;

export function useOverlayInteractions(
    onOverlaySelect: ((id: string | null) => void) | undefined,
    onOverlayUpdate: ((id: string, updates: Partial<OverlayElement>) => void) | undefined,
    actions: CanvasEngineActions,
) {
    // ── State refs ──
    const isDragging = useRef(false);
    const dragId = useRef<string | null>(null);
    const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });

    const isResizing = useRef(false);
    const resizeDir = useRef<HandleDir>('se');
    const resizeId = useRef<string | null>(null);
    const resizeStart = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

    const isRotating = useRef(false);
    const rotateId = useRef<string | null>(null);
    const rotateCenter = useRef({ cx: 0, cy: 0 });
    const rotateStartAngle = useRef(0);
    const rotateElStartAngle = useRef(0);

    // ── Tooltip state (exposed for rendering) ──
    const [resizeTooltip, setResizeTooltip] = useState<{ w: number; h: number; x: number; y: number } | null>(null);
    const [rotationTooltip, setRotationTooltip] = useState<{ angle: number; x: number; y: number } | null>(null);

    // ── Drag (move) ──
    const handleOverlayMouseDown = useCallback((e: React.MouseEvent, el: OverlayElement) => {
        e.stopPropagation();
        if (el.locked) return;
        actions.deselectAll();
        onOverlaySelect?.(el.id);
        isDragging.current = true;
        dragId.current = el.id;
        dragStart.current = { x: e.clientX, y: e.clientY, elX: el.x, elY: el.y };
    }, [onOverlaySelect, actions]);

    // ── Resize ──
    const handleResizeMouseDown = useCallback((e: React.MouseEvent, el: OverlayElement, dir: HandleDir) => {
        e.stopPropagation(); e.preventDefault();
        isResizing.current = true;
        resizeDir.current = dir;
        resizeId.current = el.id;
        resizeStart.current = { mx: e.clientX, my: e.clientY, x: el.x, y: el.y, w: el.w, h: el.h };
    }, []);

    // ── Rotate ──
    const handleRotateMouseDown = useCallback((e: React.MouseEvent, el: OverlayElement) => {
        e.stopPropagation(); e.preventDefault();
        isRotating.current = true;
        rotateId.current = el.id;
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        rotateCenter.current = { cx, cy };
        rotateStartAngle.current = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
        rotateElStartAngle.current = el.rotation ?? 0;
    }, []);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            // ── Move ──
            if (isDragging.current && dragId.current) {
                let newX = dragStart.current.elX + (e.clientX - dragStart.current.x);
                let newY = dragStart.current.elY + (e.clientY - dragStart.current.y);
                // Shift → axis lock (move only on dominant axis)
                if (e.shiftKey) {
                    const dx = Math.abs(e.clientX - dragStart.current.x);
                    const dy = Math.abs(e.clientY - dragStart.current.y);
                    if (dx > dy) newY = dragStart.current.elY;
                    else newX = dragStart.current.elX;
                }
                onOverlayUpdate?.(dragId.current, { x: newX, y: newY });
            }

            // ── Resize ──
            if (isResizing.current && resizeId.current) {
                const dx = e.clientX - resizeStart.current.mx;
                const dy = e.clientY - resizeStart.current.my;
                const s = resizeStart.current;
                const dir = resizeDir.current;
                let nx = s.x, ny = s.y, nw = s.w, nh = s.h;

                // Figma: corner = free resize, Shift+corner = proportional
                const isCorner = CORNER_DIRS.has(dir);

                if (isCorner && e.shiftKey) {
                    // Proportional resize: maintain aspect ratio
                    const aspect = s.w / s.h;
                    const effectiveDelta = Math.abs(dx) > Math.abs(dy) ? dx : dy * aspect;
                    if (dir.includes('e')) nw = Math.max(MIN_SIZE, s.w + effectiveDelta);
                    else nw = Math.max(MIN_SIZE, s.w - effectiveDelta);
                    nh = nw / aspect;
                    if (dir.includes('w')) nx = s.x + s.w - nw;
                    if (dir.includes('n')) ny = s.y + s.h - nh;
                } else {
                    // Free resize (or edge handle = single axis)
                    if (dir.includes('e')) nw = Math.max(MIN_SIZE, s.w + dx);
                    if (dir.includes('w')) { nw = Math.max(MIN_SIZE, s.w - dx); nx = s.x + (s.w - nw); }
                    if (dir.includes('s')) nh = Math.max(MIN_SIZE, s.h + dy);
                    if (dir.includes('n')) { nh = Math.max(MIN_SIZE, s.h - dy); ny = s.y + (s.h - nh); }
                }

                onOverlayUpdate?.(resizeId.current, { x: nx, y: ny, w: nw, h: nh });
                setResizeTooltip({ w: nw, h: nh, x: nx, y: ny });
            }

            // ── Rotate ──
            if (isRotating.current && rotateId.current) {
                const { cx, cy } = rotateCenter.current;
                let angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
                let delta = angle - rotateStartAngle.current;
                let finalAngle = rotateElStartAngle.current + delta;
                // Shift → 15° snap
                if (e.shiftKey) finalAngle = Math.round(finalAngle / 15) * 15;
                // Normalize to 0-360
                finalAngle = ((finalAngle % 360) + 360) % 360;
                onOverlayUpdate?.(rotateId.current, { rotation: finalAngle });
                setRotationTooltip({ angle: finalAngle, x: cx, y: cy - 40 });
            }
        };

        const handleUp = () => {
            isDragging.current = false; dragId.current = null;
            isResizing.current = false; resizeId.current = null;
            isRotating.current = false; rotateId.current = null;
            setResizeTooltip(null);
            setRotationTooltip(null);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    }, [onOverlayUpdate]);

    return {
        handleOverlayMouseDown,
        handleResizeMouseDown,
        handleRotateMouseDown,
        isDragging, dragId,
        isResizing, resizeId,
        isRotating, rotateId,
        resizeTooltip,
        rotationTooltip,
    };
}
