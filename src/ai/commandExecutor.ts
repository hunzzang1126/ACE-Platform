// ─────────────────────────────────────────────────
// Command Executor — Routes AI tool calls → Engine
// ─────────────────────────────────────────────────
// Main switch/case router. Specialized executors live
// in executorCompound.ts and executorHelpers.ts.
// ─────────────────────────────────────────────────

import type { SceneNodeInfo } from './agentContext';
import type { Engine, ExecutionResult } from './executorHelpers';
import { rgbToHex, makeNodeInfo } from './executorHelpers';
import {
    executeAddText,
    executeSetAnimPreset,
    executeRenderBanner,
    executeCreateLayout,
    executeAnimateAll,
    analyzeScene,
    setExecuteToolCallRef,
} from './executorCompound';

// Re-export types for consumers
export type { ExecutionResult } from './executorHelpers';

/**
 * Execute a single tool call on the engine.
 * Returns node tracking info for Scene RAG updates.
 */
export function executeToolCall(
    engine: Engine,
    toolName: string,
    params: Record<string, unknown>,
    trackedNodes: SceneNodeInfo[],
): ExecutionResult {
    if (!engine) {
        return { success: false, message: `Cannot execute "${toolName}": no canvas engine available. Navigate to a canvas editor first.` };
    }

    // ── Safe param extraction ──
    const num = (key: string, fallback = 0): number => {
        const v = params[key];
        if (v === undefined || v === null) return fallback;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };
    const str = (key: string, fallback = ''): string => {
        const v = params[key];
        return typeof v === 'string' ? v : fallback;
    };

    try {
        switch (toolName) {
            // ── Create ───────────────────────────────
            case 'add_rect': {
                const x = num('x'), y = num('y'), w = num('w', 100), h = num('h', 100);
                const r = num('r', 0.5), g = num('g', 0.5), b = num('b', 0.5), a = num('a', 1.0);
                const id = engine.add_rect(x, y, w, h, r, g, b, a) as number;
                trackedNodes.push(makeNodeInfo(id, 'rect', x, y, w, h, rgbToHex(r, g, b), a));
                return { success: true, message: `Rectangle created at (${x}, ${y}) with size ${w}×${h}`, nodeId: id };
            }
            case 'add_rounded_rect': {
                const x = num('x'), y = num('y'), w = num('w', 100), h = num('h', 100);
                const r = num('r', 0.5), g = num('g', 0.5), b = num('b', 0.5), a = num('a', 1.0);
                const radius = num('radius', 8);
                const id = engine.add_rounded_rect(x, y, w, h, r, g, b, a, radius) as number;
                trackedNodes.push(makeNodeInfo(id, 'rounded_rect', x, y, w, h, rgbToHex(r, g, b), a));
                return { success: true, message: `Rounded rect created (radius ${radius}) at (${x}, ${y})`, nodeId: id };
            }
            case 'add_ellipse': {
                const cx = num('cx', 100), cy = num('cy', 100), rx = num('rx', 50), ry = num('ry', 50);
                const r = num('r', 0.5), g = num('g', 0.5), b = num('b', 0.5), a = num('a', 1.0);
                const id = engine.add_ellipse(cx, cy, rx, ry, r, g, b, a) as number;
                trackedNodes.push(makeNodeInfo(id, 'ellipse', cx - rx, cy - ry, rx * 2, ry * 2, rgbToHex(r, g, b), a));
                return { success: true, message: `Ellipse created at center (${cx}, ${cy}) with radii ${rx}×${ry}`, nodeId: id };
            }
            case 'add_gradient_rect': {
                const x = num('x'), y = num('y'), w = num('w', 100), h = num('h', 100);
                const r1 = num('r1', 0.2), g1 = num('g1', 0.4), b1 = num('b1', 0.8), a1 = num('a1', 1.0);
                const r2 = num('r2', 0.8), g2 = num('g2', 0.2), b2 = num('b2', 0.4), a2 = num('a2', 1.0);
                const angle_deg = num('angle_deg', 45);
                const id = engine.add_gradient_rect(x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, angle_deg) as number;
                trackedNodes.push(makeNodeInfo(id, 'gradient_rect', x, y, w, h, 'gradient', a1));
                return { success: true, message: `Gradient rect at (${x}, ${y}), angle ${angle_deg}°`, nodeId: id };
            }

            // ── Style ────────────────────────────────
            case 'set_opacity': {
                const node_id = num('node_id'), opacity = num('opacity', 1.0);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.opacity = opacity;
                return { success: true, message: `Opacity of node ${node_id} set to ${opacity}` };
            }
            case 'set_blend_mode': {
                const node_id = num('node_id'), mode = str('mode', 'normal');
                engine.set_blend_mode(node_id, mode);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.blendMode = mode;
                return { success: true, message: `Blend mode of node ${node_id} set to "${mode}"` };
            }

            // ── Effects ──────────────────────────────
            case 'set_shadow': {
                const node_id = num('node_id');
                const ox = num('offset_x', 2), oy = num('offset_y', 2), blur = num('blur', 4);
                const r = num('r'), g = num('g'), b = num('b'), a = num('a', 0.5);
                engine.set_shadow(node_id, ox, oy, blur, r, g, b, a);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.hasShadow = true;
                return { success: true, message: `Shadow applied to node ${node_id} (blur ${blur})` };
            }
            case 'remove_shadow': {
                const node_id = num('node_id');
                engine.remove_shadow(node_id);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.hasShadow = false;
                return { success: true, message: `Shadow removed from node ${node_id}` };
            }
            case 'set_brightness': {
                const node_id = num('node_id'), v = num('brightness', 1);
                engine.set_brightness(node_id, v);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.brightness = v;
                return { success: true, message: `Brightness of node ${node_id} set to ${v}` };
            }
            case 'set_contrast': {
                const node_id = num('node_id'), v = num('contrast', 1);
                engine.set_contrast(node_id, v);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.contrast = v;
                return { success: true, message: `Contrast of node ${node_id} set to ${v}` };
            }
            case 'set_saturation': {
                const node_id = num('node_id'), v = num('saturation', 1);
                engine.set_saturation(node_id, v);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.saturation = v;
                return { success: true, message: `Saturation of node ${node_id} set to ${v}` };
            }
            case 'set_hue_rotate': {
                const node_id = num('node_id'), deg = num('degrees');
                engine.set_hue_rotate(node_id, deg);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.hueRotate = deg;
                return { success: true, message: `Hue of node ${node_id} rotated by ${deg}°` };
            }

            // ── Animation ────────────────────────────
            case 'add_keyframe': {
                const node_id = num('node_id'), prop = str('property', 'opacity');
                const time = num('time'), value = num('value'), easing = str('easing', 'linear');
                engine.add_keyframe(node_id, prop, time, value, easing);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.animations.push(`${prop}: ${time}s → ${value}`);
                return { success: true, message: `Keyframe: node ${node_id}.${prop} = ${value} at ${time}s (${easing})` };
            }
            case 'set_duration': return { success: true, message: `Timeline duration set to ${num('duration', 2)}s` };
            case 'set_looping': {
                const v = params.looping !== false;
                engine.set_looping(v);
                return { success: true, message: `Looping ${v ? 'enabled' : 'disabled'}` };
            }
            case 'anim_play': { engine.anim_play(); return { success: true, message: 'Animation playing' }; }
            case 'anim_pause': { engine.anim_pause(); return { success: true, message: 'Animation paused' }; }
            case 'anim_stop': { engine.anim_stop(); return { success: true, message: 'Animation stopped and reset' }; }
            case 'anim_seek': { engine.anim_seek(num('time')); return { success: true, message: `Seeked to ${num('time')}s` }; }
            case 'anim_set_speed': { engine.anim_set_speed(num('speed', 1)); return { success: true, message: `Playback speed set to ${num('speed', 1)}x` }; }

            // ── Selection ────────────────────────────
            case 'select_node': { engine.select(num('node_id')); return { success: true, message: `Node ${num('node_id')} selected` }; }
            case 'deselect_all': { engine.deselect_all(); return { success: true, message: 'All nodes deselected' }; }

            // ── Scene ────────────────────────────────
            case 'clear_scene': { engine.clear(); trackedNodes.length = 0; return { success: true, message: 'Canvas cleared' }; }
            case 'delete_selected': { engine.delete_selected(); return { success: true, message: 'Selected nodes deleted' }; }

            // ── Undo ─────────────────────────────────
            case 'undo': { const ok = engine.undo(); return { success: ok, message: ok ? 'Undone' : 'Nothing to undo' }; }
            case 'redo': { const ok = engine.redo(); return { success: ok, message: ok ? 'Redone' : 'Nothing to redo' }; }

            // ── Delegated executors ──────────────────
            case 'add_text': return executeAddText(engine, params, trackedNodes);
            case 'set_animation_preset': return executeSetAnimPreset(engine, params, trackedNodes);
            case 'create_layout': return executeCreateLayout(engine, params, trackedNodes);
            case 'animate_all': return executeAnimateAll(engine, params, trackedNodes);
            case 'analyze_scene': return { success: true, message: analyzeScene(trackedNodes) };
            case 'render_banner': return executeRenderBanner(engine, params, trackedNodes);

            default:
                return { success: false, message: `Unknown tool: ${toolName}` };
        }
    } catch (err) {
        return { success: false, message: `Error executing ${toolName}: ${err}` };
    }
}

// Register this function for use by executorCompound (render_banner needs recursive calls)
setExecuteToolCallRef(executeToolCall);
