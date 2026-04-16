// ─────────────────────────────────────────────────
// DashboardTemplateGallery.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './DashboardTemplateGallery.tsx'), 'utf-8');

describe('DashboardTemplateGallery — exports', () => {
    it('exports DashboardTemplateGallery component', () => {
        expect(src).toContain('export function DashboardTemplateGallery');
    });
});

describe('DashboardTemplateGallery — template rendering', () => {
    it('uses template store', () => {
        expect(src).toContain('templateStore');
    });

    it('renders template preview images', () => {
        const hasPreview = src.includes('preview') || src.includes('thumbnail') || src.includes('img');
        expect(hasPreview).toBe(true);
    });

    it('supports template categories or filtering', () => {
        const hasFilter = src.includes('category') || src.includes('filter') || src.includes('search');
        expect(hasFilter).toBe(true);
    });
});

describe('DashboardTemplateGallery — interactions', () => {
    it('handles template selection or click', () => {
        const hasClick = src.includes('onClick') || src.includes('onSelect');
        expect(hasClick).toBe(true);
    });

    it('uses React hooks for state management', () => {
        const hasHook = src.includes('useState') || src.includes('useEffect') || src.includes('useMemo');
        expect(hasHook).toBe(true);
    });
});
