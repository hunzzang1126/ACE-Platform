// ─────────────────────────────────────────────────
// designStore – Single Source of Truth
// ─────────────────────────────────────────────────
// Types/helpers → designStoreTypes.ts
// Cross-tab sync → designStoreSync.ts
// ─────────────────────────────────────────────────

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorageAdapter';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuid } from 'uuid';
import type { CreativeSet, BannerVariant, BannerPreset } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { smartSizeElements } from '@/engine/smartSizing';
import type { DesignState } from './designStoreTypes';
import { getActiveCS, mergePropertyChanges } from './designStoreTypes';
import { setupDesignStoreSync, _broadcastDesignSync } from './designStoreSync';

// Re-export for backward compatibility
export type { DesignState };
export { _broadcastDesignSync };

export const useDesignStore = create<DesignState>()(
    subscribeWithSelector(
        persist(
            immer((set, get) => ({
                allCreativeSets: {},
                activeCreativeSetId: null,
                creativeSet: null,

                createCreativeSet: (name, masterPreset) => {
                    const masterVariantId = uuid();
                    const csId = uuid();
                    const now = new Date().toISOString();
                    const masterVariant: BannerVariant = { id: masterVariantId, preset: masterPreset, elements: [], backgroundColor: '#FFFFFF', overriddenElementIds: [], syncLocked: false };
                    const newCS: CreativeSet = { id: csId, name, masterVariantId, variants: [masterVariant], plugConnections: {}, brand: { primaryColor: '#000000', secondaryColor: '#FFFFFF', fontFamily: 'Inter' }, createdAt: now, updatedAt: now };
                    set((state) => { state.allCreativeSets[csId] = newCS; state.activeCreativeSetId = csId; state.creativeSet = newCS; });
                    return csId;
                },

                openCreativeSet: (id) => {
                    const cs = get().allCreativeSets[id];
                    if (!cs) return false;
                    set((state) => { state.activeCreativeSetId = id; state.creativeSet = state.allCreativeSets[id] ?? null; });
                    return true;
                },

                deleteCreativeSet: (id) => {
                    set((state) => { delete state.allCreativeSets[id]; if (state.activeCreativeSetId === id) { state.activeCreativeSetId = null; state.creativeSet = null; } });
                },

                deleteAllCreativeSets: () => {
                    set((state) => { state.allCreativeSets = {}; state.activeCreativeSetId = null; state.creativeSet = null; });
                },

                renameCreativeSet: (id, name) => {
                    set((state) => {
                        const cs = state.allCreativeSets[id];
                        if (cs) { cs.name = name; cs.updatedAt = new Date().toISOString(); if (state.activeCreativeSetId === id) state.creativeSet = cs; }
                    });
                    // ★ REGRESSION GUARD: Cross-store sync AFTER set()
                    // ★ FIX (v0.0.0.290): Use relative path — Vite's @/ alias doesn't work with CJS require()
                    try { const { useProjectStore } = require('./projectStore'); const ps = useProjectStore.getState(); const match = ps.creativeSets.find((s: { id: string }) => s.id === id); if (match && match.name !== name) useProjectStore.getState().renameCreativeSet(id, name); } catch { /* */ }
                },

                addElementToMaster: (element) => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs) return;
                        const master = cs.variants.find((v) => v.id === cs.masterVariantId); if (!master) return;
                        master.elements.push(element);
                        for (const variant of cs.variants) {
                            if (variant.id === cs.masterVariantId) continue;
                            const adapted = smartSizeElements([element], master.preset.width, master.preset.height, variant.preset.width, variant.preset.height);
                            variant.elements.push(...adapted);
                        }
                        cs.updatedAt = new Date().toISOString(); state.creativeSet = cs;
                    });
                },

                updateMasterElement: (elementId, patch) => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs) return;
                        const master = cs.variants.find((v) => v.id === cs.masterVariantId); if (!master) return;
                        const masterEl = master.elements.find((el) => el.id === elementId); if (!masterEl) return;
                        Object.assign(masterEl, patch);
                        for (const variant of cs.variants) {
                            if (variant.id === cs.masterVariantId || variant.syncLocked || variant.overriddenElementIds.includes(elementId)) continue;
                            const slaveEl = variant.elements.find((el) => el.id === elementId);
                            if (slaveEl) Object.assign(slaveEl, patch);
                        }
                        cs.updatedAt = new Date().toISOString(); state.creativeSet = cs;
                    });
                },

                removeElementFromMaster: (elementId) => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs) return;
                        for (const variant of cs.variants) { variant.elements = variant.elements.filter((el) => el.id !== elementId); variant.overriddenElementIds = variant.overriddenElementIds.filter((id) => id !== elementId); }
                        cs.updatedAt = new Date().toISOString(); state.creativeSet = cs;
                    });
                },

                addVariant: (preset) => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs) return;
                        const newVariant: BannerVariant = { id: uuid(), preset, elements: [], backgroundColor: '#ffffff', overriddenElementIds: [], syncLocked: false };
                        cs.variants.push(newVariant);
                        if (!cs.plugConnections) cs.plugConnections = {};
                        cs.updatedAt = new Date().toISOString(); state.creativeSet = cs;
                    });
                },

                removeVariant: (variantId) => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs) return;
                        if (cs.variants.length <= 1) return;
                        cs.variants = cs.variants.filter((v) => v.id !== variantId);
                        if (cs.plugConnections) { delete cs.plugConnections[variantId]; for (const [t, o] of Object.entries(cs.plugConnections)) { if (o === variantId) delete cs.plugConnections[t]; } }
                        if (cs.masterLabel === variantId) cs.masterLabel = undefined;
                        cs.updatedAt = new Date().toISOString(); state.creativeSet = cs;
                    });
                },

                updateVariantElement: (variantId, elementId, patch) => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs) return;
                        const variant = cs.variants.find((v) => v.id === variantId); if (!variant) return;
                        const el = variant.elements.find((e) => e.id === elementId); if (!el) return;
                        Object.assign(el, patch);
                        cs.updatedAt = new Date().toISOString(); state.creativeSet = cs;
                    });
                },

                toggleElementOverride: (variantId, elementId) => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs) return;
                        const variant = cs.variants.find((v) => v.id === variantId); if (!variant) return;
                        const idx = variant.overriddenElementIds.indexOf(elementId);
                        if (idx >= 0) variant.overriddenElementIds.splice(idx, 1); else variant.overriddenElementIds.push(elementId);
                        state.creativeSet = cs;
                    });
                },

                replaceCreativeSet: (newSet) => {
                    set((state) => {
                        if (newSet) { state.allCreativeSets[newSet.id] = newSet; state.activeCreativeSetId = newSet.id; } else { state.activeCreativeSetId = null; }
                        state.creativeSet = newSet;
                    });
                },

                replaceVariantElements: (variantId, elements, fabricJSON) => {
                    // ★ BUG 4 FIX: Enforce z-index=0 for background elements
                    for (const el of elements) { if (el.name?.match(/background|ai_bg/i)) el.zIndex = 0; }
                    const pendingRefreshes: Array<{ variantId: string; fixCount: number }> = [];

                    set((state) => {
                        const cs = getActiveCS(state); if (!cs) return;
                        const variant = cs.variants.find((v) => v.id === variantId); if (!variant) return;

                        // ★ DATA LOSS GUARD (store-level): Never overwrite N>0 elements with empty array.
                        // Double-safety: even if hook-level guard is bypassed, the store blocks it.
                        if (elements.length === 0 && variant.elements.length > 0) {
                            console.error(`[designStore] ★ BLOCKED empty replaceVariantElements: variant has ${variant.elements.length} elements. Refusing to overwrite with 0.`);
                            return;
                        }

                        variant.elements = elements;
                        if (fabricJSON) variant.fabricJSON = fabricJSON;

                        // ★ Plug-aware propagation
                        const plugs = cs.plugConnections ?? {};
                        const pluggedTargetIds = Object.entries(plugs).filter(([, oid]) => oid === variantId).map(([tid]) => tid);

                        if (pluggedTargetIds.length > 0) {
                            for (const target of cs.variants) {
                                if (target.id === variantId || target.syncLocked || !pluggedTargetIds.includes(target.id)) continue;
                                const adapted = smartSizeElements(elements, variant.preset.width, variant.preset.height, target.preset.width, target.preset.height);
                                target.elements = target.elements.length > 0 ? mergePropertyChanges(adapted, elements, variant.preset.width, variant.preset.height, target.preset.width, target.preset.height) : adapted;
                            }
                        }
                        cs.updatedAt = new Date().toISOString(); state.creativeSet = cs;
                    });

                    // ★ BUG 5 FIX: Dispatch refresh events AFTER set()
                    for (const refresh of pendingRefreshes) { queueMicrotask(() => { window.dispatchEvent(new CustomEvent('ace:canvas-refresh', { detail: refresh })); }); }
                },

                getAllCreativeSets: () => Object.values(get().allCreativeSets),

                // ── Plug Connection Actions ──

                connectPlug: (originId, targetId) => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs) return;
                        const origin = cs.variants.find(v => v.id === originId);
                        const target = cs.variants.find(v => v.id === targetId);
                        if (!origin || !target || originId === targetId) return;
                        if (cs.plugConnections[originId] === targetId) return;
                        if (!cs.plugConnections) cs.plugConnections = {};
                        cs.plugConnections[targetId] = originId;
                        if (origin.elements.length > 0) {
                            target.elements = smartSizeElements(origin.elements, origin.preset.width, origin.preset.height, target.preset.width, target.preset.height);
                        }
                        cs.updatedAt = new Date().toISOString(); state.creativeSet = cs;
                    });
                },

                disconnectPlug: (targetId) => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs?.plugConnections) return;
                        delete cs.plugConnections[targetId];
                        cs.updatedAt = new Date().toISOString(); state.creativeSet = cs;
                    });
                },

                resyncAllPluggedVariants: () => {
                    set((state) => {
                        const cs = getActiveCS(state); if (!cs?.plugConnections) return;
                        let synced = 0;
                        for (const [targetId, originId] of Object.entries(cs.plugConnections)) {
                            const origin = cs.variants.find(v => v.id === originId);
                            const target = cs.variants.find(v => v.id === targetId);
                            if (!origin || !target || origin.elements.length === 0) continue;
                            target.elements = smartSizeElements(origin.elements, origin.preset.width, origin.preset.height, target.preset.width, target.preset.height);
                            synced++;
                        }
                        if (synced > 0) { cs.updatedAt = new Date().toISOString(); state.creativeSet = cs; }
                    });
                },

                getOriginForVariant: (variantId) => { const cs = get().creativeSet; return cs?.plugConnections?.[variantId]; },
                getPluggedTargets: (originId) => { const cs = get().creativeSet; if (!cs?.plugConnections) return []; return Object.entries(cs.plugConnections).filter(([, o]) => o === originId).map(([t]) => t); },

                // ── Master Label (cosmetic) ──
                setMasterLabel: (variantId) => { set((state) => { const cs = getActiveCS(state); if (!cs) return; cs.masterLabel = variantId; cs.updatedAt = new Date().toISOString(); state.creativeSet = cs; }); },
                clearMasterLabel: () => { set((state) => { const cs = getActiveCS(state); if (!cs) return; cs.masterLabel = undefined; cs.updatedAt = new Date().toISOString(); state.creativeSet = cs; }); },
            })),
            {
                name: 'glid-design-store',
                storage: createJSONStorage(() => idbStorage),
                partialize: (state) => ({ allCreativeSets: state.allCreativeSets, activeCreativeSetId: state.activeCreativeSetId }),
                onRehydrateStorage: () => (state) => {
                    if (!state) { _resolveDesignHydration(); return; }
                    for (const cs of Object.values(state.allCreativeSets)) {
                        if (!cs.plugConnections) {
                            cs.plugConnections = {};
                            for (const v of cs.variants) { if (v.id !== cs.masterVariantId) cs.plugConnections[v.id] = cs.masterVariantId; }
                        }
                    }
                    if (state.activeCreativeSetId) state.creativeSet = state.allCreativeSets[state.activeCreativeSetId] ?? null;
                    _resolveDesignHydration();
                },
            },
        ),
    ),
);

// ★ Hydration promise
let _resolveDesignHydration: () => void;
export const designStoreReady = new Promise<void>((resolve) => { _resolveDesignHydration = resolve; });

// ★ Cross-tab sync setup
setupDesignStoreSync(useDesignStore);
