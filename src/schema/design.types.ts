// ─────────────────────────────────────────────────
// Top-Level Design Schema
// ─────────────────────────────────────────────────
import type { DesignElement } from './elements.types';

/** 배너 규격 프리셋 정보 */
export interface BannerPreset {
    id: string;
    name: string;
    width: number;
    height: number;
    category: 'display' | 'social' | 'video' | 'custom';
}

/** 개별 배너 변형 (특정 규격의 디자인) */
export interface BannerVariant {
    id: string;
    preset: BannerPreset;
    /** 이 배너의 디자인 요소들 */
    elements: DesignElement[];
    /** 배경색 */
    backgroundColor: string;
    /** 배경 이미지 URL */
    backgroundImage?: string;
    /** 마스터에서 동기화 제외된 요소 ID 목록 */
    overriddenElementIds: string[];
    /** 개별 편집 잠금 상태 */
    syncLocked: boolean;
}

/** 크리에이티브 셋 (마스터 + 모든 변형) */
export interface CreativeSet {
    id: string;
    name: string;
    description?: string;
    /** 소속 폴더 ID */
    folderId?: string;
    /** 마스터 배너의 variant ID */
    masterVariantId: string;
    /** 모든 배너 변형 (마스터 포함) */
    variants: BannerVariant[];
    /** 브랜드 설정 */
    brand: BrandConfig;
    /** 생성 일시 */
    createdAt: string;
    updatedAt: string;
    /** 생성자 */
    createdBy?: string;
}

/** 대시보드용 크리에이티브 셋 요약 (가벼운 리스트 아이템) */
export interface CreativeSetSummary {
    id: string;
    name: string;
    folderId?: string;
    variantCount: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

/** 폴더 (크리에이티브 셋 정리용) */
export interface Folder {
    id: string;
    name: string;
    parentId?: string;
    createdAt: string;
    updatedAt: string;
}

/** 브랜드 가이드라인 설정 */
export interface BrandConfig {
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    fontFamily: string;
    logoUrl?: string;
    /** Auto-generated OKLCH palette from primaryColor */
    generatedPalette?: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
        surface: string;
    };
}

/** 프로젝트 (여러 크리에이티브 셋을 포함) */
export interface Project {
    id: string;
    name: string;
    description?: string;
    creativeSets: CreativeSet[];
    createdAt: string;
    updatedAt: string;
}

// Re-export all schema types from one place
export type { DesignElement, DesignElementType, ElementAnimation } from './elements.types';
export type {
    ElementConstraints,
    HorizontalConstraint,
    VerticalConstraint,
    SizeConstraint,
    HorizontalAnchor,
    VerticalAnchor,
} from './constraints.types';
export { resolveConstraints } from './constraints.types';
export { createDefaultConstraints } from './elements.types';
