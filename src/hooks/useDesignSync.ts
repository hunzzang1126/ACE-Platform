// ─────────────────────────────────────────────────
// useDesignSync – Zustand Store ↔ PixiJS 동기화
// ─────────────────────────────────────────────────
import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { useDesignStore } from '@/stores/designStore';
import type { PixiRenderer } from '@/engine/PixiRenderer';

/**
 * designStore의 creativeSet 변화를 감지하여
 * PixiJS 뷰포트를 자동으로 동기화하는 훅.
 * `ready` flag를 받아서 PixiJS 초기화 완료 후에만 동작.
 */
export function useDesignSync(
    rendererRef: MutableRefObject<PixiRenderer | null>,
    ready: boolean,
) {
    const creativeSet = useDesignStore((s) => s.creativeSet);

    useEffect(() => {
        const renderer = rendererRef.current;
        if (!ready || !renderer || !renderer.initialized || !creativeSet) return;

        // 현재 뷰포트 목록 확인
        const existingIds = new Set(
            renderer.getAllViewports().map((vp) => vp.variant.id),
        );

        // 새로운 변형 추가, 기존 변형 업데이트
        for (const variant of creativeSet.variants) {
            const existing = renderer.getViewport(variant.id);
            if (existing) {
                existing.syncFromDesign(variant);
            } else {
                renderer.createViewport(variant);
            }
            existingIds.delete(variant.id);
        }

        // 삭제된 변형 제거
        for (const removedId of existingIds) {
            renderer.removeViewport(removedId);
        }

        // 그리드 재배치
        renderer.layoutViewportsAsGrid();
    }, [creativeSet, rendererRef, ready]);
}
