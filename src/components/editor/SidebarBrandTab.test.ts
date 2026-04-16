// ─────────────────────────────────────────────────
// SidebarBrandTab.test.ts — Brand panel asset resolution tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './SidebarBrandTab.tsx'), 'utf-8');

describe('SidebarBrandTab — asset URL resolution', () => {
    it('imports resolveAsset from assetService', () => {
        expect(src).toContain('resolveAsset');
        expect(src).toContain('assetService');
    });

    it('maintains a resolvedUrls cache state', () => {
        expect(src).toContain('resolvedUrls');
        expect(src).toContain('setResolvedUrls');
    });

    it('resolves asset refs via isAssetRef + resolveAsset', () => {
        expect(src).toContain('isAssetRef(');
        expect(src).toContain('resolveAsset(');
    });

    it('uses resolved URL for image src instead of raw ref', () => {
        expect(src).toContain('resolvedUrls[');
    });

    it('shows "Cloud" label for assets without indexed size', () => {
        expect(src).toContain('Cloud');
    });
});
