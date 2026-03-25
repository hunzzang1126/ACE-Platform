// ─────────────────────────────────────────────────
// designStore – Single Source of Truth
// ─────────────────────────────────────────────────
// 모든 디자인 데이터의 최상위 저장소.
// 모든 크리에이티브 셋을 저장하고, 활성 셋만 편집 가능.
// Plug connection system: origin → plugged targets.
// IndexedDB에 persist하여 데이터 손실 방지.

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorageAdapter';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuid } from 'uuid';
import type { CreativeSet, BannerVariant, BannerPreset } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import { createDefaultConstraints } from '@/schema/elements.types';
import { smartSizeElements } from '@/engine/smartSizing';


// ── State Shape ──
interface DesignState {
    /** 모든 크리에이티브 셋 (영구 저장) */
    allCreativeSets: Record<string, CreativeSet>;

    /** 현재 활성 크리에이티브 셋 ID */
    activeCreativeSetId: string | null;

    /** 현재 활성 크리에이티브 셋 (computed getter) */
    creativeSet: CreativeSet | null;

    // ── Actions ──
    /** 새 크리에이티브 셋 생성, ID 반환 */
    createCreativeSet: (name: string, masterPreset: BannerPreset) => string;

    /** 기존 크리에이티브 셋 열기 (활성으로 전환) */
    openCreativeSet: (id: string) => boolean;

    /** 크리에이티브 셋 삭제 */
    deleteCreativeSet: (id: string) => void;

    /** 모든 크리에이티브 셋 삭제 */
    deleteAllCreativeSets: () => void;

    /** 크리에이티브 셋 이름 변경 */
    renameCreativeSet: (id: string, name: string) => void;

    /** 마스터 배너의 요소를 업데이트하고 슬레이브에 전파 */
    updateMasterElement: (elementId: string, patch: Partial<DesignElement>) => void;

    /** 마스터에 새 요소 추가 (모든 슬레이브에도 복제) */
    addElementToMaster: (element: DesignElement) => void;

    /** 마스터에서 요소 삭제 (모든 슬레이브에서도 삭제) */
    removeElementFromMaster: (elementId: string) => void;

    /** 새 배너 규격(변형) 추가 */
    addVariant: (preset: BannerPreset) => void;

    /** 변형 제거 */
    removeVariant: (variantId: string) => void;

    /** 개별 배너(슬레이브)의 요소를 독립적으로 수정 */
    updateVariantElement: (variantId: string, elementId: string, patch: Partial<DesignElement>) => void;

    /** 개별 배너의 동기화 오버라이드 토글 */
    toggleElementOverride: (variantId: string, elementId: string) => void;

    /** 전체 디자인 JSON 교체 (AI Agent 용) */
    replaceCreativeSet: (set: CreativeSet) => void;

    /** 특정 변형의 요소 전체 교체 (Canvas Save 용) */
    /** Origin 저장 시 Smart Sizing으로 plugged targets에 전파 */
    /** fabricJSON: Raw Fabric.js canvas JSON — SINGLE SOURCE OF TRUTH when present */
    replaceVariantElements: (variantId: string, elements: DesignElement[], fabricJSON?: string) => void;

    /** 모든 저장된 크리에이티브 셋 목록 가져오기 */
    getAllCreativeSets: () => CreativeSet[];

    // ── Plug Connection Actions ──
    /** Connect target to origin — target inherits origin's layout DNA */
    connectPlug: (originId: string, targetId: string) => void;
    /** Disconnect target — becomes independent */
    disconnectPlug: (targetId: string) => void;
    /** Re-run smartSizing on ALL plugged variants (retroactive rule update) */
    resyncAllPluggedVariants: () => void;
    /** Get the origin variant for a given target (or undefined if independent/origin) */
    getOriginForVariant: (variantId: string) => string | undefined;
    /** Get all targets plugged into a given origin */
    getPluggedTargets: (originId: string) => string[];

    // ── Master Label (cosmetic only — no functional difference) ──
    /** Set the "Master" cosmetic label on a variant */
    setMasterLabel: (variantId: string) => void;
    /** Remove the "Master" cosmetic label */
    clearMasterLabel: () => void;
}

