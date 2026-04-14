// ─────────────────────────────────────────────────
// useEyedropper — Canvas color picker tool
// ─────────────────────────────────────────────────
// When active, clicks on the canvas sample the pixel color
// and apply it to the currently selected element's fill.
// ─────────────────────────────────────────────────

import { useEffect, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import type { CanvasEngineActions, EngineNode } from '@/hooks/canvasTypes';

/**
 * Sample a pixel color from a canvas element at the given coordinates.
 * Returns hex color string like "#ff00aa".
 */
export function sampleCanvasPixel(canvas: HTMLCanvasElement, x: number, y: number): string {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#000000';

    // Account for canvas CSS scaling vs actual pixel ratio
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = Math.round(x * scaleX);
    const py = Math.round(y * scaleY);

    const pixel = ctx.getImageData(px, py, 1, 1).data;
    const r = pixel[0].toString(16).padStart(2, '0');
    const g = pixel[1].toString(16).padStart(2, '0');
    const b = pixel[2].toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

interface UseEyedropperOptions {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    nodes: EngineNode[];
    selection: number[];
    actions: CanvasEngineActions | null;
}

/**
 * Hook that handles eyedropper tool behavior.
 * When the eyedropper tool is active and the user clicks the canvas:
 * 1. Samples the pixel color at the click position
 * 2. Applies it as fill to the selected node
 * 3. Switches back to select tool
 */
export function useEyedropper({ canvasRef, nodes, selection, actions }: UseEyedropperOptions) {
    const activeTool = useEditorStore(s => s.activeTool);
    const setTool = useEditorStore(s => s.setTool);

    const handleClick = useCallback((e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas || !actions || selection.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = sampleCanvasPixel(canvas, x, y);
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        // Apply to first selected node
        const targetId = selection[0];
        const node = nodes.find(n => n.id === targetId);
        if (node) {
            if (node.type === 'text') {
                actions.updateText?.(targetId, { color: hex });
            } else {
                actions.setFillColor(targetId, r, g, b, 1.0);
            }
        }

        setTool('select');
    }, [canvasRef, actions, selection, nodes, setTool]);

    // Listen for canvas clicks when eyedropper is active
    useEffect(() => {
        if (activeTool !== 'eyedropper') return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Use the parent container to capture clicks (covers overlay canvas too)
        const container = canvas.parentElement;
        if (!container) return;

        container.style.cursor = 'crosshair';
        container.addEventListener('click', handleClick, { capture: true });

        return () => {
            container.style.cursor = '';
            container.removeEventListener('click', handleClick, { capture: true });
        };
    }, [activeTool, canvasRef, handleClick]);
}
