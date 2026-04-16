// ─────────────────────────────────────────────────
// SidebarUploadsTab.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SidebarUploadsTab.tsx'), 'utf-8');

describe('SidebarUploadsTab — exports', () => {
    it('exports SidebarUploadsTab component', () => {
        expect(src).toContain('export function SidebarUploadsTab');
    });
});

describe('SidebarUploadsTab — upload functionality', () => {
    it('handles image upload trigger', () => {
        expect(src).toContain('onTriggerImageUpload');
    });

    it('handles video upload trigger', () => {
        expect(src).toContain('onTriggerVideoUpload');
    });

    it('handles image selection', () => {
        expect(src).toContain('onImageSelect');
    });
});

describe('SidebarUploadsTab — asset display', () => {
    it('resolves asset references', () => {
        const hasResolve = src.includes('resolveAsset') || src.includes('isAssetRef');
        expect(hasResolve).toBe(true);
    });

    it('uses upload store for state', () => {
        expect(src).toContain('uploadStore');
    });
});
