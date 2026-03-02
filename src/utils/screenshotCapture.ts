// ─────────────────────────────────────────────────
// Screenshot Capture — DOM element → base64 PNG
// Uses native Canvas API (no external deps)
// ─────────────────────────────────────────────────

/**
 * Capture a DOM element as a base64 PNG string.
 * Renders the element onto a canvas using foreignObject SVG trick.
 */
export async function captureElementAsBase64(
    element: HTMLElement,
    width: number,
    height: number,
): Promise<string> {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.transform = 'none';
    clone.style.transformOrigin = 'top left';
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;

    // Serialize to XML
    const xmlns = 'http://www.w3.org/1999/xhtml';
    const wrapper = document.createElement('div');
    wrapper.setAttribute('xmlns', xmlns);
    wrapper.appendChild(clone);
    const xml = new XMLSerializer().serializeToString(wrapper);

    // Create SVG foreignObject
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <foreignObject width="100%" height="100%">
                ${xml}
            </foreignObject>
        </svg>
    `;

    // Render SVG to canvas
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            // Extract base64 (strip data:image/png;base64, prefix)
            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1] ?? '';
            resolve(base64);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to render screenshot'));
        };
        img.src = url;
    });
}

/**
 * Simpler approach: render colored rectangles to represent elements
 * This is more reliable than foreignObject for cross-origin content
 */
export function renderVariantToCanvas(
    variant: {
        width: number;
        height: number;
        backgroundColor: string;
        elements: Array<{
            x: number;
            y: number;
            width: number;
            height: number;
            type: string;
            fill?: string;
            color?: string;
            backgroundColor?: string;
            content?: string;
            label?: string;
            fontSize?: number;
            fontFamily?: string;
            opacity?: number;
        }>;
    },
): string {
    const canvas = document.createElement('canvas');
    canvas.width = variant.width;
    canvas.height = variant.height;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = variant.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, variant.width, variant.height);

    // Render each element
    for (const el of variant.elements) {
        ctx.globalAlpha = el.opacity ?? 1;

        if (el.type === 'shape') {
            ctx.fillStyle = el.fill || '#CCCCCC';
            ctx.fillRect(el.x, el.y, el.width, el.height);
        } else if (el.type === 'text') {
            ctx.fillStyle = el.color || '#000000';
            const fontSize = el.fontSize || 16;
            ctx.font = `${fontSize}px ${el.fontFamily || 'Inter'}`;
            ctx.textBaseline = 'top';
            ctx.fillText(el.content || '', el.x, el.y, el.width);
        } else if (el.type === 'button') {
            ctx.fillStyle = el.backgroundColor || '#FF5733';
            ctx.beginPath();
            const r = Math.min(12, el.height / 2);
            ctx.roundRect(el.x, el.y, el.width, el.height, r);
            ctx.fill();
            ctx.fillStyle = el.color || '#FFFFFF';
            const fontSize = el.fontSize || 14;
            ctx.font = `${fontSize}px ${el.fontFamily || 'Inter'}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(el.label || '', el.x + el.width / 2, el.y + el.height / 2);
        } else if (el.type === 'image') {
            ctx.fillStyle = '#E0E0E0';
            ctx.fillRect(el.x, el.y, el.width, el.height);
            ctx.fillStyle = '#999';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('', el.x + el.width / 2, el.y + el.height / 2);
        }

        ctx.globalAlpha = 1;
    }

    // Return base64 without prefix
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
}
