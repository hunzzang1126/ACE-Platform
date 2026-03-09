// ─────────────────────────────────────────────────
// createTools.ts — Create New Elements
// ─────────────────────────────────────────────────
// AI creates shapes, text, images (including brand kit
// assets) on canvas. Each tool calls designStore actions.
// ─────────────────────────────────────────────────

import type { AceTool, ToolContext, ToolResult } from './toolTypes';
import { createDefaultConstraints } from '@/schema/elements.types';
import type { ElementConstraints } from '@/schema/constraints.types';

// ── Helpers ──

function generateId(): string {
    return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildConstraints(x: number, y: number, w: number, h: number): ElementConstraints {
    const c = createDefaultConstraints();
    c.horizontal = { anchor: 'left', offset: x };
    c.vertical = { anchor: 'top', offset: y };
    c.size = { widthMode: 'fixed', heightMode: 'fixed', width: w, height: h };
    return c;
}

function getMaxZIndex(ctx: ToolContext): number {
    const cs = ctx.designActions.getCreativeSet() as { variants: { id: string; elements: { zIndex: number }[] }[] } | null;
    if (!cs || !ctx.activeVariantId) return 0;
    const variant = cs.variants.find((v: { id: string }) => v.id === ctx.activeVariantId);
    if (!variant || variant.elements.length === 0) return 0;
    return Math.max(...variant.elements.map((e: { zIndex: number }) => e.zIndex));
}

// ── Tools ──

export const createShape: AceTool = {
    name: 'create_shape',
    category: 'create',
    description: 'Create a shape element (rectangle, ellipse, polygon, line) on the canvas.',
    inputSchema: {
        type: 'object',
        required: ['shapeType', 'x', 'y', 'w', 'h'],
        properties: {
            shapeType: { type: 'string', enum: ['rectangle', 'ellipse', 'polygon', 'line'] },
            x: { type: 'number' }, y: { type: 'number' },
            w: { type: 'number' }, h: { type: 'number' },
            fill: { type: 'string', description: 'Fill color hex (#rrggbb)' },
            borderRadius: { type: 'number', description: 'Corner radius for rectangles' },
            name: { type: 'string' },
        },
    },
    execute: (params, ctx): ToolResult => {
        const id = generateId();
        const name = (params.name as string) || `Shape ${Date.now()}`;
        const element = {
            id,
            name,
            type: 'shape' as const,
            shapeType: (params.shapeType as string) || 'rectangle',
            fill: (params.fill as string) || '#333333',
            borderRadius: (params.borderRadius as number) ?? 0,
            constraints: buildConstraints(
                params.x as number, params.y as number,
                params.w as number, params.h as number,
            ),
            opacity: 1,
            visible: true,
            locked: false,
            zIndex: getMaxZIndex(ctx) + 1,
        };
        ctx.designActions.addElementToMaster(element);
        return { success: true, message: `Created ${element.shapeType} "${name}"`, data: { id }, sideEffects: [`Created shape "${name}"`] };
    },
};

export const createText: AceTool = {
    name: 'create_text',
    category: 'create',
    description: 'Create a text element on the canvas.',
    inputSchema: {
        type: 'object',
        required: ['content', 'x', 'y', 'w'],
        properties: {
            content: { type: 'string' },
            x: { type: 'number' }, y: { type: 'number' },
            w: { type: 'number' }, h: { type: 'number' },
            fontFamily: { type: 'string' },
            fontSize: { type: 'number' },
            fontWeight: { type: 'number' },
            color: { type: 'string', description: 'Text color hex' },
            textAlign: { type: 'string', enum: ['left', 'center', 'right'] },
            letterSpacing: { type: 'number' },
            lineHeight: { type: 'number' },
            name: { type: 'string' },
        },
    },
    execute: (params, ctx): ToolResult => {
        const id = generateId();
        const name = (params.name as string) || `Text ${Date.now()}`;
        const element = {
            id,
            name,
            type: 'text' as const,
            content: (params.content as string) || '',
            fontFamily: (params.fontFamily as string) || 'Inter',
            fontSize: (params.fontSize as number) || 24,
            fontWeight: (params.fontWeight as number) || 400,
            fontStyle: 'normal' as const,
            color: (params.color as string) || '#ffffff',
            textAlign: ((params.textAlign as string) || 'left') as 'left' | 'center' | 'right',
            lineHeight: (params.lineHeight as number) || 1.2,
            letterSpacing: (params.letterSpacing as number) || 0,
            autoShrink: false,
            constraints: buildConstraints(
                params.x as number, params.y as number,
                params.w as number, (params.h as number) || 40,
            ),
            opacity: 1,
            visible: true,
            locked: false,
            zIndex: getMaxZIndex(ctx) + 1,
        };
        ctx.designActions.addElementToMaster(element);
        return { success: true, message: `Created text "${name}": "${element.content}"`, data: { id }, sideEffects: [`Created text "${name}"`] };
    },
};

export const createImage: AceTool = {
    name: 'create_image',
    category: 'create',
    description: 'Create an image element on the canvas from a URL or data URL.',
    inputSchema: {
        type: 'object',
        required: ['src', 'x', 'y', 'w', 'h'],
        properties: {
            src: { type: 'string', description: 'Image URL or data URL' },
            x: { type: 'number' }, y: { type: 'number' },
            w: { type: 'number' }, h: { type: 'number' },
            fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'none'] },
            name: { type: 'string' },
        },
    },
    execute: (params, ctx): ToolResult => {
        const id = generateId();
        const name = (params.name as string) || `Image ${Date.now()}`;
        const element = {
            id,
            name,
            type: 'image' as const,
            src: (params.src as string),
            fit: ((params.fit as string) || 'cover') as 'cover' | 'contain' | 'fill' | 'none',
            constraints: buildConstraints(
                params.x as number, params.y as number,
                params.w as number, params.h as number,
            ),
            opacity: 1,
            visible: true,
            locked: false,
            zIndex: getMaxZIndex(ctx) + 1,
        };
        ctx.designActions.addElementToMaster(element);
        return { success: true, message: `Created image "${name}"`, data: { id }, sideEffects: [`Created image "${name}"`] };
    },
};

