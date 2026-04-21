// ─────────────────────────────────────────────────
// fontAttributeDb.ts — Semantic attribute vectors for fonts
// ─────────────────────────────────────────────────
// Each font gets a mood vector (0–1) enabling cosine-similarity
// matching for queries like "luxury modern" or "friendly organic".
// ─────────────────────────────────────────────────

export interface FontAttributes {
    family: string;
    hasVariable: boolean;
    /** Mood axes — each 0.0 to 1.0 */
    luxury: number;
    modern: number;
    friendly: number;
    boldImpact: number;
    editorial: number;
    tech: number;
    organic: number;
    playful: number;
    corporate: number;
    elegant: number;
}

/** All mood axis keys for iteration */
export const MOOD_AXES: (keyof Omit<FontAttributes, 'family' | 'hasVariable'>)[] = [
    'luxury', 'modern', 'friendly', 'boldImpact', 'editorial',
    'tech', 'organic', 'playful', 'corporate', 'elegant',
];

// Helper to reduce boilerplate
function font(
    family: string, hasVariable: boolean,
    luxury: number, modern: number, friendly: number, boldImpact: number,
    editorial: number, tech: number, organic: number, playful: number,
    corporate: number, elegant: number,
): FontAttributes {
    return { family, hasVariable, luxury, modern, friendly, boldImpact, editorial, tech, organic, playful, corporate, elegant };
}

// ═══════════════════════════════════════════════════
// Font Attribute Database
// Order: luxury, modern, friendly, boldImpact, editorial, tech, organic, playful, corporate, elegant
// ═══════════════════════════════════════════════════

