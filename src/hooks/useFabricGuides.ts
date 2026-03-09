// ─────────────────────────────────────────────────
// useFabricGuides — Smart Guides & Snapping
// ─────────────────────────────────────────────────
// Provides snap-to-edge, snap-to-center, and snap-to-spacing
// feedback lines during drag/resize operations.
// ─────────────────────────────────────────────────

import { useCallback, useRef } from 'react';
import type { EngineNode } from '@/hooks/canvasTypes';

// ── Types ────────────────────────────────────────

export interface GuideLine {
    /** Orientation */
    axis: 'horizontal' | 'vertical';
    /** Position in canvas coordinates */
    position: number;
    /** Type of guide */
    type: 'edge' | 'center' | 'spacing' | 'canvas-center';
}

export interface SnapResult {
    /** Snapped X position (null if no snap) */
    x: number | null;
    /** Snapped Y position (null if no snap) */
    y: number | null;
    /** Active guide lines to render */
    guides: GuideLine[];
}

export interface GuideConfig {
    /** Snap threshold in pixels */
    threshold?: number;
    /** Enable edge snapping */
    snapEdges?: boolean;
    /** Enable center snapping */
    snapCenters?: boolean;
    /** Enable spacing snapping */
    snapSpacing?: boolean;
    /** Enable canvas center guides */
    snapCanvasCenter?: boolean;
    /** Enable grid snapping */
    snapGrid?: boolean;
    /** Grid size in pixels */
    gridSize?: number;
}

const DEFAULT_CONFIG: Required<GuideConfig> = {
    threshold: 4,
    snapEdges: true,
    snapCenters: true,
    snapSpacing: true,
    snapCanvasCenter: true,
    snapGrid: false,
    gridSize: 8,
};

// ── Hook ─────────────────────────────────────────

export function useFabricGuides(
    canvasWidth: number,
    canvasHeight: number,
    config?: GuideConfig,
) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const guidesRef = useRef<GuideLine[]>([]);

    /**
     * Calculate snap suggestions for a dragging element.
     * @param dragging The element being dragged (current position)
     * @param others All other elements on canvas
     * @returns SnapResult with suggested position and guide lines
     */
    const calcSnap = useCallback((
        dragging: { x: number; y: number; w: number; h: number },
        others: EngineNode[],
    ): SnapResult => {
        const guides: GuideLine[] = [];
        let snapX: number | null = null;
        let snapY: number | null = null;
        const threshold = cfg.threshold;

        // Dragging element edges & center
        const dLeft = dragging.x;
        const dRight = dragging.x + dragging.w;
        const dTop = dragging.y;
        const dBottom = dragging.y + dragging.h;
        const dCx = dragging.x + dragging.w / 2;
        const dCy = dragging.y + dragging.h / 2;

        // ── Canvas center ──
        if (cfg.snapCanvasCenter) {
            const cx = canvasWidth / 2;
            const cy = canvasHeight / 2;

            if (Math.abs(dCx - cx) <= threshold) {
                snapX = cx - dragging.w / 2;
                guides.push({ axis: 'vertical', position: cx, type: 'canvas-center' });
            }
            if (Math.abs(dCy - cy) <= threshold) {
                snapY = cy - dragging.h / 2;
                guides.push({ axis: 'horizontal', position: cy, type: 'canvas-center' });
            }
        }

        // ── Canvas edges ──
        if (cfg.snapEdges) {
            if (Math.abs(dLeft) <= threshold) {
                snapX = 0;
                guides.push({ axis: 'vertical', position: 0, type: 'edge' });
            }
            if (Math.abs(dRight - canvasWidth) <= threshold) {
                snapX = canvasWidth - dragging.w;
                guides.push({ axis: 'vertical', position: canvasWidth, type: 'edge' });
            }
            if (Math.abs(dTop) <= threshold) {
                snapY = 0;
                guides.push({ axis: 'horizontal', position: 0, type: 'edge' });
            }
            if (Math.abs(dBottom - canvasHeight) <= threshold) {
                snapY = canvasHeight - dragging.h;
                guides.push({ axis: 'horizontal', position: canvasHeight, type: 'edge' });
            }
        }

        // ── Other element edges & centers ──
        for (const other of others) {
            const oLeft = other.x;
            const oRight = other.x + other.w;
            const oTop = other.y;
            const oBottom = other.y + other.h;
            const oCx = other.x + other.w / 2;
            const oCy = other.y + other.h / 2;

            if (cfg.snapEdges) {
                // Left edge snap
                if (snapX === null && Math.abs(dLeft - oLeft) <= threshold) {
                    snapX = oLeft; guides.push({ axis: 'vertical', position: oLeft, type: 'edge' });
                }
                if (snapX === null && Math.abs(dLeft - oRight) <= threshold) {
                    snapX = oRight; guides.push({ axis: 'vertical', position: oRight, type: 'edge' });
                }
                if (snapX === null && Math.abs(dRight - oLeft) <= threshold) {
                    snapX = oLeft - dragging.w; guides.push({ axis: 'vertical', position: oLeft, type: 'edge' });
                }
                if (snapX === null && Math.abs(dRight - oRight) <= threshold) {
                    snapX = oRight - dragging.w; guides.push({ axis: 'vertical', position: oRight, type: 'edge' });
                }

                // Top edge snap
                if (snapY === null && Math.abs(dTop - oTop) <= threshold) {
                    snapY = oTop; guides.push({ axis: 'horizontal', position: oTop, type: 'edge' });
                }
                if (snapY === null && Math.abs(dTop - oBottom) <= threshold) {
                    snapY = oBottom; guides.push({ axis: 'horizontal', position: oBottom, type: 'edge' });
                }
                if (snapY === null && Math.abs(dBottom - oTop) <= threshold) {
                    snapY = oTop - dragging.h; guides.push({ axis: 'horizontal', position: oTop, type: 'edge' });
                }
                if (snapY === null && Math.abs(dBottom - oBottom) <= threshold) {
                    snapY = oBottom - dragging.h; guides.push({ axis: 'horizontal', position: oBottom, type: 'edge' });
                }
            }

            if (cfg.snapCenters) {
                // Center snap
                if (snapX === null && Math.abs(dCx - oCx) <= threshold) {
                    snapX = oCx - dragging.w / 2; guides.push({ axis: 'vertical', position: oCx, type: 'center' });
                }
                if (snapY === null && Math.abs(dCy - oCy) <= threshold) {
                    snapY = oCy - dragging.h / 2; guides.push({ axis: 'horizontal', position: oCy, type: 'center' });
                }
            }
        }

        // ── Grid snap ──
        if (cfg.snapGrid && snapX === null) {
            const gridX = Math.round(dragging.x / cfg.gridSize) * cfg.gridSize;
            if (Math.abs(dragging.x - gridX) <= threshold) snapX = gridX;
        }
        if (cfg.snapGrid && snapY === null) {
            const gridY = Math.round(dragging.y / cfg.gridSize) * cfg.gridSize;
            if (Math.abs(dragging.y - gridY) <= threshold) snapY = gridY;
        }

        guidesRef.current = guides;
        return { x: snapX, y: snapY, guides };
    }, [canvasWidth, canvasHeight, cfg]);

    /** Clear guide lines (call on mouse up) */
    const clearGuides = useCallback(() => {
        guidesRef.current = [];
    }, []);

    return { calcSnap, clearGuides, guidesRef };
}

