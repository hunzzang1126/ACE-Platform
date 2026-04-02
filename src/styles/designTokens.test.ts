// ─────────────────────────────────────────────────
// designTokens.test.ts — Design system token validation
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { colors, spacing, typography, radius, shadows, motion, zIndex, transition } from './designTokens';

describe('designTokens — colors', () => {
    it('has bg, surface, border, text groups', () => {
        expect(colors.bg).toBeDefined();
        expect(colors.surface).toBeDefined();
        expect(colors.border).toBeDefined();
        expect(colors.text).toBeDefined();
    });

    it('has accent color', () => {
        expect(colors.accent).toBeDefined();
    });

    it('all nested color values are strings', () => {
        const allVals = Object.values(colors).flatMap(v =>
            typeof v === 'string' ? [v] : Object.values(v as Record<string, string>)
        );
        for (const c of allVals) {
            expect(typeof c).toBe('string');
        }
    });
});

describe('designTokens — spacing', () => {
    it('uses 4px grid system (values are numbers)', () => {
        const vals = Object.values(spacing);
        for (const v of vals) expect(typeof v).toBe('number');
    });

    it('has xs through xl', () => {
        expect(spacing.xs).toBeDefined();
        expect(spacing.sm).toBeDefined();
        expect(spacing.md).toBeDefined();
        expect(spacing.lg).toBeDefined();
        expect(spacing.xl).toBeDefined();
    });

    it('xs < sm < md < lg < xl', () => {
        expect(spacing.xs).toBeLessThan(spacing.sm);
        expect(spacing.sm).toBeLessThan(spacing.md);
        expect(spacing.md).toBeLessThan(spacing.lg);
        expect(spacing.lg).toBeLessThan(spacing.xl);
    });
});

describe('designTokens — typography', () => {
    it('has font families', () => {
        expect(typography.fontFamily).toBeDefined();
        expect(typography.fontFamily.ui).toContain('Inter');
    });

    it('has font sizes', () => {
        expect(typography.fontSize).toBeDefined();
        expect(typography.fontSize.md).toBeGreaterThan(0);
    });
});

describe('designTokens — radius', () => {
    it('has sm, md, lg, round', () => {
        expect(radius.sm).toBeDefined();
        expect(radius.md).toBeDefined();
        expect(radius.lg).toBeDefined();
        expect(radius.round).toBe('50%');
    });

    it('sm < md < lg', () => {
        expect(radius.sm).toBeLessThan(radius.md);
        expect(radius.md).toBeLessThan(radius.lg);
    });
});

describe('designTokens — shadows', () => {
    it('has sm, md, lg shadows', () => {
        expect(shadows.sm).toContain('rgba');
        expect(shadows.md).toContain('rgba');
        expect(shadows.lg).toContain('rgba');
    });
});

describe('designTokens — motion', () => {
    it('has duration and easing', () => {
        expect(motion.duration).toBeDefined();
        expect(motion.easing).toBeDefined();
    });

    it('has fast/normal durations', () => {
        expect(motion.duration.fast).toBeDefined();
        expect(motion.duration.normal).toBeDefined();
    });
});

describe('designTokens — zIndex', () => {
    it('has multiple z-index layers', () => {
        const vals = Object.values(zIndex);
        expect(vals.length).toBeGreaterThan(2);
    });
});

describe('designTokens — transition', () => {
    it('returns valid CSS transition string', () => {
        const t = transition(['opacity']);
        expect(typeof t).toBe('string');
        expect(t).toContain('opacity');
    });

    it('handles multiple properties', () => {
        const t = transition(['opacity', 'transform']);
        expect(t).toContain('opacity');
        expect(t).toContain('transform');
    });

    it('accepts custom duration key', () => {
        const t = transition(['transform'], 'fast');
        expect(typeof t).toBe('string');
    });
});
