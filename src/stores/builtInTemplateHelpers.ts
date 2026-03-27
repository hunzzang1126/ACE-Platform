// ─────────────────────────────────────────────────
// builtInTemplateHelpers — Element + variant factory functions
// ─────────────────────────────────────────────────

import type { BannerVariant } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';
import type { DesignTemplate } from '@/stores/templateStore';

// ── Constraint Builder ──

export function el(_id: string, _name: string, x: number, y: number, w: number, h: number): ReturnType<typeof createDefaultConstraints> {
    const c = createDefaultConstraints();
    c.horizontal.offset = x;
    c.vertical.offset = y;
    c.size.width = w;
    c.size.height = h;
    return c;
}

// ── Element Factories ──

export function textEl(id: string, name: string, x: number, y: number, w: number, h: number, opts: {
    content: string; fontSize: number; fontWeight: number; color: string;
    textAlign?: 'left' | 'center' | 'right'; fontFamily?: string; zIndex?: number;
    role?: string;
}): DesignElement {
    return {
        id, name, type: 'text',
        constraints: el(id, name, x, y, w, h),
        opacity: 1, visible: true, locked: false, zIndex: opts.zIndex ?? 1,
        content: opts.content, fontFamily: opts.fontFamily ?? 'Inter',
        fontSize: opts.fontSize, fontWeight: opts.fontWeight, fontStyle: 'normal',
        color: opts.color, textAlign: opts.textAlign ?? 'left',
        lineHeight: 1.2, letterSpacing: 0, autoShrink: true,
        role: opts.role as any,
    };
}

export function shapeEl(id: string, name: string, x: number, y: number, w: number, h: number, opts: {
    fill: string; borderRadius?: number; zIndex?: number; opacity?: number;
    gradientStart?: string; gradientEnd?: string; gradientAngle?: number;
    role?: string;
}): DesignElement {
    return {
        id, name, type: 'shape', shapeType: 'rectangle',
        constraints: el(id, name, x, y, w, h),
        opacity: opts.opacity ?? 1, visible: true, locked: false, zIndex: opts.zIndex ?? 0,
        fill: opts.fill, borderRadius: opts.borderRadius ?? 0,
        gradientStart: opts.gradientStart, gradientEnd: opts.gradientEnd,
        gradientAngle: opts.gradientAngle,
        role: opts.role as any,
    };
}

export function btnEl(id: string, name: string, x: number, y: number, w: number, h: number, opts: {
    label: string; fontSize: number; color: string; backgroundColor: string;
    borderRadius?: number; zIndex?: number; role?: string;
}): DesignElement {
    return {
        id, name, type: 'button',
        constraints: el(id, name, x, y, w, h),
        opacity: 1, visible: true, locked: false, zIndex: opts.zIndex ?? 3,
        label: opts.label, fontFamily: 'Inter',
        fontSize: opts.fontSize, fontWeight: 700, color: opts.color,
        backgroundColor: opts.backgroundColor, borderRadius: opts.borderRadius ?? 8,
        role: opts.role as any,
    };
}

export function makeVariant(id: string, w: number, h: number, bg: string, elements: DesignElement[]): BannerVariant {
    return {
        id,
        preset: { id: `p-${id}`, name: `${w}x${h}`, width: w, height: h, category: 'display' },
        elements,
        backgroundColor: bg,
        overriddenElementIds: [],
        syncLocked: false,
    };
}

export function makeTemplate(
    id: string, name: string, desc: string, category: 'display' | 'social',
    tags: string[], w: number, h: number, bg: string, elements: DesignElement[],
): DesignTemplate {
    const variant = makeVariant(`v-${id}`, w, h, bg, elements);
    return {
        id, name, description: desc, category, tags,
        thumbnailSrc: '', width: w, height: h,
        variantSnapshot: JSON.stringify(variant),
        usageCount: 0, isBuiltIn: true, isFavorite: false,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
}
