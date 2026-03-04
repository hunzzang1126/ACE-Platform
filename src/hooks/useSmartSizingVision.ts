// ─────────────────────────────────────────────────
// useSmartSizingVision — AI Vision Feedback Loop
// ─────────────────────────────────────────────────
// After SmartSizing produces a layout, this hook:
//   1. Captures a screenshot of the Fabric canvas
//   2. Sends it to Claude Vision for evaluation
//   3. Receives quality score + issue list + coordinate patches
//   4. Applies patches to the canvas (max 2 iterations)
//
// This is the "사람이 보고 고친 것" Smart Sizing approach —
// AI visually validates the layout and self-corrects.
// ─────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { callVisionCheck } from '@/services/visionService';
import type { VisionResult, VisionPatch } from '@/services/visionService';
import { classifyRatio } from '@/engine/smartSizing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

export interface VisionLoopState {
    isChecking: boolean;
    iteration: number;
    result: VisionResult | null;
    error: string | null;
}

export interface VisionLoopOptions {
    /** Fabric canvas instance (from useFabricCanvas) */
    fabricCanvas: FabricCanvas | null;
    /** Canvas width in pixels */
    canvasW: number;
    /** Canvas height in pixels */
    canvasH: number;
    /** Anthropic API key */
    apiKey: string;
    /** Element metadata for context (name, role, type) */
    elements?: Array<{ name: string; role?: string; type: string }>;
    /** Max refinement iterations (default: 2) */
    maxIterations?: number;
}

const QUALITY_THRESHOLD = 75; // Skip 2nd iteration if score >= this

/**
 * AI Vision Feedback Loop for Smart Sizing.
 *
 * Call `runVisionCheck()` after smart sizing completes:
 *   - Captures canvas screenshot automatically
 *   - Evaluates layout with Claude Vision
 *   - Applies coordinate patches to the Fabric canvas
 *   - Repeats up to maxIterations times
 */
export function useSmartSizingVision(options: VisionLoopOptions) {
    const { fabricCanvas, canvasW, canvasH, apiKey, elements = [], maxIterations = 2 } = options;

    const [state, setState] = useState<VisionLoopState>({
        isChecking: false,
        iteration: 0,
        result: null,
        error: null,
    });

    const abortRef = useRef(false);

    /**
     * Capture a base64 PNG screenshot of the current Fabric canvas.
     */
    const captureScreenshot = useCallback((): string | null => {
        if (!fabricCanvas) return null;
        try {
            // Fabric's toDataURL returns 'data:image/png;base64,...'
            return fabricCanvas.toDataURL({
                format: 'png',
                quality: 0.8,
                multiplier: 1,
            }) as string;
        } catch {
            return null;
        }
    }, [fabricCanvas]);

    /**
     * Apply a single vision patch to the Fabric canvas.
     * Finds the object by __aceName and updates its properties.
     */
    const applyPatch = useCallback((patch: VisionPatch) => {
        if (!fabricCanvas) return;

        // Find Fabric object by name
        const obj = (fabricCanvas.getObjects() as FabricCanvas[]).find(
            (o: FabricCanvas) => o.__aceName === patch.elementName || o.text === patch.elementName
        );
        if (!obj) return;

        const updates: Record<string, number> = {};
        if (patch.x !== undefined) updates.left = patch.x;
        if (patch.y !== undefined) updates.top = patch.y;
        if (patch.w !== undefined) updates.width = patch.w;
        if (patch.h !== undefined) updates.height = patch.h;
        if (patch.fontSize !== undefined) updates.fontSize = patch.fontSize;

        if (Object.keys(updates).length > 0) {
            obj.set(updates);
            obj.setCoords();
        }
    }, [fabricCanvas]);

    /**
     * Run the full Vision Feedback Loop.
     * Returns the final VisionResult after all iterations.
     */
    const runVisionCheck = useCallback(async (): Promise<VisionResult | null> => {
        if (!fabricCanvas || !apiKey?.trim()) {
            setState((s) => ({ ...s, error: 'Canvas or API key not available.' }));
            return null;
        }

        abortRef.current = false;
        const category = classifyRatio(canvasW, canvasH);

        setState({ isChecking: true, iteration: 0, result: null, error: null });

        let lastResult: VisionResult | null = null;

        for (let i = 0; i < maxIterations; i++) {
            if (abortRef.current) break;

            // 1. Capture screenshot
            setState((s) => ({ ...s, iteration: i + 1 }));
            const screenshot = captureScreenshot();

            if (!screenshot) {
                setState((s) => ({ ...s, isChecking: false, error: 'Failed to capture canvas screenshot.' }));
                return null;
            }

            try {
                // 2. Call Vision API
                const result = await callVisionCheck(
                    screenshot, canvasW, canvasH, category, elements, apiKey
                );

                lastResult = result;
                setState((s) => ({ ...s, result }));

                // 3. Apply patches if any
                if (result.patches.length > 0) {
                    for (const patch of result.patches) {
                        applyPatch(patch);
                    }
                    fabricCanvas.renderAll();
                }

                // 4. Stop early if quality is good enough
                if (result.score >= QUALITY_THRESHOLD || result.patches.length === 0) {
                    break;
                }

            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setState((s) => ({ ...s, isChecking: false, error: msg }));
                return null;
            }
        }

        setState((s) => ({ ...s, isChecking: false }));
        return lastResult;
    }, [fabricCanvas, apiKey, canvasW, canvasH, elements, maxIterations, captureScreenshot, applyPatch]);

    const cancel = useCallback(() => {
        abortRef.current = true;
        setState((s) => ({ ...s, isChecking: false }));
    }, []);

    return { state, runVisionCheck, cancel };
}
