// ─────────────────────────────────────────────────
// sizingOverrideStore — Per-variant override flags
// ─────────────────────────────────────────────────
// Tracks which elements in which variants have broken
// from master sizing. Supports lock/unlock per element.
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/** Override entry: one element in one variant */
export interface SizingOverride {
    elementId: string;
    variantId: string;
    /** Properties overridden from master */
    overriddenProps: Set<string>;
    /** Whether this override is locked (won't be auto-synced) */
    locked: boolean;
    createdAt: string;
}

/** Serializable version for persistence */
interface SizingOverrideSerialized {
    elementId: string;
    variantId: string;
    overriddenProps: string[];
    locked: boolean;
    createdAt: string;
}

interface SizingOverrideState {
    overrides: Record<string, SizingOverrideSerialized[]>; // variantId -> overrides

    /** Mark a property as overridden for an element in a variant */
    setOverride: (variantId: string, elementId: string, props: string[]) => void;

    /** Lock element in variant (won't sync from master) */
    lockElement: (variantId: string, elementId: string) => void;

    /** Unlock element in variant (resumes master sync) */
    unlockElement: (variantId: string, elementId: string) => void;

    /** Reset element to master values */
    resetToMaster: (variantId: string, elementId: string) => void;

    /** Reset all overrides in a variant */
    resetVariant: (variantId: string) => void;

    /** Check if element has overrides */
    hasOverride: (variantId: string, elementId: string) => boolean;

    /** Check if element is locked */
    isLocked: (variantId: string, elementId: string) => boolean;

    /** Get all overrides for a variant */
    getVariantOverrides: (variantId: string) => SizingOverrideSerialized[];

    /** Get override count for a variant */
    getOverrideCount: (variantId: string) => number;
}

export const useSizingOverrideStore = create<SizingOverrideState>()(
    persist(
        immer((set, get) => ({
            overrides: {},

            setOverride: (variantId, elementId, props) => {
                set(state => {
                    if (!state.overrides[variantId]) state.overrides[variantId] = [];
                    const existing = state.overrides[variantId]!.find(o => o.elementId === elementId);
                    if (existing) {
                        const merged = new Set([...existing.overriddenProps, ...props]);
                        existing.overriddenProps = [...merged];
                    } else {
                        state.overrides[variantId]!.push({
                            elementId,
                            variantId,
                            overriddenProps: props,
                            locked: false,
                            createdAt: new Date().toISOString(),
                        });
                    }
                });
            },

            lockElement: (variantId, elementId) => {
                set(state => {
                    const list = state.overrides[variantId];
                    if (!list) return;
                    const entry = list.find(o => o.elementId === elementId);
                    if (entry) entry.locked = true;
                });
            },

            unlockElement: (variantId, elementId) => {
                set(state => {
                    const list = state.overrides[variantId];
                    if (!list) return;
                    const entry = list.find(o => o.elementId === elementId);
                    if (entry) entry.locked = false;
                });
            },

            resetToMaster: (variantId, elementId) => {
                set(state => {
                    const list = state.overrides[variantId];
                    if (!list) return;
                    state.overrides[variantId] = list.filter(o => o.elementId !== elementId);
                });
            },

            resetVariant: (variantId) => {
                set(state => {
                    state.overrides[variantId] = [];
                });
            },

            hasOverride: (variantId, elementId) => {
                const list = get().overrides[variantId];
                return list?.some(o => o.elementId === elementId) ?? false;
            },

            isLocked: (variantId, elementId) => {
                const list = get().overrides[variantId];
                return list?.find(o => o.elementId === elementId)?.locked ?? false;
            },

            getVariantOverrides: (variantId) => {
                return get().overrides[variantId] ?? [];
            },

            getOverrideCount: (variantId) => {
                return (get().overrides[variantId] ?? []).length;
            },
        })),
        { name: 'ace-sizing-overrides' },
    ),
);
