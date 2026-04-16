// ─────────────────────────────────────────────────
// DashboardPage.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './DashboardPage.tsx'), 'utf-8');

describe('DashboardPage — exports', () => {
    it('exports as component', () => {
        const hasExport = src.includes('export function') || src.includes('export default');
        expect(hasExport).toBe(true);
    });
});

describe('DashboardPage — project management', () => {
    it('uses project store', () => {
        expect(src).toContain('useProjectStore');
    });

    it('renders project cards', () => {
        expect(src).toContain('ProjectCard');
    });

    it('uses design store for project data', () => {
        expect(src).toContain('useDesignStore');
    });
});

describe('DashboardPage — layout', () => {
    it('uses AppSidebar', () => {
        expect(src).toContain('AppSidebar');
    });

    it('shows version info', () => {
        expect(src).toContain('APP_VERSION');
    });

    it('uses banner presets', () => {
        expect(src).toContain('BANNER_PRESETS');
    });
});

describe('DashboardPage — navigation', () => {
    it('uses react-router', () => {
        expect(src).toContain('useNavigate');
    });

    it('supports folder navigation', () => {
        const hasFolder = src.includes('folder') || src.includes('IcFolder');
        expect(hasFolder).toBe(true);
    });
});
