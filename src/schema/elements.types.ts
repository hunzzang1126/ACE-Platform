// ─────────────────────────────────────────────────
// Design Element Types
// ─────────────────────────────────────────────────
import type { ElementConstraints } from './constraints.types';

/** Serializable animation config — persisted with the element */
export interface ElementAnimation {
    preset: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale' | 'ascend' | 'descend';
    duration: number;   // seconds
    startTime: number;  // element start time offset (seconds)
}

/** 기본 요소 공통 속성 */
export interface BaseElement {
    id: string;
    name: string;
    type: DesignElementType;
    constraints: ElementConstraints;
    opacity: number;
    visible: boolean;
    locked: boolean;
    /** 렌더링 순서 (z-index) */
    zIndex: number;
    /** 블렌드 모드 */
    blendMode?: string;
    /** Animation preset (persisted) */
    animation?: ElementAnimation;
}

// ── Text ──
export interface TextElement extends BaseElement {
    type: 'text';
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    color: string;
    textAlign: 'left' | 'center' | 'right';
    lineHeight: number;
    letterSpacing: number;
    /** 텍스트 오버플로우 시 자동 축소 */
    autoShrink: boolean;
    /** 로컬라이징 키 (번역 연동) */
    localizationKey?: string;
}

// ── Image ──
export interface ImageElement extends BaseElement {
    type: 'image';
    src: string;
    /** object-fit 스타일 */
    fit: 'cover' | 'contain' | 'fill' | 'none';
    /** 크롭 영역 (0~1 비율) */
    cropRect?: { x: number; y: number; w: number; h: number };
    /** 이미지 필터 */
    filters?: ImageFilter[];
}

export interface ImageFilter {
    type: 'brightness' | 'contrast' | 'saturate' | 'blur' | 'grayscale';
    value: number;
}

// ── Video ──
export interface VideoElement extends BaseElement {
    type: 'video';
    /** Object URL or blob URL for video playback */
    videoSrc: string;
    /** Data URL thumbnail from first frame */
    posterSrc?: string;
    /** Original filename */
    fileName?: string;
    /** object-fit style */
    fit: 'cover' | 'contain' | 'fill';
    muted: boolean;
    loop: boolean;
    autoplay: boolean;
}

// ── Shape ──
export interface ShapeElement extends BaseElement {
    type: 'shape';
    shapeType: 'rectangle' | 'ellipse' | 'polygon' | 'line';
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    borderRadius?: number;
    /** 폴리곤의 경우 좌표 배열 */
    points?: { x: number; y: number }[];
}

// ── Group ──
export interface GroupElement extends BaseElement {
    type: 'group';
    children: DesignElement[];
}

// ── Button (CTA) ──
export interface ButtonElement extends BaseElement {
    type: 'button';
    label: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    backgroundColor: string;
    borderRadius: number;
    /** 클릭 시 이동 URL */
    clickUrl?: string;
}

// ── Union Type ──
export type DesignElement =
    | TextElement
    | ImageElement
    | VideoElement
    | ShapeElement
    | GroupElement
    | ButtonElement;

export type DesignElementType = DesignElement['type'];

// ── Factory Helpers ──
export function createDefaultConstraints(): ElementConstraints {
    return {
        horizontal: { anchor: 'left', offset: 0 },
        vertical: { anchor: 'top', offset: 0 },
        size: {
            widthMode: 'fixed',
            heightMode: 'fixed',
            width: 100,
            height: 100,
        },
        rotation: 0,
    };
}
