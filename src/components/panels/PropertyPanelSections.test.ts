// ─────────────────────────────────────────────────
// PropertyPanelSections.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './PropertyPanelSections.tsx'), 'utf-8');

describe('PropertyPanelSections — exports', () => {
    it('exports FONT_FAMILIES constant', () => {
        expect(src).toContain('export const FONT_FAMILIES');
    });

    it('exports FONT_WEIGHTS constant', () => {
        expect(src).toContain('export const FONT_WEIGHTS');
    });

    it('exports RemoveBgButton component', () => {
        expect(src).toContain('export function RemoveBgButton');
    });

    it('exports FillToPageButton component', () => {
        expect(src).toContain('export function FillToPageButton');
    });

    it('exports SmartSizingSection component', () => {
        expect(src).toContain('export function SmartSizingSection');
    });

    it('re-exports AiImageReplaceSection', () => {
        expect(src).toContain('AiImageReplaceSection');
    });
});

describe('PropertyPanelSections — font families', () => {
    it('includes common professional fonts', () => {
        expect(src).toContain('Inter');
        expect(src).toContain('Roboto');
        expect(src).toContain('Poppins');
        expect(src).toContain('Montserrat');
    });
});

describe('PropertyPanelSections — dependencies', () => {
    it('uses Section component for consistent layout', () => {
        expect(src).toContain('Section');
    });

    it('integrates with sizing override store', () => {
        expect(src).toContain('useSizingOverrideStore');
    });

    it('uses layout roles schema', () => {
        expect(src).toContain('ROLE_LABELS');
    });
});
