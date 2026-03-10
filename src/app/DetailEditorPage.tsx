// ─────────────────────────────────────────────────
// DetailEditorPage – Layer 3 (Real Editor with Fabric.js canvas)
// Owns the useFabricCanvas hook, passes state down to all panels
// ─────────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { EditorTopBar } from '@/components/editor/EditorTopBar';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { PropertyPanel } from '@/components/panels/PropertyPanel';
import { BottomPanel } from '@/components/editor/BottomPanel';
// Vision check is now integrated into Auto-Design flow (autoDesignLoop.ts)
// AI is now unified in GlobalAiPanel (App.tsx sidebar)
import { ExportPanel } from '@/components/editor/ExportPanel';
import { CanvasRuler } from '@/components/editor/CanvasRuler';
import { KeyframeInspector } from '@/components/editor/KeyframeInspector';
import { BrandCompliancePanel } from '@/components/editor/BrandCompliancePanel';
import { AuthModal } from '@/components/editor/AuthModal';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { useOverlayElements } from '@/hooks/useOverlayElements';
import { useCanvasSync } from '@/hooks/useCanvasSync';

export function DetailEditorPage() {
    const { variantId } = useParams<{ variantId: string }>();

    const creativeSet = useDesignStore((s) => s.creativeSet);
    const setLayer = useEditorStore((s) => s.setLayer);
    const setActiveVariant = useEditorStore((s) => s.setActiveVariant);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // ── UI panel toggles ──
    const exportPanelOpen = useUIStore(s => s.exportPanelOpen);
    const canvasRulerVisible = useUIStore(s => s.canvasRulerVisible);
    const keyframeInspectorOpen = useUIStore(s => s.keyframeInspectorOpen);
    const brandComplianceOpen = useUIStore(s => s.brandComplianceOpen);
    const authModalOpen = useUIStore(s => s.authModalOpen);
    const toggleExportPanel = useUIStore(s => s.toggleExportPanel);
    const toggleKeyframeInspector = useUIStore(s => s.toggleKeyframeInspector);
    const toggleBrandCompliance = useUIStore(s => s.toggleBrandCompliance);
    const toggleAuthModal = useUIStore(s => s.toggleAuthModal);



    useEffect(() => {
        setLayer('detail');
        setActiveVariant(variantId ?? null);
        return () => setActiveVariant(null);
    }, [variantId, setLayer, setActiveVariant]);

    if (!creativeSet) return <Navigate to="/" replace />;

    const variant = creativeSet.variants.find((v) => v.id === variantId);
    if (!variant) return <Navigate to="/editor" replace />;

    const { width, height } = variant.preset;
    const variantLabel = `${width} × ${height}`;
    const isMaster = creativeSet.masterVariantId === variantId;

    // ── Own the engine at this level ──────────────────
    const {
        canvasRef,
        overlayRef,
        engineRef,
        state,
        actions,
        syncState,
        retryInit,
    } = useFabricCanvas(width, height, false);

    // ── Overlay elements (text + images) ──
    const overlay = useOverlayElements(width, height);

    // ── Canvas ↔ Store sync ──
    const { saveToStore, saveFromCachedNodes, restoreFromStore } = useCanvasSync(variantId, width, height);

    // Prevent double-restore (React strict mode)
    const restoredRef = useRef(false);

    // Track whether the user actually interacted (dirty = needs save)
    // This prevents React Strict Mode's phantom unmount from overwriting valid saved data
    const isDirtyRef = useRef(false);

    // Flag to skip re-sync when save writes to store (prevents infinite loop)
    const isSavingRef = useRef(false);

    // ★ REGRESSION GUARD: Tracks the last manual save timestamp.
    // Prevents auto-save on unmount from overwriting a recent manual save.
    const lastManualSaveRef = useRef(0);

    // ── Save handler (manual) ──
    const handleSave = useCallback(() => {
        setSaveStatus('saving');
        isSavingRef.current = true;
        try {
            const result = saveToStore(engineRef, overlay.overlayElements);
            console.log('[DetailEditor] Save result:', result);
            isDirtyRef.current = false; // Saved — no longer dirty
            lastManualSaveRef.current = Date.now();
            if (result.success) {
                setSaveStatus('saved');
            } else {
                console.warn('[DetailEditor] Save returned unsuccessful:', result.message);
                setSaveStatus('idle');
            }
        } catch (err) {
            console.error('[DetailEditor] Save error:', err);
            setSaveStatus('idle');
        }
        // ★ REGRESSION GUARD: Use 200ms timeout instead of rAF for the guard window.
        // rAF fires too quickly, allowing the storeElementCount effect to re-dirty
        // after save. 200ms gives Zustand effects time to settle.
        setTimeout(() => { isSavingRef.current = false; }, 200);
        setTimeout(() => setSaveStatus('idle'), 2000);
    }, [saveToStore, engineRef, overlay.overlayElements]);

    // Bridge engine to global AI panel when ready + restore saved elements
    useEffect(() => {
        if (state.status === 'ready') {
            // @ts-expect-error — global bridge for AI
            if (window.__aceGlobalAi?.setEngine) window.__aceGlobalAi.setEngine(engineRef);

            // Also expose save function for AI agent
            // @ts-expect-error — global bridge for AI
            if (window.__aceGlobalAi) window.__aceGlobalAi.saveCanvas = handleSave;

            // Restore saved elements from designStore
            if (!restoredRef.current && engineRef.current) {
                restoredRef.current = true;
                const engine = engineRef.current;
                // restoreFromStore is async (awaits video blob loads from IndexedDB)
                (async () => {
                    const { overlayElements: restoredOverlays } = await restoreFromStore(engine);
                    // Add restored overlay elements (text/image/video) with resolved blob URLs
                    if (restoredOverlays.length > 0) {
                        overlay.restoreElements(restoredOverlays);
                    }
                    // Sync engine state → React (update nodeCount, nodes for layer panel)
                    syncState();
                })();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status, engineRef, handleSave, restoreFromStore, overlay.restoreElements, syncState]);

    // ── Live re-render when AI tools add elements to designStore ──
    // Uses a targeted Zustand selector for element count to avoid infinite loop
    // (depending on full creativeSet causes re-fire on every state update)
    const storeElementCount = useDesignStore((s) => {
        if (!s.creativeSet || !variantId) return -1;
        const v = s.creativeSet.variants.find((v) => v.id === variantId);
        return v ? v.elements.length : -1;
    });
    const lastElementCountRef = useRef(-1);
    useEffect(() => {
        if (state.status !== 'ready' || !restoredRef.current) return;
        if (storeElementCount < 0) return;

        // Skip initial render (handled by restoreFromStore above)
        if (lastElementCountRef.current === -1) {
            lastElementCountRef.current = storeElementCount;
            return;
        }

        // Only re-sync if count changed (from AI add_text/add_shape calls)
        // BUT skip when our own save caused the change (prevents infinite loop)
        if (storeElementCount !== lastElementCountRef.current) {
            lastElementCountRef.current = storeElementCount;

            // If the change was triggered by our own save, skip re-sync
            if (isSavingRef.current) {
                console.log('[DetailEditor] Skipping re-sync — save in progress');
                return;
            }

            console.log(`[DetailEditor] Store elements changed (${storeElementCount}), re-syncing canvas...`);

            const engine = engineRef.current;
            if (engine) {
                // Clear current engine nodes
                try { engine.clear_scene(); } catch { /* ok */ }
                // Clear current overlays
                overlay.clearOverlays();
                // Re-restore everything from the updated store (async — waits for video blobs)
                (async () => {
                    const { overlayElements: restoredOverlays } = await restoreFromStore(engine);
                    if (restoredOverlays.length > 0) {
                        overlay.restoreElements(restoredOverlays);
                    }
                    syncState();
                    isDirtyRef.current = true;
                })();
            }
        }
    }, [storeElementCount, variantId, state.status, engineRef, restoreFromStore, overlay.clearOverlays, overlay.restoreElements, syncState]);

    // ── Keep latest refs for auto-save (avoids stale closure) ──
    const saveFromCachedRef = useRef(saveFromCachedNodes);
    const overlayElementsRef = useRef(overlay.overlayElements);
    const cachedNodesRef = useRef(state.nodes);
    useEffect(() => { saveFromCachedRef.current = saveFromCachedNodes; }, [saveFromCachedNodes]);
    useEffect(() => { cachedNodesRef.current = state.nodes; }, [state.nodes]);

    // Track overlay changes → mark dirty
    const prevOverlayCountRef = useRef(overlay.overlayElements.length);
    useEffect(() => {
        overlayElementsRef.current = overlay.overlayElements;
        // If overlay count changed and we already restored, the user made a change
        if (restoredRef.current && overlay.overlayElements.length !== prevOverlayCountRef.current) {
            isDirtyRef.current = true;
        }
        prevOverlayCountRef.current = overlay.overlayElements.length;
    }, [overlay.overlayElements]);

    // Track node changes → mark dirty
    const prevNodeCountRef = useRef(state.nodes.length);
    useEffect(() => {
        if (restoredRef.current && state.nodes.length !== prevNodeCountRef.current) {
            isDirtyRef.current = true;
        }
        prevNodeCountRef.current = state.nodes.length;
    }, [state.nodes]);

    // Auto-save when leaving the page (only if dirty)
    useEffect(() => {
        return () => {
            if (!isDirtyRef.current) {
                console.log('[DetailEditor] Auto-save skipped — no changes made');
                return;
            }

            // ★ REGRESSION GUARD: If user manually saved recently, skip auto-save.
            // This prevents the stale-data overwrite that causes preview bugs.
            const timeSinceManualSave = Date.now() - lastManualSaveRef.current;
            if (timeSinceManualSave < 2000) {
                console.log('[DetailEditor] Auto-save skipped — manual save was recent (' + timeSinceManualSave + 'ms ago)');
                return;
            }

            const nodes = cachedNodesRef.current;
            const overlays = overlayElementsRef.current;
            const save = saveFromCachedRef.current;

            console.log('[DetailEditor] Auto-save on exit:', { nodes: nodes.length, overlays: overlays.length });
            save(nodes, overlays);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Delete selected overlay on Delete/Backspace
    // Also Cmd+D to duplicate overlay, Spacebar to toggle play
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't intercept when typing in inputs
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if ((e.target as HTMLElement)?.isContentEditable) return;

            // Spacebar — toggle animation playback
            if (e.key === ' ') {
                e.preventDefault();
                const engine = engineRef.current;
                if (engine) {
                    try { engine.anim_toggle(); } catch { /* engine not ready */ }
                }
                return;
            }

            // Delete/Backspace — overlay takes priority over engine selection
            if ((e.key === 'Delete' || e.key === 'Backspace') && overlay.selectedOverlayId) {
                e.preventDefault();
                overlay.deleteElement(overlay.selectedOverlayId);
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'd' && overlay.selectedOverlayId) {
                e.preventDefault();
                overlay.duplicateOverlay(overlay.selectedOverlayId);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [overlay, engineRef]);

    // Wrapper: selecting an overlay also deselects engine shapes (and vice versa)
    const handleOverlaySelect = useCallback((id: string | null) => {
        if (id != null) {
            // Deselect engine shapes when an overlay is selected
            const engine = engineRef.current;
            if (engine) {
                try { engine.deselect_all(); } catch { /* ok */ }
            }
        }
        overlay.selectOverlay(id);
    }, [overlay, engineRef]);



    return (
        <div className="ed-layout">
            <EditorTopBar setName={creativeSet.name} variantLabel={variantLabel} canvasWidth={width} canvasHeight={height} engine={engineRef.current}>
                {/* Save Button — always visible */}
                <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: saveStatus === 'saved' ? '#238636' : '#1f6feb',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: saveStatus === 'saving' ? 'wait' : 'pointer',
                        transition: 'background 0.2s',
                    }}
                    title={isMaster ? 'Save and propagate to all sizes' : 'Save this variant'}
                >
                    {saveStatus === 'saving' ? 'Saving...'
                        : saveStatus === 'saved' ? 'Done: Saved'
                            : isMaster ? 'Save & Propagate' : 'Save'}
                </button>
            </EditorTopBar>
            <div className="ed-body">
                <EditorToolbar
                    actions={actions}
                    onTriggerImageUpload={() => overlay.triggerImageUpload()}
                    onTriggerVideoUpload={() => overlay.triggerVideoUpload()}
                />
                <EditorCanvas
                    variant={variant}
                    canvasRef={canvasRef}
                    overlayRef={overlayRef}
                    engineRef={engineRef}
                    state={state}
                    actions={actions}
                    retryInit={retryInit}
                    overlayElements={overlay.overlayElements}
                    selectedOverlayId={overlay.selectedOverlayId}
                    onOverlaySelect={handleOverlaySelect}
                    onOverlayUpdate={overlay.updateElement}
                    onOverlayDelete={overlay.deleteElement}
                    onAddText={overlay.addText}
                    onTriggerImageUpload={overlay.triggerImageUpload}
                    onTriggerVideoUpload={overlay.triggerVideoUpload}
                />
                {/* Right panel: Property editing + secondary panels */}
                <aside className="ed-right-panel-wrapper">
                    <PropertyPanel
                        nodes={state.nodes}
                        selection={state.selection}
                        actions={actions}
                        selectedOverlay={overlay.selectedOverlayElement}
                        onOverlayUpdate={overlay.updateElement}
                        canvasWidth={width}
                        canvasHeight={height}
                    />

                    {/* Keyframe Inspector */}
                    {keyframeInspectorOpen && (
                        <KeyframeInspector
                            onClose={toggleKeyframeInspector}
                        />
                    )}
                </aside>
                {/* Export Panel — slide-over */}
                {exportPanelOpen && (
                    <ExportPanel
                        nodes={state.nodes}
                        canvasWidth={width}
                        canvasHeight={height}
                        onClose={toggleExportPanel}
                    />
                )}
            </div>
            {/* Bottom panel: Layers + Timeline integrated */}
            <BottomPanel
                variant={variant}
                engine={engineRef.current}
                nodes={state.nodes}
                selection={state.selection}
                actions={actions}
                overlayElements={overlay.overlayElements}
                selectedOverlayId={overlay.selectedOverlayId}
                onOverlaySelect={handleOverlaySelect}
                onOverlayMoveUp={overlay.moveUp}
                onOverlayMoveDown={overlay.moveDown}
                onOverlayReorderTo={overlay.reorderTo}
                onOverlaySetZIndex={overlay.setZIndex}
                onOverlayToggleLock={overlay.toggleLock}
                onOverlayToggleVisibility={overlay.toggleVisibility}
                onOverlayDuplicate={overlay.duplicateOverlay}
                onOverlayRename={overlay.renameOverlay}
                onOverlayDelete={overlay.deleteElement}
            />
            {/* Auth Modal — global overlay */}
            {authModalOpen && (
                <AuthModal
                    onClose={toggleAuthModal}
                    onSuccess={toggleAuthModal}
                />
            )}
        </div>
    );
}

