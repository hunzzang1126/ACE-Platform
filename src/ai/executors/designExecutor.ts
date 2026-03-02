// ─────────────────────────────────────────────────
// Design Executor — Element CRUD + Animation + Styling
// ─────────────────────────────────────────────────
// Handles: list_elements, update_element_text, update_element_property,
//          add_text, add_shape, add_button, set_animation,
//          set_custom_style, execute_dynamic_action

import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';
import { v4 as uuid } from 'uuid';
import type { DashboardExecResult } from '../dashboardExecutor';

// ── Executor ──

export function executeDesignTool(
    toolName: string,
    params: Record<string, unknown>,
): DashboardExecResult | null {
    const designStore = useDesignStore.getState();

    switch (toolName) {
        // ── Element Listing ──
        case 'list_elements': {
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open.' };
            const master = cs.variants.find(v => v.id === cs.masterVariantId);
            if (!master || master.elements.length === 0) {
                return { success: true, message: 'No elements in the master design.', data: [] };
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const elements = master.elements.map((el: any) => ({
                id: el.id,
                name: el.name,
                type: el.type,
                content: el.content ?? el.label ?? '',
                color: el.color ?? el.fill ?? '',
                fontSize: el.fontSize ?? null,
                fontFamily: el.fontFamily ?? null,
            }));
            const summary = elements.map((e: { name: string; type: string; content: string }) =>
                `• ${e.name} (${e.type}): "${e.content}"`
            ).join('\n');
            return { success: true, message: `Elements in master:\n${summary}`, data: elements };
        }

        // ── Text Update ──
        case 'update_element_text': {
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open.' };

            const elementName = (params.element_name as string || '').toLowerCase();
            const newText = params.new_text as string;
            if (!elementName || newText === undefined) {
                return { success: false, message: 'element_name and new_text are required.' };
            }

            let updated = 0;
            for (const variant of cs.variants) {
                for (const el of variant.elements) {
                    if (el.name.toLowerCase().includes(elementName)) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const raw = el as any;
                        if (el.type === 'text' && 'content' in raw) {
                            raw.content = newText;
                            updated++;
                        } else if (el.type === 'button' && 'label' in raw) {
                            raw.label = newText;
                            updated++;
                        } else if ('content' in raw) {
                            raw.content = newText;
                            updated++;
                        }
                    }
                }
            }

            if (updated === 0) {
                return { success: false, message: `No element matching "${params.element_name}" found.` };
            }

            useDesignStore.setState((state) => {
                state.creativeSet = cs;
            });

            return { success: true, message: `Updated text to "${newText}" on ${updated} element(s) matching "${params.element_name}" across all sizes.` };
        }

        // ── Property Update ──
        case 'update_element_property': {
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open.' };

            const elementName = (params.element_name as string || '').toLowerCase();
            const property = params.property as string;
            const rawValue = params.value as string;
            if (!elementName || !property) {
                return { success: false, message: 'element_name and property are required.' };
            }

            let value: unknown = rawValue;
            const numericProps = ['fontSize', 'opacity', 'borderRadius', 'lineHeight', 'letterSpacing', 'fontWeight', 'zIndex'];
            if (numericProps.includes(property)) {
                value = Number(rawValue);
                if (!Number.isFinite(value as number)) {
                    return { success: false, message: `Invalid numeric value "${rawValue}" for property "${property}".` };
                }
            }

            let updated = 0;
            for (const variant of cs.variants) {
                for (const el of variant.elements) {
                    if (el.name.toLowerCase().includes(elementName)) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (el as any)[property] = value;
                        updated++;
                    }
                }
            }

            if (updated === 0) {
                return { success: false, message: `No element matching "${params.element_name}" found.` };
            }

            useDesignStore.setState((state) => {
                state.creativeSet = cs;
            });

            return { success: true, message: `Set "${property}" = "${rawValue}" on ${updated} element(s) matching "${params.element_name}".` };
        }

        // ── Add Text ──
        case 'add_text': {
            if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

            const content = (params.content as string) || 'Text';
            let y = Number(params.y) || 0;
            const fontSize = Number(params.fontSize) || 24;
            const fontWeight = Number(params.fontWeight) || 700;
            const color = (params.color as string) || '#ffffff';
            const fontFamily = (params.fontFamily as string) || 'Inter';
            const textAlign = (params.textAlign as string) || 'center';
            const align = (params.align as string) || 'center';
            const xParam = Number(params.x) || 0;
            const elName = (params.name as string) || content.substring(0, 20);
            const role = (params.role as string) || undefined;

            // ★ Deduplication
            const firstVariant = designStore.creativeSet.variants[0];
            if (firstVariant) {
                const dup = firstVariant.elements.find(
                    (el) => el.type === 'text' && (el as { content?: string }).content === content
                );
                if (dup) {
                    return { success: true, message: `Text "${content}" already exists (skip duplicate).` };
                }
            }

            // Calculate default width relative to canvas
            const canvasW = firstVariant?.preset?.width || 300;
            const width = Number(params.width) || Math.round(canvasW * 0.95);
            const avgCharWidth = fontSize * 0.55;
            const charsPerLine = Math.max(1, Math.floor(width / avgCharWidth));
            const lineCount = Math.ceil(content.length / charsPerLine);
            const singleLineH = Math.round(fontSize * 1.8);
            const estimatedH = singleLineH * lineCount;
            const height = Math.max(Number(params.height) || 0, estimatedH);

            // ★ Auto-collision
            if (firstVariant) {
                const canvasH = firstVariant.preset?.height || 250;
                const MIN_GAP = 10;
                for (const el of firstVariant.elements) {
                    if (el.type === 'shape') continue;
                    const elY = el.constraints?.vertical?.offset ?? 0;
                    const storedH = el.constraints?.size?.height ?? 0;
                    const elH = storedH > 0 ? storedH : 30;
                    const elBottom = elY + elH;
                    if (y >= elY && y < elBottom + MIN_GAP) {
                        y = elBottom + MIN_GAP;
                    }
                }
                y = Math.min(y, canvasH - height - 4);
                if (y < 0) y = 0;
            }

            const horizontal = align === 'center'
                ? { anchor: 'center' as const, offset: 0 }
                : align === 'right'
                    ? { anchor: 'right' as const, offset: xParam }
                    : { anchor: 'left' as const, offset: xParam };

            useDesignStore.setState((state) => {
                if (!state.creativeSet) return;
                for (const variant of state.creativeSet.variants) {
                    variant.elements.push({
                        id: uuid(),
                        name: elName,
                        type: 'text' as const,
                        content,
                        fontFamily,
                        fontSize,
                        fontWeight,
                        fontStyle: 'normal' as const,
                        color,
                        textAlign: textAlign as 'left' | 'center' | 'right',
                        lineHeight: 1.2,
                        letterSpacing: 0,
                        autoShrink: false,
                        opacity: 1,
                        visible: true,
                        locked: false,
                        zIndex: variant.elements.length,
                        constraints: {
                            horizontal,
                            vertical: { anchor: 'top' as const, offset: y },
                            size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height },
                            rotation: 0,
                        },
                        ...(role ? { role } : {}),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any);
                }
            });

            return { success: true, message: `Text "${content}" — ${fontSize}px ${color}, align=${align}, y=${y}` };
        }

        // ── Add Shape ──
        case 'add_shape': {
            if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

            const shapeType = (params.shapeType as string) || 'rectangle';
            let y = Number(params.y) || 0;
            const fill = (params.fill as string) || '#333333';
            const borderRadius = Number(params.borderRadius) || 0;
            const opacity = Number(params.opacity) ?? 1;
            const align = (params.align as string) || 'stretch';
            const xParam = Number(params.x) || 0;
            const elName = (params.name as string) || `Shape`;
            const role = (params.role as string) || undefined;

            // ★ Deduplication
            const firstVariant = designStore.creativeSet.variants[0];
            if (firstVariant && elName !== 'Shape') {
                const dup = firstVariant.elements.find(
                    (el) => el.type === 'shape' && el.name === elName
                );
                if (dup) {
                    return { success: true, message: `Shape "${elName}" already exists (skip duplicate).` };
                }
            }

            const canvasW = firstVariant?.preset?.width || 300;
            const width = Number(params.width) || canvasW;
            const height = Number(params.height) || 100;

            // ★ Auto-collision for small centered shapes
            if (firstVariant && align === 'center' && height < 50) {
                const MIN_GAP = 6;
                for (const el of firstVariant.elements) {
                    const elY = el.constraints?.vertical?.offset ?? 0;
                    const elH = el.constraints?.size?.height ?? 0;
                    const elBottom = elY + elH;
                    if (y >= elY && y < elBottom + MIN_GAP) {
                        y = elBottom + MIN_GAP;
                    }
                }
            }

            const horizontal = align === 'center'
                ? { anchor: 'center' as const, offset: 0 }
                : align === 'stretch'
                    ? { anchor: 'stretch' as const, offset: 0, marginLeft: 0, marginRight: 0 }
                    : align === 'right'
                        ? { anchor: 'right' as const, offset: xParam }
                        : { anchor: 'left' as const, offset: xParam };

            const sizeMode = align === 'stretch'
                ? { widthMode: 'relative' as const, heightMode: 'fixed' as const, width: 1, height }
                : { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height };

            useDesignStore.setState((state) => {
                if (!state.creativeSet) return;
                for (const variant of state.creativeSet.variants) {
                    const canvasH = variant.preset?.height || 250;
                    variant.elements.push({
                        id: uuid(),
                        name: elName,
                        type: 'shape' as const,
                        shapeType: shapeType as 'rectangle' | 'ellipse' | 'line',
                        fill,
                        strokeWidth: 0,
                        borderRadius,
                        opacity: Number.isFinite(opacity) ? opacity : 1,
                        visible: true,
                        locked: false,
                        zIndex: variant.elements.length,
                        constraints: {
                            horizontal,
                            vertical: { anchor: 'top' as const, offset: y },
                            size: sizeMode,
                            rotation: 0,
                        },
                        ...(role ? { role } : {}),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any);
                    if (y === 0 && height >= canvasH * 0.8) {
                        variant.backgroundColor = fill;
                    }
                }
            });

            return { success: true, message: `Shape "${shapeType}" ${width}×${height} — fill ${fill}, align=${align}` };
        }

        // ── Add Button ──
        case 'add_button': {
            if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

            const text = ((params.text as string) || 'CLICK HERE').toUpperCase();
            let y = Number(params.y) || 200;
            const bgColor = (params.bgColor as string) || '#c9a84c';
            const textColor = (params.textColor as string) || '#ffffff';
            const fontSize = Number(params.fontSize) || 14;
            const borderRadius = Number(params.borderRadius) || 6;
            const elName = (params.name as string) || 'CTA Button';
            const role = (params.role as string) || 'cta';

            // ★ Deduplication
            const firstVariant = designStore.creativeSet.variants[0];
            if (firstVariant) {
                const dup = firstVariant.elements.find(
                    (el) => el.type === 'text' && (el as { content?: string }).content === text
                );
                if (dup) {
                    return { success: true, message: `Button "${text}" already exists (skip duplicate).` };
                }
            }
            const canvasW = firstVariant?.preset?.width || 300;
            const width = Number(params.width) || Math.round(canvasW * 0.6);
            const height = Number(params.height) || 40;

            // ★ Auto-collision
            if (firstVariant) {
                const canvasH = firstVariant.preset?.height || 250;
                const MIN_GAP = 8;
                for (const el of firstVariant.elements) {
                    if (el.type === 'shape') continue;
                    const elY = el.constraints?.vertical?.offset ?? 0;
                    const elH = el.constraints?.size?.height ?? 0;
                    const elBottom = elY + elH;
                    if (y >= elY && y < elBottom + MIN_GAP) {
                        y = elBottom + MIN_GAP;
                    }
                }
                y = Math.min(y, canvasH - height - 4);
                if (y < 0) y = 0;
            }

            const btnShapeId = uuid();
            const btnTextId = uuid();

            useDesignStore.setState((state) => {
                if (!state.creativeSet) return;
                for (const variant of state.creativeSet.variants) {
                    const z = variant.elements.length;
                    variant.elements.push({
                        id: btnShapeId,
                        name: `${elName} BG`,
                        type: 'shape' as const,
                        shapeType: 'rectangle' as const,
                        fill: bgColor,
                        strokeWidth: 0,
                        borderRadius,
                        opacity: 1,
                        visible: true,
                        locked: false,
                        zIndex: z,
                        constraints: {
                            horizontal: { anchor: 'center' as const, offset: 0 },
                            vertical: { anchor: 'top' as const, offset: y },
                            size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height },
                            rotation: 0,
                        },
                        role,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any);

                    variant.elements.push({
                        id: btnTextId,
                        name: elName,
                        type: 'text' as const,
                        content: text,
                        fontFamily: 'Inter',
                        fontSize,
                        fontWeight: 700,
                        fontStyle: 'normal' as const,
                        color: textColor,
                        textAlign: 'center' as const,
                        lineHeight: 1,
                        letterSpacing: 1,
                        autoShrink: false,
                        opacity: 1,
                        visible: true,
                        locked: false,
                        zIndex: z + 1,
                        constraints: {
                            horizontal: { anchor: 'center' as const, offset: 0 },
                            vertical: { anchor: 'top' as const, offset: y + Math.round((height - fontSize) / 2) },
                            size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height: Math.round(fontSize * 1.4) },
                            rotation: 0,
                        },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any);
                }
            });

            return { success: true, message: `CTA Button "${text}" — ${width}×${height} ${bgColor}, centered` };
        }

        // ── Animation ──
        case 'set_animation': {
            if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

            const elementName = (params.element_name as string) || '';
            const preset = (params.preset as string) || 'fade';
            const duration = Number(params.duration) || 0.5;
            const startTime = Number(params.startTime) || 0;

            const validPresets = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale', 'ascend', 'descend'];
            if (!validPresets.includes(preset)) {
                return { success: false, message: `Invalid preset "${preset}". Valid: ${validPresets.join(', ')}` };
            }

            const animData = { preset, duration, startTime };
            let updated = 0;

            useDesignStore.setState((state) => {
                if (!state.creativeSet) return;
                for (const variant of state.creativeSet.variants) {
                    for (const el of variant.elements) {
                        if (el.name.toLowerCase().includes(elementName.toLowerCase())) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (el as any).animation = animData;
                            updated++;
                        }
                    }
                }
            });

            try {
                const cs = useDesignStore.getState().creativeSet;
                if (cs) {
                    for (const variant of cs.variants) {
                        for (const el of variant.elements) {
                            if (el.name.toLowerCase().includes(elementName.toLowerCase())) {
                                useAnimPresetStore.getState().setPreset(el.id, {
                                    anim: preset as 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale' | 'ascend' | 'descend' | 'none',
                                    animDuration: duration,
                                    startTime,
                                });
                            }
                        }
                    }
                }
            } catch { /* animPresetStore not available */ }

            return { success: true, message: `Animation "${preset}" (${duration}s, start ${startTime}s) applied to ${updated} element(s) matching "${elementName}"` };
        }

        // ── Custom Style ──
        case 'set_custom_style': {
            const cs = designStore.creativeSet;
            if (!cs) return { success: false, message: 'No creative set open.' };

            const elementName = (params.element_name as string || '').toLowerCase();
            const styles = params.styles as Record<string, string>;
            if (!elementName || !styles || typeof styles !== 'object') {
                return { success: false, message: 'element_name and styles object are required.' };
            }

            let updated = 0;
            for (const variant of cs.variants) {
                for (const el of variant.elements) {
                    if (el.name.toLowerCase().includes(elementName)) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const raw = el as any;
                        raw.customStyles = { ...(raw.customStyles || {}), ...styles };
                        updated++;
                    }
                }
            }

            if (updated === 0) {
                return { success: false, message: `No element matching "${params.element_name}" found.` };
            }

            useDesignStore.setState((state) => {
                state.creativeSet = cs;
            });

            const styleList = Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join(', ');
            return { success: true, message: `Applied custom styles to ${updated} element(s) matching "${params.element_name}": ${styleList}` };
        }

        // ── Dynamic Action ──
        case 'execute_dynamic_action': {
            const description = params.description as string || 'Custom action';
            const code = params.code as string;
            if (!code) {
                return { success: false, message: 'code is required.' };
            }

            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fn = new Function(
                    'designStore',
                    'useDesignStore',
                    'useProjectStore',
                    `"use strict";
                    try {
                        ${code}
                    } catch (e) {
                        return "Error: " + e.message;
                    }`
                );

                const result = fn(
                    useDesignStore.getState(),
                    useDesignStore,
                    useProjectStore,
                );

                const resultStr = typeof result === 'string' ? result : JSON.stringify(result ?? 'Done');
                console.log(`[DashboardExecutor] Dynamic action "${description}" result:`, resultStr);
                return { success: true, message: `[OK] ${description}: ${resultStr}` };
            } catch (err) {
                console.error(`[DashboardExecutor] Dynamic action failed:`, err);
                return { success: false, message: `Failed to execute "${description}": ${err}` };
            }
        }

        default:
            return null; // Not handled by this executor
    }
}
