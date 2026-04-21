// ─────────────────────────────────────────────────
// fontAnimGenerator.ts — CSS @keyframes from presets
// ─────────────────────────────────────────────────
// Generates CSS animation code for Variable Font presets.
// Used in: HTML5 Export, canvas preview overlay.
// ─────────────────────────────────────────────────

import type { FontAnimPreset } from '@/ai/fontAnimPresets';

/**
 * Generate a CSS @keyframes + class for a font animation preset.
 * The class name is scoped to the element ID to avoid conflicts.
 */
export function generateFontAnimCSS(
    elementId: string,
    preset: FontAnimPreset,
): string {
    if (preset.id === 'none' || preset.duration <= 0) return '';

    const safeName = elementId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const animName = `fa-${safeName}`;
    const iter = preset.iterationCount === 'infinite' ? 'infinite' : String(preset.iterationCount);

    return [
        `@keyframes ${animName} {`,
        `  0% { font-variation-settings: '${preset.axis}' ${preset.from}; }`,
        `  100% { font-variation-settings: '${preset.axis}' ${preset.to}; }`,
        `}`,
        `.${animName} {`,
        `  animation: ${animName} ${preset.duration}s ${preset.easing} ${preset.direction} ${iter};`,
        `}`,
    ].join('\n');
}

/**
 * Generate inline style object for live canvas preview.
 * Returns the animation CSS properties for React style prop.
 */
export function generateFontAnimStyle(
    elementId: string,
    preset: FontAnimPreset,
): React.CSSProperties | null {
    if (preset.id === 'none' || preset.duration <= 0) return null;

    const safeName = elementId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const animName = `fa-${safeName}`;
    const iter = preset.iterationCount === 'infinite' ? 'infinite' : String(preset.iterationCount);

    return {
        animationName: animName,
        animationDuration: `${preset.duration}s`,
        animationTimingFunction: preset.easing,
        animationDirection: preset.direction,
        animationIterationCount: iter,
    };
}

/**
 * Inject @keyframes into document <style> for live preview.
 * Idempotent — safe to call multiple times.
 */
export function injectFontAnimKeyframes(elementId: string, preset: FontAnimPreset): void {
    if (preset.id === 'none' || preset.duration <= 0) return;

    const safeName = elementId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const styleId = `fa-style-${safeName}`;

    // Remove existing
    document.getElementById(styleId)?.remove();

    const css = generateFontAnimCSS(elementId, preset);
    if (!css) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * Clean up injected @keyframes for an element.
 */
export function removeFontAnimKeyframes(elementId: string): void {
    const safeName = elementId.replace(/[^a-zA-Z0-9_-]/g, '_');
    document.getElementById(`fa-style-${safeName}`)?.remove();
}
