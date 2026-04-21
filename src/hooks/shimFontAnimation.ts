// ─────────────────────────────────────────────────
// shimFontAnimation.ts — Variable Font animation for Fabric.js
// ─────────────────────────────────────────────────
// Drives font-variation-settings animation on Fabric Textbox objects
// using requestAnimationFrame. Integrates with fabricEngineShim.
// ─────────────────────────────────────────────────

import type { Canvas, FabricObject } from 'fabric';
import { getAnimPreset, type FontAnimPreset } from '@/ai/fontAnimPresets';

// Active animation loops
const activeAnimations = new Map<number, number>(); // objId → RAF handle

/**
 * Easing: produce a value between 0 and 1 based on progress.
 * For 'alternate' direction, bounces back (0→1→0→1...).
 */
function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Start a Variable Font animation on a Fabric text object.
 * The animation modifies font-variation-settings by changing
 * fontWeight (for wght axis) via requestAnimationFrame.
 */
export function startFontAnimation(
    objId: number,
    obj: FabricObject,
    presetId: string,
    fc: Canvas,
): void {
    // Stop existing animation for this object
    stopFontAnimation(objId);

    const preset = getAnimPreset(presetId);
    if (preset.id === 'none' || preset.duration <= 0) return;

    // Only wght axis is supported in Fabric.js (fontWeight)
    // wdth and slnt require CSS font-variation-settings which Fabric doesn't support
    if (preset.axis !== 'wght') return;

    const durationMs = preset.duration * 1000;
    const startTime = performance.now();

    function animate(now: number) {
        const elapsed = now - startTime;
        const totalProgress = elapsed / durationMs;

        let t: number;
        if (preset.direction === 'alternate') {
            // Bounce: 0→1→0→1...
            const cycle = Math.floor(totalProgress);
            const withinCycle = totalProgress - cycle;
            t = cycle % 2 === 0 ? withinCycle : 1 - withinCycle;
        } else {
            t = totalProgress % 1;
        }

        const eased = easeInOut(t);
        const value = Math.round(lerp(preset.from, preset.to, eased));

        // Apply to Fabric object
        if ('fontWeight' in obj) {
            (obj as any).set({ fontWeight: value });
            obj.setCoords();
            fc.renderAll();
        }

        // Continue if infinite or within iteration count
        const shouldContinue = preset.iterationCount === 'infinite'
            || totalProgress < (preset.iterationCount as number);

        if (shouldContinue) {
            const handle = requestAnimationFrame(animate);
            activeAnimations.set(objId, handle);
        } else {
            activeAnimations.delete(objId);
        }
    }

    const handle = requestAnimationFrame(animate);
    activeAnimations.set(objId, handle);
}

/**
 * Stop a font animation for a specific object.
 */
export function stopFontAnimation(objId: number): void {
    const handle = activeAnimations.get(objId);
    if (handle !== undefined) {
        cancelAnimationFrame(handle);
        activeAnimations.delete(objId);
    }
}

/**
 * Stop all active font animations (e.g. on page unload).
 */
export function stopAllFontAnimations(): void {
    for (const [id, handle] of activeAnimations) {
        cancelAnimationFrame(handle);
    }
    activeAnimations.clear();
}

/**
 * Check if a font animation is currently running for an object.
 */
export function isFontAnimating(objId: number): boolean {
    return activeAnimations.has(objId);
}

/**
 * Create font animation methods for the engine shim.
 * Called by fabricEngineShim to add animation capabilities.
 */
export function createFontAnimMethods(
    fc: Canvas,
    findById: (id: number) => FabricObject | undefined,
) {
    return {
        set_font_animation: (id: number, presetId: string) => {
            const obj = findById(id);
            if (!obj || !('fontFamily' in obj)) return;

            if (presetId === 'none') {
                stopFontAnimation(id);
                return;
            }
            startFontAnimation(id, obj, presetId, fc);
        },

        stop_font_animation: (id: number) => {
            stopFontAnimation(id);
        },

        stop_all_font_animations: () => {
            stopAllFontAnimations();
        },
    };
}
