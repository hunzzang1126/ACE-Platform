// ─────────────────────────────────────────────────
// SyncEngine – Master-Slave Synchronization Core
// ─────────────────────────────────────────────────
// 마스터 배너의 변경 사항을 슬레이브 배너에 "즉시" 전파.
// 제약 조건(constraints)을 기반으로 다른 크기의 배너에 맞게 좌표를 재계산.

import type { BannerVariant, CreativeSet } from '@/schema/design.types';
import type { DesignElement } from '@/schema/elements.types';
import type { ElementConstraints } from '@/schema/constraints.types';
import { resolveConstraints } from '@/schema/constraints.types';

// ── Types ──

export interface SyncDelta {
    variantId: string;
    elementId: string;
    /** 변경된 속성들 */
    changes: Partial<DesignElement>;
    /** 재계산된 좌표 */
    resolved: { x: number; y: number; width: number; height: number };
}

export interface SyncResult {
    deltas: SyncDelta[];
    skipped: { variantId: string; reason: string }[];
}

// ── Core Sync Engine ──

export class SyncEngine {
    /**
     * 마스터 요소 변경 → 슬레이브 전파 좌표 계산
     *
     * 핵심 로직:
     * 1. 마스터 요소의 constraints를 기반으로
     * 2. 각 슬레이브 배너의 크기(preset)에 맞는 좌표를 재계算
     * 3. 오버라이드된 요소는 건너뜀
     */
    static propagateChange(
        masterElement: DesignElement,
        creativeSet: CreativeSet,
    ): SyncResult {
        const result: SyncResult = { deltas: [], skipped: [] };

        for (const variant of creativeSet.variants) {
            // 마스터 자신은 건너뜀
            if (variant.id === creativeSet.masterVariantId) continue;

            // 동기화 잠김
            if (variant.syncLocked) {
                result.skipped.push({ variantId: variant.id, reason: 'syncLocked' });
                continue;
            }

            // 개별 오버라이드
            if (variant.overriddenElementIds.includes(masterElement.id)) {
                result.skipped.push({ variantId: variant.id, reason: 'overridden' });
                continue;
            }

            // 슬레이브의 해당 요소 찾기
            const slaveElement = variant.elements.find((el) => el.id === masterElement.id);
            if (!slaveElement) continue;

            // 제약 조건 기반으로 슬레이브 크기에 맞는 좌표 재계산
            const resolved = resolveConstraints(
                masterElement.constraints,
                variant.preset.width,
                variant.preset.height,
            );

            // 변경 사항 계산 (constraints + 비레이아웃 속성)
            const changes = SyncEngine.computeChanges(masterElement, slaveElement);

            result.deltas.push({
                variantId: variant.id,
                elementId: masterElement.id,
                changes,
                resolved,
            });
        }

        return result;
    }

    /**
     * 전체 크리에이티브 셋의 모든 요소를 동기화
     * (초기 로드나 대량 변경 시 사용)
     */
    static fullSync(creativeSet: CreativeSet): SyncResult {
        const master = creativeSet.variants.find(
            (v) => v.id === creativeSet.masterVariantId,
        );
        if (!master) return { deltas: [], skipped: [] };

        const allDeltas: SyncDelta[] = [];
        const allSkipped: { variantId: string; reason: string }[] = [];

        for (const element of master.elements) {
            const result = SyncEngine.propagateChange(element, creativeSet);
            allDeltas.push(...result.deltas);
            allSkipped.push(...result.skipped);
        }

        return { deltas: allDeltas, skipped: allSkipped };
    }

    /**
     * 배치 업데이트: 여러 요소를 한 번에 동기화
     * (requestAnimationFrame 내에서 호출하여 렌더 최적화)
     */
    static batchPropagate(
        masterElements: DesignElement[],
        creativeSet: CreativeSet,
    ): SyncResult {
        const allDeltas: SyncDelta[] = [];
        const allSkipped: { variantId: string; reason: string }[] = [];

        for (const element of masterElements) {
            const result = SyncEngine.propagateChange(element, creativeSet);
            allDeltas.push(...result.deltas);
            allSkipped.push(...result.skipped);
        }

        return { deltas: allDeltas, skipped: allSkipped };
    }