// ★ BUG 3/6 FIX: Merge visual properties from origin → target WITHOUT touching layout.
// Only syncs: fill, color, opacity, content, fontWeight, fontFamily, fontSize, src, gradients.
// Preserves: constraints (position/size), overridden elements, zIndex.
// Also handles: element deletion (origin removed → target removes) and
// element addition (origin added → target gets smart-sized copy).
function mergePropertyChanges(
    targetElements: DesignElement[],
    originElements: DesignElement[],
    originW: number,
    originH: number,
    targetW: number,
    targetH: number,
): DesignElement[] {
    // Build lookup by name (primary) and id (fallback)
    const originByName = new Map<string, DesignElement>();
    const originById = new Map<string, DesignElement>();
    for (const el of originElements) {
        if (el.name) originByName.set(el.name, el);
        originById.set(el.id, el);
    }

    const targetByName = new Map<string, DesignElement>();
    const targetById = new Map<string, DesignElement>();
    for (const el of targetElements) {
        if (el.name) targetByName.set(el.name, el);
        targetById.set(el.id, el);
    }

    // Track which origin elements are matched (to detect new additions)
    const matchedOriginNames = new Set<string>();
    const matchedOriginIds = new Set<string>();

    // 1. Process existing target elements: update or remove
    const result: DesignElement[] = [];
    for (const targetEl of targetElements) {
        // Match by name first (more reliable across sizes), then by id
        const originEl = (targetEl.name ? originByName.get(targetEl.name) : undefined)
            || originById.get(targetEl.id);

        if (!originEl) {
            // ★ Element was DELETED from origin → remove from target
            continue;
        }

        // Track matched origin elements
        if (originEl.name) matchedOriginNames.add(originEl.name);
        matchedOriginIds.add(originEl.id);

        // Deep clone target to avoid mutating
        const merged = JSON.parse(JSON.stringify(targetEl)) as DesignElement;

        // Sync non-layout properties
        if ('fill' in originEl) (merged as any).fill = (originEl as any).fill;
        if ('color' in originEl) (merged as any).color = (originEl as any).color;
        if ('opacity' in originEl) merged.opacity = originEl.opacity;
        if ('content' in originEl) (merged as any).content = (originEl as any).content;
        if ('fontWeight' in originEl) (merged as any).fontWeight = (originEl as any).fontWeight;
        if ('fontFamily' in originEl) (merged as any).fontFamily = (originEl as any).fontFamily;
        if ('src' in originEl) (merged as any).src = (originEl as any).src;
        if ('gradientStart' in originEl) (merged as any).gradientStart = (originEl as any).gradientStart;
        if ('gradientEnd' in originEl) (merged as any).gradientEnd = (originEl as any).gradientEnd;
        if ('gradientAngle' in originEl) (merged as any).gradientAngle = (originEl as any).gradientAngle;
        if ('textAlign' in originEl) (merged as any).textAlign = (originEl as any).textAlign;
        if ('lineHeight' in originEl) (merged as any).lineHeight = (originEl as any).lineHeight;
        if ('letterSpacing' in originEl) (merged as any).letterSpacing = (originEl as any).letterSpacing;
        // ★ FIX: Sync shadow/effect so glow/neon/drop propagates to children
        if ('shadow' in originEl) (merged as any).shadow = (originEl as any).shadow;

        // ★ Do NOT touch: constraints, zIndex, name, id, type
        result.push(merged);
    }

    // 2. Add NEW elements from origin that don't exist in target (smart-sized)
    for (const originEl of originElements) {
        const alreadyMatched = (originEl.name && matchedOriginNames.has(originEl.name))
            || matchedOriginIds.has(originEl.id);
        if (alreadyMatched) continue;

        // ★ New element — smart-size it for the target dimensions
        const adaptedArr = smartSizeElements(
            [originEl],
            originW, originH,
            targetW, targetH,
        );
        if (adaptedArr[0]) result.push(adaptedArr[0]);
    }

    return result;
}

