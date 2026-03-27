// ─────────────────────────────────────────────────
// designElementCreators — add_text, add_shape, add_button
// ─────────────────────────────────────────────────

import { useDesignStore } from '@/stores/designStore';
import { v4 as uuid } from 'uuid';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';
import type { DashboardExecResult } from '../dashboardExecutor';

// ── Helpers ──

function autoCollision(firstVariant: { elements: any[]; preset?: { height?: number } }, y: number, height: number, skipShapes = true): number {
    if (!firstVariant) return y;
    const canvasH = firstVariant.preset?.height || 250;
    const MIN_GAP = 10;
    for (const el of firstVariant.elements) {
        if (skipShapes && el.type === 'shape') continue;
        const elY = el.constraints?.vertical?.offset ?? 0;
        const elH = el.constraints?.size?.height ?? 30;
        const elBottom = elY + (elH > 0 ? elH : 30);
        if (y >= elY && y < elBottom + MIN_GAP) y = elBottom + MIN_GAP;
    }
    y = Math.min(y, canvasH - height - 4);
    return y < 0 ? 0 : y;
}

function buildHorizontal(align: string, xParam: number) {
    if (align === 'center') return { anchor: 'center' as const, offset: 0 };
    if (align === 'right') return { anchor: 'right' as const, offset: xParam };
    if (align === 'stretch') return { anchor: 'stretch' as const, offset: 0, marginLeft: 0, marginRight: 0 };
    return { anchor: 'left' as const, offset: xParam };
}

// ── Add Text ──

export function handleAddText(params: Record<string, unknown>): DashboardExecResult {
    const designStore = useDesignStore.getState();
    if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

    const content = (params.content as string) || 'Text';
    const fontSize = Number(params.fontSize) || 24;
    const fontWeight = Number(params.fontWeight) || 700;
    const color = (params.color as string) || '#ffffff';
    const fontFamily = (params.fontFamily as string) || 'Inter';
    const textAlign = (params.textAlign as string) || 'center';
    const align = (params.align as string) || 'center';
    const xParam = Number(params.x) || 0;
    const elName = (params.name as string) || content.substring(0, 20);
    const role = (params.role as string) || undefined;

    const firstVariant = designStore.creativeSet.variants[0];
    if (firstVariant) {
        const dup = firstVariant.elements.find((el: any) => el.type === 'text' && el.content === content);
        if (dup) return { success: true, message: `Text "${content}" already exists (skip duplicate).` };
    }

    const canvasW = firstVariant?.preset?.width || 300;
    const width = Number(params.width) || Math.round(canvasW * 0.95);
    const avgCharWidth = fontSize * 0.55;
    const charsPerLine = Math.max(1, Math.floor(width / avgCharWidth));
    const lineCount = Math.ceil(content.length / charsPerLine);
    const estimatedH = Math.round(fontSize * 1.8) * lineCount;
    const height = Math.max(Number(params.height) || 0, estimatedH);
    let y = Number(params.y) || 0;
    if (firstVariant) y = autoCollision(firstVariant, y, height);

    const horizontal = buildHorizontal(align, xParam);

    useDesignStore.setState((state) => {
        if (!state.creativeSet) return;
        for (const variant of state.creativeSet.variants) {
            variant.elements.push({
                id: uuid(), name: elName, type: 'text' as const, content, fontFamily, fontSize,
                fontWeight, fontStyle: 'normal' as const, color,
                textAlign: textAlign as 'left' | 'center' | 'right', lineHeight: 1.2, letterSpacing: 0,
                autoShrink: false, opacity: 1, visible: true, locked: false,
                zIndex: variant.elements.length,
                constraints: { horizontal, vertical: { anchor: 'top' as const, offset: y }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height }, rotation: 0 },
                ...(role ? { role } : {}),
            } as any);
        }
    });
    return { success: true, message: `Text "${content}" — ${fontSize}px ${color}, align=${align}, y=${y}` };
}

// ── Add Shape ──

export function handleAddShape(params: Record<string, unknown>): DashboardExecResult {
    const designStore = useDesignStore.getState();
    if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

    const shapeType = (params.shapeType as string) || 'rectangle';
    const fill = (params.fill as string) || '#333333';
    const borderRadius = Number(params.borderRadius) || 0;
    const opacity = Number(params.opacity) ?? 1;
    const align = (params.align as string) || 'stretch';
    const xParam = Number(params.x) || 0;
    const elName = (params.name as string) || 'Shape';
    const role = (params.role as string) || undefined;

    const firstVariant = designStore.creativeSet.variants[0];
    if (firstVariant && elName !== 'Shape') {
        const dup = firstVariant.elements.find((el: any) => el.type === 'shape' && el.name === elName);
        if (dup) return { success: true, message: `Shape "${elName}" already exists (skip duplicate).` };
    }

    const canvasW = firstVariant?.preset?.width || 300;
    const width = Number(params.width) || canvasW;
    const height = Number(params.height) || 100;
    let y = Number(params.y) || 0;
    if (firstVariant && align === 'center' && height < 50) {
        y = autoCollision(firstVariant, y, height, false);
    }

    const horizontal = buildHorizontal(align, xParam);
    const sizeMode = align === 'stretch'
        ? { widthMode: 'relative' as const, heightMode: 'fixed' as const, width: 1, height }
        : { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height };

    useDesignStore.setState((state) => {
        if (!state.creativeSet) return;
        for (const variant of state.creativeSet.variants) {
            const canvasH = variant.preset?.height || 250;
            variant.elements.push({
                id: uuid(), name: elName, type: 'shape' as const,
                shapeType: shapeType as 'rectangle' | 'ellipse' | 'line',
                fill, strokeWidth: 0, borderRadius,
                opacity: Number.isFinite(opacity) ? opacity : 1,
                visible: true, locked: false, zIndex: variant.elements.length,
                constraints: { horizontal, vertical: { anchor: 'top' as const, offset: y }, size: sizeMode, rotation: 0 },
                ...(role ? { role } : {}),
            } as any);
            if (y === 0 && height >= canvasH * 0.8) variant.backgroundColor = fill;
        }
    });
    return { success: true, message: `Shape "${shapeType}" ${width}×${height} — fill ${fill}, align=${align}` };
}