export const FONT_ATTRIBUTE_DB: FontAttributes[] = [
    // ── Modern Sans ──
    font('Inter',              true,  0.3, 0.9, 0.5, 0.3, 0.4, 0.8, 0.2, 0.2, 0.7, 0.4),
    font('Outfit',             true,  0.4, 0.9, 0.5, 0.3, 0.5, 0.6, 0.2, 0.2, 0.5, 0.5),
    font('DM Sans',            true,  0.3, 0.9, 0.5, 0.3, 0.4, 0.7, 0.2, 0.2, 0.6, 0.4),
    font('Manrope',            true,  0.3, 0.8, 0.5, 0.3, 0.4, 0.7, 0.3, 0.2, 0.6, 0.4),
    font('Plus Jakarta Sans',  true,  0.4, 0.9, 0.4, 0.3, 0.5, 0.7, 0.2, 0.2, 0.6, 0.5),
    font('Space Grotesk',      true,  0.3, 0.9, 0.3, 0.4, 0.5, 0.9, 0.1, 0.2, 0.5, 0.4),
    font('Sora',               true,  0.3, 0.9, 0.4, 0.3, 0.5, 0.7, 0.2, 0.2, 0.5, 0.5),
    font('Urbanist',           true,  0.4, 0.9, 0.4, 0.3, 0.5, 0.6, 0.2, 0.2, 0.5, 0.6),
    font('Figtree',            true,  0.2, 0.8, 0.6, 0.2, 0.3, 0.5, 0.3, 0.3, 0.5, 0.3),

    // ── Classic Sans ──
    font('Roboto',             true,  0.2, 0.7, 0.5, 0.3, 0.3, 0.6, 0.2, 0.2, 0.7, 0.3),
    font('Open Sans',          true,  0.2, 0.6, 0.6, 0.2, 0.3, 0.5, 0.3, 0.2, 0.7, 0.3),
    font('Lato',               true,  0.3, 0.6, 0.6, 0.3, 0.4, 0.5, 0.3, 0.2, 0.6, 0.4),
    font('Poppins',            true,  0.3, 0.7, 0.6, 0.3, 0.4, 0.5, 0.2, 0.3, 0.5, 0.4),
    font('Montserrat',         true,  0.4, 0.7, 0.4, 0.4, 0.6, 0.5, 0.2, 0.2, 0.6, 0.5),
    font('Nunito',             true,  0.1, 0.5, 0.8, 0.2, 0.2, 0.3, 0.4, 0.5, 0.3, 0.2),
    font('Nunito Sans',        true,  0.2, 0.6, 0.7, 0.2, 0.2, 0.4, 0.3, 0.4, 0.4, 0.3),
    font('Raleway',            true,  0.5, 0.7, 0.3, 0.3, 0.6, 0.4, 0.2, 0.1, 0.5, 0.6),
    font('Work Sans',          true,  0.2, 0.7, 0.5, 0.3, 0.3, 0.5, 0.2, 0.2, 0.6, 0.3),
    font('Source Sans 3',      true,  0.2, 0.6, 0.5, 0.2, 0.3, 0.5, 0.2, 0.1, 0.7, 0.3),
    font('IBM Plex Sans',      true,  0.2, 0.7, 0.3, 0.3, 0.3, 0.8, 0.1, 0.1, 0.8, 0.3),
    font('Noto Sans',          true,  0.2, 0.6, 0.5, 0.2, 0.3, 0.5, 0.2, 0.2, 0.7, 0.3),

    // ── Serif ──
    font('Playfair Display',   true,  0.95, 0.3, 0.2, 0.5, 0.9, 0.1, 0.3, 0.1, 0.4, 0.95),
    font('Cormorant Garant',   true,  0.9, 0.3, 0.2, 0.3, 0.8, 0.1, 0.3, 0.1, 0.3, 0.95),
    font('Libre Baskerville',  false, 0.7, 0.3, 0.3, 0.3, 0.7, 0.2, 0.3, 0.1, 0.6, 0.7),
    font('Merriweather',       true,  0.6, 0.3, 0.4, 0.3, 0.6, 0.3, 0.3, 0.1, 0.6, 0.6),
    font('Lora',               true,  0.6, 0.4, 0.4, 0.3, 0.6, 0.2, 0.4, 0.1, 0.5, 0.7),
    font('EB Garamond',        true,  0.8, 0.2, 0.2, 0.2, 0.8, 0.1, 0.3, 0.1, 0.5, 0.9),
    font('DM Serif Display',   false, 0.8, 0.5, 0.2, 0.5, 0.8, 0.2, 0.2, 0.1, 0.4, 0.8),
    font('Cormorant',          true,  0.9, 0.3, 0.2, 0.2, 0.8, 0.1, 0.3, 0.1, 0.3, 0.95),
    font('Source Serif 4',     true,  0.5, 0.4, 0.3, 0.2, 0.6, 0.3, 0.3, 0.1, 0.7, 0.5),
    font('Noto Serif',         true,  0.4, 0.4, 0.3, 0.2, 0.5, 0.3, 0.3, 0.1, 0.7, 0.5),

    // ── Display / Impact ──
    font('Bebas Neue',         false, 0.3, 0.5, 0.1, 0.95, 0.6, 0.3, 0.1, 0.2, 0.3, 0.3),
    font('Oswald',             true,  0.3, 0.5, 0.2, 0.8, 0.5, 0.3, 0.1, 0.2, 0.4, 0.3),
    font('Anton',              false, 0.2, 0.4, 0.1, 0.95, 0.4, 0.2, 0.1, 0.2, 0.3, 0.2),
    font('Staatliches',        false, 0.2, 0.5, 0.1, 0.9, 0.5, 0.3, 0.1, 0.2, 0.3, 0.2),
    font('Exo 2',              true,  0.2, 0.7, 0.2, 0.6, 0.3, 0.8, 0.1, 0.2, 0.4, 0.3),
    font('Rajdhani',           true,  0.2, 0.7, 0.2, 0.6, 0.3, 0.8, 0.1, 0.2, 0.3, 0.3),
    font('Orbitron',           false, 0.3, 0.8, 0.1, 0.6, 0.3, 0.95, 0.0, 0.2, 0.3, 0.4),

    // ── Friendly / Rounded ──
    font('Quicksand',          true,  0.2, 0.6, 0.8, 0.2, 0.2, 0.3, 0.5, 0.5, 0.3, 0.3),
    font('Comfortaa',          true,  0.2, 0.6, 0.8, 0.1, 0.2, 0.3, 0.4, 0.5, 0.3, 0.3),
    font('Varela Round',       false, 0.1, 0.5, 0.8, 0.2, 0.2, 0.3, 0.4, 0.5, 0.3, 0.2),
    font('Fredoka',            true,  0.1, 0.4, 0.8, 0.2, 0.1, 0.2, 0.3, 0.8, 0.2, 0.1),
    font('Baloo 2',            true,  0.1, 0.3, 0.7, 0.3, 0.1, 0.2, 0.3, 0.8, 0.2, 0.1),

    // ── Handwritten ──
    font('Caveat',             true,  0.2, 0.2, 0.7, 0.2, 0.3, 0.1, 0.7, 0.6, 0.1, 0.3),
    font('Pacifico',           false, 0.2, 0.2, 0.6, 0.2, 0.2, 0.1, 0.5, 0.7, 0.1, 0.3),
    font('Lobster',            false, 0.3, 0.2, 0.5, 0.3, 0.3, 0.1, 0.4, 0.6, 0.1, 0.4),
    font('Dancing Script',     true,  0.3, 0.2, 0.6, 0.1, 0.3, 0.1, 0.5, 0.5, 0.1, 0.5),
    font('Nanum Pen Script',   false, 0.1, 0.2, 0.7, 0.1, 0.2, 0.1, 0.6, 0.6, 0.1, 0.2),

    // ── Monospace ──
    font('JetBrains Mono',     true,  0.2, 0.7, 0.2, 0.3, 0.2, 0.95, 0.1, 0.1, 0.5, 0.3),
    font('Fira Code',          true,  0.2, 0.6, 0.2, 0.3, 0.2, 0.9, 0.1, 0.1, 0.5, 0.3),
    font('Source Code Pro',    true,  0.2, 0.6, 0.2, 0.2, 0.2, 0.85, 0.1, 0.1, 0.6, 0.3),

    // ── Korean ──
    font('Noto Sans KR',       true,  0.3, 0.7, 0.5, 0.3, 0.3, 0.5, 0.2, 0.2, 0.7, 0.4),
    font('Noto Serif KR',      true,  0.5, 0.4, 0.3, 0.3, 0.5, 0.3, 0.3, 0.1, 0.6, 0.5),
    font('Gothic A1',          true,  0.2, 0.7, 0.5, 0.3, 0.3, 0.5, 0.2, 0.2, 0.6, 0.3),
    font('Nanum Gothic',       false, 0.2, 0.5, 0.6, 0.2, 0.3, 0.4, 0.3, 0.3, 0.5, 0.3),
    font('Nanum Myeongjo',     false, 0.5, 0.3, 0.3, 0.2, 0.5, 0.2, 0.4, 0.1, 0.5, 0.6),
    font('Do Hyeon',           false, 0.1, 0.5, 0.5, 0.5, 0.2, 0.3, 0.2, 0.4, 0.3, 0.1),
    font('Jua',                false, 0.1, 0.4, 0.7, 0.3, 0.1, 0.2, 0.3, 0.7, 0.2, 0.1),
    font('Black Han Sans',     false, 0.2, 0.5, 0.2, 0.9, 0.3, 0.3, 0.1, 0.3, 0.3, 0.2),

    // ── System ──
    font('Arial',              false, 0.1, 0.5, 0.5, 0.2, 0.2, 0.4, 0.2, 0.2, 0.7, 0.2),
    font('Helvetica',          false, 0.3, 0.6, 0.4, 0.3, 0.4, 0.5, 0.2, 0.2, 0.7, 0.4),
    font('Georgia',            false, 0.5, 0.3, 0.4, 0.2, 0.5, 0.2, 0.3, 0.1, 0.6, 0.5),
    font('Times New Roman',    false, 0.4, 0.2, 0.3, 0.2, 0.5, 0.2, 0.3, 0.1, 0.7, 0.4),
    font('Courier New',        false, 0.1, 0.3, 0.2, 0.2, 0.2, 0.7, 0.1, 0.1, 0.5, 0.1),
];

/** Quick lookup by family name */
export const FONT_ATTR_MAP = new Map<string, FontAttributes>(
    FONT_ATTRIBUTE_DB.map(f => [f.family, f]),
);
