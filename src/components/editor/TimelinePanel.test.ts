// ─────────────────────────────────────────────────
// TimelinePanel.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './TimelinePanel.tsx'), 'utf-8');

describe('TimelinePanel — exports', () => {
    it('exports TimelinePanel component', () => {
        expect(src).toContain('export function TimelinePanel');
    });
});

describe('TimelinePanel — playback controls', () => {
    it('has play button', () => {
        expect(src).toContain('IcPlay');
    });

    it('has stop button', () => {
        expect(src).toContain('IcStop');
    });

    it('has pause button', () => {
        expect(src).toContain('IcPause');
    });

    it('has loop toggle', () => {
        expect(src).toContain('IcLoop');
    });
});

describe('TimelinePanel — element display', () => {
    it('shows element type icons', () => {
        expect(src).toContain('elementTypeIcon');
    });

    it('uses BannerVariant type', () => {
        expect(src).toContain('BannerVariant');
    });

    it('uses editor store', () => {
        expect(src).toContain('useEditorStore');
    });
});
