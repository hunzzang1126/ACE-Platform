// ─────────────────────────────────────────────────
// useOverlayInteractions — Overlay drag + resize logic for EditorCanvas
// ─────────────────────────────────────────────────

import { useCallback, useRef, useEffect } from 'react';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import type { CanvasEngineActions } from '@/hooks/canvasTypes';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function useOverlayInteractions(
    onOverlaySelect: ((id: string | null) => void) | undefined,
    onOverlayUpdate: ((id: string, updates: Partial<OverlayElement>) => void) | undefined,
    actions: CanvasEngineActions,
) {
    const isDraggingOverlay = useRef(false);
    const dragOverlayId = useRef<string | null>(null);
    const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
    const isResizingOverlay = useRef(false);
    const resizeDir = useRef<ResizeDir>('se');
    const resizeOverlayId = useRef<string | null>(null);
    const resizeStart = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

    const handleOverlayMouseDown = useCallback((e: React.MouseEvent, el: OverlayElement) => {
        e.stopPropagation();
        if (el.locked) return;
        actions.deselectAll();
        onOverlaySelect?.(el.id);
        isDraggingOverlay.current = true;
        dragOverlayId.current = el.id;
        dragStart.current = { x: e.clientX, y: e.clientY, elX: el.x, elY: el.y };
    }, [onOverlaySelect, actions]);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent, el: OverlayElement, dir: ResizeDir) => {
        e.stopPropagation(); e.preventDefault();
        isResizingOverlay.current = true;
        resizeDir.current = dir;
        resizeOverlayId.current = el.id;
        resizeStart.current = { mx: e.clientX, my: e.clientY, x: el.x, y: el.y, w: el.w, h: el.h };
    }, []);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (isDraggingOverlay.current && dragOverlayId.current) {
                onOverlayUpdate?.(dragOverlayId.current, { x: dragStart.current.elX + (e.clientX - dragStart.current.x), y: dragStart.current.elY + (e.clientY - dragStart.current.y) });
            }
            if (isResizingOverlay.current && resizeOverlayId.current) {
                const dx = e.clientX - resizeStart.current.mx;
                const dy = e.clientY - resizeStart.current.my;
                const s = resizeStart.current;
                const dir = resizeDir.current;
                let nx = s.x, ny = s.y, nw = s.w, nh = s.h;
                if (dir.includes('e')) nw = Math.max(10, s.w + dx);
                if (dir.includes('w')) { nw = Math.max(10, s.w - dx); nx = s.x + (s.w - nw); }
                if (dir.includes('s')) nh = Math.max(10, s.h + dy);
                if (dir.includes('n')) { nh = Math.max(10, s.h - dy); ny = s.y + (s.h - nh); }
                onOverlayUpdate?.(resizeOverlayId.current, { x: nx, y: ny, w: nw, h: nh });
            }
        };
        const handleUp = () => { isDraggingOverlay.current = false; dragOverlayId.current = null; isResizingOverlay.current = false; resizeOverlayId.current = null; };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    }, [onOverlayUpdate]);

    // Expose refs for checking drag state in render
    return { handleOverlayMouseDown, handleResizeMouseDown, isDraggingOverlay, dragOverlayId, isResizingOverlay, resizeOverlayId };
}
