// ─────────────────────────────────────────────────
// useMasterSlave – Master-Slave 구독 훅
// ─────────────────────────────────────────────────
import { useCallback } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { SyncEngine } from '@/engine/SyncEngine';
import type { DesignElement } from '@/schema/elements.types';

/**
 * Master Canvas에서의 조작 이벤트를 SyncEngine으로 전파하는 훅.
 * 요소 드래그/리사이즈 완료 시 호출.
 */
export function useMasterSlave() {
    const creativeSet = useDesignStore((s) => s.creativeSet);
    const updateMasterElement = useDesignStore((s) => s.updateMasterElement);

    /**
     * 마스터 요소의 절대 좌표 변경 → constraints 역계산 → 모든 슬레이브 전파
     */
    const onMasterElementMoved = useCallback(
        (elementId: string, x: number, y: number, width: number, height: number) => {
            if (!creativeSet) return;

            const master = creativeSet.variants.find(
                (v) => v.id === creativeSet.masterVariantId,
            );
            if (!master) return;

            // 절대좌표 → constraints 역계산
            const newConstraints = SyncEngine.absoluteToConstraints(
                x, y, width, height,
                master.preset.width,
                master.preset.height,
            );

            // Zustand Store 업데이트 (→ 내부에서 슬레이브 자동 전파)
            updateMasterElement(elementId, { constraints: newConstraints } as Partial<DesignElement>);
        },
        [creativeSet, updateMasterElement],
    );

    /**
     * 마스터 요소의 비레이아웃 속성 변경
     */
    const onMasterElementUpdated = useCallback(
        (elementId: string, patch: Partial<DesignElement>) => {
            updateMasterElement(elementId, patch);
        },
        [updateMasterElement],
    );

    return {
        onMasterElementMoved,
        onMasterElementUpdated,
    };
}
