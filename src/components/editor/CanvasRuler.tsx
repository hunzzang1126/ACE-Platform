// ─────────────────────────────────────────────────
// CanvasRuler — Ruler + Grid overlay for precision
// ─────────────────────────────────────────────────
// Shows rulers along top/left edges with tick marks,
// and an optional grid overlay on the artboard.
// ─────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react';

interface Props {
    canvasWidth: number;
    canvasHeight: number;
    zoom: number;
    panX: number;
    panY: number;
    showGrid: boolean;
    gridSize: number;
    onToggleGrid: () => void;
}

const RULER_SIZE = 20; // px
const TICK_MINOR = 10; // px interval
const TICK_MAJOR = 50; // px interval

export function CanvasRuler({
    canvasWidth, canvasHeight, zoom, panX, panY, showGrid, gridSize, onToggleGrid,
}: Props) {
    const [unit] = useState<'px' | 'mm'>('px');

    // Generate horizontal tick marks
    const hTicks = useMemo(() => {
        const ticks: Array<{ pos: number; label: string | null; major: boolean }> = [];
        const step = zoom >= 0.5 ? TICK_MINOR : TICK_MINOR * 2;
        const startPx = -Math.floor(panX / zoom / step) * step;
        const endPx = startPx + Math.ceil(canvasWidth / zoom);
        for (let px = startPx; px <= endPx; px += step) {
            const major = px % TICK_MAJOR === 0;
            ticks.push({
                pos: px * zoom + panX,
                label: major ? String(px) : null,
                major,
            });
        }
        return ticks;
    }, [canvasWidth, zoom, panX]);

    // Generate vertical tick marks
    const vTicks = useMemo(() => {
        const ticks: Array<{ pos: number; label: string | null; major: boolean }> = [];
        const step = zoom >= 0.5 ? TICK_MINOR : TICK_MINOR * 2;
        const startPx = -Math.floor(panY / zoom / step) * step;
        const endPx = startPx + Math.ceil(canvasHeight / zoom);
        for (let px = startPx; px <= endPx; px += step) {
            const major = px % TICK_MAJOR === 0;
            ticks.push({
                pos: px * zoom + panY,
                label: major ? String(px) : null,
                major,
            });
        }
        return ticks;
    }, [canvasHeight, zoom, panY]);

    // Grid lines
    const gridLines = useMemo(() => {
        if (!showGrid) return { h: [], v: [] };
        const gs = gridSize * zoom;
        if (gs < 4) return { h: [], v: [] }; // too small to show

        const h: number[] = [];
        const v: number[] = [];
        const startX = panX % gs;
        const startY = panY % gs;

        for (let x = startX; x < canvasWidth; x += gs) h.push(x);
        for (let y = startY; y < canvasHeight; y += gs) v.push(y);

        return { h, v };
    }, [showGrid, gridSize, zoom, panX, panY, canvasWidth, canvasHeight]);

    const handleGridToggle = useCallback(() => {
        onToggleGrid();
    }, [onToggleGrid]);

    return (
        <>
            {/* Top horizontal ruler */}
            <div
                style={{
                    position: 'absolute', top: 0, left: RULER_SIZE, right: 0, height: RULER_SIZE,
                    background: '#1e2228', borderBottom: '1px solid #333', zIndex: 50,
                    overflow: 'hidden', pointerEvents: 'none', userSelect: 'none',
                }}
            >
                {hTicks.map((tick, i) => (
                    <div key={i} style={{
                        position: 'absolute', left: tick.pos, top: 0, width: 1,
                        height: tick.major ? RULER_SIZE : RULER_SIZE * 0.5,
                        background: tick.major ? '#888' : '#555',
                    }}>
                        {tick.label && (
                            <span style={{
                                position: 'absolute', top: 1, left: 3,
                                fontSize: 8, color: '#999', whiteSpace: 'nowrap',
                            }}>
                                {tick.label}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Left vertical ruler */}
            <div
                style={{
                    position: 'absolute', top: RULER_SIZE, left: 0, bottom: 0, width: RULER_SIZE,
                    background: '#1e2228', borderRight: '1px solid #333', zIndex: 50,
                    overflow: 'hidden', pointerEvents: 'none', userSelect: 'none',
                }}
            >
                {vTicks.map((tick, i) => (
                    <div key={i} style={{
                        position: 'absolute', top: tick.pos, left: 0,
                        width: tick.major ? RULER_SIZE : RULER_SIZE * 0.5,
                        height: 1, background: tick.major ? '#888' : '#555',
                    }}>
                        {tick.label && (
                            <span style={{
                                position: 'absolute', left: 2, top: 2,
                                fontSize: 8, color: '#999', whiteSpace: 'nowrap',
                                transform: 'rotate(-90deg)', transformOrigin: '0 0',
                            }}>
                                {tick.label}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Corner unit indicator */}
            <div
                style={{
                    position: 'absolute', top: 0, left: 0,
                    width: RULER_SIZE, height: RULER_SIZE,
                    background: '#1e2228', borderRight: '1px solid #333', borderBottom: '1px solid #333',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, color: '#666', cursor: 'pointer', zIndex: 51,
                    userSelect: 'none',
                }}
                onClick={handleGridToggle}
                title={showGrid ? 'Hide grid' : 'Show grid'}
            >
                {unit}
            </div>

            {/* Grid overlay */}
            {showGrid && (
                <svg
                    style={{
                        position: 'absolute', top: RULER_SIZE, left: RULER_SIZE,
                        width: canvasWidth - RULER_SIZE, height: canvasHeight - RULER_SIZE,
                        pointerEvents: 'none', zIndex: 5,
                    }}
                >
                    {gridLines.h.map((x, i) => (
                        <line key={`gh-${i}`} x1={x - RULER_SIZE} y1={0} x2={x - RULER_SIZE} y2="100%"
                            stroke="#ffffff08" strokeWidth={1} />
                    ))}
                    {gridLines.v.map((y, i) => (
                        <line key={`gv-${i}`} x1={0} y1={y - RULER_SIZE} x2="100%" y2={y - RULER_SIZE}
                            stroke="#ffffff08" strokeWidth={1} />
                    ))}
                </svg>
            )}
        </>
    );
}
