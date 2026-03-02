// ─────────────────────────────────────────────────
// AnimDropdown — Animation preset selector dropdown
// ─────────────────────────────────────────────────

import { ANIM_PRESETS, type AnimPresetType } from '@/hooks/useAnimationPresets';
import type { Engine } from './bottomPanelHelpers';

interface AnimDropdownState {
    elementId: string;
    nodeId: number;
    x: number;
    y: number;
}

interface AnimDropdownProps {
    dropdown: AnimDropdownState;
    engine?: Engine;
    getPreset: (id: string) => { anim: AnimPresetType; startTime: number; endTime: number };
    setPreset: (id: string, preset: { anim: AnimPresetType }) => void;
    onClose: () => void;
}

export function AnimDropdown({ dropdown, engine, getPreset, setPreset, onClose }: AnimDropdownProps) {
    return (
        <div className="bp-anim-dropdown-backdrop" onClick={onClose}>
            <div
                className="bp-anim-dropdown"
                style={{ left: dropdown.x, top: dropdown.y - 8 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bp-anim-dropdown-title">Animation</div>
                {ANIM_PRESETS.map((p) => {
                    const config = getPreset(dropdown.elementId);
                    const isActive = config.anim === p.value;
                    return (
                        <button
                            key={p.value}
                            className={`bp-anim-dropdown-item ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                setPreset(dropdown.elementId, { anim: p.value as AnimPresetType });
                                applyEngineKeyframes(engine, dropdown.nodeId, p.value);
                                onClose();
                            }}
                        >
                            {p.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Apply keyframes to the WASM engine for a given animation preset */
function applyEngineKeyframes(engine: Engine | undefined, nodeId: number, preset: string) {
    if (nodeId < 0 || !engine) return;
    try {
        engine.clear_node_keyframes(nodeId);

        if (preset !== 'none') {
            const animDur = 0.3;
            const st = 0;
            const et = animDur;
            const ease = 'ease_out';

            if (preset === 'fade') {
                engine.add_keyframe(nodeId, 'opacity', st, 0, ease);
                engine.add_keyframe(nodeId, 'opacity', et, 1, ease);
            } else if (preset.startsWith('slide-')) {
                const prop = preset.includes('left') || preset.includes('right') ? 'x' : 'y';
                const offset = preset.includes('left') || preset.includes('up') ? -200 : 200;
                engine.add_keyframe(nodeId, prop, st, offset, ease);
                engine.add_keyframe(nodeId, prop, et, 0, ease);
            } else if (preset === 'scale') {
                engine.add_keyframe(nodeId, 'scale_x', st, 0, ease);
                engine.add_keyframe(nodeId, 'scale_x', et, 1, ease);
                engine.add_keyframe(nodeId, 'scale_y', st, 0, ease);
                engine.add_keyframe(nodeId, 'scale_y', et, 1, ease);
            } else if (preset === 'ascend') {
                engine.add_keyframe(nodeId, 'y', st, 100, ease);
                engine.add_keyframe(nodeId, 'y', et, 0, ease);
                engine.add_keyframe(nodeId, 'opacity', st, 0, ease);
                engine.add_keyframe(nodeId, 'opacity', et, 1, ease);
            } else if (preset === 'descend') {
                engine.add_keyframe(nodeId, 'y', st, -100, ease);
                engine.add_keyframe(nodeId, 'y', et, 0, ease);
                engine.add_keyframe(nodeId, 'opacity', st, 0, ease);
                engine.add_keyframe(nodeId, 'opacity', et, 1, ease);
            }
        }

        engine.anim_stop?.();
        engine.anim_seek?.(0);
        engine.render_frame?.();
    } catch { /* engine not ready */ }
}
