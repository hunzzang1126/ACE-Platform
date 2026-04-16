// ─────────────────────────────────────────────────
// PropertyPanelSections — Sub-components for PropertyPanel
// ─────────────────────────────────────────────────

import { useState } from 'react';
import { Section } from '@/components/panels/PropertyFields';
import { removeBackgroundFromUrl, blobToDataUrl } from '@/services/backgroundRemovalService';
import { useSizingOverrideStore } from '@/stores/sizingOverrideStore';
import { useEditorStore } from '@/stores/editorStore';
import { useDesignStore } from '@/stores/designStore';
import { ROLE_LABELS } from '@/schema/layoutRoles';
import type { LayoutRole } from '@/schema/layoutRoles';

// ── Constants ──

export const FONT_FAMILIES = [
    'Inter, sans-serif', 'Roboto, sans-serif', 'Open Sans, sans-serif',
    'Lato, sans-serif', 'Poppins, sans-serif', 'Montserrat, sans-serif',
    'Outfit, sans-serif', 'Nunito, sans-serif', 'Raleway, sans-serif',
    'Work Sans, sans-serif', 'DM Sans, sans-serif', 'Manrope, sans-serif',
    'Plus Jakarta Sans, sans-serif', 'Space Grotesk, sans-serif',
    'Sora, sans-serif', 'Figtree, sans-serif',
    'Playfair Display, serif', 'Merriweather, serif', 'Lora, serif',
    'Georgia, serif', 'Times New Roman, serif',
    'Oswald, sans-serif', 'Bebas Neue, sans-serif', 'Anton, sans-serif',
    'JetBrains Mono, monospace', 'Fira Code, monospace', 'Courier New, monospace',
    'Arial, sans-serif', 'Helvetica, sans-serif',
];

export const FONT_WEIGHTS = [
    { label: 'Light', value: '300' },
    { label: 'Regular', value: '400' },
    { label: 'Medium', value: '500' },
    { label: 'Semi Bold', value: '600' },
    { label: 'Bold', value: '700' },
    { label: 'Black', value: '900' },
];

// ── Remove Background Button ──

export function RemoveBgButton({ imageSrc, onResult }: { imageSrc?: string; onResult: (dataUrl: string) => void }) {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    if (!imageSrc) return null;

    const handleRemoveBg = async () => {
        if (loading) return;
        setLoading(true); setProgress(0);
        try {
            const resultBlob = await removeBackgroundFromUrl(imageSrc, (p) => setProgress(p));
            const dataUrl = await blobToDataUrl(resultBlob);
            onResult(dataUrl);
        } catch (err) {
            console.error('[RemoveBG] Failed:', err);
        } finally {
            setLoading(false); setProgress(0);
        }
    };

    return (
        <Section label="Background">
            <button
                onClick={handleRemoveBg}
                disabled={loading}
                style={{
                    width: '100%', padding: '8px 12px',
                    background: loading ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6,
                    color: loading ? '#a5b4fc' : '#818cf8', fontSize: 12, fontWeight: 600,
                    cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; }}
            >
                {loading ? (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Removing... {Math.round(progress * 100)}%
                    </>
                ) : (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h10" />
                            <rect x="14" y="14" width="8" height="8" rx="2" strokeDasharray="3 2" />
                        </svg>
                        Remove Background
                    </>
                )}
            </button>
        </Section>
    );
}

// ── Fill to Page Button ──

interface FillToPageProps {
    nodeId: number;
    nodeW: number;
    nodeH: number;
    naturalWidth?: number;
    naturalHeight?: number;
    canvasWidth: number;
    canvasHeight: number;
    onSetPosition: (id: number, x: number, y: number) => void;
    onSetSize: (id: number, w: number, h: number) => void;
}