export const createImageFromBrandKit: AceTool = {
    name: 'create_image_from_brand_kit',
    category: 'create',
    description: 'Place a brand kit asset (logo, product image, etc.) on the canvas. Uses asset ID from the brand kit.',
    inputSchema: {
        type: 'object',
        required: ['assetId'],
        properties: {
            assetId: { type: 'string', description: 'Asset ID from brand kit assets list' },
            x: { type: 'number' }, y: { type: 'number' },
            w: { type: 'number' }, h: { type: 'number' },
        },
    },
    execute: (params, ctx): ToolResult => {
        if (!ctx.brandKit) return { success: false, message: 'No active brand kit' };

        const assetId = params.assetId as string;
        const asset = ctx.brandKit.assets.find(a => a.id === assetId && !a.deletedAt);
        if (!asset) return { success: false, message: `Asset "${assetId}" not found in brand kit` };

        const id = generateId();
        const w = (params.w as number) ?? asset.width;
        const h = (params.h as number) ?? asset.height;
        const x = (params.x as number) ?? 0;
        const y = (params.y as number) ?? 0;

        const element = {
            id,
            name: asset.name,
            type: 'image' as const,
            src: asset.src,
            fit: 'contain' as const,
            constraints: buildConstraints(x, y, w, h),
            opacity: 1,
            visible: true,
            locked: false,
            zIndex: getMaxZIndex(ctx) + 1,
        };
        ctx.designActions.addElementToMaster(element);
        return {
            success: true,
            message: `Placed brand asset "${asset.name}" (${asset.category}) at (${x},${y})`,
            data: { id, assetId, assetName: asset.name },
            sideEffects: [`Placed brand asset "${asset.name}"`],
        };
    },
};

export const createButton: AceTool = {
    name: 'create_button',
    category: 'create',
    description: 'Create a CTA button element on the canvas.',
    inputSchema: {
        type: 'object',
        required: ['label', 'x', 'y', 'w', 'h'],
        properties: {
            label: { type: 'string' },
            x: { type: 'number' }, y: { type: 'number' },
            w: { type: 'number' }, h: { type: 'number' },
            backgroundColor: { type: 'string' },
            color: { type: 'string', description: 'Text color' },
            fontSize: { type: 'number' },
            fontWeight: { type: 'number' },
            borderRadius: { type: 'number' },
            name: { type: 'string' },
        },
    },
    execute: (params, ctx): ToolResult => {
        const id = generateId();
        const name = (params.name as string) || `CTA ${Date.now()}`;
        const element = {
            id,
            name,
            type: 'button' as const,
            label: (params.label as string) || 'Click Here',
            fontFamily: 'Inter',
            fontSize: (params.fontSize as number) || 16,
            fontWeight: (params.fontWeight as number) || 700,
            color: (params.color as string) || '#ffffff',
            backgroundColor: (params.backgroundColor as string) || '#ff6b35',
            borderRadius: (params.borderRadius as number) || 8,
            constraints: buildConstraints(
                params.x as number, params.y as number,
                params.w as number, params.h as number,
            ),
            opacity: 1,
            visible: true,
            locked: false,
            zIndex: getMaxZIndex(ctx) + 1,
        };
        ctx.designActions.addElementToMaster(element);
        return { success: true, message: `Created button "${name}": "${element.label}"`, data: { id }, sideEffects: [`Created button "${name}"`] };
    },
};

export const duplicateNode: AceTool = {
    name: 'duplicate_node',
    category: 'create',
    description: 'Duplicate an existing element with a slight offset.',
    inputSchema: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
    },
    execute: (params, ctx): ToolResult => {
        const cs = ctx.designActions.getCreativeSet() as { variants: { id: string; elements: unknown[] }[] } | null;
        if (!cs || !ctx.activeVariantId) return { success: false, message: 'No active variant' };

        const variant = cs.variants.find((v: { id: string }) => v.id === ctx.activeVariantId);
        if (!variant) return { success: false, message: 'Variant not found' };

        const original = variant.elements.find((e: { id: string }) => (e as { id: string }).id === params.id) as Record<string, unknown> | undefined;
        if (!original) return { success: false, message: `Element "${params.id}" not found` };

        const newId = generateId();
        const clone = JSON.parse(JSON.stringify(original));
        clone.id = newId;
        clone.name = `${clone.name} Copy`;
        clone.zIndex = getMaxZIndex(ctx) + 1;

        // Offset by 20px
        if (clone.constraints?.horizontal) {
            clone.constraints.horizontal.offset = (clone.constraints.horizontal.offset ?? 0) + 20;
        }
        if (clone.constraints?.vertical) {
            clone.constraints.vertical.offset = (clone.constraints.vertical.offset ?? 0) + 20;
        }

        ctx.designActions.addElementToMaster(clone);
        return {
            success: true,
            message: `Duplicated "${original.name as string}" as "${clone.name}"`,
            data: { id: newId, originalId: params.id },
            sideEffects: [`Duplicated "${original.name}"`],
        };
    },
};

export const createTools: AceTool[] = [createShape, createText, createImage, createImageFromBrandKit, createButton, duplicateNode];
