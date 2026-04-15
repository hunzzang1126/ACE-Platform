// ─────────────────────────────────────────────────
// TemplatePreviewCard — Fabric.js headless rendered template preview
// ─────────────────────────────────────────────────
// ★ Uses SAME Fabric.js engine as Canvas Editor for pixel-perfect rendering.
// ★ Performance: dataURL cache + render queue (max 3 concurrent) to prevent
//   GPU lock-up when 30+ templates render simultaneously.
// ─────────────────────────────────────────────────

import { useEffect, useRef, useState, useMemo } from 'react';
import { renderVariantWithFabric } from '@/components/creativeset/fabricHeadlessRenderer';
import type { DesignTemplate } from '@/stores/templateStore';
import type { BannerVariant } from '@/schema/design.types';

const PREVIEW_W = 220;

// ═══════════════════════════════════════════════════
// RENDER CACHE — prevents redundant Fabric renders
// ═══════════════════════════════════════════════════

const previewCache = new Map<string, string>();  // templateId → dataURL
const MAX_CACHE = 200;

/** Get cached dataURL, null if not cached */
export function getCachedPreview(templateId: string): string | null {
    return previewCache.get(templateId) ?? null;
}

/** Store a rendered dataURL in cache */
function setCachedPreview(templateId: string, dataUrl: string): void {
    if (previewCache.size >= MAX_CACHE) {
        // Evict oldest entry
        const firstKey = previewCache.keys().next().value;
        if (firstKey) previewCache.delete(firstKey);
    }
    previewCache.set(templateId, dataUrl);
}

/** Invalidate a specific template's cache (call after save/edit) */
export function invalidatePreviewCache(templateId: string): void {
    previewCache.delete(templateId);
}

// ═══════════════════════════════════════════════════
// RENDER QUEUE — max 3 concurrent Fabric renders
// ═══════════════════════════════════════════════════

const MAX_CONCURRENT = 3;
let activeRenders = 0;
const pendingQueue: Array<{ resolve: () => void }> = [];

async function acquireRenderSlot(): Promise<void> {
    if (activeRenders < MAX_CONCURRENT) {
        activeRenders++;
        return;
    }
    return new Promise(resolve => pendingQueue.push({ resolve }));
}

function releaseRenderSlot(): void {
    activeRenders--;
    if (pendingQueue.length > 0 && activeRenders < MAX_CONCURRENT) {
        activeRenders++;
        pendingQueue.shift()!.resolve();
    }
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

export function TemplatePreview({ template }: { template: DesignTemplate }) {
    // ★ useMemo prevents JSON.parse on every render — key perf fix.
    // Only re-parse if variantSnapshot string actually changes.
    const variant = useMemo<BannerVariant | null>(() => {
        try { return JSON.parse(template.variantSnapshot); }
        catch { return null; }
    }, [template.variantSnapshot]);

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

    return <FabricPreview templateId={template.id} variant={variant} width={template.width} height={template.height} />;
}

// ── Fabric.js headless renderer component ──

function FabricPreview({ templateId, variant, width, height }: {
    templateId: string; variant: BannerVariant; width: number; height: number;
}) {
    const [dataUrl, setDataUrl] = useState<string | null>(() => getCachedPreview(templateId));
    const [error, setError] = useState(false);
    const renderIdRef = useRef(0);

    const scale = PREVIEW_W / width;
    const previewH = height * scale;

    useEffect(() => {
        // ★ Cache hit — skip Fabric render entirely
        const cached = getCachedPreview(templateId);
        if (cached) { setDataUrl(cached); return; }

        const renderId = ++renderIdRef.current;
        let cancelled = false;

        const fullVariant: BannerVariant = {
            ...variant,
            preset: variant.preset ?? { id: 'preview', name: 'Preview', width, height, category: 'display' as const },
        };

        // ★ Queue-limited render — max 3 concurrent Fabric canvases
        (async () => {
            await acquireRenderSlot();
            if (cancelled) { releaseRenderSlot(); return; }

            try {
                const url = await renderVariantWithFabric(fullVariant);
                if (!cancelled && renderId === renderIdRef.current) {
                    setCachedPreview(templateId, url);
                    setDataUrl(url);
                }
            } catch {
                if (!cancelled && renderId === renderIdRef.current) setError(true);
            } finally {
                releaseRenderSlot();
            }
        })();

        return () => { cancelled = true; renderIdRef.current++; };
    }, [templateId, variant, width, height]);

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
