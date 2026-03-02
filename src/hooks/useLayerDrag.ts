// ─────────────────────────────────────────────────
// useLayerDrag — Drag-to-reorder hook for layer panels
// ─────────────────────────────────────────────────
// Uses mousedown/mousemove/mouseup for reliable drag (not HTML5 DnD).
// Works for both overlay elements AND engine nodes via '.bp-layer-drag-row'.

import { useState, useCallback, useRef } from 'react';

export interface LayerDragState {
    srcId: string;
    srcIdx: number;
    overIdx: number | null;
    active: boolean;
}

export function useLayerDrag(
    totalCount: number,
    onReorder?: (sourceId: string, targetIndex: number) => void,
) {
    const [dragState, setDragState] = useState<LayerDragState | null>(null);

    // Ref to suppress click after drag
    const justDragged = useRef(false);

    const startDrag = useCallback((e: React.MouseEvent, id: string, idx: number) => {
        // Only left mouse button
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const startY = e.clientY;
        let activated = false;
        let currentOverIdx: number | null = null;

        setDragState({ srcId: id, srcIdx: idx, overIdx: null, active: false });

        const handleMove = (ev: MouseEvent) => {
            const dy = ev.clientY - startY;

            // Require 5px of movement before activating drag
            if (!activated && Math.abs(dy) < 5) return;
            activated = true;

            // Query ALL draggable rows for hit-testing (overlays + engine)
            const rows = document.querySelectorAll('.bp-layer-drag-row');
            let bestIdx = idx;
            let bestDist = Infinity;

            rows.forEach((row, i) => {
                const rect = row.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const dist = Math.abs(ev.clientY - centerY);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            });

            if (bestIdx !== currentOverIdx) {
                currentOverIdx = bestIdx;
                setDragState({ srcId: id, srcIdx: idx, overIdx: bestIdx, active: true });
            }
        };

        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            if (activated && currentOverIdx !== null && currentOverIdx !== idx) {
                onReorder?.(id, currentOverIdx);
                // Suppress the next click (mouseup -> click would re-select)
                justDragged.current = true;
                setTimeout(() => { justDragged.current = false; }, 50);
            }

            setDragState(null);
        };

        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    }, [totalCount, onReorder]);

    return { dragState, startDrag, justDragged };
}
