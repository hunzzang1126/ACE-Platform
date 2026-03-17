// ─────────────────────────────────────────────────
// PlugCanvas – SVG overlay for visual plug connections
// ─────────────────────────────────────────────────
// Renders bezier cables between connected card ports.
// Drag from an origin port to a target socket to create connections.
// Pure presentation component — uses designStore for data.

import { useCallback, useEffect, useState } from 'react';
import { useDesignStore } from '@/stores/designStore';
import type { BannerVariant } from '@/schema/design.types';

interface PlugCanvasProps {
    variants: BannerVariant[];
    /** Map of variant.id → DOM element ref for each card */
    cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    /** The scrollable container the grid lives within */
    containerRef: React.RefObject<HTMLDivElement | null>;
}

interface PortPos {
    /** Absolute px position of the port center (relative to svg) */
    x: number;
    y: number;
}

/**
 * Calculate port positions based on card DOM rects.
 * Origin port = right edge center, Target socket = left edge center.
 */
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
        // Origin port: right edge, vertically centered
        origins[id] = {
            x: r.right - cRect.left + container.scrollLeft,
            y: r.top + r.height / 2 - cRect.top + container.scrollTop,
        };
        // Target socket: left edge, vertically centered
        targets[id] = {
            x: r.left - cRect.left + container.scrollLeft,
            y: r.top + r.height / 2 - cRect.top + container.scrollTop,
        };
    }
    return { origins, targets };
}

/** Generate SVG cubic bezier path between two points */
function bezierPath(from: PortPos, to: PortPos): string {
    const dx = Math.abs(to.x - from.x) * 0.5;
    return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

export function PlugCanvas({ variants, cardRefs, containerRef }: PlugCanvasProps) {
    const plugConnections = useDesignStore(s => s.creativeSet?.plugConnections ?? {});
    const connectPlug = useDesignStore(s => s.connectPlug);
    const disconnectPlug = useDesignStore(s => s.disconnectPlug);
    const masterVariantId = useDesignStore(s => s.creativeSet?.masterVariantId ?? '');

    // Positions re-calculated on layout changes
    const [positions, setPositions] = useState<{
        origins: Record<string, PortPos>;
        targets: Record<string, PortPos>;
    }>({ origins: {}, targets: {} });

    // Drag state for creating new connections
    const [dragging, setDragging] = useState<{
        originId: string;
        from: PortPos;
        mouse: { x: number; y: number };
    } | null>(null);

    // Recalculate positions
    const recalcPositions = useCallback(() => {
        setPositions(getPortPositions(cardRefs.current, containerRef.current));
    }, [cardRefs, containerRef]);

    // Update positions on mount, resize, scroll, and variant changes
    useEffect(() => {
        recalcPositions();
        const onResize = () => recalcPositions();
        const container = containerRef.current;
        window.addEventListener('resize', onResize);
        container?.addEventListener('scroll', onResize);
        // MutationObserver for DOM changes
        const observer = new MutationObserver(onResize);
        if (container) observer.observe(container, { childList: true, subtree: true });
        return () => {
            window.removeEventListener('resize', onResize);
            container?.removeEventListener('scroll', onResize);
            observer.disconnect();
        };
    }, [variants.length, recalcPositions, containerRef]);

    // Handle drag start from origin port
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

    // Handle drag move
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
            // Find which card the mouse is over
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

    // Determine which variants are origins (have targets plugged into them)
    const originIds = new Set<string>();
    for (const [, originId] of Object.entries(plugConnections)) {
        originIds.add(originId);
    }
    // Master is always an origin
    originIds.add(masterVariantId);

    // Build connections for rendering
    const connections: { id: string; from: PortPos; to: PortPos; targetId: string }[] = [];
    for (const [targetId, originId] of Object.entries(plugConnections)) {
        const from = positions.origins[originId];
        const to = positions.targets[targetId];
        if (from && to) {
            connections.push({ id: `${originId}-${targetId}`, from, to, targetId });
        }
    }

    // SVG dimensions match container scroll area
    const container = containerRef.current;
    const svgW = container ? container.scrollWidth : 0;
    const svgH = container ? container.scrollHeight : 0;

    return (
        <>
            {/* SVG cable overlay */}
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
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <filter id="plug-glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Established connections */}
                {connections.map(conn => (
                    <g key={conn.id}>
                        {/* Glow background */}
                        <path
                            d={bezierPath(conn.from, conn.to)}
                            fill="none"
                            stroke="url(#plug-cable-grad)"
                            strokeWidth={4}
                            opacity={0.2}
                            filter="url(#plug-glow)"
                        />
                        {/* Main cable */}
                        <path
                            d={bezierPath(conn.from, conn.to)}
                            fill="none"
                            stroke="url(#plug-cable-grad)"
                            strokeWidth={2}
                            opacity={0.8}
                            strokeLinecap="round"
                        />
                    </g>
                ))}

                {/* Dragging cable preview */}
                {dragging && (
                    <path
                        d={bezierPath(dragging.from, { x: dragging.mouse.x, y: dragging.mouse.y })}
                        fill="none"
                        stroke="#4a9eff"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        opacity={0.6}
                    />
                )}
            </svg>

            {/* Port overlays on each card */}
            {variants.map(v => {
                const isOrigin = originIds.has(v.id);
                const isPlugged = v.id in plugConnections;

                return (
                    <div key={`port-${v.id}`}>
                        {/* Origin output port (right side) */}
                        {(() => {
                            const oPort = isOrigin ? positions.origins[v.id] : undefined;
                            if (!oPort) return null;
                            return (
                                <div
                                    className="plug-port plug-port--origin"
                                    style={{
                                        position: 'absolute',
                                        left: oPort.x - 7,
                                        top: oPort.y - 7,
                                        zIndex: 10,
                                        pointerEvents: 'auto',
                                    }}
                                    onMouseDown={(e) => handlePortMouseDown(e, v.id)}
                                    title="Drag to connect"
                                />
                            );
                        })()}

                        {/* Target input socket (left side) */}
                        {(() => {
                            if (isOrigin) return null;
                            const tPort = positions.targets[v.id];
                            if (!tPort) return null;
                            return (
                                <div
                                    className={`plug-port plug-port--target ${isPlugged ? 'plug-port--connected' : ''}`}
                                    style={{
                                        position: 'absolute',
                                        left: tPort.x - 7,
                                        top: tPort.y - 7,
                                        zIndex: 10,
                                        pointerEvents: 'auto',
                                    }}
                                    title={isPlugged ? 'Connected — right-click to disconnect' : 'Drop here to connect'}
                                    onContextMenu={(e) => {
                                        if (isPlugged) {
                                            e.preventDefault();
                                            disconnectPlug(v.id);
                                            recalcPositions();
                                        }
                                    }}
                                />
                            );
                        })()}
                    </div>
                );
            })}
        </>
    );
}
