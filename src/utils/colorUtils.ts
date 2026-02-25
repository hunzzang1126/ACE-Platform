/**
 * Hex → RGB 변환
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!match) return null;
    return {
        r: parseInt(match[1]!, 16),
        g: parseInt(match[2]!, 16),
        b: parseInt(match[3]!, 16),
    };
}

/**
 * RGB → Hex 변환
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Hex → 0xRRGGBB (PixiJS용) 변환
 */
export function hexToPixiColor(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
}
