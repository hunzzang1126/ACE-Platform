// ─────────────────────────────────────────────────
// executorCompound — Compound/batch command executors
// ─────────────────────────────────────────────────
// Handles: render_banner, create_layout, animate_all,
//          add_text, set_animation_preset, analyze_scene

import type { SceneNodeInfo } from './agentContext';
import type { AnimPresetType } from '@/hooks/useAnimationPresets';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';
import type { Engine, ExecutionResult } from './executorHelpers';
import { hexToRgb, rgbToHex, makeNodeInfo, getLayoutColor } from './executorHelpers';

// Forward reference — set by commandExecutor.ts on init
let _executeToolCall: ((engine: Engine, toolName: string, params: Record<string, unknown>, trackedNodes: SceneNodeInfo[]) => ExecutionResult) | null = null;

/** Called by commandExecutor.ts to avoid circular dependency */
export function setExecuteToolCallRef(fn: typeof _executeToolCall) {
    _executeToolCall = fn;
}

// ── Text ────────────────────────────────────────

export function executeAddText(
    engine: Engine,
    params: Record<string, unknown>,
    trackedNodes: SceneNodeInfo[],
): ExecutionResult {
    const x = (params.x as number) ?? 0;
    const y = (params.y as number) ?? 0;
    const content = (params.content as string) ?? '';
    const fontSize = (params.font_size as number) ?? 18;
    const fontFamily = (params.font_family as string) ?? 'Inter, system-ui, sans-serif';
    const fontWeight = (params.font_weight as string) ?? '400';
    const colorHex = (params.color_hex as string) ?? '#000000';
    const width = (params.width as number) ?? 200;
    const textAlign = (params.text_align as string) ?? 'left';

    if (!content.trim()) {
        return { success: false, message: 'add_text: content cannot be empty' };
    }

    const [cr, cg, cb] = hexToRgb(colorHex);
    const id = engine.add_text(
        x, y, content, fontSize, fontFamily, fontWeight, cr, cg, cb, 1.0, width, textAlign,
    ) as number;

    trackedNodes.push(makeNodeInfo(id, 'text', x, y, width, fontSize * 1.4, colorHex, 1.0));
    return {
        success: true,
        message: `Text "${content.slice(0, 40)}" created at (${x}, ${y}), font ${fontSize}px ${fontWeight}`,
        nodeId: id,
    };
}

// ── Animation Preset ────────────────────────────

export function executeSetAnimPreset(
    engine: Engine,
    params: Record<string, unknown>,
    trackedNodes: SceneNodeInfo[],
): ExecutionResult {
    const nodeId = (params.node_id as number);
    const preset = (params.preset as AnimPresetType) ?? 'fade';
    const duration = (params.duration as number) ?? 0.4;
    const delay = (params.delay as number) ?? 0;

    if (!Number.isFinite(nodeId) || nodeId === 0) {
        return {
            success: false,
            message: `set_animation_preset: node_id must be a valid number. Got: ${JSON.stringify(params.node_id)}. Use the ID returned by add_rect / add_text / similar tools.`,
        };
    }

    const setPreset = useAnimPresetStore.getState().setPreset;
    setPreset(String(nodeId), { anim: preset, animDuration: duration, startTime: delay });

    if (engine && preset !== 'none') {
        const easing = 'ease_out';
        try {
            switch (preset) {
                case 'fade':
                    engine.add_keyframe(nodeId, 'opacity', delay, 0, easing);
                    engine.add_keyframe(nodeId, 'opacity', delay + duration, 1, easing);
                    break;
                case 'slide-left':
                    engine.add_keyframe(nodeId, 'x', delay, -200, easing);
                    engine.add_keyframe(nodeId, 'x', delay + duration, 0, easing);
                    break;
                case 'slide-right':
                    engine.add_keyframe(nodeId, 'x', delay, 200, easing);
                    engine.add_keyframe(nodeId, 'x', delay + duration, 0, easing);
                    break;
                case 'slide-up':
                    engine.add_keyframe(nodeId, 'y', delay, -200, easing);
                    engine.add_keyframe(nodeId, 'y', delay + duration, 0, easing);
                    break;
                case 'slide-down':
                    engine.add_keyframe(nodeId, 'y', delay, 200, easing);
                    engine.add_keyframe(nodeId, 'y', delay + duration, 0, easing);
                    break;
                case 'scale':
                    engine.add_keyframe(nodeId, 'scale_x', delay, 0, easing);
                    engine.add_keyframe(nodeId, 'scale_x', delay + duration, 1, easing);
                    engine.add_keyframe(nodeId, 'scale_y', delay, 0, easing);
                    engine.add_keyframe(nodeId, 'scale_y', delay + duration, 1, easing);
                    break;
                case 'ascend':
                    engine.add_keyframe(nodeId, 'y', delay, 100, easing);
                    engine.add_keyframe(nodeId, 'y', delay + duration, 0, easing);
                    engine.add_keyframe(nodeId, 'opacity', delay, 0, easing);
                    engine.add_keyframe(nodeId, 'opacity', delay + duration, 1, easing);
                    break;
                case 'descend':
                    engine.add_keyframe(nodeId, 'y', delay, -100, easing);
                    engine.add_keyframe(nodeId, 'y', delay + duration, 0, easing);
                    engine.add_keyframe(nodeId, 'opacity', delay, 0, easing);
                    engine.add_keyframe(nodeId, 'opacity', delay + duration, 1, easing);
                    break;
            }
        } catch { /* Engine may not have all keyframe methods */ }
    }

    const node = trackedNodes.find(n => n.id === nodeId);
    if (node) node.animations.push(`${preset} +${delay}s`);

    return {
        success: true,
        message: `Animation preset "${preset}" applied to node ${nodeId} (delay: ${delay}s, duration: ${duration}s)`,
    };
}

