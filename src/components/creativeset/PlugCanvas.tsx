// ─────────────────────────────────────────────────
// PlugCanvas – Premium SVG plug connectors
// ─────────────────────────────────────────────────
// Figma-style bezier cables between origin → target cards.
// Tactile plug aesthetic: glowing output ports, socket receivers.

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

function bezierPath(from: PortPos, to: PortPos): string {
    const dx = Math.abs(to.x - from.x) * 0.5;
    return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

export function PlugCanvas({ variants, cardRefs, containerRef }: PlugCanvasProps) {
    const plugConnections = useDesignStore(s => s.creativeSet?.plugConnections ?? {});
    const connectPlug = useDesignStore(s => s.connectPlug);
    const disconnectPlug = useDesignStore(s => s.disconnectPlug);
    const masterVariantId = useDesignStore(s => s.creativeSet?.masterVariantId ?? '');

    const [positions, setPositions] = useState<{
        origins: Record<string, PortPos>;
        targets: Record<string, PortPos>;
    }>({ origins: {}, targets: {} });

    const [dragging, setDragging] = useState<{
        originId: string;
        from: PortPos;
        mouse: { x: number; y: number };
    } | null>(null);

    const recalcPositions = useCallback(() => {
        setPositions(getPortPositions(cardRefs.current, containerRef.current));
    }, [cardRefs, containerRef]);

    // Recalculate on mount, resize, scroll, variant changes, and frequently
    useEffect(() => {
        recalcPositions();
        const onResize = () => recalcPositions();
        const container = containerRef.current;
        window.addEventListener('resize', onResize);
        container?.addEventListener('scroll', onResize);
        // Frequent recalc for drag movements
        const interval = setInterval(recalcPositions, 100);
        return () => {
            window.removeEventListener('resize', onResize);
            container?.removeEventListener('scroll', onResize);
            clearInterval(interval);
        };
    }, [variants.length, recalcPositions, containerRef]);

    // Handle plug port drag
    const handlePortMouseDown = useCallback((e: React.MouseEvent, variantId: string) => {
        e.stopPropagation();
        e.preventDefault();
        const from = positions.origins[variantId];
        if (!from) return;
        const container = containerRef.current;
        if (!container) return;
        const cRect = container.getBoundingClientRect();
        setDragging({
            originId: variantId,
            from,
            mouse: {
                x: e.clientX - cRect.left + container.scrollLeft,
                y: e.clientY - cRect.top + container.scrollTop,
            },
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
                mouse: {
                    x: e.clientX - cRect.left + container.scrollLeft,
                    y: e.clientY - cRect.top + container.scrollTop,
                },
            } : null);
        };
        const onUp = (e: MouseEvent) => {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const card = target?.closest('[data-variant-id]') as HTMLElement | null;
            if (card && card.dataset.variantId && card.dataset.variantId !== dragging.originId) {
                connectPlug(dragging.originId, card.dataset.variantId);
            }
            setDragging(null);
            recalcPositions();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [dragging, connectPlug, containerRef, recalcPositions]);

    // Build connections
    const connections: { id: string; from: PortPos; to: PortPos; targetId: string }[] = [];
    for (const [targetId, originId] of Object.entries(plugConnections)) {
        const from = positions.origins[originId];
        const to = positions.targets[targetId];
        if (from && to) {
            connections.push({ id: `${originId}-${targetId}`, from, to, targetId });
        }
    }

    // Origins: master + any variant that has targets plugged into it
    const originIds = new Set<string>();
    for (const [, originId] of Object.entries(plugConnections)) {
        originIds.add(originId);
    }
    originIds.add(masterVariantId);

    const container = containerRef.current;
    const svgW = container ? container.scrollWidth : 0;
    const svgH = container ? container.scrollHeight : 0;

    return (
        <>
            {/* SVG cables */}
            <svg
                className="plug-canvas-svg"
                width={svgW}
                height={svgH}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    zIndex: 5,
                    overflow: 'visible',
                }}
            >
                <defs>
                    <linearGradient id="plug-cable-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4a9eff" />
                        <stop offset="50%" stopColor="#6c63ff" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="plug-cable-active" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#60b4ff" />
                        <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                    <filter id="plug-glow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="plug-shadow">
                        <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
                    </filter>
                </defs>

                {/* Cables */}
                {connections.map(conn => (
                    <g key={conn.id}>
                        {/* Outer glow */}
                        <path
                            d={bezierPath(conn.from, conn.to)}
                            fill="none"
                            stroke="url(#plug-cable-grad)"
                            strokeWidth={6}
                            opacity={0.15}
                            filter="url(#plug-glow)"
                        />
                        {/* Cable body */}
                        <path
                            d={bezierPath(conn.from, conn.to)}
                            fill="none"
                            stroke="url(#plug-cable-grad)"
                            strokeWidth={2.5}
                            opacity={0.9}
                            strokeLinecap="round"
                        />
                        {/* Disconnect button at midpoint */}
                        {(() => {
                            const mx = (conn.from.x + conn.to.x) / 2;
                            const my = (conn.from.y + conn.to.y) / 2;
                            return (
                                <g
                                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        disconnectPlug(conn.targetId);
                                        recalcPositions();
                                    }}
                                >
                                    <circle cx={mx} cy={my} r={8} fill="#1e2231" stroke="#ff6b6b" strokeWidth={1.5} opacity={0} className="plug-disconnect-btn" />
                                    <line x1={mx - 3} y1={my - 3} x2={mx + 3} y2={my + 3} stroke="#ff6b6b" strokeWidth={1.5} opacity={0} className="plug-disconnect-x" />
                                    <line x1={mx + 3} y1={my - 3} x2={mx - 3} y2={my + 3} stroke="#ff6b6b" strokeWidth={1.5} opacity={0} className="plug-disconnect-x" />
                                    {/* Invisible hit area */}
                                    <circle cx={mx} cy={my} r={12} fill="transparent" />
                                </g>
                            );
                        })()}
                    </g>
                ))}

                {/* Drag preview cable */}
                {dragging && (
                    <path
                        d={bezierPath(dragging.from, { x: dragging.mouse.x, y: dragging.mouse.y })}
                        fill="none"
                        stroke="url(#plug-cable-active)"
                        strokeWidth={2.5}
                        strokeDasharray="8 4"
                        opacity={0.7}
                        filter="url(#plug-glow)"
                    />
                )}

                {/* Port circles rendered in SVG for perfect alignment */}
                {variants.map(v => {
                    const isOrigin = originIds.has(v.id);
                    const isPlugged = v.id in plugConnections;

                    return (
                        <g key={`ports-${v.id}`}>
                            {/* Origin output port (right side) — blue glowing circle */}
                            {(() => {
                                const oPort = isOrigin ? positions.origins[v.id] : undefined;
                                if (!oPort) return null;
                                return (
                                    <g
                                        style={{ cursor: 'grab', pointerEvents: 'auto' }}
                                        onMouseDown={(e) => handlePortMouseDown(e as unknown as React.MouseEvent, v.id)}
                                    >
                                        {/* Glow ring */}
                                        <circle cx={oPort.x} cy={oPort.y} r={10} fill="none" stroke="#4a9eff" strokeWidth={1} opacity={0.3} />
                                        {/* Outer ring */}
                                        <circle cx={oPort.x} cy={oPort.y} r={7} fill="#1a1f2e" stroke="#4a9eff" strokeWidth={2} filter="url(#plug-shadow)" />
                                        {/* Inner dot */}
                                        <circle cx={oPort.x} cy={oPort.y} r={3} fill="#4a9eff" />
                                        {/* Invisible hit area */}
                                        <circle cx={oPort.x} cy={oPort.y} r={14} fill="transparent" />
                                    </g>
                                );
                            })()}

                            {/* Target input socket (left side) — dashed or purple */}
                            {(() => {
                                if (isOrigin) return null;
                                const tPort = positions.targets[v.id];
                                if (!tPort) return null;
                                if (isPlugged) {
                                    return (
                                        <g style={{ pointerEvents: 'auto' }}>
                                            {/* Connected: purple filled */}
                                            <circle cx={tPort.x} cy={tPort.y} r={10} fill="none" stroke="#a855f7" strokeWidth={1} opacity={0.3} />
                                            <circle cx={tPort.x} cy={tPort.y} r={7} fill="#1a1f2e" stroke="#a855f7" strokeWidth={2} filter="url(#plug-shadow)" />
                                            <circle cx={tPort.x} cy={tPort.y} r={3} fill="#a855f7" />
                                        </g>
                                    );
                                }
                                return (
                                    <g style={{ pointerEvents: 'auto' }}>
                                        {/* Unconnected: dashed ring */}
                                        <circle cx={tPort.x} cy={tPort.y} r={7} fill="#1a1f2e" stroke="#484f58" strokeWidth={1.5} strokeDasharray="3 2" filter="url(#plug-shadow)" />
                                        <circle cx={tPort.x} cy={tPort.y} r={2} fill="#484f58" opacity={0.5} />
                                    </g>
                                );
                            })()}
                        </g>
                    );
                })}
            </svg>
        </>
    );
}
