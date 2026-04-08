// ─────────────────────────────────────────────────
// useEditorPageEffects — Save/sync/effects for DetailEditorPage
// ─────────────────────────────────────────────────

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';
import { useTemplateStore } from '@/stores/templateStore';
import type { OverlayElement } from '@/hooks/useOverlayElements';
import type { EngineNode } from '@/hooks/canvasTypes';
import { readNodesFromEngine, addOverlaysAndSort } from '@/hooks/canvasSyncSave';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;
type SaveResult = { success: boolean; message: string };
type SaveToStoreRef = React.RefObject<Engine | null>;
type OverlayState = {
    overlayElements: OverlayElement[];
    restoreElements: (els: OverlayElement[]) => void;
    clearOverlays: () => void;
    selectedOverlayId: string | null;
    selectOverlay: (id: string | null) => void;
    deleteElement: (id: string) => void;
    duplicateOverlay: (id: string) => string | null;
};

export function useEditorPageSave(
    variantId: string | undefined,
    width: number, height: number,
    saveToStore: (ref: SaveToStoreRef, overlays: OverlayElement[]) => SaveResult,
    engineRef: React.RefObject<Engine | null>,
    overlayElements: OverlayElement[],
    overrideTemplate: (id: string, v: any, w: number, h: number) => void,
    setSaveStatus: (s: 'idle' | 'saving' | 'saved') => void,
    isDirtyRef: React.MutableRefObject<boolean>,
    lastManualSaveRef: React.MutableRefObject<number>,
    isSavingRef: React.MutableRefObject<boolean>,
) {
    const navigate = useNavigate();
    const setEditingTemplateId = useTemplateStore(s => s.setEditingTemplateId);

    return useCallback(() => {
        setSaveStatus('saving');
        isSavingRef.current = true;
        try {
            const tmplId = useTemplateStore.getState().editingTemplateId;
            if (tmplId) {
                // ★ ROOT CAUSE FIX: Template editing uses a temp CS that is NOT in allCreativeSets.
                // saveToStore → replaceVariantElements → getActiveCS() returns undefined, so
                // the store never gets updated. We MUST read elements directly from the engine
                // and construct the variant ourselves, bypassing the broken store path.
                const engine = engineRef.current;
                if (engine) {
                    const elements = readNodesFromEngine(engine, width, height);
                    addOverlaysAndSort(elements, overlayElements, width, height);

                    // ★ Read bg color from LIVE artboard, not stale variant
                    const cs = useDesignStore.getState().creativeSet;
                    const existingVariant = cs?.variants.find(vi => vi.id === variantId);
                    const liveBg = engine.get_artboard_color?.() ?? existingVariant?.backgroundColor ?? '#ffffff';
                    const directVariant = {
                        id: variantId ?? 'tmpl-direct',
                        preset: existingVariant?.preset ?? { id: 'tmpl', name: `${width}x${height}`, width, height, category: 'display' as const },
                        elements,
                        backgroundColor: liveBg,
                        overriddenElementIds: [],
                        syncLocked: false,
                    };

                    console.log('[handleSave] Template direct save: elements:', elements.length, 'from engine (bypassing broken store path)');
                    overrideTemplate(tmplId, directVariant, width, height);
                    setEditingTemplateId(null);
                    useTemplateStore.getState().setEditingTempCsId(null);
                    isDirtyRef.current = false;
                    lastManualSaveRef.current = Date.now();
                    navigate('/templates');
                    return;
                }
            }
            const result = saveToStore(engineRef, overlayElements);
            isDirtyRef.current = false;
            lastManualSaveRef.current = Date.now();
            if (result.success) setSaveStatus('saved'); else setSaveStatus('idle');
        } catch (e) { console.error('[handleSave] Error:', e); setSaveStatus('idle'); }
        setTimeout(() => { isSavingRef.current = false; }, 200);
        setTimeout(() => setSaveStatus('idle'), 2000);
    }, [saveToStore, engineRef, overlayElements, overrideTemplate, variantId, width, height]);
}

