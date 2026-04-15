// TemplatePreviewCard — Fabric.js headless rendered template preview
// ★ Uses SAME Fabric.js engine as Canvas Editor for pixel-perfect rendering.
// Previous CSS-based approach had unfixable text positioning drift.

import { useEffect, useRef, useState } from 'react';
import { renderVariantWithFabric } from '@/components/creativeset/fabricHeadlessRenderer';
import type { DesignTemplate } from '@/stores/templateStore';
import type { BannerVariant } from '@/schema/design.types';

const PREVIEW_W = 220;

export function TemplatePreview({ template }: { template: DesignTemplate }) {
    let variant: BannerVariant | null = null;
    try {
        variant = JSON.parse(template.variantSnapshot);
    } catch { /* noop */ }

    if (!variant) {
        return (
            <div style={{
                width: PREVIEW_W, height: 160,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#555', fontSize: 16, fontWeight: 600,
                background: 'rgba(255,255,255,0.02)', borderRadius: 8,
            }}>
                {template.width} x {template.height}
            </div>
        );
    }

    return <FabricPreview variant={variant} width={template.width} height={template.height} />;
}

// ── Fabric.js headless renderer component ──

function FabricPreview({ variant, width, height }: { variant: BannerVariant; width: number; height: number }) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const renderIdRef = useRef(0);

    const scale = PREVIEW_W / width;
    const previewH = height * scale;

    useEffect(() => {
        const renderId = ++renderIdRef.current;

        // Ensure variant has correct preset dimensions
        const fullVariant: BannerVariant = {
            ...variant,
            preset: variant.preset ?? { id: 'preview', name: 'Preview', width, height, category: 'display' as const },
        };

        renderVariantWithFabric(fullVariant)
            .then(url => { if (renderId === renderIdRef.current) setDataUrl(url); })
            .catch(() => { if (renderId === renderIdRef.current) setError(true); });

        return () => { renderIdRef.current++; };
    }, [variant, width, height]);

    if (error) {
        return (
            <div style={{
                width: PREVIEW_W, height: previewH,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#555', fontSize: 12, background: '#1a1a2e', borderRadius: 8,
            }}>
                {width} x {height}
            </div>
        );
    }

    if (!dataUrl) {
        return (
            <div style={{
                width: PREVIEW_W, height: previewH,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0d1117', borderRadius: 8,
            }}>
                <div style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(99,102,241,0.3)',
                    borderTopColor: '#818cf8',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
            </div>
        );
    }

    return (
        <img
            src={dataUrl}
            alt={`${width}x${height}`}
            width={PREVIEW_W}
            height={previewH}
            style={{ display: 'block', borderRadius: 8 }}
            draggable={false}
        />
    );
}
