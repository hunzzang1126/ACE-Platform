// ─────────────────────────────────────────────────
// designStore – Single Source of Truth
// ─────────────────────────────────────────────────
// 모든 디자인 데이터의 최상위 저장소.
// 모든 크리에이티브 셋을 저장하고, 활성 셋만 편집 가능.
// Master 요소 변경 → Slave 배너 자동 전파.
// localStorage에 persist하여 데이터 손실 방지.

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
import { runSmartSizingQA } from '@/engine/smartSizingQA';
import { generateFixes } from '@/engine/smartSizingFixer';


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
    /** 마스터에 저장 시 Smart Sizing으로 모든 슬레이브에 전파 */
    /** fabricJSON: Raw Fabric.js canvas JSON — SINGLE SOURCE OF TRUTH when present */
    replaceVariantElements: (variantId: string, elements: DesignElement[], fabricJSON?: string) => void;

    /** 모든 저장된 크리에이티브 셋 목록 가져오기 */
    getAllCreativeSets: () => CreativeSet[];
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
                        const master = cs.variants.find(
                            (v) => v.id === cs.masterVariantId,
                        );
                        if (!master) return;

                        // 마스터의 요소를 복제하여 신규 변형 생성
                        const newVariant: BannerVariant = {
                            id: uuid(),
                            preset,
                            elements: JSON.parse(JSON.stringify(master.elements)),
                            backgroundColor: master.backgroundColor,
                            overriddenElementIds: [],
                            syncLocked: false,
                        };

                        cs.variants.push(newVariant);
                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                removeVariant: (variantId) => {
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        // 마스터는 삭제 불가
                        if (variantId === cs.masterVariantId) return;
                        cs.variants = cs.variants.filter(
                            (v) => v.id !== variantId,
                        );
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
                    set((state) => {
                        const cs = getActiveCS(state);
                        if (!cs) return;
                        const variant = cs.variants.find((v) => v.id === variantId);
                        if (!variant) return;

                        // 해당 변형의 요소 교체
                        variant.elements = elements;
                        // ★ SINGLE SOURCE OF TRUTH: Store raw Fabric JSON when provided.
                        // On restore, loadFromJSON() will be used instead of element-by-element reconstruction.
                        if (fabricJSON) {
                            variant.fabricJSON = fabricJSON;
                        }

                        // 마스터인 경우 → Smart Sizing으로 모든 슬레이브에 전파
                        if (variantId === cs.masterVariantId) {
                            const masterW = variant.preset.width;
                            const masterH = variant.preset.height;

                            for (const slave of cs.variants) {
                                if (slave.id === cs.masterVariantId) continue;
                                if (slave.syncLocked) continue;

                                const slaveW = slave.preset.width;
                                const slaveH = slave.preset.height;

                                // Smart Sizing: adapt master elements → slave size
                                const adapted = smartSizeElements(
                                    elements,
                                    masterW, masterH,
                                    slaveW, slaveH,
                                );

                                // ── Phase 3A: Auto-QA sweep (Pencil-inspired) ──
                                // Run layout QA on the adapted elements and auto-fix issues
                                // (out-of-bounds, overlaps, clipped text) before saving.
                                const slaveWithAdapted: BannerVariant = { ...slave, elements: adapted };
                                const qaIssues = runSmartSizingQA([slaveWithAdapted]);
                                let finalElements = adapted;
                                if (qaIssues.length > 0) {
                                    const fixes = generateFixes(qaIssues, [slaveWithAdapted]);
                                    if (fixes.length > 0) {
                                        // Apply patches on top of adapted elements
                                        finalElements = adapted.map((el) => {
                                            const fix = fixes.find(f => f.elementId === el.id);
                                            return fix ? { ...el, ...fix.patch } as DesignElement : el;
                                        });
                                        // Notify canvas to re-render (A2 fix: GAP-4)
                                        // Dispatch after Zustand state update tick
                                        setTimeout(() => {
                                            window.dispatchEvent(new CustomEvent('ace:canvas-refresh', {
                                                detail: { variantId: slave.id, fixCount: fixes.length },
                                            }));
                                        }, 50);
                                    }
                                }

                                // Preserve overridden elements
                                const overridden = new Set(slave.overriddenElementIds);
                                slave.elements = finalElements.map((adaptedEl) => {
                                    if (overridden.has(adaptedEl.id)) {
                                        // Keep the overridden version
                                        const existing = slave.elements.find(e => e.id === adaptedEl.id);
                                        return existing ?? adaptedEl;
                                    }
                                    return adaptedEl;
                                });
                            }
                        }

                        cs.updatedAt = new Date().toISOString();
                        state.creativeSet = cs;
                    });
                },

                getAllCreativeSets: () => {
                    return Object.values(get().allCreativeSets);
                },

            })),
            {
                name: 'ace-design-store',
                // ★ IndexedDB storage — no 5MB limit, async I/O
                storage: createJSONStorage(() => idbStorage),
                partialize: (state) => ({
                    allCreativeSets: state.allCreativeSets,
                    activeCreativeSetId: state.activeCreativeSetId,
                }),
                // On rehydration, restore the creativeSet computed field
                onRehydrateStorage: () => (state) => {
                    if (state && state.activeCreativeSetId) {
                        state.creativeSet = state.allCreativeSets[state.activeCreativeSetId] ?? null;
                    }
                },
            },
        ),
    ),
);

// ── Cross-tab sync ──────────────────────────────────
// ★ REGRESSION GUARD: Always use plain-object setState() here (never immer callback).
// setState() called outside React render context doesn't go through immer middleware.

function _applyDesignSync(raw: string) {
    try {
        const parsed = JSON.parse(raw) as { state?: Partial<Pick<DesignState, 'allCreativeSets' | 'activeCreativeSetId'>> };
        const data = parsed?.state;
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
            useDesignStore.setState(patch);
        }
    } catch { /* malformed JSON */ }
}

function _broadcastDesignSync() {
    try {
        const raw = localStorage.getItem('ace-design-store');
        if (raw && _designChannel) _designChannel.postMessage(raw);
    } catch { /* ok */ }
}

let _designChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined') {
    // 1. StorageEvent (fires in OTHER tabs only)
    window.addEventListener('storage', (e) => {
        if (e.key !== 'ace-design-store' || !e.newValue) return;
        _applyDesignSync(e.newValue);
    });

    // 2. BroadcastChannel (fires in ALL other same-origin tabs instantly)
    try {
        _designChannel = new BroadcastChannel('ace-design-sync');
        _designChannel.onmessage = (e) => {
            if (typeof e.data === 'string') {
                _applyDesignSync(e.data);
            }
        };
    } catch { /* BroadcastChannel not supported */ }
}

// Export for use by actions that need to notify other tabs
export { _broadcastDesignSync };

