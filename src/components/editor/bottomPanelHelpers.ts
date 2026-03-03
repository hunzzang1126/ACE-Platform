// ─────────────────────────────────────────────────
// Bottom Panel Helpers — Shared types and utility functions
// ─────────────────────────────────────────────────

import type { EngineNode } from '@/hooks/useCanvasEngine';
import type { OverlayElement } from '@/hooks/useOverlayElements';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Engine = any;

/** Unified layer item combining overlays and engine nodes */
export interface UnifiedLayer {
    kind: 'overlay' | 'engine';
    id: string;        // overlay string id or engine node id as string
    globalZ: number;   // shared z-index for ordering
    overlay?: OverlayElement;
    node?: EngineNode;
}

// Color palette for timeline bars
export const BAR_COLORS = ['#4285f4', '#34a853', '#f9a825', '#ea4335', '#ab47bc', '#00acc1', '#ff7043'];

/** Pretty label for node type */
export function nodeLabel(node: EngineNode): string {
    // Prefer custom name from fabricToEngineNode
    if (node.name) return node.name;
    const types: Record<string, string> = {
        rect: 'Rectangle',
        rounded_rect: 'Rounded Rect',
        ellipse: 'Ellipse',
        text: 'Text',
        image: 'Image',
        path: 'Path',
    };
    return `${types[node.type] || node.type} #${node.id}`;
}

/** Type icon for node */
export function nodeIcon(type: string): string {
    switch (type) {
        case 'ellipse': return '○';
        case 'rounded_rect': return '▢';
        case 'text': return 'T';
        case 'image': return '🖼';
        case 'path': return '✒';
        default: return '□';
    }
}
