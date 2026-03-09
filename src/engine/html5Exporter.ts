// ─────────────────────────────────────────────────
// HTML5 Exporter — Self-contained HTML5 banner ads
// ─────────────────────────────────────────────────
// Reads canvas elements and animation presets, generates
// a single index.html with inline CSS + JS. IAB-compliant.
//
// Export chain:
//   EngineNodes + AnimPresets → HTML elements → CSS keyframes
//   → clickTag JS → ZIP bundle (index.html + assets)
// ─────────────────────────────────────────────────

import type { EngineNode } from '@/hooks/canvasTypes';
import type { AnimPresetConfig, AnimPresetType } from '@/hooks/useAnimationPresets';
import { useAnimPresetStore } from '@/hooks/useAnimationPresets';

// ── Types ────────────────────────────────────────

export interface ExportOptions {
    /** Banner width in px */
    width: number;
    /** Banner height in px */
    height: number;
    /** Background color (hex) */
    backgroundColor?: string;
    /** clickTag URL for ad networks */
    clickTagUrl?: string;
    /** Animation total duration (seconds) */
    duration?: number;
    /** Whether to loop animation */
    loop?: boolean;
    /** Title for <title> tag */
    title?: string;
}

export interface ExportResult {
    html: string;
    /** Blob ready for download */
    blob: Blob;
    /** Filename suggestion */
    filename: string;
}

// ── Main Export Function ─────────────────────────

/**
 * Generate a self-contained HTML5 ad creative from canvas data.
 * Returns the HTML string and a downloadable Blob.
 */
export function exportToHtml5(
    nodes: EngineNode[],
    options: ExportOptions,
): ExportResult {
    const {
        width,
        height,
        backgroundColor = '#ffffff',
        clickTagUrl = '',
        duration = 5,
        loop = false,
        title = 'ACE Banner',
    } = options;

    // Get animation presets from store
    const presets = useAnimPresetStore.getState().presets;

    // Sort by z_index
    const sorted = [...nodes].sort((a, b) => a.z_index - b.z_index);

    // Generate CSS keyframes for each animated element
    const keyframeBlocks: string[] = [];
    const elementHtml: string[] = [];

    for (const node of sorted) {
        const animConfig = presets[String(node.id)];
        const cssId = `ace-el-${node.id}`;

        // Generate keyframe if animated
        if (animConfig && animConfig.anim !== 'none') {
            const kf = generateKeyframes(cssId, animConfig);
            if (kf) keyframeBlocks.push(kf);
        }

        // Generate HTML element
        const elHtml = nodeToHtml(node, cssId, animConfig, duration, loop);
        elementHtml.push(elHtml);
    }

    // Assemble full HTML
    const html = buildHtmlDocument({
        width, height, backgroundColor, clickTagUrl,
        title, keyframeBlocks, elementHtml, duration, loop,
    });

    const blob = new Blob([html], { type: 'text/html' });
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${width}x${height}.html`;

    return { html, blob, filename };
}

// ── Static PNG/JPG Exporter ──────────────────────

/**
 * Export canvas as static image using Fabric.js toDataURL.
 * Called separately since this needs the actual Canvas instance.
 */
export function exportToImage(
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpeg' = 'png',
    quality = 0.92,
): ExportResult {
    const dataUrl = canvas.toDataURL(`image/${format}`, quality);
    const arr = dataUrl.split(',');
    const mime = arr[0]!.match(/:(.*?);/)?.[1] ?? `image/${format}`;
    const bstr = atob(arr[1]!);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    const blob = new Blob([u8arr], { type: mime });
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    return {
        html: dataUrl,
        blob,
        filename: `banner_export.${ext}`,
    };
}

// ── Download Helper ──────────────────────────────

/** Trigger browser download for an ExportResult */
export function downloadExport(result: ExportResult): void {
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── Internal: Node → HTML ────────────────────────

function nodeToHtml(
    node: EngineNode,
    cssId: string,
    animConfig: AnimPresetConfig | undefined,
    duration: number,
    loop: boolean,
): string {
    const styles: string[] = [
        `position: absolute`,
        `left: ${Math.round(node.x)}px`,
        `top: ${Math.round(node.y)}px`,
        `width: ${Math.round(node.w)}px`,
        `height: ${Math.round(node.h)}px`,
        `opacity: ${node.opacity}`,
    ];

    // Animation
    if (animConfig && animConfig.anim !== 'none') {
        const delay = animConfig.startTime ?? 0;
        const dur = animConfig.animDuration ?? 0.3;
        const iterCount = loop ? 'infinite' : '1';
        styles.push(`animation: ${cssId}-anim ${dur}s cubic-bezier(0.33, 0, 0.2, 1) ${delay}s ${iterCount} both`);
    }

    switch (node.type) {
        case 'text': {
            const color = node.color ?? `rgb(${Math.round(node.fill_r * 255)},${Math.round(node.fill_g * 255)},${Math.round(node.fill_b * 255)})`;
            styles.push(
                `color: ${color}`,
                `font-size: ${node.fontSize ?? 16}px`,
                `font-family: ${escapeAttr(node.fontFamily ?? 'Inter, system-ui, sans-serif')}`,
                `font-weight: ${node.fontWeight ?? '400'}`,
                `text-align: ${node.textAlign ?? 'left'}`,
                `line-height: ${node.lineHeight ?? 1.4}`,
                `letter-spacing: ${node.letterSpacing ?? 0}px`,
                `overflow: hidden`,
                `word-wrap: break-word`,
            );
            return `  <div id="${cssId}" style="${styles.join('; ')}">${escapeHtml(node.content ?? '')}</div>`;
        }

        case 'image': {
            if (node.src) {
                styles.push(`object-fit: cover`);
                return `  <img id="${cssId}" src="${escapeAttr(node.src)}" alt="" style="${styles.join('; ')}" />`;
            }
            styles.push(`background: #ccc`);
            return `  <div id="${cssId}" style="${styles.join('; ')}"></div>`;
        }

        case 'ellipse': {
            const fill = `rgb(${Math.round(node.fill_r * 255)},${Math.round(node.fill_g * 255)},${Math.round(node.fill_b * 255)})`;
            styles.push(`background: ${fill}`, `border-radius: 50%`);
            return `  <div id="${cssId}" style="${styles.join('; ')}"></div>`;
        }

        case 'rounded_rect': {
            const fill = `rgb(${Math.round(node.fill_r * 255)},${Math.round(node.fill_g * 255)},${Math.round(node.fill_b * 255)})`;
            styles.push(`background: ${fill}`, `border-radius: ${node.border_radius ?? 8}px`);
            return `  <div id="${cssId}" style="${styles.join('; ')}"></div>`;
        }

        default: {
            // rect, path
            const fill = `rgb(${Math.round(node.fill_r * 255)},${Math.round(node.fill_g * 255)},${Math.round(node.fill_b * 255)})`;
            styles.push(`background: ${fill}`);
            if (node.border_radius) styles.push(`border-radius: ${node.border_radius}px`);
            return `  <div id="${cssId}" style="${styles.join('; ')}"></div>`;
        }
    }
}

