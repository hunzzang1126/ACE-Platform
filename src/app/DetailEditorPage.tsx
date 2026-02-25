// ─────────────────────────────────────────────────
// DetailEditorPage – Layer 3 (Real Editor with WASM engine)
// Owns the useCanvasEngine hook, passes state down to all panels
// ─────────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';
import { useEditorStore } from '@/stores/editorStore';
import { EditorTopBar } from '@/components/editor/EditorTopBar';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { PropertyPanel } from '@/components/panels/PropertyPanel';
import { BottomPanel } from '@/components/editor/BottomPanel';
import { useCanvasEngine } from '@/hooks/useCanvasEngine';
import { useOverlayElements } from '@/hooks/useOverlayElements';
import { useCanvasSync } from '@/hooks/useCanvasSync';

export function DetailEditorPage() {
    const { variantId } = useParams<{ variantId: string }>();

    const creativeSet = useDesignStore((s) => s.creativeSet);
    const setLayer = useEditorStore((s) => s.setLayer);
    const setActiveVariant = useEditorStore((s) => s.setActiveVariant);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
        retryInit,
    } = useCanvasEngine(width, height, false);

    // ── Overlay elements (text + images) ──
    const overlay = useOverlayElements(width, height);

    // ── Canvas ↔ Store sync ──
    const { saveToStore, saveFromCachedNodes, restoreFromStore } = useCanvasSync(variantId, width, height);

    // Prevent double-restore (React strict mode)
    const restoredRef = useRef(false);

    // ── Save handler ──
    const handleSave = useCallback(() => {
        setSaveStatus('saving');
        const result = saveToStore(engineRef, overlay.overlayElements);
        console.log('[DetailEditor] Save result:', result);
        setSaveStatus('saved');
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
                const { overlayElements: restoredOverlays } = restoreFromStore(engineRef.current);
                // Add restored overlay elements (text/image)
                if (restoredOverlays.length > 0) {
                    overlay.restoreElements(restoredOverlays);
                }
            }
        }
    }, [state.status, engineRef, handleSave, restoreFromStore, overlay, actions]);

    // ── Keep latest refs for auto-save (avoids stale closure) ──
    // These refs always point to the latest values so the unmount cleanup can access them
    const saveFromCachedRef = useRef(saveFromCachedNodes);
    const overlayElementsRef = useRef(overlay.overlayElements);
    const cachedNodesRef = useRef(state.nodes);
    useEffect(() => { saveFromCachedRef.current = saveFromCachedNodes; }, [saveFromCachedNodes]);
    useEffect(() => { overlayElementsRef.current = overlay.overlayElements; }, [overlay.overlayElements]);
    useEffect(() => { cachedNodesRef.current = state.nodes; }, [state.nodes]);

    // Auto-save when leaving the page (navigating away or unmounting)
    useEffect(() => {
        return () => {
            // Use cached node data — engine may already be freed by useCanvasEngine cleanup
            const nodes = cachedNodesRef.current;
            const overlays = overlayElementsRef.current;
            const save = saveFromCachedRef.current;

            if (nodes.length > 0 || overlays.length > 0) {
                console.log('[DetailEditor] Auto-save on exit:', { nodes: nodes.length, overlays: overlays.length });
                save(nodes, overlays);
            } else {
                console.log('[DetailEditor] Skipping auto-save: nothing to save');
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Delete selected overlay on Delete/Backspace
    // Also ⌘D to duplicate overlay, Spacebar to toggle play
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
            <EditorTopBar setName={creativeSet.name} variantLabel={variantLabel} engine={engineRef.current}>
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
                    {saveStatus === 'saving' ? '⏳ Saving...'
                        : saveStatus === 'saved' ? '✓ Saved'
                            : isMaster ? '💾 Save & Propagate' : '💾 Save'}
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
                {/* Right panel: Property editing — fixed-width wrapper to prevent jitter */}
                <aside className="ed-right-panel-wrapper">
                    <PropertyPanel
                        nodes={state.nodes}
                        selection={state.selection}
                        actions={actions}
                        selectedOverlay={overlay.selectedOverlayElement}
                        onOverlayUpdate={overlay.updateElement}
                    />
                </aside>
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
        </div>
    );
}

