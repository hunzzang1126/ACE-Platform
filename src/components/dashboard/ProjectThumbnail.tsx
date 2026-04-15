// ─────────────────────────────────────────────────
// ProjectThumbnail — Screenshot preview or clean placeholder
// ─────────────────────────────────────────────────
// Uses screenshotUrl (pixel-perfect) when available.
// Falls back to a clean brand placeholder — NOT a broken CSS reconstruction.
// ─────────────────────────────────────────────────

import { useMemo } from 'react';
import { useDesignStore } from '@/stores/designStore';

interface ProjectThumbnailProps {
    setId: string;
    width?: number;
    height?: number;
}

export function ProjectThumbnail({ setId, width = 200, height = 120 }: ProjectThumbnailProps) {
    const data = useMemo(() => {
        const cs = useDesignStore.getState().allCreativeSets[setId];
        if (!cs) return null;
        const master = cs.variants.find(v => v.id === cs.masterVariantId) ?? cs.variants[0];
        if (!master) return null;

        return {
            screenshotUrl: master.screenshotUrl ?? null,
            elementCount: master.elements?.length ?? 0,
            sizeLabel: `${master.preset.width} x ${master.preset.height}`,
        };
    }, [setId]);

    // No data at all
    if (!data) return <PlaceholderBox width={width} height={height} label="" />;

    // ★ Best case: screenshot preview (pixel-perfect)
    if (data.screenshotUrl) {
        return (
            <div style={{
                width, height, borderRadius: 6, overflow: 'hidden',
                background: '#f0f2f5',
            }}>
                <img
                    src={data.screenshotUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                />
            </div>
        );
    }

    // No screenshot — clean placeholder with size info
    return <PlaceholderBox width={width} height={height} label={data.sizeLabel} />;
}

/** Clean brand placeholder — better than a broken CSS reconstruction */
function PlaceholderBox({ width, height, label }: { width: number; height: number; label: string }) {
    return (
        <div style={{
            width, height, borderRadius: 6, overflow: 'hidden',
            background: 'linear-gradient(145deg, #f0f2f5, #e8eaed)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b0b8c4" strokeWidth="1.2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
            </svg>
            {label && (
                <span style={{
                    fontSize: 10, color: '#94a3b8', fontWeight: 500,
                    letterSpacing: '0.02em',
                }}>
                    {label}
                </span>
            )}
        </div>
    );
}
