// ─────────────────────────────────────────────────
// agentFlowRender — Rendering helpers for AI design pipeline
// ─────────────────────────────────────────────────
// Extracted from agentGenerateFlow.ts to keep file under 400 lines.
// ─────────────────────────────────────────────────

import type { AgentFlowCallbacks, FlowEngine } from './agentFlowTypes';
import { resilientImport } from '@/utils/resilientImport';

/** Render a single design element onto the canvas engine. */
export function renderElement(engine: FlowEngine, el: any, canvasW: number, cacheGradientData: (key: string, start: string, end: string, angle: number) => void, guide?: any): number | null {
    const hexToRgb = (hx: string): [number, number, number] => {
        const c = hx.replace('#', '');
        return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255];
    };

    if (el.type === 'text') {
        // ★ v717: Parse rgba() for text hierarchy opacity (subheadline uses <1.0 alpha)
        let tr = 1, tg = 1, tb = 1, ta = 1;
        if (el.color_hex) {
            const rgbaMatch = el.color_hex.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/);
            if (rgbaMatch) {
                tr = parseInt(rgbaMatch[1]) / 255;
                tg = parseInt(rgbaMatch[2]) / 255;
                tb = parseInt(rgbaMatch[3]) / 255;
                ta = rgbaMatch[4] != null ? parseFloat(rgbaMatch[4]) : 1;
            } else {
                [tr, tg, tb] = hexToRgb(el.color_hex);
            }
        }
        const fontFamily = el.font_family || guide?.typography?.primaryFont || 'Inter';
        const fullFont = `${fontFamily}, system-ui, sans-serif`;
        return engine.add_text(el.x ?? 0, el.y ?? 0, el.content || 'Text', el.font_size ?? 18, fullFont, el.font_weight ?? '700', tr, tg, tb, ta, (el.w && el.w > 0) ? el.w : canvasW * 0.85, el.text_align ?? 'center', el.name, el.line_height, el.letter_spacing);
    } else if (el.gradient_start_hex && el.gradient_end_hex) {
        const nodeId = engine.add_gradient_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 100, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135, el.radius ?? 0, el.name);
        cacheGradientData(el.name ?? '', el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135);
        if (nodeId != null) cacheGradientData(`engine-${nodeId}`, el.gradient_start_hex, el.gradient_end_hex, el.gradient_angle ?? 135);
        return nodeId;
    } else if (el.type === 'rounded_rect' || (el.radius && el.radius > 0)) {
        // ★ Route any rect with radius > 0 to rounded_rect (e.g., text_overlay, cta_button)
        const bgId = engine.add_rounded_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, el.a ?? 1, el.radius ?? 8, el.name);
        // ★ v735: Render CTA label text inside button — previously silently dropped
        if (el.content && bgId != null) {
            const labelHex = el.color_hex || '#FFFFFF';
            const [lr, lg, lb] = hexToRgb(labelHex);
            const labelFont = el.font_family || guide?.typography?.secondaryFont || 'Inter';
            const labelSize = el.font_size || Math.max(12, Math.round((el.h ?? 50) * 0.4));
            // Center text vertically inside button (y offset = button_y + padding)
            const labelY = (el.y ?? 0) + Math.round(((el.h ?? 50) - labelSize * 1.2) / 2);
            engine.add_text(el.x ?? 0, labelY, el.content, labelSize, `${labelFont}, system-ui, sans-serif`, el.font_weight || '700', lr, lg, lb, 1.0, el.w ?? 100, 'center', `${el.name ?? 'cta'}_label`, 1.0, el.letter_spacing);
        }
        return bgId;
    } else if (el.type === 'ellipse') {
        return engine.add_ellipse?.((el.x ?? 0) + (el.w ?? 50) / 2, (el.y ?? 0) + (el.h ?? 50) / 2, (el.w ?? 50) / 2, (el.h ?? 50) / 2, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, el.a ?? 1) ?? null;
    } else {
        return engine.add_rect(el.x ?? 0, el.y ?? 0, el.w ?? 100, el.h ?? 50, el.r ?? 0.5, el.g ?? 0.5, el.b ?? 0.5, el.a ?? 1, el.name);
    }
}

/** Build human-readable detail string for a design element. */
export function buildElementDetail(el: any): string {
    if (el.type === 'text') return `"${(el.content ?? '').slice(0, 25)}" ${el.font_size}px at (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)})`;
    if (el.gradient_start_hex) return `${el.gradient_start_hex} -> ${el.gradient_end_hex} ${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`;
    return `${el.type ?? 'rect'} at (${Math.round(el.x ?? 0)}, ${Math.round(el.y ?? 0)}) ${Math.round(el.w ?? 0)}x${Math.round(el.h ?? 0)}`;
}

