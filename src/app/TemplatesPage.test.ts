// ─────────────────────────────────────────────────
// TemplatesPage.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './TemplatesPage.tsx'), 'utf-8');

describe('TemplatesPage — exports', () => {
    it('exports as named or default component', () => {
        const hasExport = src.includes('export function') || src.includes('export default');
        expect(hasExport).toBe(true);
    });
});

describe('TemplatesPage — template system integration', () => {
    it('uses template store', () => {
        expect(src).toContain('useTemplateStore');
    });

    it('supports template categories', () => {
        expect(src).toContain('TemplateCategory');
    });

    it('renders template preview cards', () => {
        expect(src).toContain('TemplatePreview');
    });
});

describe('TemplatesPage — navigation', () => {
    it('uses react-router navigation', () => {
        expect(src).toContain('useNavigate');
    });

    it('integrates with design store for template application', () => {
        expect(src).toContain('useDesignStore');
    });
});

describe('TemplatesPage — layout', () => {
    it('uses AppSidebar for consistent layout', () => {
        expect(src).toContain('AppSidebar');
    });

    it('uses i18n for labels', () => {
        expect(src).toContain('useAppI18n');
    });

    it('has search or filter capability', () => {
        const hasSearch = src.includes('search') || src.includes('filter') || src.includes('Search');
        expect(hasSearch).toBe(true);
    });
});
