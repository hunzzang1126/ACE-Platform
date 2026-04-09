// ─────────────────────────────────────────────────
// Brand Color Regression Guards
// ─────────────────────────────────────────────────
// ★ REGRESSION GUARD: Prevents purple (#7c3aed) from being
// reintroduced into the design system. Brand colors are:
//   Primary: #2DD4BF (Mint Teal)
//   Secondary: #6366F1 (Indigo)
//   Purple: gradient endpoint ONLY, never dominant

import { describe, it, expect } from 'vitest';
import { colors } from './designTokens';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Forbidden colors (standalone purple) ──
const FORBIDDEN_COLORS = [
    '#7c3aed',  // old purple accent
    '#6d28d9',  // old purple hover
];

// ── Required brand colors ──
const BRAND_COLORS = {
    primaryAccent: '#6366F1',   // Indigo
    mintTeal: '#2DD4BF',        // Mint Teal
};

describe('★ REGRESSION: Brand Colors — No Purple Dominance', () => {
    it('accent.blue is Indigo (#6366F1), not purple', () => {
        expect(colors.accent.blue).toBe('#6366F1');
    });

    it('accent.blueHover is light Indigo (#818CF8)', () => {
        expect(colors.accent.blueHover).toBe('#818CF8');
    });

    it('border.focus is Indigo', () => {
        expect(colors.border.focus).toBe('#6366F1');
    });

    it('text.link is Indigo', () => {
        expect(colors.text.link).toBe('#6366F1');
    });

    it('canvas.selection is Indigo', () => {
        expect(colors.canvas.selection).toBe('#6366F1');
    });

    it('canvas.guideCenter is Mint Teal', () => {
        expect(colors.canvas.guideCenter).toBe('#2DD4BF');
    });

    it('accent.blueSubtle uses Indigo rgb values (99,102,241)', () => {
        expect(colors.accent.blueSubtle).toContain('99, 102, 241');
    });

    it('surface.selected uses Indigo rgb values', () => {
        expect(colors.surface.selected).toContain('99, 102, 241');
    });

    it('canvas.selectionFill uses Indigo rgb values', () => {
        expect(colors.canvas.selectionFill).toContain('99, 102, 241');
    });

    // ── Deep scan: ensure no forbidden purple in token values ──
    it('no color token contains forbidden purple #7c3aed', () => {
        const allValues = extractAllValues(colors);
        for (const val of allValues) {
            for (const forbidden of FORBIDDEN_COLORS) {
                expect(val.toLowerCase()).not.toContain(forbidden.toLowerCase());
            }
        }
    });
});

