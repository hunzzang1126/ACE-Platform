// ─────────────────────────────────────────────────
// designStoreTypes — Types + helpers for designStore
// ─────────────────────────────────────────────────

import type { CreativeSet, BannerPreset } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { smartSizeElements } from '@/engine/smartSizing';

// ── State Shape ──

export interface DesignState {
    allCreativeSets: Record<string, CreativeSet>;
    activeCreativeSetId: string | null;
    creativeSet: CreativeSet | null;

    // ── Actions ──
    createCreativeSet: (name: string, masterPreset: BannerPreset) => string;
    openCreativeSet: (id: string) => boolean;
    deleteCreativeSet: (id: string) => void;
    deleteAllCreativeSets: () => void;
    renameCreativeSet: (id: string, name: string) => void;
    updateMasterElement: (elementId: string, patch: Partial<DesignElement>) => void;
    addElementToMaster: (element: DesignElement) => void;
    removeElementFromMaster: (elementId: string) => void;
    addVariant: (preset: BannerPreset) => void;
    removeVariant: (variantId: string) => void;
    updateVariantElement: (variantId: string, elementId: string, patch: Partial<DesignElement>) => void;
    toggleElementOverride: (variantId: string, elementId: string) => void;
    replaceCreativeSet: (set: CreativeSet) => void;
    replaceVariantElements: (variantId: string, elements: DesignElement[], fabricJSON?: string) => void;
    getAllCreativeSets: () => CreativeSet[];

    // ── Plug Connection Actions ──
    connectPlug: (originId: string, targetId: string) => void;
    disconnectPlug: (targetId: string) => void;
    resyncAllPluggedVariants: () => void;
    getOriginForVariant: (variantId: string) => string | undefined;
    getPluggedTargets: (originId: string) => string[];

    // ── Master Label (cosmetic) ──
    setMasterLabel: (variantId: string) => void;
    clearMasterLabel: () => void;
}

// ── Helper: get the active creative set from state ──

export function getActiveCS(state: DesignState): CreativeSet | undefined {
    if (!state.activeCreativeSetId) return undefined;
    return state.allCreativeSets[state.activeCreativeSetId];
}

// ── Merge visual properties origin → target (without touching layout) ──
// Syncs: fill, color, opacity, content, fontWeight, fontFamily, fontSize, src, gradients.
// Preserves: constraints (position/size), overridden elements, zIndex.

export function mergePropertyChanges(
    targetElements: DesignElement[],
    originElements: DesignElement[],
    originW: number,
    originH: number,
    targetW: number,
    targetH: number,
): DesignElement[] {
    const originByName = new Map<string, DesignElement>();
    const originById = new Map<string, DesignElement>();
    for (const el of originElements) {
        if (el.name) originByName.set(el.name, el);
        originById.set(el.id, el);
    }

    const matchedOriginNames = new Set<string>();
    const matchedOriginIds = new Set<string>();

    const result: DesignElement[] = [];
    for (const targetEl of targetElements) {
        const originEl = (targetEl.name ? originByName.get(targetEl.name) : undefined) || originById.get(targetEl.id);
        if (!originEl) continue; // deleted from origin
        if (originEl.name) matchedOriginNames.add(originEl.name);
        matchedOriginIds.add(originEl.id);

        const merged = JSON.parse(JSON.stringify(targetEl)) as DesignElement;
        if ('fill' in originEl) (merged as any).fill = (originEl as any).fill;
        if ('color' in originEl) (merged as any).color = (originEl as any).color;
        if ('opacity' in originEl) merged.opacity = originEl.opacity;
        if ('content' in originEl) (merged as any).content = (originEl as any).content;
        if ('fontWeight' in originEl) (merged as any).fontWeight = (originEl as any).fontWeight;
        if ('fontFamily' in originEl) (merged as any).fontFamily = (originEl as any).fontFamily;
        if ('src' in originEl) (merged as any).src = (originEl as any).src;
        if ('gradientStart' in originEl) (merged as any).gradientStart = (originEl as any).gradientStart;
        if ('gradientEnd' in originEl) (merged as any).gradientEnd = (originEl as any).gradientEnd;
        if ('gradientAngle' in originEl) (merged as any).gradientAngle = (originEl as any).gradientAngle;
        if ('textAlign' in originEl) (merged as any).textAlign = (originEl as any).textAlign;
        if ('lineHeight' in originEl) (merged as any).lineHeight = (originEl as any).lineHeight;
        if ('letterSpacing' in originEl) (merged as any).letterSpacing = (originEl as any).letterSpacing;
        if ('shadow' in originEl) (merged as any).shadow = (originEl as any).shadow;
        result.push(merged);
    }

    // Add NEW elements from origin that don't exist in target (smart-sized)
    for (const originEl of originElements) {
        if ((originEl.name && matchedOriginNames.has(originEl.name)) || matchedOriginIds.has(originEl.id)) continue;
        const adaptedArr = smartSizeElements([originEl], originW, originH, targetW, targetH);
        if (adaptedArr[0]) result.push(adaptedArr[0]);
    }

    return result;
}