// ── render_banner ───────────────────────────────

export function executeRenderBanner(
    engine: Engine,
    params: Record<string, unknown>,
    trackedNodes: SceneNodeInfo[],
): ExecutionResult {
    const elements = (params.elements as Record<string, unknown>[]) ?? [];
    if (!Array.isArray(elements) || elements.length === 0) {
        return { success: false, message: 'render_banner: elements array is required and cannot be empty' };
    }

    const createdIds: number[] = [];
    const errors: string[] = [];

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i]!;
        const type = el.type as string ?? 'rect';
        let result: ExecutionResult;

        if (type === 'text') {
            result = executeAddText(engine, el, trackedNodes);
        } else {
            const shapeParams: Record<string, unknown> = { ...el };
            if (typeof shapeParams.fill === 'string' && !('r' in shapeParams)) {
                const [fr, fg, fb] = hexToRgb(shapeParams.fill as string);
                shapeParams.r = fr; shapeParams.g = fg; shapeParams.b = fb;
                delete shapeParams.fill;
            }
            const toolMap: Record<string, string> = {
                rect: 'add_rect', rounded_rect: 'add_rounded_rect',
                gradient_rect: 'add_gradient_rect', ellipse: 'add_ellipse',
            };
            const toolName = toolMap[type] ?? 'add_rect';
            if (!_executeToolCall) {
                result = { success: false, message: 'Internal error: executeToolCall not registered' };
            } else {
                result = _executeToolCall(engine, toolName, shapeParams, trackedNodes);
            }
        }

        if (result.success && result.nodeId !== undefined) {
            createdIds.push(result.nodeId);
            const anim = el.animation as string | undefined;
            if (anim && anim !== 'none') {
                executeSetAnimPreset(engine, {
                    node_id: result.nodeId, preset: anim,
                    duration: (el.anim_duration as number) ?? 0.4,
                    delay: (el.anim_delay as number) ?? 0,
                }, trackedNodes);
            }
        } else if (!result.success) {
            errors.push(`Element[${i}] (${type}): ${result.message}`);
        }
    }

    if (createdIds.length === 0) {
        return { success: false, message: `render_banner failed. Errors: ${errors.join('; ')}` };
    }

    return {
        success: true,
        message: `Banner rendered: ${createdIds.length} elements created (IDs: ${createdIds.join(', ')})${errors.length > 0 ? `. Warnings: ${errors.join('; ')}` : ''}`,
        data: createdIds,
    };
}

// ── create_layout ───────────────────────────────

export function executeCreateLayout(
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
        if (pattern === 'row') x = startX + i * (ew + spacing);
        else if (pattern === 'column') y = startY + i * (eh + spacing);
        else if (pattern === 'grid') {
            const cols = Math.ceil(Math.sqrt(count));
            x = startX + (i % cols) * (ew + spacing);
            y = startY + Math.floor(i / cols) * (eh + spacing);
        } else if (pattern === 'circle') {
            const angle = (2 * Math.PI * i) / count;
            const radius = Math.max(count * 15, 100);
            x = startX + radius + Math.cos(angle) * radius;
            y = startY + radius + Math.sin(angle) * radius;
        }

        const [r, g, b] = getLayoutColor(colorScheme, i, count);
        let id: number;
        if (elemType === 'ellipse') id = engine.add_ellipse(x + ew / 2, y + eh / 2, ew / 2, eh / 2, r, g, b, 0.9);
        else if (elemType === 'rounded_rect') id = engine.add_rounded_rect(x, y, ew, eh, r, g, b, 0.9, 8);
        else id = engine.add_rect(x, y, ew, eh, r, g, b, 0.9);

        ids.push(id);
        trackedNodes.push(makeNodeInfo(id, elemType as SceneNodeInfo['type'], x, y, ew, eh, rgbToHex(r, g, b), 0.9));
    }

    return { success: true, message: `Created ${count} ${elemType}s in ${pattern} layout (IDs: ${ids.join(', ')})`, data: ids };
}

// ── animate_all ─────────────────────────────────

export function executeAnimateAll(
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

    return { success: true, message: `Applied "${type}" animation to ${nodeIds.length} elements (stagger ${stagger}s)` };
}

// ── analyze_scene ───────────────────────────────

export function analyzeScene(trackedNodes: SceneNodeInfo[]): string {
    if (trackedNodes.length === 0) return 'Canvas is empty. No elements to analyze.';

    const lines: string[] = [];
    lines.push(`**Scene Analysis** — ${trackedNodes.length} elements:`);

    for (const n of trackedNodes) {
        lines.push(`• ${n.label} (id ${n.id}): ${n.type} at (${n.x}, ${n.y}), ${n.width}×${n.height}, ${n.color}`);
    }

    const issues: string[] = [];
    for (let i = 0; i < trackedNodes.length; i++) {
        for (let j = i + 1; j < trackedNodes.length; j++) {
            const a = trackedNodes[i]!, b = trackedNodes[j]!;
            if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
                issues.push(`[Warning] ${a.label} overlaps with ${b.label}`);
            }
        }
    }

    if (issues.length > 0) {
        lines.push('', '**Issues:**', ...issues);
    }
    return lines.join('\n');
}
