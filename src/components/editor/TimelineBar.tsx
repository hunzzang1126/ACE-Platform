// ─────────────────────────────────────────────────
// TimelineBar — Single timeline bar in the bottom panel
// ─────────────────────────────────────────────────

import { useTimelineStore, type Keyframe as TLKeyframe, type AnimatableProperty } from '@/stores/timelineStore';

interface FlatKeyframe {
    id: string;
    time: number;
    value: number;
    easing: string;
    property: string;
}

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
    onKeyframeSelect?: (elementId: string, keyframeId: string) => void;
}

const EASING_COLORS: Record<string, string> = {
    linear: '#4ade80',
    ease_in: '#60a5fa',
    ease_out: '#60a5fa',
    ease_in_out: '#818cf8',
    bounce: '#c084fc',
    elastic: '#f472b6',
    spring: '#fb923c',
};

export function TimelineBar({
    elementId, label, isSelected, draggedClass, dropTargetClass,
    barLeft, barWidth, barColor, currentTime, duration, hasAnim,
    opacityStyle, justDragged, onSelect,
    onBarMouseDown, onBarCursor, onAnimClick, nodeId,
    onKeyframeSelect,
}: TimelineBarProps) {
    // Read keyframes for this element from timelineStore
    const elTimeline = useTimelineStore(s => s.timelines[elementId]);

    // Flatten all keyframes across all property tracks
    const keyframes: FlatKeyframe[] = elTimeline
        ? elTimeline.tracks.flatMap((track) =>
            track.keyframes.map((kf, idx) => ({
                id: `${elementId}-${track.property}-${idx}`,
                time: kf.time,
                value: kf.value,
                easing: kf.easing,
                property: track.property,
            }))
        ).sort((a, b) => a.time - b.time)
        : [];

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
                    if (tag === 'BUTTON' || (e.target as HTMLElement).classList.contains('bp-keyframe-diamond')) return;
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

                {/* Keyframe diamond markers */}
                {keyframes.map((kf) => {
                    const pct = duration > 0 ? (kf.time / duration) * 100 : 0;
                    const color = EASING_COLORS[kf.easing] ?? '#4ade80';
                    return (
                        <div
                            key={kf.id}
                            className="bp-keyframe-diamond"
                            title={`${kf.property}: ${kf.value.toFixed(1)} @ ${kf.time.toFixed(2)}s (${kf.easing})`}
                            style={{
                                position: 'absolute',
                                left: `${pct}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%) rotate(45deg)',
                                width: 7,
                                height: 7,
                                background: color,
                                border: '1px solid rgba(0,0,0,0.4)',
                                cursor: 'pointer',
                                zIndex: 5,
                                transition: 'transform 0.1s',
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onKeyframeSelect?.(elementId, kf.id);
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%) rotate(45deg) scale(1.4)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%) rotate(45deg)';
                            }}
                        />
                    );
                })}

                <div className="bp-bar-handle bp-bar-handle-right" title="Drag to resize end" />
            </div>
            <div className="bp-bar-playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />
        </div>
    );
}

