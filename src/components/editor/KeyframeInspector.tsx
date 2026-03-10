// ─────────────────────────────────────────────────
// KeyframeInspector — Edit individual keyframe properties
// ─────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useTimelineStore, type EasingType, type AnimatableProperty } from '@/stores/timelineStore';

const EASING_OPTIONS: EasingType[] = [
    'linear', 'ease_in', 'ease_out', 'ease_in_out', 'bounce', 'elastic', 'spring',
];

const PROPERTY_OPTIONS: AnimatableProperty[] = [
    'x', 'y', 'opacity', 'scale_x', 'scale_y', 'rotation', 'width', 'height',
];

interface Props {
    onClose?: () => void;
}

export function KeyframeInspector({ onClose }: Props) {
    const { selectedKeyframe, timelines, setKeyframe, removeKeyframe, deselectKeyframe, duration } =
        useTimelineStore();

    const [addMode, setAddMode] = useState(false);
    const [newProp, setNewProp] = useState<AnimatableProperty>('x');
    const [newTime, setNewTime] = useState(0);
    const [newValue, setNewValue] = useState(0);
    const [newEasing, setNewEasing] = useState<EasingType>('ease_out');

    // Get selected keyframe data
    const selectedData = (() => {
        if (!selectedKeyframe) return null;
        const timeline = timelines[String(selectedKeyframe.elementId)];
        if (!timeline) return null;
        const track = timeline.tracks.find(t => t.property === selectedKeyframe.property);
        if (!track || selectedKeyframe.keyframeIndex >= track.keyframes.length) return null;
        return {
            kf: track.keyframes[selectedKeyframe.keyframeIndex]!,
            property: track.property,
            elementId: selectedKeyframe.elementId,
            index: selectedKeyframe.keyframeIndex,
        };
    })();

    const handleUpdate = useCallback((field: 'time' | 'value' | 'easing', val: number | string) => {
        if (!selectedData) return;
        const kf = selectedData.kf;
        const time = field === 'time' ? (val as number) : kf.time;
        const value = field === 'value' ? (val as number) : kf.value;
        const easing = field === 'easing' ? (val as EasingType) : kf.easing;
        setKeyframe(selectedData.elementId, selectedData.property, time, value, easing);
    }, [selectedData, setKeyframe]);

    const handleDelete = useCallback(() => {
        if (!selectedData) return;
        removeKeyframe(selectedData.elementId, selectedData.property, selectedData.index);
        deselectKeyframe();
    }, [selectedData, removeKeyframe, deselectKeyframe]);

    const handleAdd = useCallback(() => {
        if (!selectedKeyframe) return;
        setKeyframe(selectedKeyframe.elementId, newProp, newTime, newValue, newEasing);
        setAddMode(false);
    }, [selectedKeyframe, newProp, newTime, newValue, newEasing, setKeyframe]);

    if (!selectedKeyframe) {
        return (
            <div style={styles.root}>
                <div style={styles.header}>
                    <span style={styles.title}>Keyframe Inspector</span>
                    {onClose && <button style={styles.closeBtn} onClick={onClose}>x</button>}
                </div>
                <div style={styles.empty}>
                    Select a keyframe diamond in the timeline to edit its properties.
                </div>
            </div>
        );
    }

    return (
        <div style={styles.root}>
            <div style={styles.header}>
                <span style={styles.title}>Keyframe Inspector</span>
                {onClose && <button style={styles.closeBtn} onClick={onClose}>x</button>}
            </div>

            <div style={styles.elementLabel}>
                Element #{selectedKeyframe.elementId}
            </div>

            {selectedData ? (
                <div style={styles.fields}>
                    {/* Property */}
                    <div style={styles.field}>
                        <label style={styles.label}>Property</label>
                        <div style={styles.propValue}>{selectedData.property}</div>
                    </div>

                    {/* Time */}
                    <div style={styles.field}>
                        <label style={styles.label}>Time (s)</label>
                        <input
                            type="number" step={0.01} min={0} max={duration}
                            value={selectedData.kf.time}
                            onChange={e => handleUpdate('time', parseFloat(e.target.value) || 0)}
                            style={styles.input}
                        />
                    </div>

                    {/* Value */}
                    <div style={styles.field}>
                        <label style={styles.label}>Value</label>
                        <input
                            type="number" step={0.1}
                            value={selectedData.kf.value}
                            onChange={e => handleUpdate('value', parseFloat(e.target.value) || 0)}
                            style={styles.input}
                        />
                    </div>

                    {/* Easing */}
                    <div style={styles.field}>
                        <label style={styles.label}>Easing</label>
                        <select
                            value={selectedData.kf.easing}
                            onChange={e => handleUpdate('easing', e.target.value)}
                            style={styles.select}
                        >
                            {EASING_OPTIONS.map(e => (
                                <option key={e} value={e}>{e.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Delete keyframe */}
                    <button style={styles.deleteBtn} onClick={handleDelete}>
                        Delete Keyframe
                    </button>
                </div>
            ) : (
                <div style={styles.empty}>Keyframe data not found.</div>
            )}

            {/* Add new keyframe */}
            <div style={styles.divider} />
            {!addMode ? (
                <button style={styles.addBtn} onClick={() => setAddMode(true)}>
                    + Add Keyframe
                </button>
            ) : (
                <div style={styles.fields}>
                    <div style={styles.field}>
                        <label style={styles.label}>Property</label>
                        <select value={newProp} onChange={e => setNewProp(e.target.value as AnimatableProperty)} style={styles.select}>
                            {PROPERTY_OPTIONS.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Time (s)</label>
                        <input type="number" step={0.01} min={0} max={duration} value={newTime}
                            onChange={e => setNewTime(parseFloat(e.target.value) || 0)} style={styles.input} />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Value</label>
                        <input type="number" step={0.1} value={newValue}
                            onChange={e => setNewValue(parseFloat(e.target.value) || 0)} style={styles.input} />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Easing</label>
                        <select value={newEasing} onChange={e => setNewEasing(e.target.value as EasingType)} style={styles.select}>
                            {EASING_OPTIONS.map(e => (
                                <option key={e} value={e}>{e.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button style={styles.addConfirmBtn} onClick={handleAdd}>Add</button>
                        <button style={styles.cancelBtn} onClick={() => setAddMode(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
    root: {
        width: 240, background: '#1a1f2e', borderLeft: '1px solid #2a2f3e',
        padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
        color: '#e0e0e0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 13, fontWeight: 600, letterSpacing: -0.3 },
    closeBtn: {
        background: 'none', border: 'none', color: '#888', cursor: 'pointer',
        fontSize: 14, padding: '2px 6px',
    },
    elementLabel: {
        fontSize: 10, color: '#888', padding: '4px 8px', background: '#0f1218',
        borderRadius: 4,
    },
    empty: {
        textAlign: 'center', color: '#666', padding: '20px', fontSize: 11,
        lineHeight: 1.6,
    },
    fields: { display: 'flex', flexDirection: 'column', gap: 8 },
    field: { display: 'flex', flexDirection: 'column', gap: 3 },
    label: {
        fontSize: 9, color: '#888', textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    propValue: {
        fontSize: 12, color: '#60a5fa', fontWeight: 500,
        padding: '4px 8px', background: '#0f1218', borderRadius: 4,
    },
    input: {
        padding: '5px 8px', background: '#0f1218', border: '1px solid #2a2f3e',
        borderRadius: 4, color: '#ccc', fontSize: 11, outline: 'none',
    },
    select: {
        padding: '5px 8px', background: '#0f1218', border: '1px solid #2a2f3e',
        borderRadius: 4, color: '#ccc', fontSize: 11, outline: 'none',
    },
    deleteBtn: {
        padding: '6px 0', background: 'transparent', border: '1px solid #ef4444',
        borderRadius: 4, color: '#f87171', fontSize: 10, cursor: 'pointer',
    },
    divider: { borderTop: '1px solid #2a2f3e', margin: '4px 0' },
    addBtn: {
        padding: '6px 0', background: 'transparent', border: '1px solid #2a2f3e',
        borderRadius: 4, color: '#888', fontSize: 10, cursor: 'pointer',
        transition: 'all 0.15s',
    },
    addConfirmBtn: {
        flex: 1, padding: '6px 0', background: '#2563eb', border: 'none',
        borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer',
    },
    cancelBtn: {
        flex: 1, padding: '6px 0', background: 'transparent', border: '1px solid #2a2f3e',
        borderRadius: 4, color: '#888', fontSize: 10, cursor: 'pointer',
    },
};
