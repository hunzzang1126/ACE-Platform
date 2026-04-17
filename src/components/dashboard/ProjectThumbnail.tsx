import { useMemo, useState } from 'react';
import { useDesignStore } from '@/stores/designStore';

interface ProjectThumbnailProps {
    setId: string;
    width?: number;
    height?: number;
}

interface VariantRect {
    w: number;
    h: number;
    label: string;
}

export function ProjectThumbnail({ setId, width = 200, height = 120 }: ProjectThumbnailProps) {
    const [imgError, setImgError] = useState(false);

    const data = useMemo(() => {
        const cs = useDesignStore.getState().allCreativeSets[setId];
        if (!cs) return null;

        // Check for screenshot on master
        const master = cs.variants.find(v => v.id === cs.masterVariantId) ?? cs.variants[0];
        const screenshotUrl = master?.screenshotUrl ?? null;

        // Collect all variant sizes
        const rects: VariantRect[] = cs.variants.map(v => ({
            w: v.preset.width,
            h: v.preset.height,
            label: `${v.preset.width}×${v.preset.height}`,
        }));

        return { screenshotUrl, rects };
    }, [setId]);

    if (!data || data.rects.length === 0) {
        return <EmptyPlaceholder width={width} height={height} />;
    }

    // ★ If screenshot available and not broken, use it
    if (data.screenshotUrl && !imgError) {
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
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    // ★ No screenshot or broken — show proportional size rectangles
    return <SizeRectangles rects={data.rects} width={width} height={height} />;
}

// ── Proportional size rectangles ──
function SizeRectangles({ rects, width, height }: { rects: VariantRect[]; width: number; height: number }) {
    // Available area with padding
    const padX = 16;
    const padY = 14;
    const areaW = width - padX * 2;
    const areaH = height - padY * 2;

    // Find max dimension to normalize
    const maxDim = Math.max(...rects.map(r => Math.max(r.w, r.h)));

    // Scale factor to fit largest rect into available area
    const maxRectH = areaH * 0.85;
    const maxRectW = rects.length === 1 ? areaW * 0.6 : areaW / Math.min(rects.length, 3) - 8;
    const globalScale = Math.min(maxRectW / maxDim, maxRectH / maxDim);

    // Limit to 3 visible, show "+N" for rest
    const visible = rects.slice(0, 3);
    const overflow = rects.length - 3;

    return (
        <div style={{
            width, height, borderRadius: 6, overflow: 'hidden',
            background: 'linear-gradient(145deg, #f5f7fa, #edf0f4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: `${padY}px ${padX}px`,
            position: 'relative',
        }}>
            {visible.map((rect, i) => {
                const rw = Math.max(20, Math.round(rect.w * globalScale));
                const rh = Math.max(14, Math.round(rect.h * globalScale));
                return (
                    <div key={i} style={{
                        width: rw, height: rh,
                        borderRadius: 4,
                        background: '#fff',
                        border: '1.5px solid #d4d8e0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'transform 0.15s ease',
                    }}>
                        <span style={{
                            fontSize: Math.min(9, rw / 6),
                            color: '#94a3b8',
                            fontWeight: 500,
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                        }}>
                            {rect.label}
                        </span>
                    </div>
                );
            })}
            {overflow > 0 && (
                <span style={{
                    fontSize: 10, color: '#94a3b8', fontWeight: 600,
                    marginLeft: 2,
                }}>
                    +{overflow}
                </span>
            )}
        </div>
    );
}

// ── Empty placeholder ──
function EmptyPlaceholder({ width, height }: { width: number; height: number }) {
    return (
        <div style={{
            width, height, borderRadius: 6,
            background: 'linear-gradient(145deg, #f0f2f5, #e8eaed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b0b8c4" strokeWidth="1.2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
            </svg>
        </div>
    );
}
