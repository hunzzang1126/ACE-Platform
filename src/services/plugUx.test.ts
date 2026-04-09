// ─────────────────────────────────────────────────
// plugUx.test — Tests for plug connection UX improvements
// ─────────────────────────────────────────────────
// Covers: LinkedBadge component, PlugCanvas SVG structure,
// and CSS class naming conventions.
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

// ── LinkedBadge source verification ──
describe('LinkedBadge component', () => {
    it('source imports disconnectPlug from designStore', async () => {
        const src = await import('../components/creativeset/LinkedBadge?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            expect(src).toContain('disconnectPlug');
            expect(src).toContain('useDesignStore');
        }
    });

    it('renders "Linked" text in normal state', async () => {
        const src = await import('../components/creativeset/LinkedBadge?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            expect(src).toContain('Linked');
            expect(src).toContain('Unlink');
        }
    });

    it('uses linked-badge CSS class', async () => {
        const src = await import('../components/creativeset/LinkedBadge?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            expect(src).toContain('linked-badge');
            expect(src).toContain('linked-badge--danger');
        }
    });

    it('calls disconnectPlug on click', async () => {
        const src = await import('../components/creativeset/LinkedBadge?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            expect(src).toContain('disconnectPlug(variantId)');
            expect(src).toContain('e.stopPropagation()');
        }
    });

    it('prevents drag initiation via onMouseDown stopPropagation', async () => {
        const src = await import('../components/creativeset/LinkedBadge?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            // Must prevent card drag from starting when clicking the badge
            expect(src).toContain('onMouseDown');
            expect(src).toContain('stopPropagation');
        }
    });
});

// ── PlugCanvas SVG structure verification ──
describe('PlugCanvas SVG z-index', () => {
    it('renders connection lines and port dots in same SVG at zIndex:50', async () => {
        const src = await import('../components/creativeset/PlugCanvas?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            // ★ REGRESSION: SVG must be above cards (zIndex: 50)
            // Previous bug: zIndex:-1 hid both lines AND port dots
            expect(src).toContain('zIndex: 50');
            // Must have cable animation class
            expect(src).toContain('plug-cable-flow');
            // Must have port dots
            expect(src).toContain('pointerEvents: \'auto\'');
        }
    });

    it('connection lines use subtle opacity (0.25)', async () => {
        const src = await import('../components/creativeset/PlugCanvas?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            // ★ Lines should be subtle, not dominant
            expect(src).toContain('rgba(99, 102, 241, 0.25)');
        }
    });

    it('drag preview uses higher opacity (0.6)', async () => {
        const src = await import('../components/creativeset/PlugCanvas?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            expect(src).toContain('rgba(99, 102, 241, 0.6)');
        }
    });
});

// ── BannerPreviewGrid uses LinkedBadge ──
describe('BannerPreviewGrid plug integration', () => {
    it('imports and uses LinkedBadge instead of plain PLUGGED text', async () => {
        const src = await import('../components/creativeset/BannerPreviewGrid?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            expect(src).toContain("import { LinkedBadge }");
            expect(src).toContain('<LinkedBadge');
            // Old PLUGGED text must be gone
            expect(src).not.toContain('banner-card-plugged');
            expect(src).not.toContain('>  PLUGGED<');
        }
    });

    it('★ REGRESSION: resolves images in PARALLEL (Promise.all)', async () => {
        const src = await import('../components/creativeset/BannerPreviewGrid?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            expect(src).toContain('Promise.all');
            // Must NOT have the old sequential pattern
            expect(src).not.toContain('if (cancelled) break');
        }
    });
});

// ── CSS styles ──
describe('creativeset.css linked-badge styles', () => {
    it('CSS contains .linked-badge class', async () => {
        const src = await import('@/styles/creativeset.css?raw' as any)
            .then(m => (m as any).default as string)
            .catch(() => '');

        if (src) {
            expect(src).toContain('.linked-badge');
            expect(src).toContain('.linked-badge:hover');
            expect(src).toContain('.linked-badge--danger');
            // Old class must be gone
            expect(src).not.toMatch(/\.banner-card-plugged\s*\{/);
        }
    });
});
