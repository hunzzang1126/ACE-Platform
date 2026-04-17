// ─────────────────────────────────────────────────
// ContextToolbar.test.ts — Contract tests for main toolbar
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './ContextToolbar.tsx'), 'utf-8');

describe('ContextToolbar — exports', () => {
    it('exports ContextToolbar component', () => {
        expect(src).toContain('export function ContextToolbar');
    });
});

describe('ContextToolbar — alignment controls', () => {
    it('supports horizontal alignment (left, center, right)', () => {
        expect(src).toContain('IcAlignLeft');
        expect(src).toContain('IcAlignCenterH');
        expect(src).toContain('IcAlignRight');
    });

    it('supports vertical alignment (top, center, bottom)', () => {
        expect(src).toContain('IcAlignTop');
        expect(src).toContain('IcAlignCenterV');
        expect(src).toContain('IcAlignBottom');
    });
});

describe('ContextToolbar — element-specific controls', () => {
    it('includes color picker', () => {
        expect(src).toContain('ColorPicker');
    });

    it('includes font family selector', () => {
        expect(src).toContain('FONT_FAMILIES');
    });

    it('supports background removal for images', () => {
        expect(src).toContain('removeBackgroundFromUrl');
    });
});

describe('ContextToolbar — Reimagine AI feature', () => {
    it('has Reimagine CTA button', () => {
        const hasReimagine = src.includes('Reimagine') || src.includes('reimagine');
        expect(hasReimagine).toBe(true);
    });

    it('uses replaceImageSrc (not deleteNode)', () => {
        expect(src).not.toContain('deleteNode');
    });
});

describe('ContextToolbar — dependencies', () => {
    it('uses uiStore for state', () => {
        expect(src).toContain('useUIStore');
    });

    it('uses proper engine types', () => {
        expect(src).toContain('EngineNode');
        expect(src).toContain('CanvasEngineActions');
    });
});

// ══════════════════════════════════════════════════
// ★ REGRESSION: RemoveBG error feedback (v0.0.0.606)
// Previously errors were swallowed by console.error (stripped in prod)
// ══════════════════════════════════════════════════
describe('★ REGRESSION: RemoveBG error feedback via toast', () => {
    it('uses status state instead of simple loading boolean', () => {
        expect(src).toContain("useState<'idle' | 'loading' | 'error'>");
    });

    it('shows toast.success on successful background removal', () => {
        expect(src).toContain("toast.success('Background removed')");
    });

    it('shows toast.error with message on failure', () => {
        expect(src).toContain('toast.error(`Remove BG failed:');
    });

    it('displays "Failed — Retry?" text on error state', () => {
        expect(src).toContain("'Failed — Retry?'");
    });

    it('resets to idle after 3s timeout on error', () => {
        expect(src).toContain("setTimeout(() => setStatus('idle'), 3000)");
    });

    it('uses red color for error state', () => {
        expect(src).toContain("'#ff6b6b'");
    });

    it('imports toast lazily to avoid circular deps', () => {
        expect(src).toContain("await import('@/components/ui/Toast')");
    });

    it('passes progress callback to removeBackgroundFromUrl', () => {
        expect(src).toContain('removeBackgroundFromUrl(imageSrc, (p)');
    });
});
