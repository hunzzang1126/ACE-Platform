// ─────────────────────────────────────────────────
// TimelineBar — Single timeline bar in the bottom panel
// ─────────────────────────────────────────────────

interface TimelineBarProps {
    elementId: string;
    label: string;
    isSelected: boolean;
    draggedClass: string;
    dropTargetClass: string;
    barLeft: string;
    barWidth: string;
    barColor: string;
    currentTime: number;
    duration: number;
    hasAnim: boolean;
    opacityStyle?: number;
    justDragged: React.RefObject<boolean>;
    onSelect: () => void;
    onBarMouseDown: (e: React.MouseEvent, elementId: string, barEl: HTMLElement) => void;
    onBarCursor: (e: React.MouseEvent<HTMLDivElement>) => string;
    onAnimClick: (e: React.MouseEvent, elementId: string, nodeId: number) => void;
    nodeId: number; // -1 for overlay
}

export function TimelineBar({
    elementId, label, isSelected, draggedClass, dropTargetClass,
    barLeft, barWidth, barColor, currentTime, duration, hasAnim,
    opacityStyle, justDragged, onSelect,
    onBarMouseDown, onBarCursor, onAnimClick, nodeId,
}: TimelineBarProps) {
    return (
        <div
            className={`bp-bar-row ${isSelected ? 'selected' : ''} ${draggedClass} ${dropTargetClass}`}
            onClick={() => { if (justDragged.current) return; onSelect(); }}
        >
            <div
                className="bp-bar bp-bar-draggable"
                style={{ left: barLeft, width: barWidth, backgroundColor: barColor, opacity: opacityStyle, position: 'relative' }}
                onMouseDown={(e) => {
                    const tag = (e.target as HTMLElement).tagName;
                    if (tag === 'BUTTON') return;
                    onBarMouseDown(e, elementId, e.currentTarget);
                }}
                onMouseMove={(e) => {
                    const tag = (e.target as HTMLElement).tagName;
                    if (tag === 'BUTTON') { e.currentTarget.style.cursor = 'pointer'; return; }
                    e.currentTarget.style.cursor = onBarCursor(e);
                }}
            >
                <div className="bp-bar-handle bp-bar-handle-left" title="Drag to resize start" />
                <button
                    className="bp-bar-anim-btn"
                    title="Click to set animation"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAnimClick(e, elementId, nodeId);
                    }}
                >
                    {hasAnim && <span className="bp-anim-dot" />}
                    {label}
                </button>
                <div className="bp-bar-handle bp-bar-handle-right" title="Drag to resize end" />
            </div>
            <div className="bp-bar-playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />
        </div>
    );
}
