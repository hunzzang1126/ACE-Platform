// ─────────────────────────────────────────────────
// Constraint Types – Anchor + Offset Based Layout
// ─────────────────────────────────────────────────
// 요소는 절대 좌표(x:100) 대신 제약 조건을 사용합니다.
// 리사이징 시 Wasm/JS 엔진이 제약 조건으로부터 실제 좌표를 계산합니다.

export type HorizontalAnchor = 'left' | 'center' | 'right' | 'stretch';
export type VerticalAnchor = 'top' | 'center' | 'bottom' | 'stretch';

export interface HorizontalConstraint {
    anchor: HorizontalAnchor;
    /** 앵커로부터의 px 오프셋 */
    offset: number;
    /** stretch 시 좌/우 마진 (px) */
    marginLeft?: number;
    marginRight?: number;
}

export interface VerticalConstraint {
    anchor: VerticalAnchor;
    offset: number;
    marginTop?: number;
    marginBottom?: number;
}

export interface SizeConstraint {
    /** 'fixed' = 절대 px, 'relative' = 부모 대비 %, 'auto' = 컨텐츠 기반 */
    widthMode: 'fixed' | 'relative' | 'auto';
    heightMode: 'fixed' | 'relative' | 'auto';
    /** fixed일 때 px 값, relative일 때 0~1 비율 */
    width: number;
    height: number;
    /** 최소/최대 크기 제한 */
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    /** 종횡비 고정 */
    aspectRatioLocked?: boolean;
}

export interface ElementConstraints {
    horizontal: HorizontalConstraint;
    vertical: VerticalConstraint;
    size: SizeConstraint;
    /** 회전 (deg) */
    rotation: number;
}

/**
 * 제약 조건 → 실제 좌표 계산
 * (향후 Wasm으로 교체 가능한 순수 함수)
 */
export function resolveConstraints(
    constraints: ElementConstraints,
    parentWidth: number,
    parentHeight: number,
): { x: number; y: number; width: number; height: number } {
    // ── Width 계산 ──
    let width: number;
    if (constraints.size.widthMode === 'fixed') {
        width = constraints.size.width;
    } else if (constraints.size.widthMode === 'relative') {
        width = parentWidth * constraints.size.width;
    } else {
        width = constraints.size.width; // auto fallback
    }

    // ── Height 계산 ──
    let height: number;
    if (constraints.size.heightMode === 'fixed') {
        height = constraints.size.height;
    } else if (constraints.size.heightMode === 'relative') {
        height = parentHeight * constraints.size.height;
    } else {
        height = constraints.size.height;
    }

    // 종횡비 고정
    if (constraints.size.aspectRatioLocked && constraints.size.width > 0 && constraints.size.height > 0) {
        const ratio = constraints.size.width / constraints.size.height;
        height = width / ratio;
    }

    // min/max 클램프
    if (constraints.size.minWidth != null) width = Math.max(width, constraints.size.minWidth);
    if (constraints.size.maxWidth != null) width = Math.min(width, constraints.size.maxWidth);
    if (constraints.size.minHeight != null) height = Math.max(height, constraints.size.minHeight);
    if (constraints.size.maxHeight != null) height = Math.min(height, constraints.size.maxHeight);

    // ── X 계산 ──
    let x: number;
    const hc = constraints.horizontal;
    switch (hc.anchor) {
        case 'left':
            x = hc.offset;
            break;
        case 'center':
            x = (parentWidth - width) / 2 + hc.offset;
            break;
        case 'right':
            x = parentWidth - width - hc.offset;
            break;
        case 'stretch':
            x = hc.marginLeft ?? 0;
            width = parentWidth - (hc.marginLeft ?? 0) - (hc.marginRight ?? 0);
            break;
    }

    // ── Y 계산 ──
    let y: number;
    const vc = constraints.vertical;
    switch (vc.anchor) {
        case 'top':
            y = vc.offset;
            break;
        case 'center':
            y = (parentHeight - height) / 2 + vc.offset;
            break;
        case 'bottom':
            y = parentHeight - height - vc.offset;
            break;
        case 'stretch':
            y = vc.marginTop ?? 0;
            height = parentHeight - (vc.marginTop ?? 0) - (vc.marginBottom ?? 0);
            break;
    }

    return { x: x!, y: y!, width, height };
}
