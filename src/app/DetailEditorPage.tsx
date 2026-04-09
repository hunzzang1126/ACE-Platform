// ─────────────────────────────────────────────────
// DetailEditorPage – Layer 3 (Real Editor with Fabric.js canvas)
// ─────────────────────────────────────────────────
// Effects/save → useEditorPageEffects.ts
// ─────────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { useTemplateStore } from '@/stores/templateStore';
import { EditorTopBar } from '@/components/editor/EditorTopBar';
import { EditorSidebar } from '@/components/editor/EditorSidebar';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { ContextToolbar } from '@/components/editor/ContextToolbar';
import { BottomPanel } from '@/components/editor/BottomPanel';
import { ExportPanel } from '@/components/editor/ExportPanel';
import { AuthModal } from '@/components/editor/AuthModal';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { useOverlayElements } from '@/hooks/useOverlayElements';
import { useCanvasSync } from '@/hooks/useCanvasSync';
import { exportToHtml5, exportToImage, downloadExport } from '@/engine/html5Exporter';
import type { EngineNode } from '@/hooks/canvasTypes';
import { useEditorPageSave, useEditorRestore, useEditorAutoSync, useEditorAutoSave } from './useEditorPageEffects';

export function DetailEditorPage() {
    const { variantId } = useParams<{ variantId: string }>();
    const creativeSet = useDesignStore((s) => s.creativeSet);
    const setLayer = useEditorStore((s) => s.setLayer);
    const setActiveVariant = useEditorStore((s) => s.setActiveVariant);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const exportPanelOpen = useUIStore(s => s.exportPanelOpen);
    const authModalOpen = useUIStore(s => s.authModalOpen);
    const toggleExportPanel = useUIStore(s => s.toggleExportPanel);
    const toggleAuthModal = useUIStore(s => s.toggleAuthModal);
    const editingTemplateId = useTemplateStore(s => s.editingTemplateId);
    const overrideTemplate = useTemplateStore(s => s.overrideTemplate);
    const setEditingTemplateId = useTemplateStore(s => s.setEditingTemplateId);
    const navigate = useNavigate();

    useEffect(() => { setLayer('detail'); setActiveVariant(variantId ?? null); return () => setActiveVariant(null); }, [variantId, setLayer, setActiveVariant]);

    if (!creativeSet) return <Navigate to="/" replace />;
    const variant = creativeSet.variants.find((v) => v.id === variantId);
    if (!variant) return <Navigate to="/editor" replace />;
    const { width, height } = variant.preset;

    const { canvasRef, overlayRef, engineRef, state, actions, syncState, retryInit } = useFabricCanvas(width, height, false);
    const overlay = useOverlayElements(width, height);
    const { saveToStore, saveFromCachedNodes, restoreFromStore } = useCanvasSync(variantId, width, height);

    const isDirtyRef = useRef(false);
    const isSavingRef = useRef(false);
    const lastManualSaveRef = useRef(0);

    const handleSave = useEditorPageSave(variantId, width, height, saveToStore, engineRef, overlay.overlayElements, overrideTemplate, setSaveStatus, isDirtyRef, lastManualSaveRef, isSavingRef);
    const restoredRef = useEditorRestore(state.status === 'ready', engineRef, handleSave, restoreFromStore, overlay.restoreElements, syncState);
    useEditorAutoSync(variantId, state.status === 'ready', engineRef, restoreFromStore, overlay.clearOverlays, overlay.restoreElements, syncState, restoredRef, isSavingRef);
    useEditorAutoSave(saveFromCachedNodes, overlay.overlayElements, state.nodes, isDirtyRef, lastManualSaveRef, restoredRef);

    // ── Export handlers ──
    const handleExportPNG = useCallback((q: number) => { const c = canvasRef.current; if (c) downloadExport(exportToImage(c, 'png', q)); }, [canvasRef]);
    const handleExportJPG = useCallback((q: number) => { const c = canvasRef.current; if (c) downloadExport(exportToImage(c, 'jpeg', q)); }, [canvasRef]);
    const handleExportHTML5 = useCallback(() => { const e = engineRef.current; if (!e) return; try { const nodes: EngineNode[] = JSON.parse(e.get_all_nodes()); downloadExport(exportToHtml5(nodes, { width, height, backgroundColor: variant?.backgroundColor ?? '#ffffff', title: `${creativeSet?.name ?? 'Banner'}_${width}x${height}` })); } catch { /* */ } }, [engineRef, width, height, variant?.backgroundColor, creativeSet?.name]);

    // ── Keyboard ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
            if (e.key === ' ') { e.preventDefault(); try { engineRef.current?.anim_toggle(); } catch { /* */ } return; }
            if ((e.key === 'Delete' || e.key === 'Backspace') && overlay.selectedOverlayId) { e.preventDefault(); overlay.deleteElement(overlay.selectedOverlayId); return; }
            if ((e.metaKey || e.ctrlKey) && e.key === 'd' && overlay.selectedOverlayId) { e.preventDefault(); overlay.duplicateOverlay(overlay.selectedOverlayId); }
        };
        window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
    }, [overlay, engineRef]);

    // ── Prevent browser zoom ──
    useEffect(() => {
        const pw = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); };
        const pg = (e: Event) => { e.preventDefault(); };
        document.addEventListener('wheel', pw, { passive: false });
        document.addEventListener('gesturestart', pg, { passive: false } as any);
        document.addEventListener('gesturechange', pg, { passive: false } as any);
        return () => { document.removeEventListener('wheel', pw); document.removeEventListener('gesturestart', pg); document.removeEventListener('gesturechange', pg); };
    }, []);

    const handleOverlaySelect = useCallback((id: string | null) => { if (id != null) { try { engineRef.current?.deselect_all(); } catch { /* */ } } overlay.selectOverlay(id); }, [overlay, engineRef]);

    return (
        <div className="ed-layout">
            {editingTemplateId && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '8px 16px', background: 'linear-gradient(90deg, #f59e0b, #d97706)', color: '#fff', fontSize: 12, fontWeight: 600, zIndex: 100 }}>
                    <span>EDITING TEMPLATE — Save to update the global template</span>
                    <button onClick={() => { setEditingTemplateId(null); useTemplateStore.getState().setEditingTempCsId(null); isDirtyRef.current = false; navigate('/templates'); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '3px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Cancel</button>
                </div>
            )}
            <EditorTopBar setName={creativeSet.name} variantLabel={`${width} × ${height}`} canvasWidth={width} canvasHeight={height} engine={engineRef.current}>
                <button onClick={handleSave} disabled={saveStatus === 'saving'} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 8, border: 'none', background: saveStatus === 'saved' ? 'var(--success)' : 'var(--accent-gradient)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saveStatus === 'saving' ? 'wait' : 'pointer', transition: 'background 0.2s' }} title="Save this variant">
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? (editingTemplateId ? 'Template Updated' : 'Done: Saved') : (editingTemplateId ? 'Save Template' : 'Save')}
                </button>
            </EditorTopBar>
            <div className="ed-body">
                <EditorSidebar actions={actions} nodes={state.nodes} selection={state.selection} onTriggerImageUpload={() => overlay.triggerImageUpload()} onTriggerVideoUpload={() => overlay.triggerVideoUpload()} />
                <EditorCanvas variant={variant} canvasRef={canvasRef} overlayRef={overlayRef} engineRef={engineRef} state={state} actions={actions} retryInit={retryInit} overlayElements={overlay.overlayElements} selectedOverlayId={overlay.selectedOverlayId} onOverlaySelect={handleOverlaySelect} onOverlayUpdate={overlay.updateElement} onOverlayDelete={overlay.deleteElement} onAddText={overlay.addText} onTriggerVideoUpload={overlay.triggerVideoUpload}>
                    <ContextToolbar nodes={state.nodes} selection={state.selection} actions={actions} selectedOverlay={overlay.selectedOverlayElement} onOverlayUpdate={overlay.updateElement} canvasWidth={width} canvasHeight={height} />
                </EditorCanvas>
                {exportPanelOpen && (<ExportPanel nodes={state.nodes} canvasWidth={width} canvasHeight={height} onExportHTML5={handleExportHTML5} onExportPNG={handleExportPNG} onExportJPG={handleExportJPG} onExportGIF={() => alert('GIF export coming soon')} onClose={toggleExportPanel} />)}
            </div>
            <BottomPanel variant={variant} engine={engineRef.current} nodes={state.nodes} selection={state.selection} actions={actions} overlayElements={overlay.overlayElements} selectedOverlayId={overlay.selectedOverlayId} onOverlaySelect={handleOverlaySelect} onOverlayMoveUp={overlay.moveUp} onOverlayMoveDown={overlay.moveDown} onOverlayReorderTo={overlay.reorderTo} onOverlaySetZIndex={overlay.setZIndex} onOverlayToggleLock={overlay.toggleLock} onOverlayToggleVisibility={overlay.toggleVisibility} onOverlayDuplicate={overlay.duplicateOverlay} onOverlayRename={overlay.renameOverlay} onOverlayDelete={overlay.deleteElement} />
            {authModalOpen && (<AuthModal onClose={toggleAuthModal} onSuccess={toggleAuthModal} />)}
        </div>
    );
}