// ── Internal: CSS Keyframes ──────────────────────

function generateKeyframes(cssId: string, config: AnimPresetConfig): string | null {
    const name = `${cssId}-anim`;

    switch (config.anim) {
        case 'fade':
            return `@keyframes ${name} { from { opacity: 0; } to { opacity: 1; } }`;

        case 'slide-left':
            return `@keyframes ${name} { from { transform: translateX(-100%); } to { transform: translateX(0); } }`;

        case 'slide-right':
            return `@keyframes ${name} { from { transform: translateX(100%); } to { transform: translateX(0); } }`;

        case 'slide-up':
            return `@keyframes ${name} { from { transform: translateY(-100%); } to { transform: translateY(0); } }`;

        case 'slide-down':
            return `@keyframes ${name} { from { transform: translateY(100%); } to { transform: translateY(0); } }`;

        case 'scale':
            return `@keyframes ${name} { from { transform: scale(0); } to { transform: scale(1); } }`;

        case 'ascend':
            return `@keyframes ${name} { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }`;

        case 'descend':
            return `@keyframes ${name} { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }`;

        default:
            return null;
    }
}

// ── Internal: HTML Document Builder ──────────────

interface BuildOptions {
    width: number;
    height: number;
    backgroundColor: string;
    clickTagUrl: string;
    title: string;
    keyframeBlocks: string[];
    elementHtml: string[];
    duration: number;
    loop: boolean;
}

function buildHtmlDocument(opts: BuildOptions): string {
    const clickTagScript = opts.clickTagUrl
        ? `
<script>
var clickTag = "${escapeAttr(opts.clickTagUrl)}";
document.getElementById("ace-clickarea").addEventListener("click", function() {
  window.open(clickTag, "_blank");
});
</script>`
        : `
<script>
var clickTag = "";
document.getElementById("ace-clickarea").addEventListener("click", function() {
  if (clickTag) window.open(clickTag, "_blank");
});
</script>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="ad.size" content="width=${opts.width},height=${opts.height}">
<title>${escapeHtml(opts.title)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { overflow: hidden; }
#ace-banner {
  position: relative;
  width: ${opts.width}px;
  height: ${opts.height}px;
  background: ${opts.backgroundColor};
  overflow: hidden;
  cursor: pointer;
}
#ace-clickarea {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
  cursor: pointer;
}
${opts.keyframeBlocks.join('\n')}
</style>
</head>
<body>
<div id="ace-banner">
${opts.elementHtml.join('\n')}
  <div id="ace-clickarea"></div>
</div>
${clickTagScript}
</body>
</html>`;
}

// ── Helpers ──────────────────────────────────────

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