// ── Standalone snap function (for unit tests) ──

export function snapToGuides(
    dragging: { x: number; y: number; w: number; h: number },
    others: { x: number; y: number; w: number; h: number }[],
    canvasW: number,
    canvasH: number,
    threshold = 4,
): SnapResult {
    const guides: GuideLine[] = [];
    let snapX: number | null = null;
    let snapY: number | null = null;

    const dCx = dragging.x + dragging.w / 2;
    const dCy = dragging.y + dragging.h / 2;

    // Canvas center
    if (Math.abs(dCx - canvasW / 2) <= threshold) {
        snapX = canvasW / 2 - dragging.w / 2;
        guides.push({ axis: 'vertical', position: canvasW / 2, type: 'canvas-center' });
    }
    if (Math.abs(dCy - canvasH / 2) <= threshold) {
        snapY = canvasH / 2 - dragging.h / 2;
        guides.push({ axis: 'horizontal', position: canvasH / 2, type: 'canvas-center' });
    }

    // Canvas edges
    if (snapX === null && Math.abs(dragging.x) <= threshold) {
        snapX = 0;
        guides.push({ axis: 'vertical', position: 0, type: 'edge' });
    }
    if (snapY === null && Math.abs(dragging.y) <= threshold) {
        snapY = 0;
        guides.push({ axis: 'horizontal', position: 0, type: 'edge' });
    }

    // Other elements
    for (const other of others) {
        if (snapX === null && Math.abs(dragging.x - other.x) <= threshold) {
            snapX = other.x;
            guides.push({ axis: 'vertical', position: other.x, type: 'edge' });
        }
        if (snapY === null && Math.abs(dragging.y - other.y) <= threshold) {
            snapY = other.y;
            guides.push({ axis: 'horizontal', position: other.y, type: 'edge' });
        }
    }

    return { x: snapX, y: snapY, guides };
}
