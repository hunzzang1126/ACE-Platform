// ─────────────────────────────────────────────────
// Command Executor — Maps AI tool calls → WASM Engine
// ─────────────────────────────────────────────────
// Every tool call from the AI is routed here and executed
// on the WASM engine. Returns structured results.

import type { SceneNodeInfo } from './agentContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

export interface ExecutionResult {
    success: boolean;
    message: string;
    nodeId?: number;
    data?: unknown;
}

/**
 * Color helper: HSL hue (0-360) → RGB (0-1)
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [r + m, g + m, b + m];
}

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
    // ── Guard: Engine must exist ──
    if (!engine) {
        return { success: false, message: `Cannot execute "${toolName}": no canvas engine available. Navigate to a canvas editor first.` };
    }

    // ── Safe number extraction — never pass undefined/NaN to WASM ──
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
                const x = num('x'), y = num('y');
                const w = num('w', 100), h = num('h', 100);
                const r = num('r', 0.5), g = num('g', 0.5), b = num('b', 0.5);
                const a = num('a', 1.0);
                const id = engine.add_rect(x, y, w, h, r, g, b, a) as number;
                trackedNodes.push(makeNodeInfo(id, 'rect', x, y, w, h, rgbToHex(r, g, b), a));
                return { success: true, message: `Rectangle created at (${x}, ${y}) with size ${w}×${h}`, nodeId: id };
            }

            case 'add_rounded_rect': {
                const x = num('x'), y = num('y');
                const w = num('w', 100), h = num('h', 100);
                const r = num('r', 0.5), g = num('g', 0.5), b = num('b', 0.5);
                const a = num('a', 1.0);
                const radius = num('radius', 8);
                const id = engine.add_rounded_rect(x, y, w, h, r, g, b, a, radius) as number;
                trackedNodes.push(makeNodeInfo(id, 'rounded_rect', x, y, w, h, rgbToHex(r, g, b), a));
                return { success: true, message: `Rounded rect created (radius ${radius}) at (${x}, ${y})`, nodeId: id };
            }

            case 'add_ellipse': {
                const cx = num('cx', 100), cy = num('cy', 100);
                const rx = num('rx', 50), ry = num('ry', 50);
                const r = num('r', 0.5), g = num('g', 0.5), b = num('b', 0.5);
                const a = num('a', 1.0);
                const id = engine.add_ellipse(cx, cy, rx, ry, r, g, b, a) as number;
                trackedNodes.push(makeNodeInfo(id, 'ellipse', cx - rx, cy - ry, rx * 2, ry * 2, rgbToHex(r, g, b), a));
                return { success: true, message: `Ellipse created at center (${cx}, ${cy}) with radii ${rx}×${ry}`, nodeId: id };
            }

            case 'add_gradient_rect': {
                const x = num('x'), y = num('y');
                const w = num('w', 100), h = num('h', 100);
                const r1 = num('r1', 0.2), g1 = num('g1', 0.4), b1 = num('b1', 0.8), a1 = num('a1', 1.0);
                const r2 = num('r2', 0.8), g2 = num('g2', 0.2), b2 = num('b2', 0.4), a2 = num('a2', 1.0);
                const angle_deg = num('angle_deg', 45);
                const id = engine.add_gradient_rect(x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, angle_deg) as number;
                trackedNodes.push(makeNodeInfo(id, 'gradient_rect', x, y, w, h, 'gradient', a1));
                return { success: true, message: `Gradient rect at (${x}, ${y}), angle ${angle_deg}°`, nodeId: id };
            }

            // ── Style ────────────────────────────────
            case 'set_opacity': {
                const node_id = num('node_id');
                const opacity = num('opacity', 1.0);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.opacity = opacity;
                return { success: true, message: `Opacity of node ${node_id} set to ${opacity}` };
            }

            case 'set_blend_mode': {
                const node_id = num('node_id');
                const mode = str('mode', 'normal');
                engine.set_blend_mode(node_id, mode);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.blendMode = mode;
                return { success: true, message: `Blend mode of node ${node_id} set to "${mode}"` };
            }

            // ── Effects ──────────────────────────────
            case 'set_shadow': {
                const node_id = num('node_id');
                const offset_x = num('offset_x', 2), offset_y = num('offset_y', 2);
                const blur = num('blur', 4);
                const r = num('r'), g = num('g'), b = num('b');
                const a = num('a', 0.5);
                engine.set_shadow(node_id, offset_x, offset_y, blur, r, g, b, a);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.hasShadow = true;
                return { success: true, message: `Shadow applied to node ${node_id} (blur ${blur}, offset ${offset_x}/${offset_y})` };
            }

            case 'remove_shadow': {
                const node_id = num('node_id');
                engine.remove_shadow(node_id);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.hasShadow = false;
                return { success: true, message: `Shadow removed from node ${node_id}` };
            }

            case 'set_brightness': {
                const node_id = num('node_id');
                const brightness = num('brightness', 1);
                engine.set_brightness(node_id, brightness);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.brightness = brightness;
                return { success: true, message: `Brightness of node ${node_id} set to ${brightness}` };
            }

            case 'set_contrast': {
                const node_id = num('node_id');
                const contrast = num('contrast', 1);
                engine.set_contrast(node_id, contrast);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.contrast = contrast;
                return { success: true, message: `Contrast of node ${node_id} set to ${contrast}` };
            }

            case 'set_saturation': {
                const node_id = num('node_id');
                const saturation = num('saturation', 1);
                engine.set_saturation(node_id, saturation);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.saturation = saturation;
                return { success: true, message: `Saturation of node ${node_id} set to ${saturation}` };
            }

            case 'set_hue_rotate': {
                const node_id = num('node_id');
                const degrees = num('degrees');
                engine.set_hue_rotate(node_id, degrees);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.effects.hueRotate = degrees;
                return { success: true, message: `Hue of node ${node_id} rotated by ${degrees}°` };
            }

            // ── Animation ────────────────────────────
            case 'add_keyframe': {
                const node_id = num('node_id');
                const property = str('property', 'opacity');
                const time = num('time');
                const value = num('value');
                const easing = str('easing', 'linear');
                engine.add_keyframe(node_id, property, time, value, easing);
                const node = trackedNodes.find(n => n.id === node_id);
                if (node) node.animations.push(`${property}: ${time}s → ${value}`);
                return { success: true, message: `Keyframe: node ${node_id}.${property} = ${value} at ${time}s (${easing})` };
            }

            case 'set_duration': {
                const duration = num('duration', 2);
                engine.set_duration(duration);
                return { success: true, message: `Timeline duration set to ${duration}s` };
            }

            case 'set_looping': {
                const looping = params.looping !== false;
                engine.set_looping(looping);
                return { success: true, message: `Looping ${looping ? 'enabled' : 'disabled'}` };
            }

            case 'anim_play': {
                engine.anim_play();
                return { success: true, message: 'Animation playing' };
            }

            case 'anim_pause': {
                engine.anim_pause();
                return { success: true, message: 'Animation paused' };
            }

            case 'anim_stop': {
                engine.anim_stop();
                return { success: true, message: 'Animation stopped and reset' };
            }

            case 'anim_seek': {
                const time = num('time');
                engine.anim_seek(time);
                return { success: true, message: `Seeked to ${time}s` };
            }

            case 'anim_set_speed': {
                const speed = num('speed', 1);
                engine.anim_set_speed(speed);
                return { success: true, message: `Playback speed set to ${speed}x` };
            }

            // ── Selection ────────────────────────────
            case 'select_node': {
                const node_id = num('node_id');
                engine.select(node_id);
                return { success: true, message: `Node ${node_id} selected` };
            }

            case 'deselect_all': {
                engine.deselect_all();
                return { success: true, message: 'All nodes deselected' };
            }

            // ── Scene ────────────────────────────────
            case 'clear_scene': {
                engine.clear();
                trackedNodes.length = 0;
                return { success: true, message: 'Canvas cleared' };
            }

            case 'delete_selected': {
                engine.delete_selected();
                return { success: true, message: 'Selected nodes deleted' };
            }

            // ── Undo ─────────────────────────────────
            case 'undo': {
                const ok = engine.undo();
                return { success: ok, message: ok ? 'Undone' : 'Nothing to undo' };
            }

            case 'redo': {
                const ok = engine.redo();
                return { success: ok, message: ok ? 'Redone' : 'Nothing to redo' };
            }

            // ── Compound ─────────────────────────────
            case 'create_layout': {
                return executeCreateLayout(engine, params, trackedNodes);
            }

            case 'animate_all': {
                return executeAnimateAll(engine, params, trackedNodes);
            }

            case 'analyze_scene': {
                const analysis = analyzeScene(trackedNodes);
                return { success: true, message: analysis };
            }

            default:
                return { success: false, message: `Unknown tool: ${toolName}` };
        }
    } catch (err) {
        return { success: false, message: `Error executing ${toolName}: ${err}` };
    }
}

// ── Compound Implementations ─────────────────────

function executeCreateLayout(
    engine: Engine,
    params: Record<string, unknown>,
    trackedNodes: SceneNodeInfo[],
): ExecutionResult {
    const pattern = (params.pattern as string) ?? 'row';
    const count = (params.count as number) ?? 5;
    const elemType = (params.element_type as string) ?? 'rect';
    const startX = (params.start_x as number) ?? 50;
    const startY = (params.start_y as number) ?? 50;
    const spacing = (params.spacing as number) ?? 20;
    const ew = (params.element_width as number) ?? 50;
    const eh = (params.element_height as number) ?? 50;
    const colorScheme = (params.color_scheme as string) ?? 'rainbow';

    const ids: number[] = [];

    for (let i = 0; i < count; i++) {
        let x = startX, y = startY;

        if (pattern === 'row') {
            x = startX + i * (ew + spacing);
        } else if (pattern === 'column') {
            y = startY + i * (eh + spacing);
        } else if (pattern === 'grid') {
            const cols = Math.ceil(Math.sqrt(count));
            x = startX + (i % cols) * (ew + spacing);
            y = startY + Math.floor(i / cols) * (eh + spacing);
        } else if (pattern === 'circle') {
            const angle = (2 * Math.PI * i) / count;
            const radius = Math.max(count * 15, 100);
            x = startX + radius + Math.cos(angle) * radius;
            y = startY + radius + Math.sin(angle) * radius;
        }

        // Color
        const [r, g, b] = getLayoutColor(colorScheme, i, count);

        let id: number;
        if (elemType === 'ellipse') {
            id = engine.add_ellipse(x + ew / 2, y + eh / 2, ew / 2, eh / 2, r, g, b, 0.9) as number;
        } else if (elemType === 'rounded_rect') {
            id = engine.add_rounded_rect(x, y, ew, eh, r, g, b, 0.9, 8) as number;
        } else {
            id = engine.add_rect(x, y, ew, eh, r, g, b, 0.9) as number;
        }

        ids.push(id);
        trackedNodes.push(makeNodeInfo(id, elemType as SceneNodeInfo['type'], x, y, ew, eh, rgbToHex(r, g, b), 0.9));
    }

    return {
        success: true,
        message: `Created ${count} ${elemType}s in ${pattern} layout (IDs: ${ids.join(', ')})`,
        data: ids,
    };
}

function executeAnimateAll(
    engine: Engine,
    params: Record<string, unknown>,
    trackedNodes: SceneNodeInfo[],
): ExecutionResult {
    const type = (params.animation_type as string) ?? 'fade_in';
    const nodeIds = (params.node_ids as number[]) ?? trackedNodes.map(n => n.id);
    const duration = (params.duration as number) ?? 2.0;
    const stagger = (params.stagger as number) ?? 0.1;

    for (let i = 0; i < nodeIds.length; i++) {
        const nid = nodeIds[i]!;
        const delay = i * stagger;

        switch (type) {
            case 'fade_in':
                engine.add_keyframe(nid, 'opacity', delay, 0.0, 'linear');
                engine.add_keyframe(nid, 'opacity', delay + duration, 1.0, 'ease_in_out');
                break;
            case 'bounce':
                engine.add_keyframe(nid, 'y', delay, trackedNodes.find(n => n.id === nid)?.y ?? 100, 'bounce');
                engine.add_keyframe(nid, 'y', delay + duration / 2, (trackedNodes.find(n => n.id === nid)?.y ?? 100) + 80, 'bounce');
                engine.add_keyframe(nid, 'y', delay + duration, trackedNodes.find(n => n.id === nid)?.y ?? 100, 'bounce');
                break;
            case 'slide_in':
                engine.add_keyframe(nid, 'x', delay, -100, 'ease_out');
                engine.add_keyframe(nid, 'x', delay + duration, trackedNodes.find(n => n.id === nid)?.x ?? 100, 'ease_out');
                break;
            case 'rotate':
                engine.add_keyframe(nid, 'rotation', delay, 0, 'ease_in_out');
                engine.add_keyframe(nid, 'rotation', delay + duration, 6.283, 'ease_in_out');
                break;
            case 'pulse':
                engine.add_keyframe(nid, 'opacity', delay, 0.3, 'ease_in_out');
                engine.add_keyframe(nid, 'opacity', delay + duration / 2, 1.0, 'ease_in_out');
                engine.add_keyframe(nid, 'opacity', delay + duration, 0.3, 'ease_in_out');
                break;
            case 'wave': {
                const baseY = trackedNodes.find(n => n.id === nid)?.y ?? 100;
                engine.add_keyframe(nid, 'y', delay, baseY, 'ease_in_out');
                engine.add_keyframe(nid, 'y', delay + duration * 0.25, baseY - 40, 'ease_in_out');
                engine.add_keyframe(nid, 'y', delay + duration * 0.5, baseY, 'ease_in_out');
                engine.add_keyframe(nid, 'y', delay + duration * 0.75, baseY + 40, 'ease_in_out');
                engine.add_keyframe(nid, 'y', delay + duration, baseY, 'ease_in_out');
                break;
            }
        }
    }

    engine.set_duration(Math.max(duration + nodeIds.length * stagger, engine.anim_duration?.() ?? 0));
    engine.set_looping(true);

    return {
        success: true,
        message: `Applied "${type}" animation to ${nodeIds.length} elements (stagger ${stagger}s)`,
    };
}

function analyzeScene(trackedNodes: SceneNodeInfo[]): string {
    if (trackedNodes.length === 0) return 'Canvas is empty. No elements to analyze.';

    const lines: string[] = [];
    lines.push(`**Scene Analysis** — ${trackedNodes.length} elements:`);

    for (const n of trackedNodes) {
        lines.push(`• ${n.label} (id ${n.id}): ${n.type} at (${n.x}, ${n.y}), ${n.width}×${n.height}, ${n.color}`);
    }

    // Detect issues
    const issues: string[] = [];
    for (let i = 0; i < trackedNodes.length; i++) {
        for (let j = i + 1; j < trackedNodes.length; j++) {
            const a = trackedNodes[i]!;
            const b = trackedNodes[j]!;
            const ax2 = a.x + a.width, ay2 = a.y + a.height;
            const bx2 = b.x + b.width, by2 = b.y + b.height;
            if (a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y) {
                issues.push(`⚠️ ${a.label} overlaps with ${b.label}`);
            }
        }
    }

    if (issues.length > 0) {
        lines.push('');
        lines.push('**Issues:**');
        lines.push(...issues);
    }

    return lines.join('\n');
}

// ── Helpers ──────────────────────────────────────

function makeNodeInfo(
    id: number, type: SceneNodeInfo['type'],
    x: number, y: number, w: number, h: number,
    color: string, opacity: number,
): SceneNodeInfo {
    const colorNames: Record<string, string> = {
        '#ff0000': 'Red', '#0033ff': 'Blue', '#00cc66': 'Green',
        '#ffee00': 'Yellow', '#9933ee': 'Purple', '#00ccff': 'Cyan',
        '#ff8800': 'Orange', '#ff6699': 'Pink', '#ffffff': 'White',
        '#000000': 'Black',
    };
    const typeName = type === 'rounded_rect' ? 'Rounded Rect' : type === 'gradient_rect' ? 'Gradient Rect' : type.charAt(0).toUpperCase() + type.slice(1);
    const colorName = colorNames[color.toLowerCase()] ?? color;
    const label = `${colorName} ${typeName} #${id}`;

    return {
        id, type, x, y, width: w, height: h,
        color, opacity, zIndex: 0,
        label,
        effects: { hasShadow: false, brightness: 1, contrast: 1, saturation: 1, hueRotate: 0, blendMode: 'normal' },
        animations: [],
    };
}

function rgbToHex(r: number, g: number, b: number): string {
    const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${to(r)}${to(g)}${to(b)}`;
}

function getLayoutColor(scheme: string, i: number, total: number): [number, number, number] {
    switch (scheme) {
        case 'rainbow':
            return hslToRgb((i / total) * 360, 0.8, 0.55);
        case 'monochrome':
            return hslToRgb(210, 0.7, 0.3 + (i / total) * 0.5);
        case 'gradient': {
            const t = i / Math.max(total - 1, 1);
            return [0.2 + t * 0.8, 0.4 * (1 - t), 0.9 * (1 - t)];
        }
        default: // random
            return [Math.random(), Math.random(), Math.random()];
    }
}