/** Run Vision QA healing loop (currently unused but preserved for future re-enable). */
export async function runVisionQA(engine: FlowEngine, canvasW: number, canvasH: number, guide: any, template: any, rendered: number, abort: AbortController, cb: AgentFlowCallbacks) {
    cb.narrate('Reviewing and optimizing design quality...');
    cb.addCard('vision', 'Optimizing layout', 'running');
    try {
        const { runVisionHealingLoop } = await resilientImport(() => import('@/services/autoDesignLoop'));
        const loopResult = await runVisionHealingLoop(engine, canvasW, canvasH, abort.signal, (msg: string) => cb.updateCard('vision', 'running', msg));
        const fixNote = loopResult.fixesApplied > 0 ? ` · ${loopResult.fixesApplied} fix(es)` : '';
        const methodNote = loopResult.healingMethod === 'patch' ? ' (auto-patched)' : '';
        cb.updateCard('vision', loopResult.finalScore >= 80 ? 'done' : 'error', `Score: ${loopResult.finalScore}/100${fixNote}${methodNote}`);
        cb.narrate(`Design quality review — score ${loopResult.finalScore}/100.${fixNote}\nStyle: ${guide.name}\nLayout: ${template.name}\nElements: ${rendered}\nCanvas: ${canvasW}x${canvasH}px`);
    } catch {
        cb.updateCard('vision', 'done', 'Vision check skipped');
        cb.narrate(`Design placed with ${rendered} elements using ${guide.name}.\nCanvas: ${canvasW}x${canvasH}px`);
    }
}

/** Place brand logo and product images on the canvas. Returns count of rendered product images. */
export async function placeBrandAssets(
    engine: FlowEngine,
    canvasW: number,
    canvasH: number,
    logoUrl: string | null,
    logoW: number,
    logoH: number,
    selectedAssets: import('@/services/brandAssetSelector').AssetSelection | null | undefined,
    cb: AgentFlowCallbacks,
): Promise<number> {
    let placed = 0;

    // ── Brand Logo ──
    if (logoUrl) {
        try {
            // ★ Resolve storage:// and idb:// refs to renderable data URLs
            let resolvedLogoUrl = logoUrl;
            try {
                const { resolveAsset, isAssetRef } = await resilientImport(() => import('@/services/assetService'));
                if (isAssetRef(logoUrl)) {
                    resolvedLogoUrl = await resolveAsset(logoUrl);
                    console.log(`[Pipeline] Logo resolved: ${logoUrl.slice(0, 30)}... → data URL (${Math.round(resolvedLogoUrl.length / 1024)}KB)`);
                }
            } catch { /* continue with original URL */ }

            const canvasMin = Math.min(canvasW, canvasH);
            const maxLogoSize = Math.round(canvasMin * 0.15);
            const logoAspect = logoW > 0 && logoH > 0 ? logoW / logoH : 1;
            const [logoPlaceW, logoPlaceH] = logoAspect >= 1
                ? [maxLogoSize, Math.round(maxLogoSize / logoAspect)]
                : [Math.round(maxLogoSize * logoAspect), maxLogoSize];
            const logoPad = Math.round(canvasMin * 0.04);
            await engine.add_image(canvasW - logoPlaceW - logoPad, canvasH - logoPlaceH - logoPad, resolvedLogoUrl, logoPlaceW, logoPlaceH, 'brand_logo');
            cb.narrate('Brand logo placed on canvas.');
        } catch (err) { console.warn('[Pipeline] Failed to place logo:', err); }
    }

    // ── Brand Product Images (★ v719) ──
    if (selectedAssets?.productImages.length) {
        for (const { asset, reasoning, placementHint } of selectedAssets.productImages) {
            try {
                // ★ Resolve storage:// and idb:// refs
                let resolvedSrc = asset.src;
                try {
                    const { resolveAsset, isAssetRef } = await resilientImport(() => import('@/services/assetService'));
                    if (isAssetRef(asset.src)) {
                        resolvedSrc = await resolveAsset(asset.src);
                    }
                } catch { /* continue with original */ }

                const canvasMin = Math.min(canvasW, canvasH);
                const productSize = Math.round(canvasMin * 0.35);
                const productAspect = asset.width > 0 && asset.height > 0 ? asset.width / asset.height : 1;
                const [pw, ph] = productAspect >= 1
                    ? [productSize, Math.round(productSize / productAspect)]
                    : [Math.round(productSize * productAspect), productSize];
                const pad = Math.round(canvasMin * 0.04);

                let px: number, py: number;
                const place = placementHint ?? asset.metadata?.suggestedPlacement ?? 'center';
                if (place === 'top-right') { px = canvasW - pw - pad; py = pad; }
                else if (place === 'bottom-left') { px = pad; py = canvasH - ph - pad; }
                else if (place === 'bottom-right') { px = canvasW - pw - pad; py = canvasH - ph - pad; }
                else { px = Math.round((canvasW - pw) / 2); py = Math.round((canvasH - ph) / 2); }

                await engine.add_image(px, py, resolvedSrc, pw, ph, `brand_product_${asset.name}`);
                placed++;
                cb.narrate(`Product image placed: ${reasoning}`);
            } catch (err) { console.warn('[Pipeline] Failed to place product image:', err); }
        }
    }

    return placed;
}
