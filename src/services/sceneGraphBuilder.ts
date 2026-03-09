// ─────────────────────────────────────────────────
// sceneGraphBuilder.ts — Design State → Scene Graph
// ─────────────────────────────────────────────────
// Converts flat DesignElement[] into a rich scene graph
// that AI agents can understand: hierarchy, relationships
// between elements, overlap detection, design tokens.
// ─────────────────────────────────────────────────

import type { DesignElement } from '@/schema/design.types';
import type { BannerVariant } from '@/schema/design.types';
import { resolveConstraints } from '@/schema/constraints.types';

// ── Scene Graph Types ──

export interface SceneGraph {
    canvas: { width: number; height: number };
    elements: SceneNode[];
    relationships: ElementRelationship[];
    tokens: DesignTokens;
}

export interface SceneNode {
    id: string;
    name: string;
    role: string | null;
    type: string;
    bounds: { x: number; y: number; w: number; h: number };
    style: NodeStyle;
    zIndex: number;
    visible: boolean;
    locked: boolean;
}

export interface NodeStyle {
    fill?: string;
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    borderRadius?: number;
    opacity: number;
}

export interface ElementRelationship {
    elementId: string;
    elementName: string;
    overlaps: string[];
    containedBy: string | null;
    distanceToEdge: { top: number; right: number; bottom: number; left: number };
}

export interface DesignTokens {
    colors: { hex: string; count: number; elements: string[] }[];
    fonts: { family: string; sizes: number[]; elements: string[] }[];
}

// ── Builder ──

export function buildSceneGraph(variant: BannerVariant): SceneGraph {
    const canvasW = variant.preset.width;
    const canvasH = variant.preset.height;

    // 1. Convert elements to SceneNodes
    const nodes = variant.elements.map(el => elementToNode(el, canvasW, canvasH));

    // 2. Compute relationships (overlaps, containment, edge distances)
    const relationships = computeRelationships(nodes, canvasW, canvasH);

    // 3. Extract design tokens
    const tokens = extractTokens(variant.elements);

    return {
        canvas: { width: canvasW, height: canvasH },
        elements: nodes,
        relationships,
        tokens,
    };
}

// ── Element → SceneNode ──

function elementToNode(el: DesignElement, canvasW: number, canvasH: number): SceneNode {
    const resolved = resolveConstraints(el.constraints, canvasW, canvasH);

    const style: NodeStyle = { opacity: el.opacity };

    if (el.type === 'shape') {
        style.fill = el.fill;
        style.borderRadius = el.borderRadius;
    }
    if (el.type === 'text') {
        style.color = el.color;
        style.fontFamily = el.fontFamily;
        style.fontSize = el.fontSize;
        style.fontWeight = el.fontWeight;
    }
    if (el.type === 'button') {
        style.fill = el.backgroundColor;
        style.color = el.color;
        style.fontFamily = el.fontFamily;
        style.fontSize = el.fontSize;
        style.borderRadius = el.borderRadius;
    }

    return {
        id: el.id,
        name: el.name,
        role: el.role ?? null,
        type: el.type,
        bounds: {
            x: resolved.x,
            y: resolved.y,
            w: resolved.width,
            h: resolved.height,
        },
        style,
        zIndex: el.zIndex,
        visible: el.visible,
        locked: el.locked,
    };
}

// ── Relationships ──

function computeRelationships(
    nodes: SceneNode[],
    canvasW: number,
    canvasH: number,
): ElementRelationship[] {
    return nodes.map(node => {
        const overlaps: string[] = [];
        let containedBy: string | null = null;

        for (const other of nodes) {
            if (other.id === node.id) continue;

            // Check overlap
            if (rectsOverlap(node.bounds, other.bounds)) {
                overlaps.push(other.name);
            }

            // Check containment (is node fully inside other?)
            if (rectContains(other.bounds, node.bounds)) {
                // Pick smallest container
                if (!containedBy || areaOf(other.bounds) < areaOf(findNode(nodes, containedBy)?.bounds)) {
                    containedBy = other.name;
                }
            }
        }

        // Distance to canvas edges
        const distanceToEdge = {
            top: node.bounds.y,
            right: canvasW - (node.bounds.x + node.bounds.w),
            bottom: canvasH - (node.bounds.y + node.bounds.h),
            left: node.bounds.x,
        };

        return {
            elementId: node.id,
            elementName: node.name,
            overlaps,
            containedBy,
            distanceToEdge,
        };
    });
}

function rectsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y;
}

function rectContains(
    outer: { x: number; y: number; w: number; h: number },
    inner: { x: number; y: number; w: number; h: number },
): boolean {
    return inner.x >= outer.x && inner.y >= outer.y &&
        inner.x + inner.w <= outer.x + outer.w &&
        inner.y + inner.h <= outer.y + outer.h;
}

function areaOf(bounds?: { w: number; h: number }): number {
    if (!bounds) return Infinity;
    return bounds.w * bounds.h;
}

function findNode(nodes: SceneNode[], name: string): SceneNode | undefined {
    return nodes.find(n => n.name === name);
}

// ── Design Tokens ──

function extractTokens(elements: DesignElement[]): DesignTokens {
    const colorMap = new Map<string, { count: number; elements: string[] }>();
    const fontMap = new Map<string, { sizes: Set<number>; elements: string[] }>();

    for (const el of elements) {
        // Colors
        const colors: string[] = [];
        if (el.type === 'shape') colors.push(el.fill);
        if (el.type === 'text') colors.push(el.color);
        if (el.type === 'button') { colors.push(el.backgroundColor); colors.push(el.color); }

        for (const c of colors) {
            if (!c) continue;
            const entry = colorMap.get(c) ?? { count: 0, elements: [] };
            entry.count++;
            entry.elements.push(el.name);
            colorMap.set(c, entry);
        }

        // Fonts
        if (el.type === 'text' || el.type === 'button') {
            const family = el.fontFamily;
            const entry = fontMap.get(family) ?? { sizes: new Set(), elements: [] };
            entry.sizes.add(el.fontSize);
            entry.elements.push(el.name);
            fontMap.set(family, entry);
        }
    }

    return {
        colors: [...colorMap.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .map(([hex, info]) => ({ hex, count: info.count, elements: info.elements })),
        fonts: [...fontMap.entries()]
            .map(([family, info]) => ({ family, sizes: [...info.sizes].sort((a, b) => b - a), elements: info.elements })),
    };
}