export function FillToPageButton({ nodeId, nodeW, nodeH, naturalWidth, naturalHeight, canvasWidth, canvasHeight, onSetPosition, onSetSize }: FillToPageProps) {
    const handleFillToPage = () => {
        // Cover mode: scale image to fill canvas while maintaining aspect ratio
        const imgAspect = (naturalWidth && naturalHeight && naturalWidth > 0 && naturalHeight > 0)
            ? naturalWidth / naturalHeight
            : nodeW / Math.max(nodeH, 1);
        const canvasAspect = canvasWidth / canvasHeight;

        let newW: number, newH: number;
        if (imgAspect > canvasAspect) {
            // Image is wider — fit height, overflow width
            newH = canvasHeight;
            newW = canvasHeight * imgAspect;
        } else {
            // Image is taller — fit width, overflow height
            newW = canvasWidth;
            newH = canvasWidth / imgAspect;
        }

        // Center on canvas
        const newX = Math.round((canvasWidth - newW) / 2);
        const newY = Math.round((canvasHeight - newH) / 2);

        onSetPosition(nodeId, newX, newY);
        onSetSize(nodeId, Math.round(newW), Math.round(newH));
    };

    return (
        <Section label="Image">
            <button
                onClick={handleFillToPage}
                style={{
                    width: '100%', padding: '8px 12px',
                    background: 'rgba(56,189,248,0.12)',
                    border: '1px solid rgba(56,189,248,0.3)', borderRadius: 6,
                    color: '#38bdf8', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.12)'; }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 3v18" opacity="0.4" />
                    <path d="M15 9l-3 3-3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Fill to Page
            </button>
        </Section>
    );
}

// ── Smart Sizing Section ──

export function SmartSizingSection({ elementId }: { elementId: string }) {
    const activeVariant = useEditorStore(s => s.activeVariantId);
    const creativeSet = useDesignStore(s => s.creativeSet);
    const isMaster = creativeSet ? activeVariant === creativeSet.masterVariantId : false;
    const variantId = activeVariant ?? '';

    const hasOverride = useSizingOverrideStore(s => s.hasOverride(variantId, elementId));
    const isLocked = useSizingOverrideStore(s => s.isLocked(variantId, elementId));
    const lockElement = useSizingOverrideStore(s => s.lockElement);
    const unlockElement = useSizingOverrideStore(s => s.unlockElement);
    const resetToMaster = useSizingOverrideStore(s => s.resetToMaster);
    const overrideCount = useSizingOverrideStore(s => s.getOverrideCount(variantId));

    if (isMaster) {
        return (
            <Section label="Smart Sizing">
                <div style={{ fontSize: 11, color: '#8b949e', padding: '2px 0' }}>
                    This is the master variant. Edits here propagate to all sizes.
                </div>
                <RoleSelector elementId={elementId} />
                {overrideCount > 0 && (
                    <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 4 }}>
                        {overrideCount} element{overrideCount !== 1 ? 's' : ''} overridden in other variants
                    </div>
                )}
            </Section>
        );
    }

    return (
        <Section label="Smart Sizing">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: hasOverride ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.12)',
                    color: hasOverride ? '#fbbf24' : '#4ade80',
                    border: `1px solid ${hasOverride ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.2)'}`,
                }}>
                    {hasOverride ? 'OVERRIDDEN' : 'SYNCED'}
                </span>
                <button
                    onClick={() => isLocked ? unlockElement(variantId, elementId) : lockElement(variantId, elementId)}
                    title={isLocked ? 'Unlock: Resume master sync' : 'Lock: Prevent master sync'}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: isLocked ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isLocked ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 4, padding: '2px 8px', color: isLocked ? '#f87171' : '#8b949e',
                        fontSize: 10, fontWeight: 500, cursor: 'pointer',
                    }}
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isLocked ? (
                            <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>
                        ) : (
                            <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 019.9-1" /></>
                        )}
                    </svg>
                    {isLocked ? 'Locked' : 'Unlocked'}
                </button>
            </div>
            {hasOverride && (
                <button
                    onClick={() => resetToMaster(variantId, elementId)}
                    style={{
                        marginTop: 6, width: '100%', padding: '4px 0',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 4, color: '#8b949e', fontSize: 10, cursor: 'pointer',
                    }}
                >
                    Reset to Master
                </button>
            )}
        </Section>
    );
}

// ── Layout Role Selector ──

const ROLE_OPTIONS: LayoutRole[] = [
    'background', 'hero', 'logo', 'headline', 'subline',
    'cta', 'tnc', 'accent', 'detail', 'badge',
];

function RoleSelector({ elementId }: { elementId: string }) {
    const updateElement = useDesignStore(s => s.updateMasterElement);
    const currentRole = useDesignStore(s => {
        const cs = s.creativeSet;
        if (!cs) return undefined;
        const master = cs.variants.find(v => v.id === cs.masterVariantId);
        return master?.elements.find(el => el.id === elementId)?.role;
    });

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateElement(elementId, { role: (val || undefined) } as any);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 10, color: '#8b949e', whiteSpace: 'nowrap' }}>Role:</span>
            <select
                value={currentRole ?? ''}
                onChange={handleChange}
                style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
                    color: '#e6edf3', fontSize: 11, padding: '3px 6px',
                    cursor: 'pointer',
                }}
            >
                <option value="">Auto-detect</option>
                {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
            </select>
        </div>
    );
}

// ── AI Image Replace (extracted to AiImageReplace.tsx) ──
export { AiImageReplaceSection, AiOverlayReplaceSection } from './AiImageReplace';