describe('★ REGRESSION: CSS Files — No Purple (#7c3aed)', () => {
    const CSS_FILES = [
        'src/index.css',
        'src/styles/dashboard.css',
        'src/styles/editor.css',
        'src/styles/ai-chat.css',
        'src/styles/creativeset.css',
        'src/app/landing.css',
    ];

    for (const file of CSS_FILES) {
        it(`${file} contains no standalone purple (#7c3aed)`, () => {
            const content = readFileSafe(file);
            expect(content.toLowerCase()).not.toContain('#7c3aed');
        });

        it(`${file} contains no old purple hover (#6d28d9)`, () => {
            const content = readFileSafe(file);
            expect(content.toLowerCase()).not.toContain('#6d28d9');
        });
    }

    it('index.css --accent uses Indigo (#6366F1)', () => {
        const content = readFileSafe('src/index.css');
        const accentMatch = content.match(/--accent:\s*(#[0-9a-fA-F]+)/);
        expect(accentMatch).not.toBeNull();
        expect(accentMatch![1]).toBe('#6366F1');
    });

    it('index.css --accent-gradient uses Indigo→Mint', () => {
        const content = readFileSafe('src/index.css');
        expect(content).toContain('#6366F1');
        expect(content).toContain('#2DD4BF');
    });

    it('index.css has dark theme block with [data-theme="dark"]', () => {
        const content = readFileSafe('src/index.css');
        expect(content).toContain('html[data-theme="dark"]');
    });

    it('dark theme defines all critical CSS variables', () => {
        const content = readFileSafe('src/index.css');
        const darkBlock = extractDarkBlock(content);
        expect(darkBlock).toContain('--bg-base');
        expect(darkBlock).toContain('--bg-surface');
        expect(darkBlock).toContain('--bg-elevated');
        expect(darkBlock).toContain('--text-primary');
        expect(darkBlock).toContain('--text-secondary');
        expect(darkBlock).toContain('--text-muted');
        expect(darkBlock).toContain('--border');
        expect(darkBlock).toContain('--accent');
        expect(darkBlock).toContain('--shadow-sm');
        expect(darkBlock).toContain('--glass-bg');
        expect(darkBlock).toContain('--border-editor');
        expect(darkBlock).toContain('--canvas-bg');
    });

    it('dark theme text-primary is light (#F1F5F9)', () => {
        const content = readFileSafe('src/index.css');
        const darkBlock = extractDarkBlock(content);
        expect(darkBlock).toContain('--text-primary: #F1F5F9');
    });

    it('dark theme bg-base is deep navy (#0B0F1A)', () => {
        const content = readFileSafe('src/index.css');
        const darkBlock = extractDarkBlock(content);
        expect(darkBlock).toContain('--bg-base: #0B0F1A');
    });
});

describe('★ REGRESSION: Landing Page Brand', () => {
    it('landing page base background is #0B0F1A (not #050505)', () => {
        const content = readFileSafe('src/app/landing.css');
        // .lp background should be brand navy
        const bgMatch = content.match(/\.lp\s*\{[^}]*background:\s*(#[0-9a-fA-F]+)/s);
        expect(bgMatch).not.toBeNull();
        expect(bgMatch![1]).toBe('#0B0F1A');
    });

    it('gradient text starts with Mint Teal (#2DD4BF)', () => {
        const content = readFileSafe('src/app/landing.css');
        const gradMatch = content.match(/\.lp-gradient-text[^{]*\{[^}]*linear-gradient\([^)]+\)/s);
        expect(gradMatch).not.toBeNull();
        expect(gradMatch![0]).toContain('#2DD4BF');
    });

    it('CTA buttons use Indigo→Mint gradient (not purple)', () => {
        const content = readFileSafe('src/app/landing.css');
        // All button gradients should be Indigo→Mint
        const buttonGrads = content.match(/linear-gradient\(135deg,\s*#6366F1,\s*#2DD4BF\)/g);
        expect(buttonGrads).not.toBeNull();
        expect(buttonGrads!.length).toBeGreaterThanOrEqual(1);
    });

    it('landing page has dynamic aurora animation', () => {
        const content = readFileSafe('src/app/landing.css');
        expect(content).toContain('auroraDrift');
        expect(content).toContain('@keyframes auroraDrift');
    });
});

describe('★ REGRESSION: Dashboard Brand', () => {
    it('dashboard greeting gradient starts with Mint Teal', () => {
        const content = readFileSafe('src/styles/dashboard.css');
        const greetingMatch = content.match(
            /\.dashboard-hero__greeting[^{]*\{[^}]*linear-gradient\([^)]+\)/s
        );
        expect(greetingMatch).not.toBeNull();
        expect(greetingMatch![0]).toContain('#2DD4BF');
    });
});

// ── Helpers ──

function readFileSafe(relativePath: string): string {
    try {
        return readFileSync(resolve(__dirname, '../../', relativePath), 'utf-8');
    } catch {
        // Try from project root
        return readFileSync(resolve(process.cwd(), relativePath), 'utf-8');
    }
}

function extractDarkBlock(css: string): string {
    const match = css.match(/html\[data-theme="dark"\]\s*\{([^}]+)\}/s);
    return match ? match[1] : '';
}

function extractAllValues(obj: Record<string, unknown>): string[] {
    const values: string[] = [];
    for (const val of Object.values(obj)) {
        if (typeof val === 'string') {
            values.push(val);
        } else if (typeof val === 'object' && val !== null) {
            values.push(...extractAllValues(val as Record<string, unknown>));
        }
    }
    return values;
}