// Helper: get the active creative set from state
function getActiveCS(state: DesignState): CreativeSet | undefined {
    if (!state.activeCreativeSetId) return undefined;
    return state.allCreativeSets[state.activeCreativeSetId];
}

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

                    const masterVariant: BannerVariant = {
                        id: masterVariantId,
                        preset: masterPreset,
                        elements: [],
                        backgroundColor: '#FFFFFF',
                        overriddenElementIds: [],
                        syncLocked: false,
                    };

                    const newCS: CreativeSet = {
                        id: csId,
                        name,
                        masterVariantId,
                        variants: [masterVariant],
                        plugConnections: {},
                        brand: {
                            primaryColor: '#000000',
                            secondaryColor: '#FFFFFF',
                            fontFamily: 'Inter',
                        },
                        createdAt: now,
                        updatedAt: now,
                    };

                    set((state) => {
                        state.allCreativeSets[csId] = newCS;
                        state.activeCreativeSetId = csId;
                        state.creativeSet = newCS;
                    });

                    return csId;
                },

                openCreativeSet: (id) => {
                    const cs = get().allCreativeSets[id];
                    if (!cs) return false;

                    set((state) => {
                        state.activeCreativeSetId = id;
                        state.creativeSet = state.allCreativeSets[id] ?? null;
                    });
                    return true;
                },

                deleteCreativeSet: (id) => {
                    set((state) => {
                        delete state.allCreativeSets[id];
                        if (state.activeCreativeSetId === id) {
                            state.activeCreativeSetId = null;
                            state.creativeSet = null;
                        }
                    });
                },

                deleteAllCreativeSets: () => {
                    set((state) => {
                        state.allCreativeSets = {};
                        state.activeCreativeSetId = null;
                        state.creativeSet = null;
                    });
                },

                renameCreativeSet: (id, name) => {
                    set((state) => {
                        const cs = state.allCreativeSets[id];
                        if (cs) {
                            cs.name = name;
                            cs.updatedAt = new Date().toISOString();
                            if (state.activeCreativeSetId === id) {
                                state.creativeSet = cs;
                            }
                        }
                    });
                    // ★ Cross-store sync: also update projectStore so name persists on reload.
                    // Called AFTER set() to avoid Zustand deadlock (REGRESSION GUARD).
                    try {
                        const { useProjectStore } = require('@/stores/projectStore');
                        const ps = useProjectStore.getState();
                        const match = ps.creativeSets.find((s: { id: string }) => s.id === id);
                        if (match && match.name !== name) {
                            useProjectStore.getState().renameCreativeSet(id, name);
                        }
                    } catch { /* projectStore not yet loaded */ }
                },

                addElementToMaster: (element) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        const master = cs.variants.find(
                            (v) => v.id === cs.masterVariantId,
                        );
                        if (!master) return;

                        // 마스터에 추가
                        master.elements.push(element);

                        const masterW = master.preset.width;
                        const masterH = master.preset.height;

                        // 슬레이브에도 복제 (Smart Sizing 적용)
                        for (const variant of cs.variants) {
                            if (variant.id === cs.masterVariantId) continue;

                            const adapted = smartSizeElements(
                                [element],
                                masterW, masterH,
                                variant.preset.width, variant.preset.height,
                            );
                            variant.elements.push(...adapted);
                        }

                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                updateMasterElement: (elementId, patch) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        const master = cs.variants.find(
                            (v) => v.id === cs.masterVariantId,
                        );
                        if (!master) return;

                        // 마스터 요소 업데이트
                        const masterEl = master.elements.find((el) => el.id === elementId);
                        if (!masterEl) return;
                        Object.assign(masterEl, patch);

                        // 슬레이브에 전파 (오버라이드 되지 않은 요소만)
                        for (const variant of cs.variants) {
                            if (variant.id === cs.masterVariantId) continue;
                            if (variant.syncLocked) continue;
                            if (variant.overriddenElementIds.includes(elementId)) continue;

                            const slaveEl = variant.elements.find((el) => el.id === elementId);
                            if (slaveEl) {
                                Object.assign(slaveEl, patch);
                            }
                        }

                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                removeElementFromMaster: (elementId) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;

                        for (const variant of cs.variants) {
                            variant.elements = variant.elements.filter((el) => el.id !== elementId);
                            variant.overriddenElementIds = variant.overriddenElementIds.filter(
                                (id) => id !== elementId,
                            );
                        }

                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                addVariant: (preset) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;

                        // Create blank variant — user connects plugs manually
                        const newVariantId = uuid();
                        const newVariant: BannerVariant = {
                            id: newVariantId,
                            preset,
                            elements: [],
                            backgroundColor: '#ffffff',
                            overriddenElementIds: [],
                            syncLocked: false,
                        };

                        cs.variants.push(newVariant);
                        if (!cs.plugConnections) cs.plugConnections = {};
                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                removeVariant: (variantId) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        // Cannot delete the last remaining variant
                        if (cs.variants.length <= 1) return;
                        cs.variants = cs.variants.filter(
                            (v) => v.id !== variantId,
                        );
                        // ★ Clean up plug connections for removed variant
                        if (cs.plugConnections) {
                            delete cs.plugConnections[variantId];
                            // Also remove any variants that were plugged INTO the removed variant
                            for (const [target, origin] of Object.entries(cs.plugConnections)) {
                                if (origin === variantId) {
                                    delete cs.plugConnections[target];
                                }
                            }
                        }
                        // Clear master label if deleted variant had it
                        if (cs.masterLabel === variantId) {
                            cs.masterLabel = undefined;
                        }
                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                updateVariantElement: (variantId, elementId, patch) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        const variant = cs.variants.find((v) => v.id === variantId);
                        if (!variant) return;

                        const el = variant.elements.find((e) => e.id === elementId);
                        if (!el) return;
                        Object.assign(el, patch);
                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                toggleElementOverride: (variantId, elementId) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        const variant = cs.variants.find((v) => v.id === variantId);
                        if (!variant) return;

                        const idx = variant.overriddenElementIds.indexOf(elementId);
                        if (idx >= 0) {
                            variant.overriddenElementIds.splice(idx, 1);
                        } else {
                            variant.overriddenElementIds.push(elementId);
                        }
                        state.creativeSet = cs;
                    });
                },

                replaceCreativeSet: (newSet) => {
                    set((state) => {
                        if (newSet) {
                            state.allCreativeSets[newSet.id] = newSet;
                            state.activeCreativeSetId = newSet.id;
                        } else {
                            state.activeCreativeSetId = null;
                        }
                        state.creativeSet = newSet;
                    });
                },

                replaceVariantElements: (variantId, elements, fabricJSON) => {
                    // ★ BUG 4 FIX: Enforce z-index=0 for background elements before saving
                    for (const el of elements) {
                        if (el.name?.match(/background|ai_bg/i)) {
                            el.zIndex = 0;
                        }
                    }

                    // ★ BUG 5 FIX: Collect refresh events OUTSIDE set() to avoid Immer proxy revocation
                    const pendingRefreshes: Array<{ variantId: string; fixCount: number }> = [];

                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        const variant = cs.variants.find((v) => v.id === variantId);
                        if (!variant) return;

                        // 해당 변형의 요소 교체
                        variant.elements = elements;
                        if (fabricJSON) {
                            variant.fabricJSON = fabricJSON;
                        }

                        // ★ Plug-aware propagation: propagate to variants plugged INTO this one
                        const plugs = cs.plugConnections ?? {};
                        const pluggedTargetIds = Object.entries(plugs)
                            .filter(([, originId]) => originId === variantId)
                            .map(([targetId]) => targetId);

                        console.log(`[designStore] replaceVariantElements: variantId=${variantId}, plugConnections=`, JSON.stringify(plugs), `pluggedTargetIds=`, pluggedTargetIds);

                        if (pluggedTargetIds.length > 0) {
                            const originW = variant.preset.width;
                            const originH = variant.preset.height;

                            for (const target of cs.variants) {
                                if (target.id === variantId) continue;
                                if (target.syncLocked) continue;
                                if (!pluggedTargetIds.includes(target.id)) continue;

                                const targetW = target.preset.width;
                                const targetH = target.preset.height;

                                // ★ ALWAYS re-run smart sizing for layout, then merge visual properties.
                                // Smart sizing gives proper aspect-ratio-aware positions.
                                // Property merge ensures colors/text/opacity stay in sync with origin.
                                const adapted = smartSizeElements(
                                    elements,
                                    originW, originH,
                                    targetW, targetH,
                                );

                                // If target already has elements, merge visual properties from origin
                                // onto the newly-laid-out elements (so colors/text stay synced)
                                let finalElements: DesignElement[];
                                if (target.elements.length > 0) {
                                    finalElements = mergePropertyChanges(adapted, elements, originW, originH, targetW, targetH);
                                } else {
                                    finalElements = adapted;
                                }

                                // ★ NO QA AUTO-FIX: trust template-proven scaling directly.
                                // QA overlap detector was shrinking backgrounds.
                                target.elements = finalElements;
                            }
                        }

                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });

                    // ★ BUG 5 FIX: Dispatch refresh events AFTER set() completes (proxy is dead)
                    for (const refresh of pendingRefreshes) {
                        queueMicrotask(() => {
                            window.dispatchEvent(new CustomEvent('ace:canvas-refresh', {
                                detail: refresh,
                            }));
                        });
                    }
                },

                getAllCreativeSets: () => {
                    return Object.values(get().allCreativeSets);
                },

                // ── Plug Connection Actions ──

                connectPlug: (originId, targetId) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        // Validate both variants exist
                        const origin = cs.variants.find(v => v.id === originId);
                        const target = cs.variants.find(v => v.id === targetId);
                        if (!origin || !target || originId === targetId) return;
                        // Prevent circular: target can't be an origin that originId plugs into
                        if (cs.plugConnections[originId] === targetId) return;
                        if (!cs.plugConnections) cs.plugConnections = {};
                        cs.plugConnections[targetId] = originId;

                        console.log(`[designStore] connectPlug: origin=${originId} (${origin.preset.width}x${origin.preset.height}) → target=${targetId} (${target.preset.width}x${target.preset.height}), origin.elements=${origin.elements.length}`);

                        // ★ FIX: ALWAYS re-run smart sizing on plug connection.
                        // Plugging is a deliberate action — the user WANTS the layout to adapt.
                        // ★ NO QA AUTO-FIX: template drops don't use QA — plugs shouldn't either.
                        // The QA overlap detector was shrinking backgrounds because they overlap
                        // with other elements at (0,0). Trust the template-proven scaling directly.
                        if (origin.elements.length > 0) {
                            console.log(`[designStore] connectPlug: calling smartSizeElements...`);
                            const adapted = smartSizeElements(
                                origin.elements,
                                origin.preset.width, origin.preset.height,
                                target.preset.width, target.preset.height,
                            );
                            target.elements = adapted;
                        }

                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                disconnectPlug: (targetId) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs || !cs.plugConnections) return;
                        delete cs.plugConnections[targetId];
                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                // ★ Re-sync ALL plugged variants with current smartSizing rules.
                // Call this when smartLayout rules change or to fix stale layouts.
                resyncAllPluggedVariants: () => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs?.plugConnections) return;
                        const connections = cs.plugConnections;
                        let synced = 0;
                        for (const [targetId, originId] of Object.entries(connections)) {
                            const origin = cs.variants.find(v => v.id === originId);
                            const target = cs.variants.find(v => v.id === targetId);
                            if (!origin || !target || origin.elements.length === 0) continue;
                            const adapted = smartSizeElements(
                                origin.elements,
                                origin.preset.width, origin.preset.height,
                                target.preset.width, target.preset.height,
                            );
                            target.elements = adapted;
                            synced++;
                        }
                        if (synced > 0) {
                            cs.updatedAt = new Date().toISOString();
                            state.creativeSet = cs;
                            console.log(`[designStore] resyncAllPluggedVariants: re-synced ${synced} variants`);
                        }
                    });
                },

                getOriginForVariant: (variantId) => {
                    const cs = get().creativeSet;
                    if (!cs?.plugConnections) return undefined;
                    return cs.plugConnections[variantId];
                },

                getPluggedTargets: (originId) => {
                    const cs = get().creativeSet;
                    if (!cs?.plugConnections) return [];
                    return Object.entries(cs.plugConnections)
                        .filter(([, oId]) => oId === originId)
                        .map(([targetId]) => targetId);
                },

                // ── Master Label (cosmetic only) ──

                setMasterLabel: (variantId) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        cs.masterLabel = variantId;
                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                clearMasterLabel: () => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        cs.masterLabel = undefined;
                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

            })),
            {
                name: 'glid-design-store',
                // ★ IndexedDB storage — no 5MB limit, async I/O
                storage: createJSONStorage(() => idbStorage),
                partialize: (state) => ({
                    allCreativeSets: state.allCreativeSets,
                    activeCreativeSetId: state.activeCreativeSetId,
                }),
                // On rehydration, restore creativeSet + migrate old data to plug model
                onRehydrateStorage: () => (state) => {
                    if (!state) { _resolveDesignHydration(); return; }
                    // ★ Auto-migrate: add plugConnections to old creative sets
                    for (const cs of Object.values(state.allCreativeSets)) {
                        if (!cs.plugConnections) {
                            cs.plugConnections = {};
                            // Migrate: all non-master variants plug into master
                            for (const v of cs.variants) {
                                if (v.id !== cs.masterVariantId) {
                                    cs.plugConnections[v.id] = cs.masterVariantId;
                                }
                            }
                        }
                    }
                    if (state.activeCreativeSetId) {
                        state.creativeSet = state.allCreativeSets[state.activeCreativeSetId] ?? null;
                    }
                    _resolveDesignHydration();
                },
            },
        ),
    ),
);

