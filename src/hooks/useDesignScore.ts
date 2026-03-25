// ─────────────────────────────────────────────────
// useDesignScore — Real-time design quality scoring hook
// ─────────────────────────────────────────────────
// Subscribes to canvas changes (Fabric.js events) and
// recalculates design score with debounce.
// Returns score, issues, and fix actions.
// ─────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { scoreDesign, getAutoFixPatches, type DesignScore } from '@/engine/designScoreEngine';
import { useDesignStore } from '@/stores/designStore';
import { useEditorStore } from '@/stores/editorStore';
import { useBrandKitStore } from '@/stores/brandKitStore';
import type { EngineNode } from '@/hooks/canvasTypes';

const DEBOUNCE_MS = 500;

const EMPTY_SCORE: DesignScore = {
    total: 100,
    grade: 'A',
    issues: [],
    fixableCount: 0,
    suggestions: [],
};

/**
 * Hook that provides real-time design quality scoring.
 * Debounces recalculation to avoid performance issues during rapid edits.
 *
 * @param nodes  Current canvas nodes from the engine
 * @param canvasWidth  Current canvas width
 * @param canvasHeight Current canvas height
 */
export function useDesignScore(
    nodes: EngineNode[],
    canvasWidth: number,
    canvasHeight: number,
) {
    const [score, setScore] = useState<DesignScore>(EMPTY_SCORE);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const creativeSet = useDesignStore(s => s.creativeSet);
    const activeVariantId = useEditorStore(s => s.activeVariantId);
    const brandKit = useBrandKitStore(s => s.getActiveKit());

    // Find the active variant for constraint-based checks
    const variant = creativeSet?.variants.find(v => v.id === activeVariantId) ?? null;

    // ── Debounced score recalculation ──
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            const result = scoreDesign(variant, nodes, brandKit);
            setScore(result);
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [nodes, variant, brandKit, canvasWidth, canvasHeight]);

    // ── Fix Actions ──

    const fixAll = useCallback((): Array<{ elementId: number; patch: Partial<EngineNode> }> => {
        return getAutoFixPatches(nodes, brandKit);
    }, [nodes, brandKit]);

    return { score, fixAll };
}
