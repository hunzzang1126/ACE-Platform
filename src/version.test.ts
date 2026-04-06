// ─────────────────────────────────────────────────
// version.test.ts — App version validation
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { APP_VERSION } from './version';

describe('APP_VERSION', () => {
    it('follows semver format v{major}.{minor}.{patch}.{build}', () => {
        expect(APP_VERSION).toMatch(/^v\d+\.\d+\.\d+\.\d+$/);
    });

    it('starts with v0', () => {
        expect(APP_VERSION.startsWith('v0')).toBe(true);
    });
});
