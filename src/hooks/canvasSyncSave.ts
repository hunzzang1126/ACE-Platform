// ─────────────────────────────────────────────────
// canvasSyncSave — Save pipeline helpers for useCanvasSync
// ─────────────────────────────────────────────────

import { extractAssets } from '@/services/assetService';
import { useDesignStore } from '@/stores/designStore';
import type { DesignElement, ShapeElement, ImageElement, TextElement } from '@/schema/elements.types';
import type { EngineNode } from './useCanvasEngine';
import type { OverlayElement } from './useOverlayElements';
import {
    engineNodeToShapeElement, engineNodeToTextElement,
    engineNodeToImageElement, overlayToDesignElement,
} from '@/engine/elementConverters';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;

/**
 * Restore idb:// refs for image elements (shared by both save functions).
 * blob: URLs are SESSION-SCOPED — must map back to idb:// before persisting.
 */
export function restoreIdbRefs(elements: DesignElement[], variantId: string): void {
    const cs = useDesignStore.getState().creativeSet;
    const variant = cs?.variants.find(v => v.id === variantId);
    if (!variant) return;

    const storedSrcByName = new Map<string, string>();
    const storedSrcById = new Map<string, string>();
    for (const el of variant.elements) {
        if (el.type === 'image' && (el as ImageElement).src) {
            const src = (el as ImageElement).src!;
            if (src.startsWith('idb://') || src.startsWith('data:')) {
                if (el.name) storedSrcByName.set(el.name, src);
                storedSrcById.set(el.id, src);
            }
        }
    }
    for (const el of elements) {
        if (el.type !== 'image') continue;
        const img = el as ImageElement;
        if (!img.src || !img.src.startsWith('blob:')) continue;
        const original = (img.name ? storedSrcByName.get(img.name) : undefined) || storedSrcById.get(img.id);
        if (original) img.src = original;
    }
}

/**
 * Preserve customStyles from existing store elements during save.
 */
export function preserveCustomStyles(elements: DesignElement[], variantId: string): void {
    const cs = useDesignStore.getState().creativeSet;
    const existingVariant = cs?.variants.find(v => v.id === variantId);
    if (!existingVariant) return;

    const stylesByName = new Map<string, Record<string, string>>();
    const stylesById = new Map<string, Record<string, string>>();
    for (const el of existingVariant.elements) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cs = (el as any).customStyles;
        if (cs && Object.keys(cs).length > 0) {
            if (el.name) stylesByName.set(el.name, cs);
            stylesById.set(el.id, cs);
        }
    }
    for (const el of elements) {
        const existing = (el.name ? stylesByName.get(el.name) : undefined) || stylesById.get(el.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (existing) (el as any).customStyles = existing;
    }
}

/**
 * Convert engine nodes to DesignElements using proven legacy pipeline.
 */
export function convertNodesToElements(nodes: EngineNode[], canvasW: number, canvasH: number): DesignElement[] {
    const elements: DesignElement[] = [];
    for (const node of nodes) {
        if (node.type === 'text') {
            elements.push(engineNodeToTextElement(node, canvasW, canvasH));
        } else if (node.type === 'image') {
            elements.push(engineNodeToImageElement(node, canvasW, canvasH));

        } else {
            elements.push(engineNodeToShapeElement(node, canvasW, canvasH));
        }
    }
    return elements;
}

/**
 * Read nodes from live engine and convert them to DesignElements.
 */
export function readNodesFromEngine(engine: Engine, canvasW: number, canvasH: number): DesignElement[] {
    if (typeof engine.syncZIndexFromStack === 'function') engine.syncZIndexFromStack();
    const raw = engine.get_all_nodes();
    const nodes: EngineNode[] = JSON.parse(raw);
    return convertNodesToElements(nodes, canvasW, canvasH);
}

/**
 * Add overlay elements and sort by zIndex.
 */
export function addOverlaysAndSort(elements: DesignElement[], overlayElements: OverlayElement[], canvasW: number, canvasH: number): void {
    for (const oel of overlayElements) elements.push(overlayToDesignElement(oel, canvasW, canvasH));
    elements.sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * Run async asset extraction (data: → idb://) in background.
 */
export function asyncExtractAssets(elements: DesignElement[], variantId: string, replaceVariantElements: (vId: string, els: DesignElement[]) => void): void {
    extractAssets(elements).then(extracted => {
        const hasChanges = extracted.some((el, i) => el.type === 'image' && (el as any).src !== (elements[i] as any).src);
        if (hasChanges) {
            replaceVariantElements(variantId, extracted);
            console.log('[useCanvasSync] Asset extraction complete — base64 → idb:// refs');
        }
    }).catch(err => { console.warn('[useCanvasSync] Asset extraction failed:', err); });
}
