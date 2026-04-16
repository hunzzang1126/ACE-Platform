// ─────────────────────────────────────────────────
// supabaseClient.test.ts — Contract tests
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './supabaseClient.ts'), 'utf-8');

describe('supabaseClient — exports', () => {
    it('exports getSupabase function', () => {
        expect(src).toContain('export function getSupabase');
    });

    it('exports isCloudEnabled function', () => {
        expect(src).toContain('export function isCloudEnabled');
    });
});

describe('supabaseClient — auth functions', () => {
    it('exports signInWithOAuth', () => {
        expect(src).toContain('export async function signInWithOAuth');
    });

    it('exports signInWithEmail', () => {
        expect(src).toContain('export async function signInWithEmail');
    });

    it('exports signUpWithEmail', () => {
        expect(src).toContain('export async function signUpWithEmail');
    });

    it('exports signOut', () => {
        expect(src).toContain('export async function signOut');
    });
});

describe('supabaseClient — user management', () => {
    it('exports fetchUserRole', () => {
        expect(src).toContain('export async function fetchUserRole');
    });

    it('exports fetchAllUsers', () => {
        expect(src).toContain('export async function fetchAllUsers');
    });

    it('exports updateUserRole', () => {
        expect(src).toContain('export async function updateUserRole');
    });

    it('exports UserRole type', () => {
        expect(src).toContain("export type UserRole = 'admin' | 'user'");
    });
});

describe('supabaseClient — onboarding', () => {
    it('exports fetchOnboardingStatus', () => {
        expect(src).toContain('export async function fetchOnboardingStatus');
    });

    it('exports markOnboardingComplete', () => {
        expect(src).toContain('export async function markOnboardingComplete');
    });
});

describe('supabaseClient — templates', () => {
    it('exports fetchTemplateOverrides', () => {
        expect(src).toContain('export async function fetchTemplateOverrides');
    });

    it('exports upsertTemplateOverride', () => {
        expect(src).toContain('export async function upsertTemplateOverride');
    });

    it('exports deleteTemplateOverride', () => {
        expect(src).toContain('export async function deleteTemplateOverride');
    });
});

describe('supabaseClient — brand kit cloud sync', () => {
    it('exports pushBrandKitCloud', () => {
        expect(src).toContain('export async function pushBrandKitCloud');
    });

    it('exports pullBrandKitsCloud', () => {
        expect(src).toContain('export async function pullBrandKitsCloud');
    });

    it('exports deleteBrandKitCloud', () => {
        expect(src).toContain('export async function deleteBrandKitCloud');
    });
});

describe('supabaseClient — security', () => {
    it('uses environment variables for Supabase config', () => {
        expect(src).toContain('VITE_SUPABASE');
    });

    it('does not expose service_role key on client', () => {
        expect(src).not.toContain('service_role');
    });
});
