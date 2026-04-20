// ─────────────────────────────────────────────────
// LiveSizePreview — Real-time multi-size minimap
// ─────────────────────────────────────────────────
// Shows other variant sizes while editing the master.
// ★ ADDITIVE component — zero impact on existing editor.
// ─────────────────────────────────────────────────

import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { CanvasPreviewImage } from '@/components/creativeset/CanvasPreviewImage';
import type { BannerVariant } from '@/schema/design.types';
import { LIVE_PREVIEW_STYLES as S } from './liveSizePreviewStyles';

interface Props {
    currentVariantId: string | undefined;
}

/** Compute a scale factor that fits a variant into the minimap card width */
function fitScale(variantW: number, variantH: number, maxW: number): number {
    return Math.min(maxW / variantW, 1);
}

/** Single minimap card for one variant */
const MiniCard = memo(function MiniCard({ variant, resolvedImages }: { variant: BannerVariant; resolvedImages: Record<string, string> }) {
    const { width: w, height: h } = variant.preset;
    const maxCardWidth = 180;
    const scale = fitScale(w, h, maxCardWidth);
    const displayW = Math.round(w * scale);
    const displayH = Math.round(h * scale);

    return (
        <div style={S.card}>
            <div style={S.cardLabel}>{w} x {h}</div>
            <div style={{ ...S.cardPreview, width: displayW, height: displayH }}>
                <CanvasPreviewImage
                    variant={variant}
                    resolvedImageUrls={resolvedImages}
                    videoUrls={{}}
                    scale={scale}
                />
            </div>
        </div>
    );
});

/** Collapsible panel showing all other size variants */
export const LiveSizePreview = memo(function LiveSizePreview({ currentVariantId }: Props) {
    const [collapsed, setCollapsed] = useState(false);
    const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
    const creativeSet = useDesignStore(s => s.creativeSet);

    const otherVariants = useMemo(() => {
        if (!creativeSet) return [];
        return creativeSet.variants.filter(v => v.id !== currentVariantId);
    }, [creativeSet, currentVariantId]);

    // ★ Resolve idb:// and storage:// image URLs for preview rendering
    useEffect(() => {
        let cancelled = false;
        const toResolve: { elId: string; src: string }[] = [];
        for (const v of otherVariants) {
            for (const el of v.elements) {
                if (el.type === 'image' && el.src && (el.src.startsWith('idb://') || el.src.startsWith('storage://'))) {
                    toResolve.push({ elId: el.id, src: el.src });
                }
            }
        }
        if (toResolve.length === 0) return;
        (async () => {
            const { resolveAsset } = await import('@/services/assetService');
            const results = await Promise.all(
                toResolve.map(async ({ elId, src }) => {
                    try { return { elId, blobUrl: await resolveAsset(src) }; }
                    catch { return { elId, blobUrl: src }; }
                })
            );
            if (!cancelled) {
                const resolved: Record<string, string> = {};
                for (const { elId, blobUrl } of results) if (blobUrl) resolved[elId] = blobUrl;
                setResolvedImages(resolved);
            }
        })();
        return () => { cancelled = true; };
    }, [otherVariants]);

    const toggleCollapse = useCallback(() => setCollapsed(p => !p), []);

    if (otherVariants.length === 0) return null;

    return (
        <div style={{ ...S.panel, ...(collapsed ? S.panelCollapsed : {}) }}>
            {/* Header */}
            <button onClick={toggleCollapse} style={S.header}>
                <span style={S.headerTitle}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    Sizes ({otherVariants.length})
                </span>
                <span style={{ ...S.chevron, transform: collapsed ? 'rotate(180deg)' : 'rotate(0)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>

            {/* Cards */}
            {!collapsed && (
                <div style={S.cardList}>
                    {otherVariants.slice(0, 8).map(variant => (
                        <MiniCard key={variant.id} variant={variant} resolvedImages={resolvedImages} />
                    ))}
                    {otherVariants.length > 8 && (
                        <div style={S.overflow}>+{otherVariants.length - 8} more</div>
                    )}
                </div>
            )}
        </div>
    );
});