// ── Add Button ──

export function handleAddButton(params: Record<string, unknown>): DashboardExecResult {
    const designStore = useDesignStore.getState();
    if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

    const text = (params.text as string) || 'Shop Now';
    const bgColor = (params.bgColor as string) || '#c9a84c';
    const textColor = (params.textColor as string) || '#ffffff';
    const fontSize = Number(params.fontSize) || 14;
    const fontFamily = (params.fontFamily as string) || 'Inter';
    const borderRadius = Number(params.borderRadius) || 6;
    const elName = (params.name as string) || 'CTA Button';
    const role = (params.role as string) || 'cta';

    const firstVariant = designStore.creativeSet.variants[0];
    if (firstVariant) {
        const dup = firstVariant.elements.find((el: any) => el.type === 'text' && (el as any).content === text);
        if (dup) return { success: true, message: `Button "${text}" already exists (skip duplicate).` };
    }
    const canvasW = firstVariant?.preset?.width || 300;
    const width = Number(params.width) || Math.round(canvasW * 0.6);
    const height = Number(params.height) || 40;
    let y = Number(params.y) || 200;
    if (firstVariant) y = autoCollision(firstVariant, y, height);

    const btnShapeId = uuid(), btnTextId = uuid();

    useDesignStore.setState((state) => {
        if (!state.creativeSet) return;
        for (const variant of state.creativeSet.variants) {
            const z = variant.elements.length;
            variant.elements.push({
                id: btnShapeId, name: `${elName} BG`, type: 'shape' as const,
                shapeType: 'rectangle' as const, fill: bgColor, strokeWidth: 0, borderRadius,
                opacity: 1, visible: true, locked: false, zIndex: z,
                constraints: { horizontal: { anchor: 'center' as const, offset: 0 }, vertical: { anchor: 'top' as const, offset: y }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height }, rotation: 0 },
                role,
            } as any);
            variant.elements.push({
                id: btnTextId, name: elName, type: 'text' as const,
                content: text, fontFamily, fontSize, fontWeight: 700, fontStyle: 'normal' as const,
                color: textColor, textAlign: 'center' as const, lineHeight: 1, letterSpacing: 1,
                autoShrink: false, opacity: 1, visible: true, locked: false, zIndex: z + 1,
                constraints: { horizontal: { anchor: 'center' as const, offset: 0 }, vertical: { anchor: 'top' as const, offset: y + Math.round((height - fontSize) / 2) }, size: { widthMode: 'fixed' as const, heightMode: 'fixed' as const, width, height: Math.round(fontSize * 1.4) }, rotation: 0 },
            } as any);
        }
    });
    return { success: true, message: `CTA Button "${text}" — ${width}×${height} ${bgColor}, centered` };
}

// ── Animation ──

export function handleSetAnimation(params: Record<string, unknown>): DashboardExecResult {
    const designStore = useDesignStore.getState();
    if (!designStore.creativeSet) return { success: false, message: 'No creative set open.' };

    const elementName = (params.element_name as string) || '';
    const preset = (params.preset as string) || 'fade';
    const duration = Number(params.duration) || 0.5;
    const startTime = Number(params.startTime) || 0;

    const validPresets = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale', 'ascend', 'descend'];
    if (!validPresets.includes(preset)) return { success: false, message: `Invalid preset "${preset}". Valid: ${validPresets.join(', ')}` };

    let updated = 0;
    useDesignStore.setState((state) => {
        if (!state.creativeSet) return;
        for (const variant of state.creativeSet.variants) {
            for (const el of variant.elements) {
                if (el.name.toLowerCase().includes(elementName.toLowerCase())) { (el as any).animation = { preset, duration, startTime }; updated++; }
            }
        }
    });

    try {
        const cs = useDesignStore.getState().creativeSet;
        if (cs) {
            for (const variant of cs.variants) {
                for (const el of variant.elements) {
                    if (el.name.toLowerCase().includes(elementName.toLowerCase())) {
                        useAnimPresetStore.getState().setPreset(el.id, { anim: preset as any, animDuration: duration, startTime });
                    }
                }
            }
        }
    } catch { /* animPresetStore not available */ }

    return { success: true, message: `Animation "${preset}" (${duration}s, start ${startTime}s) applied to ${updated} element(s) matching "${elementName}"` };
}