// ★ Hydration promise — resolves when IDB data is loaded into store
let _resolveDesignHydration: () => void;
export const designStoreReady = new Promise<void>((resolve) => {
    _resolveDesignHydration = resolve;
});

// ── Cross-tab sync ──────────────────────────────────
// ★ REGRESSION GUARD: Always use plain-object setState() here (never immer callback).
// setState() called outside React render context doesn't go through immer middleware.
//
// ★ FIX (v0.0.0.211): Old code read from localStorage.getItem('glid-design-store')
// but persist middleware writes to IndexedDB, so localStorage was ALWAYS EMPTY.
// StorageEvent never fired either (IDB writes don't trigger storage events).
// New approach: subscribe() to Zustand state changes → serialize → BroadcastChannel.

let _designChannel: BroadcastChannel | null = null;
let _isBroadcasting = false; // guard against echo loops

function _applyDesignSync(raw: string) {
    try {
        const data = JSON.parse(raw) as Partial<Pick<DesignState, 'allCreativeSets' | 'activeCreativeSetId'>>;
        if (!data) return;
        const patch: Partial<DesignState> = {};
        if (data.allCreativeSets !== undefined) patch.allCreativeSets = data.allCreativeSets;
        if (data.activeCreativeSetId !== undefined) {
            patch.activeCreativeSetId = data.activeCreativeSetId;
            patch.creativeSet = data.activeCreativeSetId
                ? (data.allCreativeSets ?? useDesignStore.getState().allCreativeSets)[data.activeCreativeSetId] ?? null
                : null;
        }
        if (Object.keys(patch).length > 0) {
            _isBroadcasting = true; // prevent echo
            useDesignStore.setState(patch);
            _isBroadcasting = false;
        }
    } catch { /* malformed JSON */ }
}

if (typeof window !== 'undefined') {
    // ★ Set up BroadcastChannel for cross-tab sync
    try {
        _designChannel = new BroadcastChannel('glid-design-sync');
        _designChannel.onmessage = (e) => {
            if (typeof e.data === 'string') {
                _applyDesignSync(e.data);
            }
        };
    } catch { /* BroadcastChannel not supported */ }

    // ★ Subscribe to state changes → broadcast to other tabs
    // This replaces the old _broadcastDesignSync() that was never called
    // and the StorageEvent that never fired (IDB doesn't trigger it).
    useDesignStore.subscribe((state) => {
        if (_isBroadcasting || !_designChannel) return;
        try {
            const payload = JSON.stringify({
                allCreativeSets: state.allCreativeSets,
                activeCreativeSetId: state.activeCreativeSetId,
            });
            _designChannel.postMessage(payload);
        } catch { /* ok — serialization or channel error */ }
    });
}

// Export for backward compatibility (no longer needed to call manually)
export function _broadcastDesignSync() {
    // No-op — subscribe-based broadcast handles this automatically
}

