// ─────────────────────────────────────────────────
// Top-Level Design Schema
// ─────────────────────────────────────────────────
import type { DesignElement } from './elements.types';

/** Size preset definition (display dimensions + category) */
export interface SizePreset {
    id: string;
    name: string;
    width: number;
    height: number;
    category: 'display' | 'social' | 'video' | 'custom';
}

/** @deprecated Use SizePreset. Kept for backward compatibility. */
export type BannerPreset = SizePreset;

/** Individual size variant (a specific design at a specific dimension) */
export interface SizeVariant {
    id: string;
    preset: SizePreset;
    /** Design elements for this variant (derived view — computed from fabricJSON when present) */
    elements: DesignElement[];
    /** Background color */
    backgroundColor: string;
    /** Background image URL */
    backgroundImage?: string;
    /** Element IDs excluded from master sync */
    overriddenElementIds: string[];
    /** Individual editing lock state */
    syncLocked: boolean;
    /**
     * ★ SCREENSHOT PREVIEW — Fabric canvas toDataURL() captured at save time.
     * Used as the authoritative preview instead of HTML/CSS reconstruction.
     * Guarantees pixel-perfect fidelity with the canvas editor.
     */
    screenshotUrl?: string;
    /**
     * ★ SINGLE SOURCE OF TRUTH — Raw Fabric.js canvas JSON from fc.toObject().
     * When present, this is the CANONICAL representation of the canvas.
     * `elements` is derived from this for backward compatibility with SmartSizing/AI.
     * Restore uses fc.loadFromJSON() directly — zero conversion, zero data loss.
     * If null/undefined, falls back to legacy DesignElement restore path.
     */
    fabricJSON?: string;
}

/** @deprecated Use SizeVariant. Kept for backward compatibility. */
export type BannerVariant = SizeVariant;

/** Per-locale translated content map: elementName → translated text */
export type LocaleContent = Record<string, string>;

/** Locale metadata stored on the creative set */
export interface LocaleData {
    /** Locale code → element content map (elementName → translated text) */
    locales: Record<string, LocaleContent>;
    /** Currently active locale code (e.g., "en", "ko"). Null = original content. */
    activeLocale: string | null;
    /** The original content language (auto-detected or user-set) */
    originalLocale: string;
    /** Per-variant original font sizes (variantId → elementName → fontSize) */
    originalFontSizes?: Record<string, Record<string, number>>;
    /** Per-locale, per-variant cached font sizes (localeCode → variantId → elementName → fontSize) */
    localeFontSizes?: Record<string, Record<string, Record<string, number>>>;
}

/** Smart sizing mode: how elements are repositioned across variants */
export type SizingMode = 'uniform' | 'edge-pin';

/** Creative set (origin + plug-connected variants) */
export interface CreativeSet {
    id: string;
    name: string;
    description?: string;
    /** Folder ID this set belongs to */
    folderId?: string;
    /** @deprecated Use plugConnections instead. Kept for backward compat (auto-derived). */
    masterVariantId: string;
    /** All size variants (including origin) */
    variants: SizeVariant[];
    /**
     * ★ Plug connections: maps targetVariantId → originVariantId.
     * A target "plugs into" its origin and inherits layout DNA.
     * Variants NOT in this map (as keys) are either origins or independent.
     * Example: { "v2": "v1", "v3": "v1" } means v2 and v3 are plugged into v1.
     */
    plugConnections: Record<string, string>;
    /** Brand configuration */
    brand: BrandConfig;
    /** Created at timestamp */
    createdAt: string;
    updatedAt: string;
    /** Created by user ID */
    createdBy?: string;
    /** Cosmetic label only — marks one variant as "Master" for organization. No functional difference. */
    masterLabel?: string;
    /** Persisted card positions in size dashboard (variantId → {x,y}) */
    cardPositions?: Record<string, { x: number; y: number }>;
    /** ★ Locale Layer — multi-language content switching (optional, backward-compat) */
    localeData?: LocaleData;
    /** ★ Smart sizing mode: 'uniform' (center-aligned) or 'edge-pin' (left-gap fixed) */
    sizingMode?: SizingMode;
}


/** Dashboard creative set summary (lightweight list item) */
export interface CreativeSetSummary {
    id: string;
    name: string;
    folderId?: string;
    variantCount: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

/** Folder (for organizing creative sets) */
export interface Folder {
    id: string;
    name: string;
    parentId?: string;
    createdAt: string;
    updatedAt: string;
}

/** Brand guideline configuration */
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

/** Project (contains multiple creative sets) */
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