    /**
     * 마스터 vs 슬레이브 요소의 비레이아웃 속성 차이 계산
     */
    private static computeChanges(
        master: DesignElement,
        slave: DesignElement,
    ): Partial<DesignElement> {
        const changes: Record<string, unknown> = {};

        // constraints는 항상 마스터를 따름
        changes.constraints = { ...master.constraints };

        // 공통 속성 동기화
        if (master.opacity !== slave.opacity) changes.opacity = master.opacity;
        if (master.visible !== slave.visible) changes.visible = master.visible;
        if (master.zIndex !== slave.zIndex) changes.zIndex = master.zIndex;
        if (master.blendMode !== slave.blendMode) changes.blendMode = master.blendMode;

        // 타입별 속성 동기화
        if (master.type === slave.type) {
            switch (master.type) {
                case 'text': {
                    const s = slave as typeof master;
                    if (master.content !== s.content) changes.content = master.content;
                    if (master.fontFamily !== s.fontFamily) changes.fontFamily = master.fontFamily;
                    if (master.fontSize !== s.fontSize) changes.fontSize = master.fontSize;
                    if (master.fontWeight !== s.fontWeight) changes.fontWeight = master.fontWeight;
                    if (master.color !== s.color) changes.color = master.color;
                    if (master.textAlign !== s.textAlign) changes.textAlign = master.textAlign;
                    if (master.lineHeight !== s.lineHeight) changes.lineHeight = master.lineHeight;
                    break;
                }
                case 'shape': {
                    const s = slave as typeof master;
                    if (master.fill !== s.fill) changes.fill = master.fill;
                    if (master.stroke !== s.stroke) changes.stroke = master.stroke;
                    if (master.strokeWidth !== s.strokeWidth) changes.strokeWidth = master.strokeWidth;
                    if (master.borderRadius !== s.borderRadius) changes.borderRadius = master.borderRadius;
                    break;
                }
                case 'button': {
                    const s = slave as typeof master;
                    if (master.label !== s.label) changes.label = master.label;
                    if (master.color !== s.color) changes.color = master.color;
                    if (master.backgroundColor !== s.backgroundColor) changes.backgroundColor = master.backgroundColor;
                    if (master.borderRadius !== s.borderRadius) changes.borderRadius = master.borderRadius;
                    break;
                }
            }
        }

        return changes as Partial<DesignElement>;
    }

    /**
     * 제약 조건 재계산 유틸리티
     * (마스터의 절대좌표 변경 → constraints 역계산)
     */
    static absoluteToConstraints(
        x: number,
        y: number,
        width: number,
        height: number,
        parentWidth: number,
        parentHeight: number,
    ): ElementConstraints {
        // 가장 가까운 앵커 자동 결정
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        const leftDist = x;
        const rightDist = parentWidth - (x + width);
        const centerXDist = Math.abs(centerX - parentWidth / 2);

        const topDist = y;
        const bottomDist = parentHeight - (y + height);
        const centerYDist = Math.abs(centerY - parentHeight / 2);

        // 가장 가까운 수평 앵커
        let hAnchor: 'left' | 'center' | 'right';
        let hOffset: number;
        if (centerXDist <= leftDist && centerXDist <= rightDist) {
            hAnchor = 'center';
            hOffset = centerX - parentWidth / 2 - width / 2 + width / 2;
            hOffset = x - (parentWidth - width) / 2;
        } else if (leftDist <= rightDist) {
            hAnchor = 'left';
            hOffset = x;
        } else {
            hAnchor = 'right';
            hOffset = rightDist;
        }

        // 가장 가까운 수직 앵커
        let vAnchor: 'top' | 'center' | 'bottom';
        let vOffset: number;
        if (centerYDist <= topDist && centerYDist <= bottomDist) {
            vAnchor = 'center';
            vOffset = y - (parentHeight - height) / 2;
        } else if (topDist <= bottomDist) {
            vAnchor = 'top';
            vOffset = y;
        } else {
            vAnchor = 'bottom';
            vOffset = bottomDist;
        }

        return {
            horizontal: { anchor: hAnchor, offset: hOffset },
            vertical: { anchor: vAnchor, offset: vOffset },
            size: {
                widthMode: 'fixed',
                heightMode: 'fixed',
                width,
                height,
            },
            rotation: 0,
        };
    }
}
