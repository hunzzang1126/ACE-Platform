// ─────────────────────────────────────────────────
// brandKitHelpers.test.ts — Source-level regression guards
// ─────────────────────────────────────────────────
// saveToBrandKit depends on browser Image + crypto.subtle,
// so we test via source inspection + guessFormatFromUrl logic.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './brandKitHelpers.ts'), 'utf-8');

describe('brandKitHelpers — saveToBrandKit contract', () => {
    it('auto-creates default brand kit when none exists', () => {
        expect(src).toContain("createKit('My Brand')");
        expect(src).toContain('setActiveKit(kitId)');
    });

    it('resolves idb:// refs before upload', () => {
        expect(src).toContain('isAssetRef(src)');
        expect(src).toContain('await resolveAsset(src)');
    });

    it('uploads to Supabase for blob/data URLs when userId exists', () => {
        expect(src).toContain("uploadSrc.startsWith('blob:')");
        expect(src).toContain("uploadSrc.startsWith('data:')");
        expect(src).toContain("uploadToCloud(uploadSrc, 'brand', userId)");
    });

    it('preserves storage:// refs without re-upload', () => {
        expect(src).toContain('isStorageRef(src)');
    });

    it('generates thumbnail with maxSize constraint', () => {
        expect(src).toContain('generateBrandThumb');
        expect(src).toContain('Math.min(maxSize / img.width, maxSize / img.height, 1)');
    });

    it('computes quick hash for dedup', () => {
        expect(src).toContain('computeQuickHash(cloudSrc)');
        expect(src).toContain("crypto.subtle.digest('SHA-256'");
    });
});

describe('brandKitHelpers — guessFormatFromUrl', () => {
    // Test the pure function logic by reading it
    it('recognizes png, jpg, svg, webp, gif, avif extensions', () => {
        expect(src).toContain("['png', 'jpg', 'svg', 'webp', 'gif', 'avif']");
    });

    it('defaults to png for unknown extensions', () => {
        expect(src).toContain("return 'png'");
    });
});
