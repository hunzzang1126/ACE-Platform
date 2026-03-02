// ─────────────────────────────────────────────────
// GeneralEditorPage – Layer 2 (Creative Set View)
// ─────────────────────────────────────────────────
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';
import { CreativeSetTopBar } from '@/components/creativeset/CreativeSetTopBar';
import { SizeSidebar } from '@/components/creativeset/SizeSidebar';
import { BannerPreviewGrid } from '@/components/creativeset/BannerPreviewGrid';
import { AddSizeModal } from '@/components/creativeset/AddSizeModal';
import { useSmartCheck } from '@/hooks/useSmartCheck';
import type { BannerPreset } from '@/schema/design.types';
import { v4 as uuid } from 'uuid';
import type { DesignElement } from '@/schema/elements.types';
import '@/styles/visionqa.css';

export function GeneralEditorPage() {
    const creativeSet = useDesignStore((s) => s.creativeSet);
    const addVariant = useDesignStore((s) => s.addVariant);
    const addElementToMaster = useDesignStore((s) => s.addElementToMaster);

    // Modal state
    const [showAddSizeModal, setShowAddSizeModal] = useState(false);

    // Smart Check (one-click auto-fix)
    const { status: smartCheckStatus, result: smartCheckResult, error: smartCheckError, runSmartCheck, reset: resetSmartCheck } = useSmartCheck();

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (smartCheckStatus === 'done' || smartCheckStatus === 'error') {
            const timer = setTimeout(resetSmartCheck, 4000);
            return () => clearTimeout(timer);
        }
    }, [smartCheckStatus, resetSmartCheck]);

    // Visible size toggles — all visible by default
    const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
    const [initialized, setInitialized] = useState(false);

    // Initialize visibleIds when creativeSet loads
    if (creativeSet && !initialized) {
        const allIds = new Set(creativeSet.variants.map((v) => v.id));
        setVisibleIds(allIds);
        setInitialized(true);
    }

    const toggleVisibility = useCallback((id: string) => {
        setVisibleIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const existingPresetIds = useMemo(() => {
        if (!creativeSet) return new Set<string>();
        return new Set(creativeSet.variants.map((v) => v.preset.id));
    }, [creativeSet]);

    const handleAddSizes = useCallback((presets: BannerPreset[]) => {
        for (const preset of presets) {
            addVariant(preset);
        }
        // Make newly added variants visible
        // (we'll pick them up on next render since initialized is true)
        setTimeout(() => {
            const cs = useDesignStore.getState().creativeSet;
            if (cs) {
                setVisibleIds(new Set(cs.variants.map((v) => v.id)));
            }
        }, 0);
    }, [addVariant]);

    // Auto-add demo elements if master has none
    const handleAddDemoElements = useCallback(() => {
        addElementToMaster({
            id: uuid(), name: 'Headline', type: 'text',
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'top', offset: 40 }, size: { widthMode: 'relative', heightMode: 'auto', width: 0.8, height: 40 }, rotation: 0 },
            content: '2026 Spring Sale', fontFamily: 'Inter', fontSize: 32, fontWeight: 700, fontStyle: 'normal', color: '#FFFFFF', textAlign: 'center', lineHeight: 1.2, letterSpacing: 0, autoShrink: true, opacity: 1, visible: true, locked: false, zIndex: 2,
        } as DesignElement);
        addElementToMaster({
            id: uuid(), name: 'Background', type: 'shape', shapeType: 'rectangle',
            constraints: { horizontal: { anchor: 'stretch', offset: 0, marginLeft: 0, marginRight: 0 }, vertical: { anchor: 'stretch', offset: 0, marginTop: 0, marginBottom: 0 }, size: { widthMode: 'relative', heightMode: 'relative', width: 1, height: 1 }, rotation: 0 },
            fill: '#6C63FF', opacity: 1, visible: true, locked: false, zIndex: 0, borderRadius: 0,
        } as DesignElement);
        addElementToMaster({
            id: uuid(), name: 'CTA Button', type: 'button',
            constraints: { horizontal: { anchor: 'center', offset: 0 }, vertical: { anchor: 'bottom', offset: 30 }, size: { widthMode: 'fixed', heightMode: 'fixed', width: 160, height: 44 }, rotation: 0 },
            label: 'Shop Now', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: '#FFFFFF', backgroundColor: '#FF5733', borderRadius: 22, opacity: 1, visible: true, locked: false, zIndex: 3,
        } as DesignElement);
    }, [addElementToMaster]);

    if (!creativeSet) {
        return <Navigate to="/" replace />;
    }

    const masterHasElements = creativeSet.variants.find(
        (v) => v.id === creativeSet.masterVariantId,
    )?.elements.length ?? 0;

    return (
        <div className="cs-layout">
            <CreativeSetTopBar
                setName={creativeSet.name}
                variantCount={creativeSet.variants.length}
            />
            <div className="cs-body">
                <SizeSidebar
                    variants={creativeSet.variants}
                    visibleIds={visibleIds}
                    onToggleVisibility={toggleVisibility}
                    onAddSizeClick={() => setShowAddSizeModal(true)}
                />
                <main className="cs-main">
                    {/* Quick action bar */}
                    {masterHasElements === 0 && (
                        <div className="cs-empty-banner">
                            <p>No elements yet. Add demo elements to preview across sizes.</p>
                            <button className="cs-demo-btn" onClick={handleAddDemoElements}>
                                + Add Demo Elements
                            </button>
                        </div>
                    )}
                    <BannerPreviewGrid
                        variants={creativeSet.variants}
                        visibleIds={visibleIds}
                        masterVariantId={creativeSet.masterVariantId}
                        onRunSmartCheck={() => runSmartCheck(creativeSet)}
                        smartCheckStatus={smartCheckStatus}
                    />
                </main>
            </div>

            {/* Add Size Modal */}
            {showAddSizeModal && (
                <AddSizeModal
                    existingPresetIds={existingPresetIds}
                    onAdd={handleAddSizes}
                    onClose={() => setShowAddSizeModal(false)}
                />
            )}

            {/* Smart Check Toast */}
            {smartCheckStatus === 'checking' && (
                <div className="vqa-loading-overlay">
                    <div className="vqa-loading-spinner" />
                    <div className="vqa-loading-text">Checking all sizes...</div>
                </div>
            )}

            {smartCheckStatus === 'done' && smartCheckResult && (
                <div
                    className="vqa-loading-overlay"
                    onClick={resetSmartCheck}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="vqa-loading-text" style={{ fontSize: 18 }}>
                        {smartCheckResult.message}
                    </div>
                    <div className="vqa-loading-progress">Click to dismiss</div>
                </div>
            )}

            {smartCheckStatus === 'error' && smartCheckError && (
                <div className="vqa-loading-overlay" onClick={resetSmartCheck}>
                    <div className="vqa-loading-text">❌ {smartCheckError}</div>
                    <div className="vqa-loading-progress">Click to dismiss</div>
                </div>
            )}
        </div>
    );
}
