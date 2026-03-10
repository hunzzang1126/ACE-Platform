// ─────────────────────────────────────────────────
// adNetworkValidator.test — Ad network validation tests
// ─────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { validateForNetwork, validateAllNetworks, getNetworkSpec } from './adNetworkValidator';
import type { ValidateInput } from './adNetworkValidator';

const validInput: ValidateInput = {
    width: 300, height: 250,
    fileSizeBytes: 100 * 1024, // 100KB
    animDurationS: 15,
    loopCount: 2,
    hasClickTag: true,
    hasBackupImage: true,
};

describe('validateForNetwork', () => {
    it('passes valid Google Ads creative', () => {
        const result = validateForNetwork('google_ads', validInput);
        expect(result.passed).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('fails oversized file', () => {
        const result = validateForNetwork('google_ads', { ...validInput, fileSizeBytes: 200 * 1024 });
        expect(result.passed).toBe(false);
        expect(result.violations.some(v => v.code === 'FILE_SIZE')).toBe(true);
    });

    it('fails wrong dimensions', () => {
        const result = validateForNetwork('google_ads', { ...validInput, width: 999, height: 999 });
        expect(result.passed).toBe(false);
        expect(result.violations.some(v => v.code === 'DIMENSIONS')).toBe(true);
    });

    it('fails animation too long', () => {
        const result = validateForNetwork('google_ads', { ...validInput, animDurationS: 60 });
        expect(result.passed).toBe(false);
        expect(result.violations.some(v => v.code === 'ANIM_DURATION')).toBe(true);
    });

    it('fails too many loops', () => {
        const result = validateForNetwork('google_ads', { ...validInput, loopCount: 10 });
        expect(result.passed).toBe(false);
        expect(result.violations.some(v => v.code === 'LOOP_COUNT')).toBe(true);
    });

    it('fails missing clickTag for Google Ads', () => {
        const result = validateForNetwork('google_ads', { ...validInput, hasClickTag: false });
        expect(result.passed).toBe(false);
        expect(result.violations.some(v => v.code === 'CLICK_TAG')).toBe(true);
    });

    it('Meta does not require clickTag', () => {
        const result = validateForNetwork('meta', { ...validInput, hasClickTag: false, width: 1200, height: 628 });
        expect(result.violations.some(v => v.code === 'CLICK_TAG')).toBe(false);
    });

    it('warns near file size limit', () => {
        const result = validateForNetwork('google_ads', { ...validInput, fileSizeBytes: 130 * 1024 });
        expect(result.warnings.some(w => w.code === 'FILE_SIZE_WARN')).toBe(true);
    });

    it('provides fix suggestions', () => {
        const result = validateForNetwork('google_ads', { ...validInput, fileSizeBytes: 200 * 1024 });
        const violation = result.violations.find(v => v.code === 'FILE_SIZE');
        expect(violation?.fix).toBeTruthy();
    });
});

describe('validateAllNetworks', () => {
    it('returns results for all 4 networks', () => {
        const results = validateAllNetworks(validInput);
        expect(results.length).toBe(4);
        expect(results.map(r => r.network)).toContain('google_ads');
        expect(results.map(r => r.network)).toContain('meta');
    });
});

describe('getNetworkSpec', () => {
    it('returns Google Ads spec', () => {
        const spec = getNetworkSpec('google_ads');
        expect(spec.maxFileSizeKB).toBe(150);
        expect(spec.requireClickTag).toBe(true);
    });
});
