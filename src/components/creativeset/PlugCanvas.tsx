// ─────────────────────────────────────────────────
// PlugCanvas – Lightweight animated dotted connectors
// ─────────────────────────────────────────────────
// Concept A: Tiny dots on card edges + animated flowing dotted lines.
// No heavy SVG filters, no glow, no drop shadows.
// Connection cables are 1.5px dotted lines with flowing animation.

import { useCallback, useEffect, useState } from 'react';
import { useDesignStore } from '@/stores/designStore';
import type { BannerVariant } from '@/schema/design.types';

interface PlugCanvasProps {
    variants: BannerVariant[];
    cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

interface PortPos { x: number; y: number; }

function getPortPositions(
    cardRefs: Record<string, HTMLDivElement | null>,
    container: HTMLDivElement | null,
): { origins: Record<string, PortPos>; targets: Record<string, PortPos> } {
    const origins: Record<string, PortPos> = {};
    const targets: Record<string, PortPos> = {};
    if (!container) return { origins, targets };
    const cRect = container.getBoundingClientRect();
    for (const [id, el] of Object.entries(cardRefs)) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        origins[id] = {
            x: r.right - cRect.left + container.scrollLeft,
            y: r.top + r.height / 2 - cRect.top + container.scrollTop,
        };
        targets[id] = {
            x: r.left - cRect.left + container.scrollLeft,
            y: r.top + r.height / 2 - cRect.top + container.scrollTop,
        };
    }
    return { origins, targets };
}

/** Smooth bezier path between two points */
function bezierPath(from: PortPos, to: PortPos): string {
    const dx = Math.abs(to.x - from.x) * 0.45;
    return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

export function PlugCanvas({ variants, cardRefs, containerRef }: PlugCanvasProps) {
    const plugConnections = useDesignStore(s => s.creativeSet?.plugConnections ?? {});
    const connectPlug = useDesignStore(s => s.connectPlug);
    const disconnectPlug = useDesignStore(s => s.disconnectPlug);

    const [positions, setPositions] = useState<{
        origins: Record<string, PortPos>;
        targets: Record<string, PortPos>;
    }>({ origins: {}, targets: {} });

    const [dragging, setDragging] = useState<{
        originId: string; from: PortPos; mouse: PortPos;
    } | null>(null);

    const recalcPositions = useCallback(() => {
        setPositions(getPortPositions(cardRefs.current, containerRef.current));
    }, [cardRefs, containerRef]);

    useEffect(() => {
        recalcPositions();
        const container = containerRef.current;
        window.addEventListener('resize', recalcPositions);
        container?.addEventListener('scroll', recalcPositions);
        const interval = setInterval(recalcPositions, 200);
        return () => {
            window.removeEventListener('resize', recalcPositions);
            container?.removeEventListener('scroll', recalcPositions);
            clearInterval(interval);
        };
    }, [variants.length, recalcPositions, containerRef]);

    // ── Drag-to-connect ──
    const handlePortMouseDown = useCallback((e: React.MouseEvent, variantId: string) => {
        e.stopPropagation(); e.preventDefault();
        const from = positions.origins[variantId];
        const container = containerRef.current;
        if (!from || !container) return;
        const cRect = container.getBoundingClientRect();
        setDragging({
            originId: variantId, from,
            mouse: { x: e.clientX - cRect.left + container.scrollLeft, y: e.clientY - cRect.top + container.scrollTop },
        });
    }, [positions.origins, containerRef]);

    useEffect(() => {
        if (!dragging) return;
        const container = containerRef.current;
        if (!container) return;
        const cRect = container.getBoundingClientRect();
        const onMove = (e: MouseEvent) => {
            setDragging(prev => prev ? {
                ...prev,
                mouse: { x: e.clientX - cRect.left + container.scrollLeft, y: e.clientY - cRect.top + container.scrollTop },
            } : null);
        };
        const onUp = (e: MouseEvent) => {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const card = target?.closest('[data-variant-id]') as HTMLElement | null;
            if (card?.dataset.variantId && card.dataset.variantId !== dragging.originId) {
                connectPlug(dragging.originId, card.dataset.variantId);
            }
            setDragging(null);
            recalcPositions();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging, connectPlug, containerRef, recalcPositions]);

    // ── Build connections ──
    const connections: { id: string; from: PortPos; to: PortPos; targetId: string }[] = [];
    for (const [targetId, originId] of Object.entries(plugConnections)) {
        const from = positions.origins[originId];
        const to = positions.targets[targetId];
        if (from && to) connections.push({ id: `${originId}-${targetId}`, from, to, targetId });
    }

    // SVG dimensions
    const container = containerRef.current;
    let svgW = container ? container.scrollWidth : 0;
    let svgH = container ? container.scrollHeight : 0;
    const PAD = 40;
    for (const pos of [...Object.values(positions.origins), ...Object.values(positions.targets)]) {
        svgW = Math.max(svgW, pos.x + PAD);
        svgH = Math.max(svgH, pos.y + PAD);
    }

    return (
        <svg
            className="plug-canvas-svg"
            width={svgW}
            height={svgH}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 50, overflow: 'visible' }}
        >
            {/* ── Connected cables: subtle animated flowing lines ── */}
            {connections.map(conn => (
                <path
                    key={conn.id}
                    d={bezierPath(conn.from, conn.to)}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.25)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    className="plug-cable-flow"
                />
            ))}

            {/* ── Drag preview: dashed line following mouse ── */}
            {dragging && (
                <path
                    d={bezierPath(dragging.from, dragging.mouse)}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.6)"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    className="plug-cable-flow"
                />
            )}

            {/* ── Port dots: tiny 4px circles on card edges ── */}
            {variants.map(v => {
                const isPlugged = v.id in plugConnections;
                const oPort = positions.origins[v.id];
                const tPort = positions.targets[v.id];

                return (
                    <g key={`ports-${v.id}`}>
                        {/* Output dot (right edge) — draggable */}
                        {oPort && (
                            <g
                                style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                                onMouseDown={(e) => handlePortMouseDown(e as unknown as React.MouseEvent, v.id)}
                            >
                                <circle cx={oPort.x} cy={oPort.y} r={4} fill="#6366f1" opacity={0.9} />
                                {/* Invisible hit area */}
                                <circle cx={oPort.x} cy={oPort.y} r={12} fill="transparent" />
                            </g>
                        )}

                        {/* Input dot (left edge) */}
                        {tPort && (
                            <circle
                                cx={tPort.x} cy={tPort.y} r={4}
                                fill={isPlugged ? '#a78bfa' : 'rgba(148, 163, 184, 0.3)'}
                                strokeDasharray={isPlugged ? undefined : '2 2'}
                                stroke={isPlugged ? undefined : 'rgba(148,163,184,0.4)'}
                                strokeWidth={isPlugged ? 0 : 1}
                            />
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
