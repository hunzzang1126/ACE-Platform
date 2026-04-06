// ─────────────────────────────────────────────────
// Test Setup — React Testing Library + Canvas Mock
// ─────────────────────────────────────────────────

import '@testing-library/jest-dom/vitest';

// Canvas mock for jsdom (vitest-compatible)
if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = (() => {
        const original = HTMLCanvasElement.prototype.getContext;
        return function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
            if (type === '2d') {
                return {
                    fillRect: () => {},
                    clearRect: () => {},
                    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
                    putImageData: () => {},
                    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
                    setTransform: () => {},
                    drawImage: () => {},
                    save: () => {},
                    fillText: () => {},
                    restore: () => {},
                    beginPath: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    closePath: () => {},
                    stroke: () => {},
                    translate: () => {},
                    scale: () => {},
                    rotate: () => {},
                    arc: () => {},
                    fill: () => {},
                    measureText: () => ({ width: 0 }),
                    transform: () => {},
                    rect: () => {},
                    clip: () => {},
                    createLinearGradient: () => ({ addColorStop: () => {} }),
                    createRadialGradient: () => ({ addColorStop: () => {} }),
                    canvas: this,
                };
            }
            try { return original.call(this, type, ...args as [any]); } catch { return null; }
        };
    })() as any;

    HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
    HTMLCanvasElement.prototype.toBlob = function (cb: any) { cb?.(new Blob()); };
}
