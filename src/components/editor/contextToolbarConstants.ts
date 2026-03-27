// ─────────────────────────────────────────────────
// contextToolbarConstants — Font families + Google Fonts loader
// ─────────────────────────────────────────────────

export const FONT_FAMILIES = [
    // Sans-Serif
    'Inter, sans-serif', 'Roboto, sans-serif', 'Open Sans, sans-serif', 'Lato, sans-serif',
    'Poppins, sans-serif', 'Montserrat, sans-serif', 'Outfit, sans-serif', 'Nunito, sans-serif',
    'Raleway, sans-serif', 'Work Sans, sans-serif', 'DM Sans, sans-serif', 'Manrope, sans-serif',
    'Plus Jakarta Sans, sans-serif', 'Space Grotesk, sans-serif', 'Sora, sans-serif', 'Figtree, sans-serif',
    // Serif
    'Playfair Display, serif', 'Merriweather, serif', 'Lora, serif', 'Georgia, serif', 'Times New Roman, serif',
    // Display
    'Oswald, sans-serif', 'Bebas Neue, sans-serif', 'Anton, sans-serif',
    // Mono
    'JetBrains Mono, monospace', 'Fira Code, monospace', 'Courier New, monospace',
    // System
    'Arial, sans-serif', 'Helvetica, sans-serif',
];

const loadedFonts = new Set<string>();
const SYSTEM_FONTS = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New'];

export function ensureGoogleFont(family: string) {
    const name = family.split(',')[0].trim();
    if (SYSTEM_FONTS.includes(name) || loadedFonts.has(name)) return;
    loadedFonts.add(name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@300;400;500;600;700;900&display=swap`;
    document.head.appendChild(link);
}

// Preload all fonts on first import
FONT_FAMILIES.forEach(f => ensureGoogleFont(f));