export function useEditorRestore(
    statusReady: boolean,
    engineRef: React.RefObject<Engine | null>,
    handleSave: () => void,
    restoreFromStore: (engine: Engine) => Promise<{ overlayElements: OverlayElement[] }>,
    restoreElements: (els: OverlayElement[]) => void,
    syncState: () => void,
) {
    const restoredRef = useRef(false);
    useEffect(() => {
        if (statusReady) {
            // @ts-expect-error — global bridge
            if (window.__aceGlobalAi?.setEngine) window.__aceGlobalAi.setEngine(engineRef);
            // @ts-expect-error — global bridge
            if (window.__aceGlobalAi) window.__aceGlobalAi.saveCanvas = handleSave;
            if (!restoredRef.current && engineRef.current) {
                restoredRef.current = true;
                (async () => {
                    const { overlayElements: restored } = await restoreFromStore(engineRef.current!);
                    if (restored.length > 0) restoreElements(restored);
                    syncState();
                })();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusReady, engineRef, handleSave, restoreFromStore, restoreElements, syncState]);
    return restoredRef;
}

export function useEditorAutoSync(
    variantId: string | undefined,
    statusReady: boolean,
    engineRef: React.RefObject<Engine | null>,
    restoreFromStore: (engine: Engine) => Promise<{ overlayElements: OverlayElement[] }>,
    clearOverlays: () => void,
    restoreElements: (els: OverlayElement[]) => void,
    syncState: () => void,
    restoredRef: React.MutableRefObject<boolean>,
    isSavingRef: React.MutableRefObject<boolean>,
) {
    const storeElementCount = useDesignStore((s) => {
        if (!s.creativeSet || !variantId) return -1;
        const v = s.creativeSet.variants.find(v => v.id === variantId);
        return v ? v.elements.length : -1;
    });
    const lastCountRef = useRef(-1);
    useEffect(() => {
        if (!statusReady || !restoredRef.current || storeElementCount < 0) return;
        if (lastCountRef.current === -1) { lastCountRef.current = storeElementCount; return; }
        if (storeElementCount !== lastCountRef.current) {
            lastCountRef.current = storeElementCount;
            if (isSavingRef.current) return;
            const engine = engineRef.current;
            if (engine) {
                try { engine.clear_scene(); } catch { /* */ }
                clearOverlays();
                (async () => {
                    const { overlayElements: restored } = await restoreFromStore(engine);
                    if (restored.length > 0) restoreElements(restored);
                    syncState();
                })();
            }
        }
    }, [storeElementCount, variantId, statusReady, engineRef, restoreFromStore, clearOverlays, restoreElements, syncState]);
}

export function useEditorAutoSave(
    saveFromCachedNodes: (nodes: EngineNode[], overlays: OverlayElement[]) => SaveResult,
    overlayElements: OverlayElement[],
    nodes: EngineNode[],
    isDirtyRef: React.MutableRefObject<boolean>,
    lastManualSaveRef: React.MutableRefObject<number>,
    restoredRef: React.MutableRefObject<boolean>,
) {
    const saveRef = useRef(saveFromCachedNodes);
    const overlayRef = useRef(overlayElements);
    const nodesRef = useRef(nodes);
    useEffect(() => { saveRef.current = saveFromCachedNodes; }, [saveFromCachedNodes]);
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);

    const prevOverlayCount = useRef(overlayElements.length);
    useEffect(() => {
        overlayRef.current = overlayElements;
        if (restoredRef.current && overlayElements.length !== prevOverlayCount.current) isDirtyRef.current = true;
        prevOverlayCount.current = overlayElements.length;
    }, [overlayElements]);

    const prevNodeCount = useRef(nodes.length);
    useEffect(() => {
        if (restoredRef.current && nodes.length !== prevNodeCount.current) isDirtyRef.current = true;
        prevNodeCount.current = nodes.length;
    }, [nodes]);

    useEffect(() => {
        return () => {
            const tmplId = useTemplateStore.getState().editingTemplateId;
            const tempCsId = useTemplateStore.getState().editingTempCsId;
            if (tmplId || tempCsId) return;
            if (!isDirtyRef.current) return;
            if (Date.now() - lastManualSaveRef.current < 5000) return;
            saveRef.current(nodesRef.current, overlayRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
